import Foundation

enum HostSelfTest {
    private struct Failure: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    static func run() throws {
        try verifyBundleIntegrity()
        try verifyCurrentBundleContract()
        try verifyWorkspaceReleaseIdentity()
        try verifyLaunchReadinessPersistence()
        try verifyLocalDatabaseRecoveryAndExports()
        try verifyLocalAudioLifecycle()
        try verifyLocalVideoLifecycle()
        try verifyLocalServerBoundary()
    }

    private static func verifyLaunchReadinessPersistence() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("cerise-readiness-self-test-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let assets = root.appendingPathComponent("assets", isDirectory: true)
        let media = root.appendingPathComponent("media", isDirectory: true)
        let exports = root.appendingPathComponent("exports", isDirectory: true)
        let backups = root.appendingPathComponent("backups", isDirectory: true)
        for directory in [assets, media, exports, backups] {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }
        let workspace = ImportedStudyWorkspace(
            rootURL: root,
            bundleURL: root.appendingPathComponent("study.cerisehost"),
            databaseURL: root.appendingPathComponent("responses.sqlite"),
            assetsURL: assets,
            mediaURL: media,
            readinessURL: root.appendingPathComponent("launch-readiness.json"),
            exportsURL: exports,
            backupsURL: backups
        )
        let checksum = "sha256:" + String(repeating: "e", count: 64)
        var readiness = HostLaunchReadiness.empty(for: checksum)
        readiness.expectedProductionSessions = 250
        readiness.representativeDevicesRehearsed = true
        try StudyWorkspaceService.saveReadiness(readiness, for: workspace)
        let loaded = StudyWorkspaceService.loadReadiness(
            for: workspace,
            releaseChecksum: checksum
        )
        guard loaded.expectedProductionSessions == 250,
              loaded.representativeDevicesRehearsed,
              StudyWorkspaceService.workspaceIsWritable(workspace)
        else {
            throw Failure(message: "Launch-readiness state did not persist inside the study workspace.")
        }
        let changedRelease = StudyWorkspaceService.loadReadiness(
            for: workspace,
            releaseChecksum: "sha256:" + String(repeating: "f", count: 64)
        )
        guard !changedRelease.representativeDevicesRehearsed else {
            throw Failure(message: "Launch readiness was reused across different release checksums.")
        }
    }

    private static func verifyBundleIntegrity() throws {
        var release: [String: Any] = [
            "releaseId": "release_test_1",
            "projectId": "project_test_1",
            "releaseNumber": 1,
            "studio": [
                "title": "Attention pilot",
                "blocks": [],
            ],
        ]
        guard let releaseChecksum = HostBundleVerifier.checksum(for: release) else {
            throw Failure(message: "The self-test release checksum could not be created.")
        }
        release["checksum"] = releaseChecksum
        let nonce = "0123456789abcdef"
        let runnerHTML = """
        <!doctype html>
        <meta http-equiv="Content-Security-Policy" content="script-src 'nonce-\(nonce)'; style-src 'nonce-\(nonce)'; connect-src 'self'">
        <main>\(releaseChecksum)</main>
        <style nonce="\(nonce)">main{display:block}</style>
        <script id="study-spec" nonce="\(nonce)" type="application/json">{}</script>
        <script nonce="\(nonce)">fetch('/api/checkpoints')</script>
        """
        let codebook: [String: Any] = [
            "releaseId": "release_test_1",
            "releaseNumber": 1,
            "releaseChecksum": releaseChecksum,
            "timingClaim": "browser-measured",
        ]
        var bundle: [String: Any] = [
            "bundleFormat": "cerise-local-research-host",
            "bundleVersion": 1,
            "createdAt": "2026-07-27T12:00:00Z",
            "executionMode": "pilot",
            "participantResponsesIncluded": false,
            "release": release,
            "runner": [
                "packageVersion": 4,
                "checkpointEndpoint": "/api/checkpoints",
                "html": runnerHTML,
            ],
            "codebook": codebook,
            "dataPolicy": [
                "participantResponses": "local-only",
                "localDatabase": "sqlite",
                "cloudUpload": false,
                "mediaDirectoryPrepared": true,
            ],
        ]
        guard let bundleChecksum = HostBundleVerifier.checksum(for: bundle) else {
            throw Failure(message: "The self-test bundle checksum could not be created.")
        }
        bundle["bundleChecksum"] = bundleChecksum
        let data = try JSONSerialization.data(withJSONObject: bundle, options: [.sortedKeys])
        let verified = try HostBundleVerifier.verify(data: data)
        guard verified.id == "release_test_1",
              verified.releaseChecksum == releaseChecksum
        else {
            throw Failure(message: "The verified bundle identity did not match its release.")
        }

        var tampered = bundle
        guard var runner = tampered["runner"] as? [String: Any] else {
            throw Failure(message: "The self-test runner was missing.")
        }
        runner["html"] = runnerHTML + "<!-- altered -->"
        tampered["runner"] = runner
        let tamperedData = try JSONSerialization.data(withJSONObject: tampered)
        do {
            _ = try HostBundleVerifier.verify(data: tamperedData)
            throw Failure(message: "A tampered Local Host bundle was accepted.")
        } catch let failure as Failure {
            throw failure
        } catch {
            // Expected: the unchanged checksum must reject the altered runner.
        }
    }

