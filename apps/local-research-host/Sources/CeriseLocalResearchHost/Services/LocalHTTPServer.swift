import Foundation
import Network

final class LocalHTTPServer: @unchecked Sendable {
    typealias ReadyHandler = @Sendable (Result<URL, Error>) -> Void
    typealias CheckpointHandler = @Sendable () -> Void

    private let queue = DispatchQueue(label: "com.cerisescholar.local-host.http")
    private var listener: NWListener?
    private var connections: [ObjectIdentifier: NWConnection] = [:]
    private var runnerHTML = ""
    private var runnerNonce = ""
    private var database: LocalResponseDatabase?
    private var releaseId = ""
    private var releaseNumber = 0
    private var releaseChecksum = ""
    private var audioLimits: [String: HostAudioBlockLimit] = [:]
    private var audioMaxChunkBytes = 0
    private var videoLimits: [String: HostVideoBlockLimit] = [:]
    private var videoMaxChunkBytes = 0
    private var mode: HostExecutionMode = .sameComputer
    private var paused = false
    private var participantURL: URL?
    private var checkpointHandler: CheckpointHandler?

    func start(
        mode: HostExecutionMode,
        runnerHTML: String,
        runnerNonce: String,
        database: LocalResponseDatabase,
        releaseId: String,
        releaseNumber: Int,
        releaseChecksum: String,
        audioLimits: [String: HostAudioBlockLimit],
        audioMaxChunkBytes: Int,
        videoLimits: [String: HostVideoBlockLimit],
        videoMaxChunkBytes: Int,
        onCheckpoint: @escaping CheckpointHandler,
        completion: @escaping ReadyHandler
    ) {
        stop()
        queue.async {
            self.mode = mode
            self.runnerHTML = runnerHTML
            self.runnerNonce = runnerNonce
            self.database = database
            self.releaseId = releaseId
            self.releaseNumber = releaseNumber
            self.releaseChecksum = releaseChecksum
            self.audioLimits = audioLimits
            self.audioMaxChunkBytes = audioMaxChunkBytes
            self.videoLimits = videoLimits
            self.videoMaxChunkBytes = videoMaxChunkBytes
            self.paused = false
            self.checkpointHandler = onCheckpoint

            do {
                let parameters = NWParameters.tcp
                parameters.allowLocalEndpointReuse = true
                if mode == .sameComputer {
                    parameters.requiredLocalEndpoint = .hostPort(
                        host: NWEndpoint.Host("127.0.0.1"),
                        port: .any
                    )
                }
                let listener = try NWListener(using: parameters, on: .any)
                self.listener = listener
                listener.newConnectionHandler = { [weak self] connection in
                    self?.accept(connection)
                }
                listener.stateUpdateHandler = { [weak self] state in
                    guard let self else { return }
                    switch state {
                    case .ready:
                        guard let port = listener.port else {
                            completion(.failure(HostError.server("The Local Host did not receive a port.")))
                            return
                        }
                        let host = mode == .sameComputer
                            ? "127.0.0.1"
                            : (LocalNetworkAddress.primaryIPv4() ?? "127.0.0.1")
                        guard let url = URL(string: "http://\(host):\(port.rawValue)/") else {
                            completion(.failure(HostError.server("The participant URL could not be created.")))
                            return
                        }
                        self.participantURL = url
                        completion(.success(url))
                    case .failed(let error):
                        completion(.failure(HostError.server("The Local Host could not start: \(error.localizedDescription)")))
                        self.stopUnlocked()
                    default:
                        break
                    }
                }
                listener.start(queue: self.queue)
            } catch {
                completion(.failure(HostError.server("The Local Host could not start: \(error.localizedDescription)")))
            }
        }
    }

    func setPaused(_ paused: Bool) {
        queue.async {
            self.paused = paused
        }
    }

    func stop() {
        queue.sync {
            stopUnlocked()
        }
    }

    private func stopUnlocked() {
        listener?.cancel()
        listener = nil
        for connection in connections.values {
            connection.cancel()
        }
        connections.removeAll()
        participantURL = nil
        paused = false
    }

