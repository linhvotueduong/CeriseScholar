import Foundation
import SQLite3

private let sqliteTransient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

final class LocalResponseDatabase: @unchecked Sendable {
    private let lock = NSLock()
    private var handle: OpaquePointer?
    let databaseURL: URL

    init(databaseURL: URL) throws {
        self.databaseURL = databaseURL
        var database: OpaquePointer?
        let flags = SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX
        guard sqlite3_open_v2(databaseURL.path, &database, flags, nil) == SQLITE_OK,
              let database
        else {
            let message = database.flatMap { String(cString: sqlite3_errmsg($0)) }
                ?? "SQLite could not create the local response database."
            if let database { sqlite3_close(database) }
            throw HostError.storage(message)
        }
        handle = database
        do {
            try execute("""
                PRAGMA journal_mode=WAL;
                PRAGMA synchronous=FULL;
                PRAGMA busy_timeout=5000;
                PRAGMA foreign_keys=ON;
                CREATE TABLE IF NOT EXISTS checkpoints (
                  idempotency_key TEXT PRIMARY KEY,
                  session_id TEXT NOT NULL,
                  release_id TEXT NOT NULL,
                  release_checksum TEXT NOT NULL,
                  status TEXT NOT NULL,
                  payload_json TEXT NOT NULL,
                  recorded_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS checkpoints_session_idx
                  ON checkpoints(session_id, recorded_at);
                CREATE TABLE IF NOT EXISTS sessions (
                  session_id TEXT PRIMARY KEY,
                  checkpoint_sequence INTEGER NOT NULL DEFAULT 0,
                  release_id TEXT NOT NULL,
                  release_number INTEGER NOT NULL,
                  release_checksum TEXT NOT NULL,
                  execution_mode TEXT NOT NULL,
                  condition_id TEXT NOT NULL,
                  condition_name TEXT NOT NULL,
                  status TEXT NOT NULL,
                  started_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  payload_json TEXT NOT NULL
                );
                """)
        } catch {
            sqlite3_close(database)
            handle = nil
            throw error
        }
    }

    deinit {
        close()
    }

