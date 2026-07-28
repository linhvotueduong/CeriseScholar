import Foundation

enum HostSelfTest {
    private struct Failure: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    static func run() throws {
        try verifyBundleIntegrity()
        try verifyLocalDatabaseRecoveryAndExports()
        try verifyLocalServerBoundary()
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
            releaseChecksum: releaseChecksum
        ) else {
            throw Failure(message: "The first checkpoint was not inserted.")
        }
        guard try !database.saveCheckpoint(
            completed,
            releaseId: releaseId,
            releaseNumber: 1,
            releaseChecksum: releaseChecksum
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
            releaseChecksum: releaseChecksum
        )
        guard try database.sessions().first?.status == "completed" else {
            throw Failure(message: "An older checkpoint replaced the newest session state.")
        }

        let csv = String(decoding: try database.responseExportCSV(), as: UTF8.self)
        guard csv.contains("'=unsafe") else {
            throw Failure(message: "CSV formula injection protection was not applied.")
        }
        let backupURL = root.appendingPathComponent("backup.sqlite")
        try database.backup(to: backupURL)
        guard FileManager.default.fileExists(atPath: backupURL.path) else {
            throw Failure(message: "The consistent SQLite backup was not created.")
        }

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
            releaseChecksum: releaseChecksum
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
        response: String
    ) -> Data {
        let payload: [String: Any] = [
            "idempotencyKey": idempotencyKey,
            "sessionId": "participant_1",
            "checkpointSequence": sequence,
            "releaseId": releaseId,
            "releaseNumber": 1,
            "releaseChecksum": releaseChecksum,
            "status": status,
            "executionMode": "pilot",
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