    private func accept(_ connection: NWConnection) {
        guard connections.count < 64 else {
            connection.cancel()
            return
        }
        let identifier = ObjectIdentifier(connection)
        connections[identifier] = connection
        connection.stateUpdateHandler = { [weak self, weak connection] state in
            guard let self, let connection else { return }
            if case .failed = state {
                self.remove(connection)
            } else if case .cancelled = state {
                self.remove(connection)
            }
        }
        connection.start(queue: queue)
        queue.asyncAfter(deadline: .now() + 15) { [weak self, weak connection] in
            guard let self, let connection,
                  self.connections[ObjectIdentifier(connection)] != nil
            else { return }
            self.remove(connection)
        }
        receive(from: connection, buffer: Data())
    }

    private func receive(from connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) {
            [weak self, weak connection] content, _, isComplete, error in
            guard let self, let connection else { return }
            var next = buffer
            if let content { next.append(content) }
            if next.count > HTTPRequest.maximumRequestBytes {
                self.send(.text(413, "Request too large"), to: connection)
                return
            }
            switch HTTPRequest.parse(next) {
            case .complete(let request):
                self.handle(request, connection: connection)
            case .invalid:
                self.send(.text(400, "Bad request"), to: connection)
            case .incomplete:
                if isComplete || error != nil {
                    self.remove(connection)
                } else {
                    self.receive(from: connection, buffer: next)
                }
            }
        }
    }

    private func handle(_ request: HTTPRequest, connection: NWConnection) {
        let path = request.path.split(separator: "?", maxSplits: 1).first.map(String.init) ?? request.path
        if request.method == "GET", path == "/favicon.ico" {
            send(.empty(204), to: connection)
            return
        }
        if request.method == "GET", path == "/" {
            guard !paused else {
                send(.text(503, "This local study is temporarily paused."), to: connection)
                return
            }
            send(
                .html(
                    200,
                    runnerHTML,
                    nonce: runnerNonce,
                    mediaEnabled: mode == .sameComputer && !videoLimits.isEmpty
                ),
                to: connection
            )
            return
        }
        if request.method == "POST", path == "/api/checkpoints" {
            guard !paused else {
                send(.json(503, ["saved": false, "error": "paused"]), to: connection)
                return
            }
            guard request.headers["content-type"]?.lowercased().hasPrefix("application/json") == true else {
                send(.json(415, ["saved": false, "error": "content-type"]), to: connection)
                return
            }
            guard originIsAllowed(request) else {
                send(.json(403, ["saved": false, "error": "origin"]), to: connection)
                return
            }
            do {
                let inserted = try database?.saveCheckpoint(
                    request.body,
                    releaseId: releaseId,
                    releaseNumber: releaseNumber,
                    releaseChecksum: releaseChecksum
                ) ?? false
                checkpointHandler?()
                send(.json(200, ["saved": true, "duplicate": !inserted]), to: connection)
            } catch {
                send(.json(400, ["saved": false, "error": "invalid-checkpoint"]), to: connection)
            }
            return
        }
        if request.method == "POST", path == "/api/audio" {
            guard !paused else {
                send(.json(503, ["saved": false, "error": "paused"]), to: connection)
                return
            }
            guard mode == .sameComputer, !audioLimits.isEmpty else {
                send(.json(403, ["saved": false, "error": "audio-boundary"]), to: connection)
                return
            }
            guard originIsAllowed(request),
                  let actionValue = request.headers["x-cerise-audio-action"],
                  let action = LocalAudioRequest.Action(rawValue: actionValue),
                  let sessionId = request.headers["x-cerise-session-id"],
                  let blockId = request.headers["x-cerise-block-id"],
                  let uploadId = request.headers["x-cerise-upload-id"],
                  let chunkIndex = strictInteger(request.headers["x-cerise-chunk-index"]),
                  let totalBytes = strictInteger(request.headers["x-cerise-total-bytes"]),
                  let durationMilliseconds = strictInteger(request.headers["x-cerise-duration-ms"]),
                  let mimeType = request.headers["x-cerise-audio-mime"],
                  let limit = audioLimits[blockId],
                  request.body.count <= audioMaxChunkBytes
            else {
                send(.json(400, ["saved": false, "error": "invalid-audio-metadata"]), to: connection)
                return
            }
            let contentType = request.headers["content-type"]?
                .lowercased()
                .split(separator: ";", maxSplits: 1)
                .first
                .map(String.init) ?? ""
            let contentTypeAllowed = action == .chunk
                ? ["audio/webm", "audio/mp4", "audio/ogg"].contains(contentType)
                : contentType == "application/octet-stream"
            guard contentTypeAllowed else {
                send(.json(415, ["saved": false, "error": "audio-content-type"]), to: connection)
                return
            }
            do {
                let inserted = try database?.saveAudio(
                    request.body,
                    request: LocalAudioRequest(
                        action: action,
                        sessionId: sessionId,
                        blockId: blockId,
                        uploadId: uploadId,
                        chunkIndex: chunkIndex,
                        totalBytes: totalBytes,
                        durationMilliseconds: durationMilliseconds,
                        mimeType: mimeType
                    ),
                    limit: limit,
                    releaseId: releaseId,
                    releaseChecksum: releaseChecksum,
                    maximumChunkBytes: audioMaxChunkBytes
                ) ?? false
                checkpointHandler?()
                send(.json(200, ["saved": true, "duplicate": !inserted]), to: connection)
            } catch {
                send(.json(400, ["saved": false, "error": "invalid-audio"]), to: connection)
            }
            return
        }
        if request.method == "POST", path == "/api/video" {
            guard !paused else {
                send(.json(503, ["saved": false, "error": "paused"]), to: connection)
                return
            }
            guard mode == .sameComputer, !videoLimits.isEmpty else {
                send(.json(403, ["saved": false, "error": "video-boundary"]), to: connection)
                return
            }
            guard originIsAllowed(request),
                  let actionValue = request.headers["x-cerise-video-action"],
                  let action = LocalVideoRequest.Action(rawValue: actionValue),
                  let sessionId = request.headers["x-cerise-session-id"],
                  let blockId = request.headers["x-cerise-block-id"],
                  let uploadId = request.headers["x-cerise-upload-id"],
                  let chunkIndex = strictInteger(request.headers["x-cerise-chunk-index"]),
                  let totalBytes = strictInteger(request.headers["x-cerise-total-bytes"]),
                  let durationMilliseconds = strictInteger(request.headers["x-cerise-duration-ms"]),
                  let mimeType = request.headers["x-cerise-video-mime"],
                  let includeAudio = strictBoolean(
                    request.headers["x-cerise-video-includes-audio"]
                  ),
                  let limit = videoLimits[blockId],
                  request.body.count <= videoMaxChunkBytes
            else {
                send(.json(400, ["saved": false, "error": "invalid-video-metadata"]), to: connection)
                return
            }
            let contentType = request.headers["content-type"]?
                .lowercased()
                .split(separator: ";", maxSplits: 1)
                .first
                .map(String.init) ?? ""
            let contentTypeAllowed = action == .chunk
                ? ["video/webm", "video/mp4"].contains(contentType)
                : contentType == "application/octet-stream"
            guard contentTypeAllowed else {
                send(.json(415, ["saved": false, "error": "video-content-type"]), to: connection)
                return
            }
            do {
                let inserted = try database?.saveVideo(
                    request.body,
                    request: LocalVideoRequest(
                        action: action,
                        sessionId: sessionId,
                        blockId: blockId,
                        uploadId: uploadId,
                        chunkIndex: chunkIndex,
                        totalBytes: totalBytes,
                        durationMilliseconds: durationMilliseconds,
                        mimeType: mimeType,
                        includeAudio: includeAudio
                    ),
                    limit: limit,
                    releaseId: releaseId,
                    releaseChecksum: releaseChecksum,
                    maximumChunkBytes: videoMaxChunkBytes
                ) ?? false
                checkpointHandler?()
                send(.json(200, ["saved": true, "duplicate": !inserted]), to: connection)
            } catch {
                send(.json(400, ["saved": false, "error": "invalid-video"]), to: connection)
            }
            return
        }
        send(.text(404, "Not found"), to: connection)
    }

    private func originIsAllowed(_ request: HTTPRequest) -> Bool {
        guard let origin = request.headers["origin"],
              let host = request.headers["host"],
              !host.contains("/"),
              !host.contains("\\"),
              origin == "http://\(host)",
              let participantURL,
              let port = participantURL.port
        else { return false }
        let allowedHosts: Set<String>
        switch mode {
        case .sameComputer:
            allowedHosts = ["127.0.0.1:\(port)", "localhost:\(port)"]
        case .trustedLAN:
            let networkHost = participantURL.host ?? ""
            allowedHosts = ["\(networkHost):\(port)", "127.0.0.1:\(port)", "localhost:\(port)"]
        }
        return allowedHosts.contains(host.lowercased())
    }

    private func send(_ response: HTTPResponse, to connection: NWConnection) {
        let body = response.body
        var headers = [
            "HTTP/1.1 \(response.status) \(HTTPResponse.reason(response.status))",
            "Content-Length: \(body.count)",
            "Content-Type: \(response.contentType)",
            "Cache-Control: no-store",
            "Connection: close",
            "X-Content-Type-Options: nosniff",
            "X-Frame-Options: DENY",
            "Cross-Origin-Opener-Policy: same-origin",
            "Cross-Origin-Resource-Policy: same-origin",
            "Referrer-Policy: no-referrer",
            "Permissions-Policy: camera=\(videoLimits.isEmpty || mode != .sameComputer ? "()" : "(self)"), microphone=\((audioLimits.isEmpty && !videoLimits.values.contains(where: \.includeAudio)) || mode != .sameComputer ? "()" : "(self)"), geolocation=()",
        ]
        headers.append(contentsOf: response.headers.map { "\($0.key): \($0.value)" })
        let head = headers.joined(separator: "\r\n") + "\r\n\r\n"
        var data = Data(head.utf8)
        data.append(body)
        connection.send(content: data, completion: .contentProcessed { [weak self, weak connection] _ in
            guard let self, let connection else { return }
            self.remove(connection)
        })
    }

    private func remove(_ connection: NWConnection) {
        connection.cancel()
        connections.removeValue(forKey: ObjectIdentifier(connection))
    }

    private func strictInteger(_ value: String?) -> Int? {
        guard let value,
              !value.isEmpty,
              value.count <= 20,
              value.allSatisfy(\.isNumber),
              let parsed = Int(value)
        else { return nil }
        return parsed
    }

    private func strictBoolean(_ value: String?) -> Bool? {
        switch value {
        case "true": true
        case "false": false
        default: nil
        }
    }
}

