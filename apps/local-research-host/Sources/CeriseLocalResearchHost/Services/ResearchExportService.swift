import Foundation

enum ResearchExportService {
    static func exportPackage(
        bundle: VerifiedHostBundle,
        workspace: ImportedStudyWorkspace,
        database: LocalResponseDatabase,
        to parentDirectory: URL
    ) throws -> URL {
        let timestamp = timestampForFilename()
        let directory = parentDirectory.appendingPathComponent(
            "cerise-\(safeStem(bundle.title))-v\(bundle.releaseNumber)-export-\(timestamp)",
            isDirectory: true
        )
        guard !FileManager.default.fileExists(atPath: directory.path) else {
            throw HostError.storage("An export with this timestamp already exists.")
        }
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)
        do {
            let production = directory.appendingPathComponent("production", isDirectory: true)
            let pilot = directory.appendingPathComponent("pilot", isDirectory: true)
            let audit = directory.appendingPathComponent("audit", isDirectory: true)
            for modeDirectory in [production, pilot, audit] {
                try FileManager.default.createDirectory(
                    at: modeDirectory,
                    withIntermediateDirectories: false
                )
            }
            try exportMode(
                "production",
                to: production,
                workspace: workspace,
                database: database,
                releaseId: bundle.id,
                releaseChecksum: bundle.releaseChecksum
            )
            try exportMode(
                "pilot",
                to: pilot,
                workspace: workspace,
                database: database,
                releaseId: bundle.id,
                releaseChecksum: bundle.releaseChecksum
            )
            try StudyWorkspaceService.atomicWrite(
                bundle.releaseJSON,
                to: directory.appendingPathComponent("release.json")
            )
            try StudyWorkspaceService.atomicWrite(
                bundle.codebookJSON,
                to: directory.appendingPathComponent("codebook.json")
            )
            let backup = audit.appendingPathComponent("all-responses.sqlite")
            try database.backup(to: backup)
            let readme = """
                Cerise Scholar Local Research Host export

                Study: \(bundle.title)
                Release: v\(bundle.releaseNumber)
                Release ID: \(bundle.id)
                Release checksum: \(bundle.releaseChecksum)
                Bundle checksum: \(bundle.bundleChecksum)
                Exported: \(ISO8601DateFormatter().string(from: Date()))

                Data boundary
                - Participant responses were collected into local SQLite on the researcher's Mac.
                - This package was created locally. Cerise Scholar, Supabase, Azure, OpenRouter, and OpenAI did not receive participant responses.
                - Production and pilot responses are exported into separate folders.
                - Use production/ for analysis. Pilot rows are excluded from every production CSV, JSON, manifest, and media folder.
                - Timing values are browser-measured, not certified millisecond timing.

                Files
                - production/: production-only CSV, JSON, manifests, and media.
                - pilot/: pilot-only CSV, JSON, manifests, and media.
                - audit/all-responses.sqlite: consistent local database backup containing both modes for recovery and audit—not the analysis-ready production dataset.
                - release.json: immutable frozen release.
                - codebook.json: variable and trial-table definitions.
                - Each mode folder contains responses.csv, trials.csv, responses.json,
                  audio/video manifests, and only that mode's media. Raw media may
                  identify participants, surroundings, or bystanders.

                Audio boundary
                - Audio was captured only through the same-Mac Local Research Host.
                - Cerise does not transcribe, analyze, or upload these recordings.
                - Browser audio codecs and microphone properties vary; this is not calibrated acoustic measurement.

                Video boundary
                - Video was captured only through the same-Mac Local Research Host after a visible camera check.
                - Microphone audio is off by default and requires separate audio consent when enabled.
                - Cerise does not identify faces, analyze behavior, transcribe, or upload these recordings.
                - Browser video codecs and camera properties vary; this is not biometric, clinical, eye-tracking, or certified timing measurement.

                Keep this folder according to the approved consent, retention, de-identification,
                access-control, and institutional research-data plan.
                """
            try StudyWorkspaceService.atomicWrite(
                Data(readme.utf8),
                to: directory.appendingPathComponent("README.txt")
            )
            return directory
        } catch {
            try? FileManager.default.removeItem(at: directory)
            throw error
        }
    }

    private static func exportMode(
        _ executionMode: String,
        to directory: URL,
        workspace: ImportedStudyWorkspace,
        database: LocalResponseDatabase,
        releaseId: String,
        releaseChecksum: String
    ) throws {
        try StudyWorkspaceService.atomicWrite(
            try database.responseExportCSV(executionMode: executionMode),
            to: directory.appendingPathComponent("responses.csv")
        )
        try StudyWorkspaceService.atomicWrite(
            try database.trialExportCSV(executionMode: executionMode),
            to: directory.appendingPathComponent("trials.csv")
        )
        try StudyWorkspaceService.atomicWrite(
            try database.responseExportJSON(
                releaseId: releaseId,
                releaseChecksum: releaseChecksum,
                executionMode: executionMode
            ),
            to: directory.appendingPathComponent("responses.json")
        )
        try StudyWorkspaceService.atomicWrite(
            try database.audioManifestJSON(executionMode: executionMode),
            to: directory.appendingPathComponent("audio-manifest.json")
        )
        try StudyWorkspaceService.atomicWrite(
            try database.audioManifestCSV(executionMode: executionMode),
            to: directory.appendingPathComponent("audio-manifest.csv")
        )
        try StudyWorkspaceService.atomicWrite(
            try database.videoManifestJSON(executionMode: executionMode),
            to: directory.appendingPathComponent("video-manifest.json")
        )
        try StudyWorkspaceService.atomicWrite(
            try database.videoManifestCSV(executionMode: executionMode),
            to: directory.appendingPathComponent("video-manifest.csv")
        )

        let modeMedia = directory.appendingPathComponent("media", isDirectory: true)
        try FileManager.default.createDirectory(at: modeMedia, withIntermediateDirectories: false)
        for session in try database.sessions(executionMode: executionMode) {
            guard HostBundleVerifier.isValidIdentifier(session.id) else { continue }
            let source = workspace.mediaURL.appendingPathComponent(session.id, isDirectory: true)
            guard FileManager.default.fileExists(atPath: source.path) else { continue }
            try FileManager.default.copyItem(
                at: source,
                to: modeMedia.appendingPathComponent(session.id, isDirectory: true)
            )
        }
    }

    static func createBackup(
        bundle: VerifiedHostBundle,
        workspace: ImportedStudyWorkspace,
        database: LocalResponseDatabase
    ) throws -> URL {
        let destination = workspace.backupsURL.appendingPathComponent(
            "local-backup-v\(bundle.releaseNumber)-\(timestampForFilename())",
            isDirectory: true
        )
        try FileManager.default.createDirectory(at: destination, withIntermediateDirectories: false)
        do {
            try database.backup(to: destination.appendingPathComponent("responses.sqlite"))
            try StudyWorkspaceService.atomicWrite(
                try database.audioManifestJSON(),
                to: destination.appendingPathComponent("audio-manifest.json")
            )
            try StudyWorkspaceService.atomicWrite(
                try database.videoManifestJSON(),
                to: destination.appendingPathComponent("video-manifest.json")
            )
            if StudyWorkspaceService.directoryContainsRegularFiles(workspace.mediaURL) {
                try FileManager.default.copyItem(
                    at: workspace.mediaURL,
                    to: destination.appendingPathComponent("media", isDirectory: true)
                )
            }
        } catch {
            try? FileManager.default.removeItem(at: destination)
            throw error
        }
        return destination
    }

    private static func timestampForFilename() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        return formatter.string(from: Date())
    }

    private static func safeStem(_ value: String) -> String {
        let normalized = value.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
        let stem = normalized
            .lowercased()
            .replacingOccurrences(of: #"[^a-z0-9]+"#, with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return String((stem.isEmpty ? "study" : stem).prefix(60))
    }
}
