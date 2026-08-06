import CryptoKit
import Foundation
import SQLite3

private let sqliteTransient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

struct LocalAudioRequest {
    enum Action: String {
        case chunk
        case finalize
        case discard
    }

    let action: Action
    let sessionId: String
    let blockId: String
    let uploadId: String
    let chunkIndex: Int
    let totalBytes: Int
    let durationMilliseconds: Int
    let mimeType: String
}

struct LocalVideoRequest {
    enum Action: String {
        case chunk
        case finalize
        case discard
    }

    let action: Action
    let sessionId: String
    let blockId: String
    let uploadId: String
    let chunkIndex: Int
    let totalBytes: Int
    let durationMilliseconds: Int
    let mimeType: String
    let includeAudio: Bool
}

final class LocalResponseDatabase: @unchecked Sendable {
    private let lock = NSLock()
    private var handle: OpaquePointer?
    let databaseURL: URL
    let mediaURL: URL?

    init(databaseURL: URL, mediaURL: URL? = nil) throws {
        self.databaseURL = databaseURL
        self.mediaURL = mediaURL
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
                CREATE TABLE IF NOT EXISTS audio_uploads (
                  session_id TEXT NOT NULL,
                  block_id TEXT NOT NULL,
                  upload_id TEXT NOT NULL,
                  release_id TEXT NOT NULL,
                  release_checksum TEXT NOT NULL,
                  mime_type TEXT NOT NULL,
                  status TEXT NOT NULL,
                  duration_ms INTEGER NOT NULL DEFAULT 0,
                  total_bytes INTEGER NOT NULL DEFAULT 0,
                  chunk_count INTEGER NOT NULL DEFAULT 0,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  PRIMARY KEY (session_id, block_id, upload_id)
                );
                CREATE INDEX IF NOT EXISTS audio_uploads_session_idx
                  ON audio_uploads(session_id, status);
                CREATE TABLE IF NOT EXISTS audio_chunks (
                  session_id TEXT NOT NULL,
                  block_id TEXT NOT NULL,
                  upload_id TEXT NOT NULL,
                  chunk_index INTEGER NOT NULL,
                  relative_path TEXT NOT NULL,
                  mime_type TEXT NOT NULL,
                  byte_count INTEGER NOT NULL,
                  checksum TEXT NOT NULL,
                  recorded_at TEXT NOT NULL,
                  PRIMARY KEY (session_id, block_id, upload_id, chunk_index),
                  FOREIGN KEY (session_id, block_id, upload_id)
                    REFERENCES audio_uploads(session_id, block_id, upload_id)
                    ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS video_uploads (
                  session_id TEXT NOT NULL,
                  block_id TEXT NOT NULL,
                  upload_id TEXT NOT NULL,
                  release_id TEXT NOT NULL,
                  release_checksum TEXT NOT NULL,
                  mime_type TEXT NOT NULL,
                  includes_audio INTEGER NOT NULL DEFAULT 0,
                  status TEXT NOT NULL,
                  duration_ms INTEGER NOT NULL DEFAULT 0,
                  total_bytes INTEGER NOT NULL DEFAULT 0,
                  chunk_count INTEGER NOT NULL DEFAULT 0,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  PRIMARY KEY (session_id, block_id, upload_id)
                );
                CREATE INDEX IF NOT EXISTS video_uploads_session_idx
                  ON video_uploads(session_id, status);
                CREATE TABLE IF NOT EXISTS video_chunks (
                  session_id TEXT NOT NULL,
                  block_id TEXT NOT NULL,
                  upload_id TEXT NOT NULL,
                  chunk_index INTEGER NOT NULL,
                  relative_path TEXT NOT NULL,
                  mime_type TEXT NOT NULL,
                  byte_count INTEGER NOT NULL,
                  checksum TEXT NOT NULL,
                  recorded_at TEXT NOT NULL,
                  PRIMARY KEY (session_id, block_id, upload_id, chunk_index),
                  FOREIGN KEY (session_id, block_id, upload_id)
                    REFERENCES video_uploads(session_id, block_id, upload_id)
                    ON DELETE CASCADE
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
        releaseChecksum: String,
        expectedExecutionMode: String
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
              ["started", "completed", "refused", "withdrawn"].contains(status),
              let executionMode = payload["executionMode"] as? String,
              ["pilot", "production"].contains(executionMode),
              executionMode == expectedExecutionMode,
              let condition = payload["condition"] as? [String: Any],
              let conditionId = condition["id"] as? String,
              HostBundleVerifier.isValidIdentifier(conditionId)
        else {
            throw HostError.storage("The participant checkpoint did not match the frozen release contract.")
        }

        if status == "withdrawn" || status == "refused" {
            payload["responses"] = [String: Any]()
            payload["audioResponses"] = [String: Any]()
            payload["videoResponses"] = [String: Any]()
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

        let inserted = try locked {
            try executeUnlocked("BEGIN IMMEDIATE")
            do {
                if status == "withdrawn" || status == "refused" {
                    try executePrepared(
                        "DELETE FROM checkpoints WHERE session_id = ?",
                        bindings: [.text(sessionId)]
                    )
                    _ = try executePrepared(
                        "DELETE FROM audio_uploads WHERE session_id = ?",
                        bindings: [.text(sessionId)]
                    )
                    _ = try executePrepared(
                        "DELETE FROM video_uploads WHERE session_id = ?",
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
        if status == "withdrawn" || status == "refused" {
            try removeMediaDirectory(for: sessionId)
        }
        return inserted
    }

    func saveAudio(
        _ data: Data,
        request: LocalAudioRequest,
        limit: HostAudioBlockLimit,
        releaseId: String,
        releaseChecksum: String,
        maximumChunkBytes: Int
    ) throws -> Bool {
        guard HostBundleVerifier.isValidIdentifier(request.sessionId),
              HostBundleVerifier.isValidIdentifier(request.blockId),
              HostBundleVerifier.isValidIdentifier(request.uploadId),
              request.blockId == limit.blockId,
              (0...10_000).contains(request.chunkIndex),
              (0...limit.maxBytes).contains(request.totalBytes),
              (0...(limit.maxDurationSeconds * 1_000 + 2_000)).contains(request.durationMilliseconds),
              maximumChunkBytes > 0,
              let normalizedMime = normalizedAudioMime(request.mimeType)
        else {
            throw HostError.storage("The local audio request did not match the frozen audio contract.")
        }
        guard let mediaURL else {
            throw HostError.storage("This imported study has no private local media directory.")
        }

        switch request.action {
        case .discard:
            guard data.isEmpty else {
                throw HostError.storage("An audio discard request must not contain media bytes.")
            }
            let removed = try locked {
                try executePrepared(
                    """
                    DELETE FROM audio_uploads
                    WHERE session_id = ? AND block_id = ? AND upload_id = ?
                    """,
                    bindings: [
                        .text(request.sessionId), .text(request.blockId), .text(request.uploadId),
                    ]
                ) > 0
            }
            try removeAudioUploadDirectory(
                sessionId: request.sessionId,
                blockId: request.blockId,
                uploadId: request.uploadId
            )
            return removed

        case .finalize:
            guard data.isEmpty else {
                throw HostError.storage("An audio finalize request must not contain media bytes.")
            }
            return try locked {
                guard try sessionStatus(request.sessionId) == "started",
                      let upload = try audioUploadSummary(
                        sessionId: request.sessionId,
                        blockId: request.blockId,
                        uploadId: request.uploadId
                      ),
                      upload.totalBytes == request.totalBytes,
                      upload.chunkCount == request.chunkIndex,
                      upload.chunkCount > 0,
                      upload.mimeType == normalizedMime
                else {
                    throw HostError.storage("The audio upload could not be finalized from its recorded chunks.")
                }
                if upload.status == "complete" {
                    return false
                }
                guard upload.status == "recording" else {
                    throw HostError.storage("The audio upload is not in a finalizable state.")
                }
                let finalURL = try assembleAudioRecording(
                    sessionId: request.sessionId,
                    blockId: request.blockId,
                    uploadId: request.uploadId,
                    chunkCount: upload.chunkCount,
                    totalBytes: upload.totalBytes,
                    mimeType: normalizedMime
                )
                do {
                    let updated = try executePrepared(
                        """
                        UPDATE audio_uploads
                        SET status = 'complete', duration_ms = ?, updated_at = ?
                        WHERE session_id = ? AND block_id = ? AND upload_id = ? AND status = 'recording'
                        """,
                        bindings: [
                            .integer(request.durationMilliseconds),
                            .text(ISO8601DateFormatter().string(from: Date())),
                            .text(request.sessionId), .text(request.blockId), .text(request.uploadId),
                        ]
                    ) > 0
                    if !updated { try? FileManager.default.removeItem(at: finalURL) }
                    return updated
                } catch {
                    try? FileManager.default.removeItem(at: finalURL)
                    throw error
                }
            }

        case .chunk:
            guard !data.isEmpty,
                  data.count <= maximumChunkBytes,
                  data.count <= limit.maxBytes
            else {
                throw HostError.storage("The local audio chunk exceeded its frozen size limit.")
            }
            let checksum = "sha256:" + SHA256.hash(data: data)
                .map { String(format: "%02x", $0) }
                .joined()
            let extensionName = audioExtension(for: normalizedMime)
            let relativePath = [
                request.sessionId,
                request.blockId,
                request.uploadId,
                String(format: "%06d.%@", request.chunkIndex, extensionName),
            ].joined(separator: "/")
            let fileURL = mediaURL.appendingPathComponent(relativePath)
            let now = ISO8601DateFormatter().string(from: Date())
            var wroteFile = false

            return try locked {
                guard try sessionStatus(request.sessionId) == "started" else {
                    throw HostError.storage("Audio can be attached only to an active local participant session.")
                }
                if let existing = try audioChunkChecksum(
                    sessionId: request.sessionId,
                    blockId: request.blockId,
                    uploadId: request.uploadId,
                    chunkIndex: request.chunkIndex
                ) {
                    guard existing == checksum else {
                        throw HostError.storage("An audio chunk index was reused with different bytes.")
                    }
                    return false
                }
                let summary = try audioUploadSummary(
                    sessionId: request.sessionId,
                    blockId: request.blockId,
                    uploadId: request.uploadId
                )
                guard summary?.status != "complete",
                      summary?.mimeType == nil || summary?.mimeType == normalizedMime
                else {
                    throw HostError.storage("A completed audio upload cannot accept more chunks.")
                }
                let previousBytes = summary?.totalBytes ?? 0
                guard previousBytes + data.count <= limit.maxBytes,
                      request.totalBytes == previousBytes + data.count,
                      request.chunkIndex == (summary?.chunkCount ?? 0)
                else {
                    throw HostError.storage("The audio response exceeded its frozen limit or arrived out of sequence.")
                }

                try FileManager.default.createDirectory(
                    at: fileURL.deletingLastPathComponent(),
                    withIntermediateDirectories: true
                )
                try StudyWorkspaceService.atomicWrite(data, to: fileURL)
                wroteFile = true
                do {
                    try executeUnlocked("BEGIN IMMEDIATE")
                    _ = try executePrepared(
                        """
                        INSERT OR IGNORE INTO audio_uploads
                          (session_id, block_id, upload_id, release_id, release_checksum,
                           mime_type, status, duration_ms, total_bytes, chunk_count, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'recording', 0, 0, 0, ?, ?)
                        """,
                        bindings: [
                            .text(request.sessionId), .text(request.blockId), .text(request.uploadId),
                            .text(releaseId), .text(releaseChecksum), .text(normalizedMime),
                            .text(now), .text(now),
                        ]
                    )
                    let inserted = try executePrepared(
                        """
                        INSERT INTO audio_chunks
                          (session_id, block_id, upload_id, chunk_index, relative_path,
                           mime_type, byte_count, checksum, recorded_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        bindings: [
                            .text(request.sessionId), .text(request.blockId), .text(request.uploadId),
                            .integer(request.chunkIndex), .text(relativePath), .text(normalizedMime),
                            .integer(data.count), .text(checksum), .text(now),
                        ]
                    )
                    _ = try executePrepared(
                        """
                        UPDATE audio_uploads
                        SET total_bytes = total_bytes + ?, chunk_count = chunk_count + 1, updated_at = ?
                        WHERE session_id = ? AND block_id = ? AND upload_id = ? AND status = 'recording'
                        """,
                        bindings: [
                            .integer(data.count), .text(now), .text(request.sessionId),
                            .text(request.blockId), .text(request.uploadId),
                        ]
                    )
                    try executeUnlocked("COMMIT")
                    return inserted > 0
                } catch {
                    try? executeUnlocked("ROLLBACK")
                    if wroteFile { try? FileManager.default.removeItem(at: fileURL) }
                    throw error
                }
            }
        }
    }

    func audioManifestJSON(executionMode: String? = nil) throws -> Data {
        let rows = try audioManifestRows(executionMode: executionMode)
        return try JSONSerialization.data(
            withJSONObject: [
                "exportedAt": ISO8601DateFormatter().string(from: Date()),
                "executionMode": executionMode ?? "all",
                "storageBoundary": "local-only",
                "containsRawVoice": !rows.isEmpty,
                "chunks": rows,
            ],
            options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        )
    }

    func audioManifestCSV(executionMode: String? = nil) throws -> Data {
        let fields = [
            "session_id", "block_id", "upload_id", "upload_status", "duration_ms",
            "recording_path", "chunk_index", "relative_path", "mime_type", "byte_count", "checksum",
        ]
        let rows = try audioManifestRows(executionMode: executionMode).map { row in
            [
                row["sessionId"], row["blockId"], row["uploadId"], row["uploadStatus"],
                row["durationMs"], row["recordingPath"], row["chunkIndex"],
                row["relativePath"], row["mimeType"],
                row["byteCount"], row["checksum"],
            ].map(csvString)
        }
        let csv = ([fields.map(csvCell).joined(separator: ",")]
            + rows.map { $0.map(csvCell).joined(separator: ",") })
            .joined(separator: "\r\n") + "\r\n"
        return Data(csv.utf8)
    }

    func saveVideo(
        _ data: Data,
        request: LocalVideoRequest,
        limit: HostVideoBlockLimit,
        releaseId: String,
        releaseChecksum: String,
        maximumChunkBytes: Int
    ) throws -> Bool {
        guard HostBundleVerifier.isValidIdentifier(request.sessionId),
              HostBundleVerifier.isValidIdentifier(request.blockId),
              HostBundleVerifier.isValidIdentifier(request.uploadId),
              request.blockId == limit.blockId,
              request.includeAudio == limit.includeAudio,
              (0...10_000).contains(request.chunkIndex),
              (0...limit.maxBytes).contains(request.totalBytes),
              (0...(limit.maxDurationSeconds * 1_000 + 2_000)).contains(request.durationMilliseconds),
              maximumChunkBytes > 0,
              let normalizedMime = normalizedVideoMime(request.mimeType)
        else {
            throw HostError.storage("The local video request did not match the frozen video contract.")
        }
        guard let mediaURL else {
            throw HostError.storage("This imported study has no private local media directory.")
        }

        switch request.action {
        case .discard:
            guard data.isEmpty else {
                throw HostError.storage("A video discard request must not contain media bytes.")
            }
            let removed = try locked {
                try executePrepared(
                    """
                    DELETE FROM video_uploads
                    WHERE session_id = ? AND block_id = ? AND upload_id = ?
                    """,
                    bindings: [
                        .text(request.sessionId), .text(request.blockId), .text(request.uploadId),
                    ]
                ) > 0
            }
            try removeMediaUploadDirectory(
                sessionId: request.sessionId,
                blockId: request.blockId,
                uploadId: request.uploadId
            )
            return removed

        case .finalize:
            guard data.isEmpty else {
                throw HostError.storage("A video finalize request must not contain media bytes.")
            }
            return try locked {
                guard try sessionStatus(request.sessionId) == "started",
                      let upload = try videoUploadSummary(
                        sessionId: request.sessionId,
                        blockId: request.blockId,
                        uploadId: request.uploadId
                      ),
                      upload.totalBytes == request.totalBytes,
                      upload.chunkCount == request.chunkIndex,
                      upload.chunkCount > 0,
                      upload.mimeType == normalizedMime,
                      upload.includeAudio == request.includeAudio
                else {
                    throw HostError.storage("The video upload could not be finalized from its recorded chunks.")
                }
                if upload.status == "complete" { return false }
                guard upload.status == "recording" else {
                    throw HostError.storage("The video upload is not in a finalizable state.")
                }
                let finalURL = try assembleVideoRecording(
                    sessionId: request.sessionId,
                    blockId: request.blockId,
                    uploadId: request.uploadId,
                    chunkCount: upload.chunkCount,
                    totalBytes: upload.totalBytes,
                    mimeType: normalizedMime
                )
                do {
                    let updated = try executePrepared(
                        """
                        UPDATE video_uploads
                        SET status = 'complete', duration_ms = ?, updated_at = ?
                        WHERE session_id = ? AND block_id = ? AND upload_id = ? AND status = 'recording'
                        """,
                        bindings: [
                            .integer(request.durationMilliseconds),
                            .text(ISO8601DateFormatter().string(from: Date())),
                            .text(request.sessionId), .text(request.blockId), .text(request.uploadId),
                        ]
                    ) > 0
                    if !updated { try? FileManager.default.removeItem(at: finalURL) }
                    return updated
                } catch {
                    try? FileManager.default.removeItem(at: finalURL)
                    throw error
                }
            }

        case .chunk:
            guard !data.isEmpty,
                  data.count <= maximumChunkBytes,
                  data.count <= limit.maxBytes
            else {
                throw HostError.storage("The local video chunk exceeded its frozen size limit.")
            }
            let checksum = "sha256:" + SHA256.hash(data: data)
                .map { String(format: "%02x", $0) }
                .joined()
            let extensionName = videoExtension(for: normalizedMime)
            let relativePath = [
                request.sessionId,
                request.blockId,
                request.uploadId,
                String(format: "%06d.%@", request.chunkIndex, extensionName),
            ].joined(separator: "/")
            let fileURL = mediaURL.appendingPathComponent(relativePath)
            let now = ISO8601DateFormatter().string(from: Date())
            var wroteFile = false

            return try locked {
                guard try sessionStatus(request.sessionId) == "started" else {
                    throw HostError.storage("Video can be attached only to an active local participant session.")
                }
                if let existing = try videoChunkChecksum(
                    sessionId: request.sessionId,
                    blockId: request.blockId,
                    uploadId: request.uploadId,
                    chunkIndex: request.chunkIndex
                ) {
                    guard existing == checksum else {
                        throw HostError.storage("A video chunk index was reused with different bytes.")
                    }
                    return false
                }
                let summary = try videoUploadSummary(
                    sessionId: request.sessionId,
                    blockId: request.blockId,
                    uploadId: request.uploadId
                )
                guard summary?.status != "complete",
                      summary?.mimeType == nil || summary?.mimeType == normalizedMime,
                      summary?.includeAudio == nil || summary?.includeAudio == request.includeAudio
                else {
                    throw HostError.storage("A completed video upload cannot accept more chunks.")
                }
                let previousBytes = summary?.totalBytes ?? 0
                guard previousBytes + data.count <= limit.maxBytes,
                      request.totalBytes == previousBytes + data.count,
                      request.chunkIndex == (summary?.chunkCount ?? 0)
                else {
                    throw HostError.storage("The video response exceeded its frozen limit or arrived out of sequence.")
                }

                try FileManager.default.createDirectory(
                    at: fileURL.deletingLastPathComponent(),
                    withIntermediateDirectories: true
                )
                try StudyWorkspaceService.atomicWrite(data, to: fileURL)
                wroteFile = true
                do {
                    try executeUnlocked("BEGIN IMMEDIATE")
                    _ = try executePrepared(
                        """
                        INSERT OR IGNORE INTO video_uploads
                          (session_id, block_id, upload_id, release_id, release_checksum,
                           mime_type, includes_audio, status, duration_ms, total_bytes,
                           chunk_count, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'recording', 0, 0, 0, ?, ?)
                        """,
                        bindings: [
                            .text(request.sessionId), .text(request.blockId), .text(request.uploadId),
                            .text(releaseId), .text(releaseChecksum), .text(normalizedMime),
                            .integer(request.includeAudio ? 1 : 0), .text(now), .text(now),
                        ]
                    )
                    let inserted = try executePrepared(
                        """
                        INSERT INTO video_chunks
                          (session_id, block_id, upload_id, chunk_index, relative_path,
                           mime_type, byte_count, checksum, recorded_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        bindings: [
                            .text(request.sessionId), .text(request.blockId), .text(request.uploadId),
                            .integer(request.chunkIndex), .text(relativePath), .text(normalizedMime),
                            .integer(data.count), .text(checksum), .text(now),
                        ]
                    )
                    _ = try executePrepared(
                        """
                        UPDATE video_uploads
                        SET total_bytes = total_bytes + ?, chunk_count = chunk_count + 1, updated_at = ?
                        WHERE session_id = ? AND block_id = ? AND upload_id = ? AND status = 'recording'
                        """,
                        bindings: [
                            .integer(data.count), .text(now), .text(request.sessionId),
                            .text(request.blockId), .text(request.uploadId),
                        ]
                    )
                    try executeUnlocked("COMMIT")
                    return inserted > 0
                } catch {
                    try? executeUnlocked("ROLLBACK")
                    if wroteFile { try? FileManager.default.removeItem(at: fileURL) }
                    throw error
                }
            }
        }
    }

    func videoManifestJSON(executionMode: String? = nil) throws -> Data {
        let rows = try videoManifestRows(executionMode: executionMode)
        return try JSONSerialization.data(
            withJSONObject: [
                "exportedAt": ISO8601DateFormatter().string(from: Date()),
                "executionMode": executionMode ?? "all",
                "storageBoundary": "local-only",
                "containsIdentifyingVideo": !rows.isEmpty,
                "chunks": rows,
            ],
            options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        )
    }

    func videoManifestCSV(executionMode: String? = nil) throws -> Data {
        let fields = [
            "session_id", "block_id", "upload_id", "upload_status", "duration_ms",
            "includes_audio", "recording_path", "chunk_index", "relative_path",
            "mime_type", "byte_count", "checksum",
        ]
        let rows = try videoManifestRows(executionMode: executionMode).map { row in
            [
                row["sessionId"], row["blockId"], row["uploadId"], row["uploadStatus"],
                row["durationMs"], row["includesAudio"], row["recordingPath"],
                row["chunkIndex"], row["relativePath"], row["mimeType"],
                row["byteCount"], row["checksum"],
            ].map(csvString)
        }
        let csv = ([fields.map(csvCell).joined(separator: ",")]
            + rows.map { $0.map(csvCell).joined(separator: ",") })
            .joined(separator: "\r\n") + "\r\n"
        return Data(csv.utf8)
    }

    func sessions(executionMode: String? = nil) throws -> [HostSession] {
        try locked {
            guard let handle else { return [] }
            var statement: OpaquePointer?
            let sql = executionMode == nil ? """
                SELECT session_id, status, execution_mode, condition_name, started_at, updated_at
                FROM sessions ORDER BY updated_at DESC
                """ : """
                SELECT session_id, status, execution_mode, condition_name, started_at, updated_at
                FROM sessions WHERE execution_mode = ? ORDER BY updated_at DESC
                """
            guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK,
                  let statement
            else { throw sqliteError() }
            defer { sqlite3_finalize(statement) }
            if let executionMode {
                guard ["pilot", "production"].contains(executionMode) else {
                    throw HostError.storage("The requested response mode is invalid.")
                }
                try bind([.text(executionMode)], to: statement)
            }
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

    func counts(executionMode: String? = nil) throws -> HostSessionCounts {
        let sessions = try sessions(executionMode: executionMode)
        return sessions.reduce(into: HostSessionCounts()) { counts, session in
            switch session.status {
            case "completed": counts.completed += 1
            case "refused": counts.refused += 1
            case "withdrawn": counts.withdrawn += 1
            default: counts.started += 1
            }
        }
    }

    func responseExportJSON(
        releaseId: String,
        releaseChecksum: String,
        executionMode: String? = nil
    ) throws -> Data {
        let payloads = try sessionPayloads(executionMode: executionMode)
        let export: [String: Any] = [
            "releaseId": releaseId,
            "releaseChecksum": releaseChecksum,
            "executionMode": executionMode ?? "all",
            "exportedAt": ISO8601DateFormatter().string(from: Date()),
            "sessions": payloads,
        ]
        return try JSONSerialization.data(
            withJSONObject: export,
            options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        )
    }

    func responseExportCSV(executionMode: String? = nil) throws -> Data {
        let payloads = try sessionPayloads(executionMode: executionMode)
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

    func trialExportCSV(executionMode: String? = nil) throws -> Data {
        let payloads = try sessionPayloads(executionMode: executionMode)
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

    func quickCheck() throws -> Bool {
        try locked {
            try queryText("PRAGMA quick_check(1)", bindings: []) == "ok"
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

    private func sessionPayloads(executionMode: String? = nil) throws -> [[String: Any]] {
        try locked {
            guard let handle else { return [] }
            var statement: OpaquePointer?
            let sql = executionMode == nil
                ? "SELECT payload_json FROM sessions ORDER BY started_at, session_id"
                : "SELECT payload_json FROM sessions WHERE execution_mode = ? ORDER BY started_at, session_id"
            guard sqlite3_prepare_v2(
                handle,
                sql,
                -1,
                &statement,
                nil
            ) == SQLITE_OK, let statement else { throw sqliteError() }
            defer { sqlite3_finalize(statement) }
            if let executionMode {
                guard ["pilot", "production"].contains(executionMode) else {
                    throw HostError.storage("The requested response mode is invalid.")
                }
                try bind([.text(executionMode)], to: statement)
            }
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

    private struct AudioUploadSummary {
        let status: String
        let mimeType: String
        let totalBytes: Int
        let chunkCount: Int
    }

    private struct VideoUploadSummary {
        let status: String
        let mimeType: String
        let includeAudio: Bool
        let totalBytes: Int
        let chunkCount: Int
    }

    private func sessionStatus(_ sessionId: String) throws -> String? {
        try queryText(
            "SELECT status FROM sessions WHERE session_id = ? LIMIT 1",
            bindings: [.text(sessionId)]
        )
    }

    private func audioUploadSummary(
        sessionId: String,
        blockId: String,
        uploadId: String
    ) throws -> AudioUploadSummary? {
        guard let handle else { throw HostError.storage("The local response database is closed.") }
        var statement: OpaquePointer?
        let sql = """
            SELECT status, mime_type, total_bytes, chunk_count
            FROM audio_uploads
            WHERE session_id = ? AND block_id = ? AND upload_id = ?
            LIMIT 1
            """
        guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK,
              let statement else { throw sqliteError() }
        defer { sqlite3_finalize(statement) }
        try bind(
            [.text(sessionId), .text(blockId), .text(uploadId)],
            to: statement
        )
        guard sqlite3_step(statement) == SQLITE_ROW else { return nil }
        return AudioUploadSummary(
            status: columnText(statement, 0),
            mimeType: columnText(statement, 1),
            totalBytes: Int(sqlite3_column_int64(statement, 2)),
            chunkCount: Int(sqlite3_column_int64(statement, 3))
        )
    }

    private func audioChunkChecksum(
        sessionId: String,
        blockId: String,
        uploadId: String,
        chunkIndex: Int
    ) throws -> String? {
        try queryText(
            """
            SELECT checksum FROM audio_chunks
            WHERE session_id = ? AND block_id = ? AND upload_id = ? AND chunk_index = ?
            LIMIT 1
            """,
            bindings: [
                .text(sessionId), .text(blockId), .text(uploadId), .integer(chunkIndex),
            ]
        )
    }

    private func videoUploadSummary(
        sessionId: String,
        blockId: String,
        uploadId: String
    ) throws -> VideoUploadSummary? {
        guard let handle else { throw HostError.storage("The local response database is closed.") }
        var statement: OpaquePointer?
        let sql = """
            SELECT status, mime_type, includes_audio, total_bytes, chunk_count
            FROM video_uploads
            WHERE session_id = ? AND block_id = ? AND upload_id = ?
            LIMIT 1
            """
        guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK,
              let statement else { throw sqliteError() }
        defer { sqlite3_finalize(statement) }
        try bind([.text(sessionId), .text(blockId), .text(uploadId)], to: statement)
        guard sqlite3_step(statement) == SQLITE_ROW else { return nil }
        return VideoUploadSummary(
            status: columnText(statement, 0),
            mimeType: columnText(statement, 1),
            includeAudio: sqlite3_column_int(statement, 2) == 1,
            totalBytes: Int(sqlite3_column_int64(statement, 3)),
            chunkCount: Int(sqlite3_column_int64(statement, 4))
        )
    }

    private func videoChunkChecksum(
        sessionId: String,
        blockId: String,
        uploadId: String,
        chunkIndex: Int
    ) throws -> String? {
        try queryText(
            """
            SELECT checksum FROM video_chunks
            WHERE session_id = ? AND block_id = ? AND upload_id = ? AND chunk_index = ?
            LIMIT 1
            """,
            bindings: [
                .text(sessionId), .text(blockId), .text(uploadId), .integer(chunkIndex),
            ]
        )
    }

    private func audioManifestRows(executionMode: String? = nil) throws -> [[String: Any]] {
        try locked {
            guard let handle else { return [] }
            var statement: OpaquePointer?
            let modeClause = executionMode == nil ? "" : "WHERE s.execution_mode = ?"
            let sql = """
                SELECT c.session_id, c.block_id, c.upload_id, u.status, u.duration_ms,
                       c.chunk_index, c.relative_path, c.mime_type, c.byte_count, c.checksum
                FROM audio_chunks c
                INNER JOIN audio_uploads u
                  ON u.session_id = c.session_id
                 AND u.block_id = c.block_id
                 AND u.upload_id = c.upload_id
                INNER JOIN sessions s ON s.session_id = c.session_id
                \(modeClause)
                ORDER BY c.session_id, c.block_id, c.upload_id, c.chunk_index
                """
            guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK,
                  let statement else { throw sqliteError() }
            defer { sqlite3_finalize(statement) }
            if let executionMode {
                guard ["pilot", "production"].contains(executionMode) else {
                    throw HostError.storage("The requested response mode is invalid.")
                }
                try bind([.text(executionMode)], to: statement)
            }
            var rows: [[String: Any]] = []
            while sqlite3_step(statement) == SQLITE_ROW {
                let sessionId = columnText(statement, 0)
                let blockId = columnText(statement, 1)
                let uploadId = columnText(statement, 2)
                let status = columnText(statement, 3)
                let mimeType = columnText(statement, 7)
                rows.append([
                    "sessionId": sessionId,
                    "blockId": blockId,
                    "uploadId": uploadId,
                    "uploadStatus": status,
                    "durationMs": Int(sqlite3_column_int64(statement, 4)),
                    "chunkIndex": Int(sqlite3_column_int64(statement, 5)),
                    "relativePath": columnText(statement, 6),
                    "recordingPath": status == "complete"
                        ? "\(sessionId)/\(blockId)/\(uploadId)/recording.\(audioExtension(for: mimeType))"
                        : "",
                    "mimeType": mimeType,
                    "byteCount": Int(sqlite3_column_int64(statement, 8)),
                    "checksum": columnText(statement, 9),
                ])
            }
            return rows
        }
    }

    private func videoManifestRows(executionMode: String? = nil) throws -> [[String: Any]] {
        try locked {
            guard let handle else { return [] }
            var statement: OpaquePointer?
            let modeClause = executionMode == nil ? "" : "WHERE s.execution_mode = ?"
            let sql = """
                SELECT c.session_id, c.block_id, c.upload_id, u.status, u.duration_ms,
                       u.includes_audio, c.chunk_index, c.relative_path, c.mime_type,
                       c.byte_count, c.checksum
                FROM video_chunks c
                INNER JOIN video_uploads u
                  ON u.session_id = c.session_id
                 AND u.block_id = c.block_id
                 AND u.upload_id = c.upload_id
                INNER JOIN sessions s ON s.session_id = c.session_id
                \(modeClause)
                ORDER BY c.session_id, c.block_id, c.upload_id, c.chunk_index
                """
            guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK,
                  let statement else { throw sqliteError() }
            defer { sqlite3_finalize(statement) }
            if let executionMode {
                guard ["pilot", "production"].contains(executionMode) else {
                    throw HostError.storage("The requested response mode is invalid.")
                }
                try bind([.text(executionMode)], to: statement)
            }
            var rows: [[String: Any]] = []
            while sqlite3_step(statement) == SQLITE_ROW {
                let sessionId = columnText(statement, 0)
                let blockId = columnText(statement, 1)
                let uploadId = columnText(statement, 2)
                let status = columnText(statement, 3)
                let mimeType = columnText(statement, 8)
                rows.append([
                    "sessionId": sessionId,
                    "blockId": blockId,
                    "uploadId": uploadId,
                    "uploadStatus": status,
                    "durationMs": Int(sqlite3_column_int64(statement, 4)),
                    "includesAudio": sqlite3_column_int(statement, 5) == 1,
                    "chunkIndex": Int(sqlite3_column_int64(statement, 6)),
                    "relativePath": columnText(statement, 7),
                    "recordingPath": status == "complete"
                        ? "\(sessionId)/\(blockId)/\(uploadId)/recording.\(videoExtension(for: mimeType))"
                        : "",
                    "mimeType": mimeType,
                    "byteCount": Int(sqlite3_column_int64(statement, 9)),
                    "checksum": columnText(statement, 10),
                ])
            }
            return rows
        }
    }

    private func queryText(_ sql: String, bindings: [SQLiteBinding]) throws -> String? {
        guard let handle else { throw HostError.storage("The local response database is closed.") }
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK,
              let statement else { throw sqliteError() }
        defer { sqlite3_finalize(statement) }
        try bind(bindings, to: statement)
        guard sqlite3_step(statement) == SQLITE_ROW else { return nil }
        return columnText(statement, 0)
    }

    private func normalizedAudioMime(_ value: String) -> String? {
        let normalized = value
            .lowercased()
            .split(separator: ";", maxSplits: 1)
            .first
            .map(String.init)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return ["audio/webm", "audio/mp4", "audio/ogg"].contains(normalized)
            ? normalized
            : nil
    }

    private func normalizedVideoMime(_ value: String) -> String? {
        let normalized = value
            .lowercased()
            .split(separator: ";", maxSplits: 1)
            .first
            .map(String.init)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return ["video/webm", "video/mp4"].contains(normalized) ? normalized : nil
    }

    private func audioExtension(for mimeType: String) -> String {
        switch mimeType {
        case "audio/mp4": "m4a"
        case "audio/ogg": "ogg"
        default: "webm"
        }
    }

    private func videoExtension(for mimeType: String) -> String {
        mimeType == "video/mp4" ? "mp4" : "webm"
    }

    private func assembleAudioRecording(
        sessionId: String,
        blockId: String,
        uploadId: String,
        chunkCount: Int,
        totalBytes: Int,
        mimeType: String
    ) throws -> URL {
        guard let mediaURL else {
            throw HostError.storage("This imported study has no private local media directory.")
        }
        let directory = mediaURL
            .appendingPathComponent(sessionId, isDirectory: true)
            .appendingPathComponent(blockId, isDirectory: true)
            .appendingPathComponent(uploadId, isDirectory: true)
        let extensionName = audioExtension(for: mimeType)
        var recording = Data()
        recording.reserveCapacity(totalBytes)
        for index in 0..<chunkCount {
            let chunkURL = directory.appendingPathComponent(
                String(format: "%06d.%@", index, extensionName)
            )
            guard FileManager.default.fileExists(atPath: chunkURL.path) else {
                throw HostError.storage("A recorded audio chunk is missing from local storage.")
            }
            recording.append(try Data(contentsOf: chunkURL, options: [.mappedIfSafe]))
        }
        guard recording.count == totalBytes else {
            throw HostError.storage("The assembled audio recording did not match its recorded byte count.")
        }
        let finalURL = directory.appendingPathComponent("recording.\(extensionName)")
        try StudyWorkspaceService.atomicWrite(recording, to: finalURL)
        return finalURL
    }

    private func assembleVideoRecording(
        sessionId: String,
        blockId: String,
        uploadId: String,
        chunkCount: Int,
        totalBytes: Int,
        mimeType: String
    ) throws -> URL {
        guard let mediaURL else {
            throw HostError.storage("This imported study has no private local media directory.")
        }
        let directory = mediaURL
            .appendingPathComponent(sessionId, isDirectory: true)
            .appendingPathComponent(blockId, isDirectory: true)
            .appendingPathComponent(uploadId, isDirectory: true)
        let extensionName = videoExtension(for: mimeType)
        var recording = Data()
        recording.reserveCapacity(totalBytes)
        for index in 0..<chunkCount {
            let chunkURL = directory.appendingPathComponent(
                String(format: "%06d.%@", index, extensionName)
            )
            guard FileManager.default.fileExists(atPath: chunkURL.path) else {
                throw HostError.storage("A recorded video chunk is missing from local storage.")
            }
            recording.append(try Data(contentsOf: chunkURL, options: [.mappedIfSafe]))
        }
        guard recording.count == totalBytes else {
            throw HostError.storage("The assembled video recording did not match its recorded byte count.")
        }
        let finalURL = directory.appendingPathComponent("recording.\(extensionName)")
        try StudyWorkspaceService.atomicWrite(recording, to: finalURL)
        return finalURL
    }

    private func removeMediaDirectory(for sessionId: String) throws {
        guard let mediaURL else { return }
        let directory = mediaURL.appendingPathComponent(sessionId, isDirectory: true)
        if FileManager.default.fileExists(atPath: directory.path) {
            try FileManager.default.removeItem(at: directory)
        }
    }

    private func removeAudioUploadDirectory(
        sessionId: String,
        blockId: String,
        uploadId: String
    ) throws {
        guard let mediaURL else { return }
        let directory = mediaURL
            .appendingPathComponent(sessionId, isDirectory: true)
            .appendingPathComponent(blockId, isDirectory: true)
            .appendingPathComponent(uploadId, isDirectory: true)
        if FileManager.default.fileExists(atPath: directory.path) {
            try FileManager.default.removeItem(at: directory)
        }
    }

    private func removeMediaUploadDirectory(
        sessionId: String,
        blockId: String,
        uploadId: String
    ) throws {
        try removeAudioUploadDirectory(
            sessionId: sessionId,
            blockId: blockId,
            uploadId: uploadId
        )
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
        try bind(bindings, to: statement)
        let step = sqlite3_step(statement)
        guard step == SQLITE_DONE || step == SQLITE_ROW else { throw sqliteError() }
        return Int(sqlite3_changes(handle))
    }

    private func bind(_ bindings: [SQLiteBinding], to statement: OpaquePointer) throws {
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