private struct HTTPRequest {
    static let maximumRequestBytes = 4 * 1024 * 1024 + 64 * 1024

    enum ParseResult {
        case incomplete
        case invalid
        case complete(HTTPRequest)
    }

    let method: String
    let path: String
    let headers: [String: String]
    let body: Data

    static func parse(_ data: Data) -> ParseResult {
        guard let headerRange = data.range(of: Data("\r\n\r\n".utf8)) else {
            return data.count > 64 * 1024 ? .invalid : .incomplete
        }
        let headData = data[..<headerRange.lowerBound]
        guard let head = String(data: headData, encoding: .utf8) else { return .invalid }
        let lines = head.components(separatedBy: "\r\n")
        guard let requestLine = lines.first else { return .invalid }
        let parts = requestLine.split(separator: " ", omittingEmptySubsequences: true)
        guard parts.count == 3,
              ["GET", "POST"].contains(String(parts[0])),
              parts[1].first == "/",
              parts[2] == "HTTP/1.1"
        else { return .invalid }
        var headers: [String: String] = [:]
        for line in lines.dropFirst() {
            guard let separator = line.firstIndex(of: ":") else { return .invalid }
            let name = line[..<separator].trimmingCharacters(in: .whitespaces).lowercased()
            let value = line[line.index(after: separator)...].trimmingCharacters(in: .whitespaces)
            guard !name.isEmpty, headers[name] == nil else { return .invalid }
            headers[name] = value
        }
        if headers["transfer-encoding"] != nil { return .invalid }
        let contentLength: Int
        if let rawLength = headers["content-length"] {
            guard let parsed = Int(rawLength), parsed >= 0, parsed <= 4 * 1024 * 1024 else {
                return .invalid
            }
            contentLength = parsed
        } else {
            contentLength = 0
        }
        let bodyStart = headerRange.upperBound
        let available = data.distance(from: bodyStart, to: data.endIndex)
        guard available >= contentLength else { return .incomplete }
        guard available == contentLength else { return .invalid }
        return .complete(HTTPRequest(
            method: String(parts[0]),
            path: String(parts[1]),
            headers: headers,
            body: Data(data[bodyStart..<data.endIndex])
        ))
    }
}