    private static func verifyCurrentBundleContract() throws {
        let nonce = "fedcba9876543210"
        let analysisContract: [String: Any] = [
            "schemaVersion": 1,
            "projectId": "project_phase_8_0",
            "frozenAt": "2026-07-28T12:00:00Z",
            "provenance": [
                "studyDesignSchemaVersion": NSNull(),
                "studyDesignUpdatedAt": NSNull(),
                "experimentStudioSchemaVersion": 8,
                "experimentStudioUpdatedAt": "2026-07-28T11:55:00Z",
            ],
            "design": [
                "kind": "",
                "goal": "",
                "setting": "",
                "targetPopulation": "",
                "plannedSampleSize": "",
                "alpha": "0.05",
                "power": "0.80",
            ],
            "researchQuestions": [],
            "variables": [],
            "globalPlan": [
                "unitOfAnalysis": "unspecified",
                "missingDataStrategy": "",
                "exclusionRules": [],
                "transformations": [],
                "multiplicityStrategy": "",
                "sensitivityAnalyses": [],
            ],
            "dataAccessDeclaration": "not-declared",
            "readiness": [
                "status": "needs-planning",
                "warningCount": 2,
                "issues": [
                    [
                        "id": "analysis-no-research-questions",
                        "severity": "warning",
                        "scope": "contract",
                        "message": "No research question was frozen into this release.",
                    ],
                    [
                        "id": "analysis-no-variables",
                        "severity": "warning",
                        "scope": "contract",
                        "message": "No participant-response variable was frozen into this release.",
                    ],
                ],
            ],
        ]
        guard let analysisContractChecksum = HostBundleVerifier.checksum(for: analysisContract) else {
            throw Failure(message: "The Phase 8 analysis-contract checksum could not be created.")
        }
        var release: [String: Any] = [
            "releaseId": "release_phase_8_0",
            "projectId": "project_phase_8_0",
            "releaseNumber": 5,
            "studio": [
                "title": "Phase 8 analysis contract",
                "blocks": [],
            ],
            "manifest": [
                "formatVersion": 5,
                "audioResponseCount": 0,
                "audioCaptureBoundary": NSNull(),
                "videoResponseCount": 0,
                "videoCaptureBoundary": NSNull(),
                "containsSensitiveMedia": false,
                "analysisContractSchemaVersion": 1,
                "analysisContractChecksum": analysisContractChecksum,
                "analysisContract": analysisContract,
            ],
        ]
        guard let releaseChecksum = HostBundleVerifier.checksum(for: release) else {
            throw Failure(message: "The Phase 8 self-test release checksum could not be created.")
        }
        release["checksum"] = releaseChecksum
        let runnerHTML = """
        <!doctype html>
        <meta http-equiv="Content-Security-Policy" content="script-src 'nonce-\(nonce)'; style-src 'nonce-\(nonce)'; connect-src 'self'">
        <main>\(releaseChecksum)</main>
        <style nonce="\(nonce)">main{display:block}</style>
        <script id="study-spec" nonce="\(nonce)" type="application/json">{}</script>
        <script nonce="\(nonce)">fetch('/api/checkpoints')</script>
        """
        let codebook: [String: Any] = [
            "releaseId": "release_phase_8_0",
            "releaseNumber": 5,
            "releaseChecksum": releaseChecksum,
            "timingClaim": "browser-measured",
            "analysisContract": [
                "schemaVersion": 1,
                "checksum": analysisContractChecksum,
                "readinessStatus": "needs-planning",
                "warningCount": 2,
                "researchQuestionIds": [],
            ],
            "audioResponses": [],
            "videoResponses": [],
        ]
        var bundle: [String: Any] = [
            "bundleFormat": "cerise-local-research-host",
            "bundleVersion": 5,
            "createdAt": "2026-07-28T12:00:00Z",
            "executionMode": "production",
            "participantResponsesIncluded": false,
            "release": release,
            "runner": [
                "packageVersion": 6,
                "checkpointEndpoint": "/api/checkpoints",
                "audioEndpoint": NSNull(),
                "videoEndpoint": NSNull(),
                "html": runnerHTML,
            ],
            "codebook": codebook,
            "dataPolicy": [
                "participantResponses": "local-only",
                "localDatabase": "sqlite",
                "cloudUpload": false,
                "mediaDirectoryPrepared": true,
                "audioResponses": "local-only",
                "audioExecutionBoundary": "localhost-only",
                "audioMaxChunkBytes": 1_048_576,
                "videoResponses": "local-only",
                "videoExecutionBoundary": "localhost-only",
                "videoMaxChunkBytes": 2_097_152,
                "pilotDataIsolation": "separate-mode-exports",
                "productionLaunchGate": "local-preflight-and-rehearsal",
            ],
        ]
        guard let bundleChecksum = HostBundleVerifier.checksum(for: bundle) else {
            throw Failure(message: "The Phase 7.4 self-test bundle checksum could not be created.")
        }
        bundle["bundleChecksum"] = bundleChecksum
        let data = try JSONSerialization.data(withJSONObject: bundle, options: [.sortedKeys])
        let verified = try HostBundleVerifier.verify(data: data)
        guard verified.id == "release_phase_8_0",
              verified.authoringMode == "production",
              verified.releaseChecksum == releaseChecksum,
              verified.analysisContractJSON != nil
        else {
            throw Failure(message: "The native host did not accept the Phase 8 analysis contract.")
        }
    }

