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
            try StudyWorkspaceService.atomicWrite(
                try database.responseExportCSV(),
                to: directory.appendingPathComponent("responses.csv")
            )
            try StudyWorkspaceService.atomicWrite(
                try database.trialExportCSV(),
                to: directory.appendingPathComponent("trials.csv")
            )
            try StudyWorkspaceService.atomicWrite(
                try database.responseExportJSON(
                    releaseId: bundle.id,
                    releaseChecksum: bundle.releaseChecksum
                ),
                to: directory.appendingPathComponent("responses.json")
            )
            try StudyWorkspaceService.atomicWrite(
                bundle.releaseJSON,
                to: directory.appendingPathComponent("release.json")
            )
            try StudyWorkspaceService.atomicWrite(
                bundle.codebookJSON,
                to: directory.appendingPathComponent("codebook.json")
            )
            try StudyWorkspaceService.atomicWrite(
                try database.audioManifestJSON(),
                to: directory.appendingPathComponent("audio-manifest.json")
            )
            try StudyWorkspaceService.atomicWrite(
                try database.audioManifestCSV(),
                to: directory.appendingPathComponent("audio-manifest.csv")
            )
            try StudyWorkspaceService.atomicWrite(
                try database.videoManifestJSON(),
                to: directory.appendingPathComponent("video-manifest.json")
            )
            try StudyWorkspaceService.atomicWrite(
                try database.videoManifestCSV(),
                to: directory.appendingPathComponent("video-manifest.csv")
            )
            if StudyWorkspaceService.directoryContainsRegularFiles(workspace.mediaURL) {
                try FileManager.default.copyItem(
                    at: workspace.mediaURL,
                    to: directory.appendingPathComponent("media", isDirectory: true)
                )
            }
            let backup = directory.appendingPathComponent("responses.sqlite")
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
                - Pilot and production rows remain explicitly tagged in every response.
                - Timing values are browser-measured, not certified millisecond timing.

                Files
                - responses.csv: one row per participant session; spreadsheet-formula-safe cells.
                - trials.csv: long-format trial data when the release contains trial loops.
                - responses.json: full structured session records.
                - responses.sqlite: consistent local database backup.
                - release.json: immutable frozen release.
                - codebook.json: variable and trial-table definitions.
                - audio-manifest.json / audio-manifest.csv: anonymous local recording/chunk references, sizes, MIME types, and checksums.
                - video-manifest.json / video-manifest.csv: local camera-recording references, sizes, MIME types, audio inclusion, and checksums.
                - media/: finalized local recordings plus transport chunks when this release collected audio or video. Raw media may identify participants, surroundings, or bystanders.

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