private struct HTTPResponse {
    let status: Int
    let contentType: String
    let body: Data
    var headers: [String: String] = [:]

    static func empty(_ status: Int) -> HTTPResponse {
        HTTPResponse(status: status, contentType: "text/plain;charset=utf-8", body: Data())
    }

    static func text(_ status: Int, _ value: String) -> HTTPResponse {
        HTTPResponse(status: status, contentType: "text/plain;charset=utf-8", body: Data(value.utf8))
    }

    static func html(
        _ status: Int,
        _ value: String,
        nonce: String,
        mediaEnabled: Bool
    ) -> HTTPResponse {
        let policy = [
            "default-src 'none'",
            "script-src 'nonce-\(nonce)'",
            "style-src 'nonce-\(nonce)'",
            "img-src data: blob:",
            "connect-src 'self'",
            "font-src 'none'",
            mediaEnabled ? "media-src blob:" : "media-src 'none'",
            "worker-src 'none'",
            "object-src 'none'",
            "base-uri 'none'",
            "form-action 'none'",
            "frame-ancestors 'none'",
        ].joined(separator: "; ")
        return HTTPResponse(
            status: status,
            contentType: "text/html;charset=utf-8",
            body: Data(value.utf8),
            headers: ["Content-Security-Policy": policy]
        )
    }