    private static func verifyWorkspaceReleaseIdentity() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("cerise-release-identity-self-test-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let releaseURL = root.appendingPathComponent("release.json")
        let checksum = "sha256:" + String(repeating: "1", count: 64)
        try StudyWorkspaceService.atomicWrite(
            Data(#"{"checksum":"\#(checksum)"}"#.utf8),
            to: releaseURL
        )
        try StudyWorkspaceService.validateExistingReleaseIdentity(
            at: releaseURL,
            expectedChecksum: checksum
        )
        do {
            try StudyWorkspaceService.validateExistingReleaseIdentity(
                at: releaseURL,
                expectedChecksum: "sha256:" + String(repeating: "2", count: 64)
            )
            throw Failure(message: "A different release checksum reused an existing study workspace.")
        } catch let failure as Failure {
            throw failure
        } catch {
            // Expected: an existing release ID cannot silently switch immutable checksums.
        }
    }

    private static func verifyLocalDatabaseRecoveryAndExports() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("cerise-local-host-self-test-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }

        let database = try LocalResponseDatabase(
            databaseURL: root.appendingPathComponent("responses.sqlite")
        )
        defer { database.close() }
        let releaseId = "release_test_1"
        let releaseChecksum = "sha256:" + String(repeating: "a", count: 64)

        let completed = checkpoint(
            idempotencyKey: "completed-2",
            sequence: 2,
            status: "completed",
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            response: "=unsafe"
        )
        guard try database.saveCheckpoint(
            completed,
            releaseId: releaseId,
            releaseNumber: 1,
            releaseChecksum: releaseChecksum,
            expectedExecutionMode: "pilot"
        ) else {
            throw Failure(message: "The first checkpoint was not inserted.")
        }
        guard try !database.saveCheckpoint(
            completed,
            releaseId: releaseId,
            releaseNumber: 1,
            releaseChecksum: releaseChecksum,
            expectedExecutionMode: "pilot"
        ) else {
            throw Failure(message: "An idempotent checkpoint was inserted twice.")
        }

        let stale = checkpoint(
            idempotencyKey: "started-1",
            sequence: 1,
            status: "started",
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            response: "stale"
        )
        _ = try database.saveCheckpoint(
            stale,
            releaseId: releaseId,
            releaseNumber: 1,
            releaseChecksum: releaseChecksum,
            expectedExecutionMode: "pilot"
        )
        guard try database.sessions().first?.status == "completed" else {
            throw Failure(message: "An older checkpoint replaced the newest session state.")
        }

        let spoofedProduction = checkpoint(
            idempotencyKey: "spoofed-production-1",
            sequence: 1,
            status: "completed",
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            response: "must be rejected",
            sessionId: "participant_spoofed",
            executionMode: "production"
        )
        do {
            _ = try database.saveCheckpoint(
                spoofedProduction,
                releaseId: releaseId,
                releaseNumber: 1,
                releaseChecksum: releaseChecksum,
                expectedExecutionMode: "pilot"
            )
            throw Failure(message: "A checkpoint changed the frozen pilot/production mode.")
        } catch let failure as Failure {
            throw failure
        } catch {
            // Expected: checkpoint mode must match the verified bundle mode.
        }

        let production = checkpoint(
            idempotencyKey: "production-1",
            sequence: 1,
            status: "completed",
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            response: "production-only",
            sessionId: "participant_production",
            executionMode: "production"
        )
        _ = try database.saveCheckpoint(
            production,
            releaseId: releaseId,
            releaseNumber: 1,
            releaseChecksum: releaseChecksum,
            expectedExecutionMode: "production"
        )

        let csv = String(decoding: try database.responseExportCSV(), as: UTF8.self)
        guard csv.contains("'=unsafe") else {
            throw Failure(message: "CSV formula injection protection was not applied.")
        }
        let pilotCSV = String(
            decoding: try database.responseExportCSV(executionMode: "pilot"),
            as: UTF8.self
        )
        let productionCSV = String(
            decoding: try database.responseExportCSV(executionMode: "production"),
            as: UTF8.self
        )
        guard pilotCSV.contains("participant_1"),
              !pilotCSV.contains("participant_production"),
              productionCSV.contains("participant_production"),
              !productionCSV.contains("participant_1"),
              try database.quickCheck()
        else {
            throw Failure(message: "Pilot and production export separation failed.")
        }
        let backupURL = root.appendingPathComponent("backup.sqlite")
        try database.backup(to: backupURL)
        guard FileManager.default.fileExists(atPath: backupURL.path) else {
            throw Failure(message: "The consistent SQLite backup was not created.")
        }
        try verifySeparatedResearchPackage(
            root: root,
            database: database,
            releaseId: releaseId,
            releaseChecksum: releaseChecksum
        )

        let withdrawn = checkpoint(
            idempotencyKey: "withdrawn-3",
            sequence: 3,
            status: "withdrawn",
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            response: "must be removed"
        )
        _ = try database.saveCheckpoint(
            withdrawn,
            releaseId: releaseId,
            releaseNumber: 1,
            releaseChecksum: releaseChecksum,
            expectedExecutionMode: "pilot"
        )
        let export = try JSONSerialization.jsonObject(
            with: database.responseExportJSON(
                releaseId: releaseId,
                releaseChecksum: releaseChecksum
            )
        ) as? [String: Any]
        let sessions = export?["sessions"] as? [[String: Any]]
        let responses = sessions?.first?["responses"] as? [String: Any]
        guard sessions?.first?["status"] as? String == "withdrawn",
              responses?.isEmpty == true
        else {
            throw Failure(message: "Withdrawn participant payloads were not scrubbed.")
        }
    }

    private static func verifySeparatedResearchPackage(
        root: URL,
        database: LocalResponseDatabase,
        releaseId: String,
        releaseChecksum: String
    ) throws {
        let assets = root.appendingPathComponent("assets", isDirectory: true)
        let media = root.appendingPathComponent("media", isDirectory: true)
        let exports = root.appendingPathComponent("research-exports", isDirectory: true)
        let backups = root.appendingPathComponent("backups", isDirectory: true)
        for directory in [assets, media, exports, backups] {
            try FileManager.default.createDirectory(
                at: directory,
                withIntermediateDirectories: true
            )
        }
        let releaseJSON = Data(#"{"releaseId":"release_test_1"}"#.utf8)
        let codebookJSON = Data(#"{"variables":[]}"#.utf8)
        let analysisContractJSON = Data(#"{"schemaVersion":1}"#.utf8)
        let bundle = VerifiedHostBundle(
            id: releaseId,
            projectId: "project_test_1",
            releaseNumber: 1,
            releaseChecksum: releaseChecksum,
            bundleChecksum: "sha256:" + String(repeating: "b", count: 64),
            title: "Phase 7.4 export test",
            createdAt: Date(),
            authoringMode: "production",
            containsAudioResponses: false,
            audioMaxChunkBytes: 0,
            audioLimits: [:],
            containsVideoResponses: false,
            videoMaxChunkBytes: 0,
            videoLimits: [:],
            runnerNonce: "0123456789abcdef",
            runnerHTML: "<!doctype html>",
            releaseJSON: releaseJSON,
            codebookJSON: codebookJSON,
            analysisContractJSON: analysisContractJSON,
            originalBundle: Data()
        )
        let workspace = ImportedStudyWorkspace(
            rootURL: root,
            bundleURL: root.appendingPathComponent("study.cerisehost"),
            databaseURL: database.databaseURL,
            assetsURL: assets,
            mediaURL: media,
            readinessURL: root.appendingPathComponent("launch-readiness.json"),
            exportsURL: exports,
            backupsURL: backups
        )
        let package = try ResearchExportService.exportPackage(
            bundle: bundle,
            workspace: workspace,
            database: database,
            to: exports
        )
        let productionCSV = try String(
            contentsOf: package
                .appendingPathComponent("production", isDirectory: true)
                .appendingPathComponent("responses.csv"),
            encoding: .utf8
        )
        let pilotCSV = try String(
            contentsOf: package
                .appendingPathComponent("pilot", isDirectory: true)
                .appendingPathComponent("responses.csv"),
            encoding: .utf8
        )
        let auditDatabase = package
            .appendingPathComponent("audit", isDirectory: true)
            .appendingPathComponent("all-responses.sqlite")
        let analysisContract = package.appendingPathComponent("analysis-contract.json")
        guard productionCSV.contains("participant_production"),
              !productionCSV.contains("participant_1"),
              pilotCSV.contains("participant_1"),
              !pilotCSV.contains("participant_production"),
              FileManager.default.fileExists(atPath: auditDatabase.path),
              FileManager.default.fileExists(atPath: analysisContract.path)
        else {
            throw Failure(message: "The research package mixed pilot and production data.")
        }
    }

    private static func verifyLocalAudioLifecycle() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("cerise-local-host-audio-self-test-\(UUID().uuidString)", isDirectory: true)
        let mediaURL = root.appendingPathComponent("media", isDirectory: true)
        try FileManager.default.createDirectory(at: mediaURL, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }

        let database = try LocalResponseDatabase(
            databaseURL: root.appendingPathComponent("responses.sqlite"),
            mediaURL: mediaURL
        )
        defer { database.close() }
        let releaseId = "release_audio_test"
        let releaseChecksum = "sha256:" + String(repeating: "c", count: 64)
        let sessionId = "participant_audio"
        let blockId = "audio_response_1"
        let uploadId = "upload_1"
        let limit = HostAudioBlockLimit(
            blockId: blockId,
            maxDurationSeconds: 30,
            maxBytes: 1_024
        )
        _ = try database.saveCheckpoint(
            checkpoint(
                idempotencyKey: "audio-started-1",
                sequence: 1,
                status: "started",
                releaseId: releaseId,
                releaseChecksum: releaseChecksum,
                response: "consented",
                sessionId: sessionId
            ),
            releaseId: releaseId,
            releaseNumber: 1,
            releaseChecksum: releaseChecksum,
            expectedExecutionMode: "pilot"
        )

        let first = Data("first-audio-chunk".utf8)
        let second = Data("second-audio-chunk".utf8)
        _ = try database.saveAudio(
            first,
            request: LocalAudioRequest(
                action: .chunk,
                sessionId: sessionId,
                blockId: blockId,
                uploadId: uploadId,
                chunkIndex: 0,
                totalBytes: first.count,
                durationMilliseconds: 1_000,
                mimeType: "audio/webm"
            ),
            limit: limit,
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            maximumChunkBytes: 512
        )
        _ = try database.saveAudio(
            second,
            request: LocalAudioRequest(
                action: .chunk,
                sessionId: sessionId,
                blockId: blockId,
                uploadId: uploadId,
                chunkIndex: 1,
                totalBytes: first.count + second.count,
                durationMilliseconds: 2_000,
                mimeType: "audio/webm"
            ),
            limit: limit,
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            maximumChunkBytes: 512
        )
        let finalize = LocalAudioRequest(
            action: .finalize,
            sessionId: sessionId,
            blockId: blockId,
            uploadId: uploadId,
            chunkIndex: 2,
            totalBytes: first.count + second.count,
            durationMilliseconds: 2_100,
            mimeType: "audio/webm"
        )
        guard try database.saveAudio(
            Data(),
            request: finalize,
            limit: limit,
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            maximumChunkBytes: 512
        ), try !database.saveAudio(
            Data(),
            request: finalize,
            limit: limit,
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            maximumChunkBytes: 512
        ) else {
            throw Failure(message: "Audio finalization was not idempotent.")
        }

        let recordingURL = mediaURL
            .appendingPathComponent(sessionId)
            .appendingPathComponent(blockId)
            .appendingPathComponent(uploadId)
            .appendingPathComponent("recording.webm")
        var expectedRecording = first
        expectedRecording.append(second)
        guard try Data(contentsOf: recordingURL) == expectedRecording else {
            throw Failure(message: "The finalized local recording did not preserve its ordered chunks.")
        }
        let manifest = String(decoding: try database.audioManifestJSON(), as: UTF8.self)
        guard manifest.contains("recording.webm"),
              manifest.contains("\"storageBoundary\" : \"local-only\"")
        else {
            throw Failure(message: "The audio manifest did not identify the assembled local recording.")
        }

        _ = try database.saveCheckpoint(
            checkpoint(
                idempotencyKey: "audio-withdrawn-2",
                sequence: 2,
                status: "withdrawn",
                releaseId: releaseId,
                releaseChecksum: releaseChecksum,
                response: "must be removed",
                sessionId: sessionId
            ),
            releaseId: releaseId,
            releaseNumber: 1,
            releaseChecksum: releaseChecksum,
            expectedExecutionMode: "pilot"
        )
        guard !FileManager.default.fileExists(atPath: recordingURL.path),
              !String(decoding: try database.audioManifestJSON(), as: UTF8.self)
                .contains("recording.webm")
        else {
            throw Failure(message: "Withdrawal did not delete the participant's local audio.")
        }
    }

    private static func verifyLocalVideoLifecycle() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("cerise-local-host-video-self-test-\(UUID().uuidString)", isDirectory: true)
        let mediaURL = root.appendingPathComponent("media", isDirectory: true)
        try FileManager.default.createDirectory(at: mediaURL, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }

        let database = try LocalResponseDatabase(
            databaseURL: root.appendingPathComponent("responses.sqlite"),
            mediaURL: mediaURL
        )
        defer { database.close() }
        let releaseId = "release_video_test"
        let releaseChecksum = "sha256:" + String(repeating: "d", count: 64)
        let sessionId = "participant_video"
        let blockId = "video_response_1"
        let uploadId = "video_upload_1"
        let limit = HostVideoBlockLimit(
            blockId: blockId,
            maxDurationSeconds: 30,
            maxBytes: 4_096,
            includeAudio: false
        )
        _ = try database.saveCheckpoint(
            checkpoint(
                idempotencyKey: "video-started-1",
                sequence: 1,
                status: "started",
                releaseId: releaseId,
                releaseChecksum: releaseChecksum,
                response: "consented",
                sessionId: sessionId
            ),
            releaseId: releaseId,
            releaseNumber: 1,
            releaseChecksum: releaseChecksum,
            expectedExecutionMode: "pilot"
        )

        let first = Data("first-video-chunk".utf8)
        let second = Data("second-video-chunk".utf8)
        for (index, chunk) in [first, second].enumerated() {
            _ = try database.saveVideo(
                chunk,
                request: LocalVideoRequest(
                    action: .chunk,
                    sessionId: sessionId,
                    blockId: blockId,
                    uploadId: uploadId,
                    chunkIndex: index,
                    totalBytes: index == 0 ? first.count : first.count + second.count,
                    durationMilliseconds: (index + 1) * 1_000,
                    mimeType: "video/webm",
                    includeAudio: false
                ),
                limit: limit,
                releaseId: releaseId,
                releaseChecksum: releaseChecksum,
                maximumChunkBytes: 1_024
            )
        }
        let finalize = LocalVideoRequest(
            action: .finalize,
            sessionId: sessionId,
            blockId: blockId,
            uploadId: uploadId,
            chunkIndex: 2,
            totalBytes: first.count + second.count,
            durationMilliseconds: 2_100,
            mimeType: "video/webm",
            includeAudio: false
        )
        guard try database.saveVideo(
            Data(),
            request: finalize,
            limit: limit,
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            maximumChunkBytes: 1_024
        ), try !database.saveVideo(
            Data(),
            request: finalize,
            limit: limit,
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            maximumChunkBytes: 1_024
        ) else {
            throw Failure(message: "Video finalization was not idempotent.")
        }

        let recordingURL = mediaURL
            .appendingPathComponent(sessionId)
            .appendingPathComponent(blockId)
            .appendingPathComponent(uploadId)
            .appendingPathComponent("recording.webm")
        var expected = first
        expected.append(second)
        guard try Data(contentsOf: recordingURL) == expected,
              String(decoding: try database.videoManifestJSON(), as: UTF8.self)
                .contains("recording.webm")
        else {
            throw Failure(message: "The finalized local video did not preserve its chunks and manifest.")
        }

        _ = try database.saveCheckpoint(
            checkpoint(
                idempotencyKey: "video-withdrawn-2",
                sequence: 2,
                status: "withdrawn",
                releaseId: releaseId,
                releaseChecksum: releaseChecksum,
                response: "must be removed",
                sessionId: sessionId
            ),
            releaseId: releaseId,
            releaseNumber: 1,
            releaseChecksum: releaseChecksum,
            expectedExecutionMode: "pilot"
        )
        guard !FileManager.default.fileExists(atPath: recordingURL.path),
              !String(decoding: try database.videoManifestJSON(), as: UTF8.self)
                .contains("recording.webm")
        else {
            throw Failure(message: "Withdrawal did not delete the participant's local video.")
        }
    }

    private static func verifyLocalServerBoundary() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("cerise-local-host-http-self-test-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let database = try LocalResponseDatabase(
            databaseURL: root.appendingPathComponent("responses.sqlite")
        )
        defer { database.close() }
        let server = LocalHTTPServer()
        defer { server.stop() }
        let releaseId = "release_http_test"
        let releaseChecksum = "sha256:" + String(repeating: "b", count: 64)
        let ready = DispatchSemaphore(value: 0)
        let result = LockedBox<Result<URL, Error>>()
        server.start(
            mode: .sameComputer,
            runnerHTML: "<!doctype html><title>Local Host self-test</title>",
            runnerNonce: "0123456789abcdef",
            database: database,
            releaseId: releaseId,
            releaseNumber: 1,
            releaseChecksum: releaseChecksum,
            studyExecutionMode: "pilot",
            audioLimits: [:],
            audioMaxChunkBytes: 0,
            videoLimits: [:],
            videoMaxChunkBytes: 0,
            onCheckpoint: {},
            completion: { value in
                result.value = value
                ready.signal()
            }
        )
        guard ready.wait(timeout: .now() + 5) == .success,
              let startResult = result.value
        else {
            throw Failure(message: "The localhost server did not become ready.")
        }
        let participantURL = try startResult.get()
        let page = try synchronousRequest(URLRequest(url: participantURL))
        guard page.response.statusCode == 200,
              String(decoding: page.data, as: UTF8.self).contains("Local Host self-test"),
              page.response.value(forHTTPHeaderField: "Content-Security-Policy")?
                .contains("script-src 'nonce-0123456789abcdef'") == true
        else {
            throw Failure(message: "The localhost participant runner was not served.")
        }

        var checkpointRequest = URLRequest(
            url: participantURL.appendingPathComponent("api/checkpoints")
        )
        checkpointRequest.httpMethod = "POST"
        checkpointRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let origin = "http://127.0.0.1:\(participantURL.port ?? 0)"
        checkpointRequest.setValue(origin, forHTTPHeaderField: "Origin")
        checkpointRequest.httpBody = checkpoint(
            idempotencyKey: "http-1",
            sequence: 1,
            status: "completed",
            releaseId: releaseId,
            releaseChecksum: releaseChecksum,
            response: "local"
        )
        let post = try synchronousRequest(checkpointRequest)
        guard post.response.statusCode == 200,
              try database.sessions().first?.status == "completed"
        else {
            throw Failure(message: "The same-origin local checkpoint was not saved.")
        }

        server.setPaused(true)
        let paused = try synchronousRequest(URLRequest(url: participantURL))
        guard paused.response.statusCode == 503 else {
            throw Failure(message: "Pausing did not stop new participant page access.")
        }
    }

    private static func synchronousRequest(
        _ request: URLRequest
    ) throws -> (response: HTTPURLResponse, data: Data) {
        let completed = DispatchSemaphore(value: 0)
        let result = LockedBox<(HTTPURLResponse?, Data?, Error?)>()
        URLSession.shared.dataTask(with: request) { data, response, error in
            result.value = (response as? HTTPURLResponse, data, error)
            completed.signal()
        }.resume()
        guard completed.wait(timeout: .now() + 5) == .success,
              let value = result.value
        else {
            throw Failure(message: "A localhost request timed out.")
        }
        if let error = value.2 { throw error }
        guard let response = value.0 else {
            throw Failure(message: "A localhost request returned no HTTP response.")
        }
        return (response, value.1 ?? Data())
    }

    private static func checkpoint(
        idempotencyKey: String,
        sequence: Int,
        status: String,
        releaseId: String,
        releaseChecksum: String,
        response: String,
        sessionId: String = "participant_1",
        executionMode: String = "pilot"
    ) -> Data {
        let payload: [String: Any] = [
            "idempotencyKey": idempotencyKey,
            "sessionId": sessionId,
            "checkpointSequence": sequence,
            "releaseId": releaseId,
            "releaseNumber": 1,
            "releaseChecksum": releaseChecksum,
            "status": status,
            "executionMode": executionMode,
            "condition": ["id": "condition_a", "name": "Condition A"],
            "startedAt": "2026-07-27T12:00:00Z",
            "updatedAt": "2026-07-27T12:01:00Z",
            "responses": ["answer": response],
            "timings": [["durationMs": 125]],
            "events": [["type": "response"]],
            "trials": [["trialId": "trial_1", "response": response]],
        ]
        return try! JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys])
    }
}

private final class LockedBox<Value>: @unchecked Sendable {
    private let lock = NSLock()
    private var stored: Value?

    var value: Value? {
        get {
            lock.lock()
            defer { lock.unlock() }
            return stored
        }
        set {
            lock.lock()
            stored = newValue
            lock.unlock()
        }
    }
}
