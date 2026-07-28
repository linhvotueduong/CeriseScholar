import Foundation

enum StudyWorkspaceService {
    private static let applicationFolder = "Cerise Local Research Host"

    static func applicationSupportURL() throws -> URL {
        guard let base = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first else {
            throw HostError.storage("macOS did not provide an Application Support directory.")
        }
        let root = base.appendingPathComponent(applicationFolder, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        return root
    }

    static func importBundle(_ bundle: VerifiedHostBundle) throws -> ImportedStudyWorkspace {
        let studies = try applicationSupportURL().appendingPathComponent("Studies", isDirectory: true)
        try FileManager.default.createDirectory(at: studies, withIntermediateDirectories: true)
        let root = studies.appendingPathComponent(bundle.id, isDirectory: true)
        let assets = root.appendingPathComponent("assets", isDirectory: true)
        let media = root.appendingPathComponent("media", isDirectory: true)
        let exports = root.appendingPathComponent("exports", isDirectory: true)
        let backups = root.appendingPathComponent("backups", isDirectory: true)
        for directory in [root, assets, media, exports, backups] {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }

        let releaseURL = root.appendingPathComponent("release.json")
        try validateExistingReleaseIdentity(
            at: releaseURL,
            expectedChecksum: bundle.releaseChecksum
        )
        let bundleURL = root.appendingPathComponent("study.cerisehost")
        try atomicWrite(bundle.originalBundle, to: bundleURL)
        try atomicWrite(bundle.releaseJSON, to: releaseURL)
        let codebookURL = root.appendingPathComponent("codebook.json")
        try atomicWrite(bundle.codebookJSON, to: codebookURL)
        UserDefaults.standard.set(bundle.id, forKey: "lastImportedReleaseId")
        return ImportedStudyWorkspace(
            rootURL: root,
            bundleURL: bundleURL,
            databaseURL: root.appendingPathComponent("responses.sqlite"),
            assetsURL: assets,
            mediaURL: media,
            readinessURL: root.appendingPathComponent("launch-readiness.json"),
            exportsURL: exports,
            backupsURL: backups
        )
    }

    static func recoverLastBundle() throws -> (VerifiedHostBundle, ImportedStudyWorkspace)? {
        guard let releaseId = UserDefaults.standard.string(forKey: "lastImportedReleaseId"),
              HostBundleVerifier.isValidIdentifier(releaseId)
        else { return nil }
        let root = try applicationSupportURL()
            .appendingPathComponent("Studies", isDirectory: true)
            .appendingPathComponent(releaseId, isDirectory: true)
        let bundleURL = root.appendingPathComponent("study.cerisehost")
        guard FileManager.default.fileExists(atPath: bundleURL.path) else { return nil }
        let data = try Data(contentsOf: bundleURL, options: [.mappedIfSafe])
        let bundle = try HostBundleVerifier.verify(data: data)
        let workspace = try importBundle(bundle)
        return (bundle, workspace)
    }

    static func storageSnapshot(for workspace: ImportedStudyWorkspace) -> HostStorageSnapshot {
        let databaseBytes = fileSize(workspace.databaseURL)
            + fileSize(URL(fileURLWithPath: workspace.databaseURL.path + "-wal"))
            + fileSize(URL(fileURLWithPath: workspace.databaseURL.path + "-shm"))
        let assetBytes = directorySize(workspace.assetsURL)
        let mediaBytes = directorySize(workspace.mediaURL)
        return HostStorageSnapshot(
            databaseBytes: databaseBytes,
            assetBytes: assetBytes,
            mediaBytes: mediaBytes,
            totalBytes: databaseBytes + assetBytes + mediaBytes
        )
    }

    static func validateExistingReleaseIdentity(
        at releaseURL: URL,
        expectedChecksum: String
    ) throws {
        guard FileManager.default.fileExists(atPath: releaseURL.path) else { return }
        guard let attributes = try? FileManager.default.attributesOfItem(atPath: releaseURL.path),
              let size = attributes[.size] as? NSNumber,
              size.intValue <= HostBundleVerifier.maximumBundleBytes,
              let data = try? Data(contentsOf: releaseURL, options: [.mappedIfSafe]),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let existingChecksum = object["checksum"] as? String,
              existingChecksum == expectedChecksum
        else {
            throw HostError.storage(
                "This release ID already has a different or unreadable frozen release. "
                + "Cerise refused to mix its responses with the imported study."
            )
        }
    }

    static func loadReadiness(
        for workspace: ImportedStudyWorkspace,
        releaseChecksum: String
    ) -> HostLaunchReadiness {
        guard let attributes = try? FileManager.default.attributesOfItem(
            atPath: workspace.readinessURL.path
        ),
        let size = attributes[.size] as? NSNumber,
        size.intValue <= 64 * 1_024,
        let data = try? Data(contentsOf: workspace.readinessURL),
        var readiness = try? JSONDecoder().decode(HostLaunchReadiness.self, from: data),
        readiness.releaseChecksum == releaseChecksum
        else {
            return .empty(for: releaseChecksum)
        }
        readiness.expectedProductionSessions = min(
            100_000,
            max(1, readiness.expectedProductionSessions)
        )
        return readiness
    }

    static func saveReadiness(
        _ readiness: HostLaunchReadiness,
        for workspace: ImportedStudyWorkspace
    ) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        let data = try encoder.encode(readiness)
        guard data.count <= 64 * 1_024 else {
            throw HostError.storage("The local launch-readiness record exceeded its size limit.")
        }
        try atomicWrite(data, to: workspace.readinessURL)
    }