    static func json(_ status: Int, _ value: [String: Any]) -> HTTPResponse {
        let data = (try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])) ?? Data("{}".utf8)
        return HTTPResponse(status: status, contentType: "application/json;charset=utf-8", body: data)
    }

    static func reason(_ status: Int) -> String {
        switch status {
        case 200: "OK"
        case 204: "No Content"
        case 400: "Bad Request"
        case 403: "Forbidden"
        case 404: "Not Found"
        case 413: "Payload Too Large"
        case 415: "Unsupported Media Type"
        case 503: "Service Unavailable"
        default: "Error"
        }
    }
}

private enum LocalNetworkAddress {
    static func primaryIPv4() -> String? {
        var pointer: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&pointer) == 0, let first = pointer else { return nil }
        defer { freeifaddrs(pointer) }
        var candidates: [(String, String)] = []
        var current: UnsafeMutablePointer<ifaddrs>? = first
        while let interface = current {
            defer { current = interface.pointee.ifa_next }
            guard let address = interface.pointee.ifa_addr,
                  address.pointee.sa_family == UInt8(AF_INET),
                  (interface.pointee.ifa_flags & UInt32(IFF_LOOPBACK)) == 0
            else { continue }
            let name = String(cString: interface.pointee.ifa_name)
            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            let length = socklen_t(address.pointee.sa_len)
            guard getnameinfo(
                address,
                length,
                &host,
                socklen_t(host.count),
                nil,
                0,
                NI_NUMERICHOST
            ) == 0 else { continue }
            candidates.append((name, String(cString: host)))
        }
        return candidates.first(where: { $0.0 == "en0" })?.1 ?? candidates.first?.1
    }
}