    func saveCheckpoint(
        _ data: Data,
        releaseId: String,
        releaseNumber: Int,
        releaseChecksum: String
    ) throws -> Bool {
        guard data.count <= 4 * 1024 * 1024 else {
            throw HostError.storage("The participant checkpoint exceeded the 4 MB request limit.")
        }
        guard var payload = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let idempotencyKey = payload["idempotencyKey"] as? String,
              !idempotencyKey.isEmpty,
              idempotencyKey.utf8.count <= 200,
              let sessionId = payload["sessionId"] as? String,
              HostBundleVerifier.isValidIdentifier(sessionId),
              let sequenceNumber = integer(payload["checkpointSequence"]),
              sequenceNumber > 0,
              sequenceNumber <= 10_000_000,
              payload["releaseId"] as? String == releaseId,
              integer(payload["releaseNumber"]) == releaseNumber,
              payload["releaseChecksum"] as? String == releaseChecksum,
              let status = payload["status"] as? String,
              ["started", "completed", "withdrawn"].contains(status),
              let executionMode = payload["executionMode"] as? String,
              ["pilot", "production"].contains(executionMode),
              let condition = payload["condition"] as? [String: Any],
              let conditionId = condition["id"] as? String,
              HostBundleVerifier.isValidIdentifier(conditionId)
        else {
            throw HostError.storage("The participant checkpoint did not match the frozen release contract.")
        }

        if status == "withdrawn" {
            payload["responses"] = [String: Any]()
            payload["timings"] = [Any]()
            payload["events"] = [Any]()
            payload["trials"] = [Any]()
            payload["trialResults"] = [Any]()
        }
        let normalizedData = try JSONSerialization.data(
            withJSONObject: payload,
            options: [.sortedKeys, .withoutEscapingSlashes]
        )
        guard let normalizedPayload = String(data: normalizedData, encoding: .utf8) else {
            throw HostError.storage("The participant checkpoint could not be encoded.")
        }
        let now = ISO8601DateFormatter().string(from: Date())
        let conditionName = String((condition["name"] as? String ?? "").prefix(200))
        let startedAt = String((payload["startedAt"] as? String ?? now).prefix(40))
        let updatedAt = String((payload["updatedAt"] as? String ?? now).prefix(40))

        return try locked {
            try executeUnlocked("BEGIN IMMEDIATE")
            do {
                if status == "withdrawn" {
                    try executePrepared(
                        "DELETE FROM checkpoints WHERE session_id = ?",
                        bindings: [.text(sessionId)]
                    )
                }
                let checkpointChanges = try executePrepared(
                    """
                    INSERT OR IGNORE INTO checkpoints
                      (idempotency_key, session_id, release_id, release_checksum, status, payload_json, recorded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    bindings: [
                        .text(idempotencyKey), .text(sessionId), .text(releaseId),
                        .text(releaseChecksum), .text(status), .text(normalizedPayload), .text(now),
                    ]
                )
                if checkpointChanges > 0 {
                    _ = try executePrepared(
                        """
                        INSERT INTO sessions
                          (session_id, checkpoint_sequence, release_id, release_number, release_checksum,
                           execution_mode, condition_id, condition_name, status, started_at, updated_at, payload_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(session_id) DO UPDATE SET
                          checkpoint_sequence = excluded.checkpoint_sequence,
                          status = excluded.status,
                          updated_at = excluded.updated_at,
                          payload_json = excluded.payload_json
                        WHERE excluded.checkpoint_sequence >= sessions.checkpoint_sequence
                        """,
                        bindings: [
                            .text(sessionId), .integer(sequenceNumber), .text(releaseId),
                            .integer(releaseNumber), .text(releaseChecksum), .text(executionMode),
                            .text(conditionId), .text(conditionName), .text(status),
                            .text(startedAt), .text(updatedAt), .text(normalizedPayload),
                        ]
                    )
                }
                try executeUnlocked("COMMIT")
                return checkpointChanges > 0
            } catch {
                try? executeUnlocked("ROLLBACK")
                throw error
            }
        }
    }

    func sessions() throws -> [HostSession] {
        try locked {
            guard let handle else { return [] }
            var statement: OpaquePointer?
            let sql = """
                SELECT session_id, status, execution_mode, condition_name, started_at, updated_at
                FROM sessions ORDER BY updated_at DESC
                """
            guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK,
                  let statement
            else { throw sqliteError() }
            defer { sqlite3_finalize(statement) }
            var output: [HostSession] = []
            while sqlite3_step(statement) == SQLITE_ROW {
                output.append(HostSession(
                    id: columnText(statement, 0),
                    status: columnText(statement, 1),
                    executionMode: columnText(statement, 2),
                    conditionName: columnText(statement, 3),
                    startedAt: columnText(statement, 4),
                    updatedAt: columnText(statement, 5)
                ))
            }
            return output
        }
    }

    func counts() throws -> HostSessionCounts {
        let sessions = try sessions()
        return sessions.reduce(into: HostSessionCounts()) { counts, session in
            switch session.status {
            case "completed": counts.completed += 1
            case "withdrawn": counts.withdrawn += 1
            default: counts.started += 1
            }
        }
    }

    func responseExportJSON(releaseId: String, releaseChecksum: String) throws -> Data {
        let payloads = try sessionPayloads()
        let export: [String: Any] = [
            "releaseId": releaseId,
            "releaseChecksum": releaseChecksum,
            "exportedAt": ISO8601DateFormatter().string(from: Date()),
            "sessions": payloads,
        ]
        return try JSONSerialization.data(
            withJSONObject: export,
            options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        )
    }

    func responseExportCSV() throws -> Data {
        let payloads = try sessionPayloads()
        let responseKeys = Set(payloads.flatMap { payload in
            Array((payload["responses"] as? [String: Any])?.keys ?? [:].keys)
        }).sorted()
        let headers = [
            "session_id", "status", "execution_mode", "condition_id", "condition_name",
            "started_at", "updated_at",
        ] + responseKeys
        let rows = payloads.map { payload -> [String] in
            let condition = payload["condition"] as? [String: Any] ?? [:]
            let responses = payload["responses"] as? [String: Any] ?? [:]
            return [
                payload["sessionId"], payload["status"], payload["executionMode"],
                condition["id"], condition["name"], payload["startedAt"], payload["updatedAt"],
            ].map(csvString) + responseKeys.map { csvString(responses[$0]) }
        }
        let csv = ([headers.map(csvCell).joined(separator: ",")]
            + rows.map { $0.map(csvCell).joined(separator: ",") })
            .joined(separator: "\r\n") + "\r\n"
        return Data(csv.utf8)
    }

    func trialExportCSV() throws -> Data {
        let payloads = try sessionPayloads()
        let fields = [
            "session_id", "execution_mode", "condition_id", "condition_name",
            "order_index", "table_id", "loop_block_id", "trial_id", "source_row",
            "repetition", "practice", "response", "correct_answer", "correct",
            "reaction_time_ms", "deadline_ms", "deadline_exceeded", "completion_reason",
        ]
        var rows: [[String]] = []
        for payload in payloads {
            let condition = payload["condition"] as? [String: Any] ?? [:]
            let trials = (payload["trials"] as? [[String: Any]])
                ?? (payload["trialResults"] as? [[String: Any]])
                ?? []
            for trial in trials {
                let identity: [Any?] = [
                    payload["sessionId"], payload["executionMode"],
                    condition["id"], condition["name"],
                ]
                let trialIdentity: [Any?] = [
                    trial["orderIndex"] ?? trial["order_index"],
                    trial["tableId"] ?? trial["table_id"],
                    trial["loopBlockId"] ?? trial["loop_block_id"],
                    trial["trialId"] ?? trial["trial_id"],
                    trial["sourceRow"] ?? trial["source_row"],
                    trial["repetition"], trial["practice"],
                ]
                let result: [Any?] = [
                    trial["response"],
                    trial["correctAnswer"] ?? trial["correct_answer"],
                    trial["correct"],
                    trial["reactionTimeMs"] ?? trial["reaction_time_ms"],
                    trial["deadlineMs"] ?? trial["deadline_ms"],
                    trial["deadlineExceeded"] ?? trial["deadline_exceeded"],
                    trial["completionReason"] ?? trial["completion_reason"],
                ]
                rows.append((identity + trialIdentity + result).map(csvString))
            }
        }
        let csv = ([fields.map(csvCell).joined(separator: ",")]
            + rows.map { $0.map(csvCell).joined(separator: ",") })
            .joined(separator: "\r\n") + "\r\n"
        return Data(csv.utf8)
    }

    func backup(to destination: URL) throws {
        try locked {
            guard let source = handle else {
                throw HostError.storage("The local response database is closed.")
            }
            _ = try executePrepared("PRAGMA wal_checkpoint(FULL)", bindings: [])
            var destinationHandle: OpaquePointer?
            guard sqlite3_open_v2(
                destination.path,
                &destinationHandle,
                SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE,
                nil
            ) == SQLITE_OK, let destinationHandle else {
                throw HostError.storage("The backup database could not be created.")
            }
            defer { sqlite3_close(destinationHandle) }
            guard let backup = sqlite3_backup_init(destinationHandle, "main", source, "main") else {
                throw HostError.storage("SQLite could not initialize the local backup.")
            }
            defer { sqlite3_backup_finish(backup) }
            guard sqlite3_backup_step(backup, -1) == SQLITE_DONE else {
                throw HostError.storage("SQLite could not complete the local backup.")
            }
        }
    }

    func close() {
        lock.lock()
        defer { lock.unlock() }
        guard let handle else { return }
        sqlite3_exec(handle, "PRAGMA wal_checkpoint(TRUNCATE)", nil, nil, nil)
        sqlite3_close(handle)
        self.handle = nil
    }

    private func sessionPayloads() throws -> [[String: Any]] {
        try locked {
            guard let handle else { return [] }
            var statement: OpaquePointer?
            guard sqlite3_prepare_v2(
                handle,
                "SELECT payload_json FROM sessions ORDER BY started_at, session_id",
                -1,
                &statement,
                nil
            ) == SQLITE_OK, let statement else { throw sqliteError() }
            defer { sqlite3_finalize(statement) }
            var payloads: [[String: Any]] = []
            while sqlite3_step(statement) == SQLITE_ROW {
                let text = columnText(statement, 0)
                guard let data = text.data(using: .utf8),
                      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
                else { continue }
                payloads.append(object)
            }
            return payloads
        }
    }

    private func locked<T>(_ operation: () throws -> T) throws -> T {
        lock.lock()
        defer { lock.unlock() }
        return try operation()
    }

    private func execute(_ sql: String) throws {
        try locked { try executeUnlocked(sql) }
    }

    private func executeUnlocked(_ sql: String) throws {
        guard let handle else { throw HostError.storage("The local response database is closed.") }
        var message: UnsafeMutablePointer<CChar>?
        guard sqlite3_exec(handle, sql, nil, nil, &message) == SQLITE_OK else {
            let detail = message.map { String(cString: $0) } ?? String(cString: sqlite3_errmsg(handle))
            sqlite3_free(message)
            throw HostError.storage(detail)
        }
    }

    private enum SQLiteBinding {
        case text(String)
        case integer(Int)
    }

    @discardableResult
    private func executePrepared(_ sql: String, bindings: [SQLiteBinding]) throws -> Int {
        guard let handle else { throw HostError.storage("The local response database is closed.") }
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK,
              let statement else { throw sqliteError() }
        defer { sqlite3_finalize(statement) }
        for (offset, binding) in bindings.enumerated() {
            let index = Int32(offset + 1)
            let result: Int32
            switch binding {
            case .text(let value):
                result = sqlite3_bind_text(statement, index, value, -1, sqliteTransient)
            case .integer(let value):
                result = sqlite3_bind_int64(statement, index, sqlite3_int64(value))
            }
            guard result == SQLITE_OK else { throw sqliteError() }
        }
        let step = sqlite3_step(statement)
        guard step == SQLITE_DONE || step == SQLITE_ROW else { throw sqliteError() }
        return Int(sqlite3_changes(handle))
    }

    private func sqliteError() -> HostError {
        let detail = handle.map { String(cString: sqlite3_errmsg($0)) }
            ?? "The local SQLite operation failed."
        return .storage(detail)
    }

    private func columnText(_ statement: OpaquePointer, _ index: Int32) -> String {
        guard let pointer = sqlite3_column_text(statement, index) else { return "" }
        return String(cString: pointer)
    }

    private func integer(_ value: Any?) -> Int? {
        guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() else {
            return nil
        }
        let integer = number.intValue
        return number.doubleValue == Double(integer) ? integer : nil
    }

    private func csvString(_ value: Any?) -> String {
        switch value {
        case nil, is NSNull: return ""
        case let value as String: return value
        case let value as Bool: return value ? "true" : "false"
        case let value as NSNumber: return value.stringValue
        default:
            guard JSONSerialization.isValidJSONObject(value as Any),
                  let data = try? JSONSerialization.data(
                    withJSONObject: value as Any,
                    options: [.sortedKeys, .withoutEscapingSlashes]
                  )
            else { return String(describing: value!) }
            return String(data: data, encoding: .utf8) ?? ""
        }
    }

    private func csvCell(_ value: String) -> String {
        let dangerous = value.range(
            of: #"^[\t\r\n ]*[=+\-@]"#,
            options: .regularExpression
        ) != nil
        let safe = dangerous ? "'" + value : value
        return "\"" + safe.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }
}