    static func workspaceIsWritable(_ workspace: ImportedStudyWorkspace) -> Bool {
        let probe = workspace.rootURL.appendingPathComponent(
            ".preflight-\(UUID().uuidString).tmp"
        )
        do {
            try Data("cerise-preflight".utf8).write(to: probe, options: [.atomic])
            try FileManager.default.removeItem(at: probe)
            return true
        } catch {
            try? FileManager.default.removeItem(at: probe)
            return false
        }
    }

    static func availableCapacity(for workspace: ImportedStudyWorkspace) -> Int64 {
        let values = try? workspace.rootURL.resourceValues(
            forKeys: [.volumeAvailableCapacityForImportantUsageKey, .volumeAvailableCapacityKey]
        )
        if let important = values?.volumeAvailableCapacityForImportantUsage {
            return important
        }
        return Int64(values?.volumeAvailableCapacity ?? 0)
    }

    static func atomicWrite(_ data: Data, to destination: URL) throws {
        let temporary = destination
            .deletingLastPathComponent()
            .appendingPathComponent(".\(UUID().uuidString).tmp")
        try data.write(to: temporary, options: [.atomic])
        if FileManager.default.fileExists(atPath: destination.path) {
            _ = try FileManager.default.replaceItemAt(destination, withItemAt: temporary)
        } else {
            try FileManager.default.moveItem(at: temporary, to: destination)
        }
    }

    static func directoryContainsRegularFiles(_ directory: URL) -> Bool {
        guard let enumerator = FileManager.default.enumerator(
            at: directory,
            includingPropertiesForKeys: [.isRegularFileKey],
            options: [.skipsHiddenFiles, .skipsPackageDescendants]
        ) else { return false }
        for case let file as URL in enumerator {
            if (try? file.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true {
                return true
            }
        }
        return false
    }

    private static func fileSize(_ url: URL) -> Int64 {
        let values = try? url.resourceValues(forKeys: [.fileSizeKey])
        return Int64(values?.fileSize ?? 0)
    }

    private static func directorySize(_ directory: URL) -> Int64 {
        guard let enumerator = FileManager.default.enumerator(
            at: directory,
            includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey],
            options: [.skipsHiddenFiles, .skipsPackageDescendants]
        ) else { return 0 }
        var total: Int64 = 0
        for case let file as URL in enumerator {
            let values = try? file.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
            if values?.isRegularFile == true {
                total += Int64(values?.fileSize ?? 0)
            }
        }
        return total
    }
}
