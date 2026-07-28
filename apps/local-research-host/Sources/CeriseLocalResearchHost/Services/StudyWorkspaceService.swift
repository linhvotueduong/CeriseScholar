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

        let bundleURL = root.appendingPathComponent("study.cerisehost")
        try atomicWrite(bundle.originalBundle, to: bundleURL)
        let releaseURL = root.appendingPathComponent("release.json")
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
