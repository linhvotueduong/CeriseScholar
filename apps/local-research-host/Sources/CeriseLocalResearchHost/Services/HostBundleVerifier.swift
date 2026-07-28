import CryptoKit
import Foundation

enum HostBundleVerifier {
    static let maximumBundleBytes = 8 * 1024 * 1024

    static func verify(data: Data) throws -> VerifiedHostBundle {
        guard data.count <= maximumBundleBytes else {
            throw HostError.invalidBundle("The selected file is larger than the 8 MB Local Host safety limit.")
        }
        let object: Any
        do {
            object = try JSONSerialization.jsonObject(with: data)
        } catch {
            throw HostError.invalidBundle("The selected file is not valid JSON.")
        }
        guard let root = object as? [String: Any] else {
            throw HostError.invalidBundle("The Local Host bundle must contain one JSON object.")
        }
        guard root["bundleFormat"] as? String == "cerise-local-research-host",
              number(root["bundleVersion"]) == 1,
              root["participantResponsesIncluded"] as? Bool == false,
              let createdAtText = root["createdAt"] as? String,
              createdAtText.utf8.count <= 40,
              let createdAt = parseISO8601Date(createdAtText),
              let bundleChecksum = root["bundleChecksum"] as? String,
              isValidChecksum(bundleChecksum),
              let executionMode = root["executionMode"] as? String,
              ["pilot", "production"].contains(executionMode),
              let runner = root["runner"] as? [String: Any],
              number(runner["packageVersion"]) == 4,
              runner["checkpointEndpoint"] as? String == "/api/checkpoints",
              let runnerHTML = runner["html"] as? String,
              !runnerHTML.isEmpty,
              runnerHTML.utf8.count <= maximumBundleBytes,
              let dataPolicy = root["dataPolicy"] as? [String: Any],
              dataPolicy["participantResponses"] as? String == "local-only",
              dataPolicy["localDatabase"] as? String == "sqlite",
              dataPolicy["cloudUpload"] as? Bool == false,
              dataPolicy["mediaDirectoryPrepared"] as? Bool == true,
              let release = root["release"] as? [String: Any],
              let releaseId = release["releaseId"] as? String,
              isValidIdentifier(releaseId),
              let projectId = release["projectId"] as? String,
              isValidIdentifier(projectId),
              let releaseNumber = number(release["releaseNumber"]),
              releaseNumber > 0,
              let releaseChecksum = release["checksum"] as? String,
              isValidChecksum(releaseChecksum),
              let studio = release["studio"] as? [String: Any],
              let title = studio["title"] as? String,
              !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              title.count <= 200,
              let codebook = root["codebook"] as? [String: Any],
              codebook["releaseId"] as? String == releaseId,
              number(codebook["releaseNumber"]) == releaseNumber,
              codebook["releaseChecksum"] as? String == releaseChecksum,
              codebook["timingClaim"] as? String == "browser-measured"
        else {
            throw HostError.invalidBundle("The Local Host bundle is incomplete or uses an unsupported format.")
        }

        guard runnerHTML.contains("connect-src 'self'"),
              runnerHTML.contains(releaseChecksum),
              runnerHTML.contains("/api/checkpoints"),
              let runnerNonce = runnerNonce(in: runnerHTML),
              runnerHTML.contains("script-src 'nonce-\(runnerNonce)'"),
              runnerHTML.contains("style-src 'nonce-\(runnerNonce)'"),
              runnerHTML.contains("<style nonce=\"\(runnerNonce)\">"),
              runnerHTML.contains("<script nonce=\"\(runnerNonce)\">")
        else {
            throw HostError.invalidBundle("The participant runner is not bound to this release and local checkpoint endpoint.")
        }

        var releasePayload = release
        releasePayload.removeValue(forKey: "checksum")
        guard checksum(for: releasePayload) == releaseChecksum else {
            throw HostError.invalidBundle("The frozen experiment release was altered after it was created.")
        }

        var bundlePayload = root
        bundlePayload.removeValue(forKey: "bundleChecksum")
        guard checksum(for: bundlePayload) == bundleChecksum else {
            throw HostError.invalidBundle("The Local Host bundle failed its integrity check.")
        }

        let releaseData = try JSONSerialization.data(
            withJSONObject: release,
            options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        )
        let codebookData = try JSONSerialization.data(
            withJSONObject: codebook,
            options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        )
        return VerifiedHostBundle(
            id: releaseId,
            projectId: projectId,
            releaseNumber: releaseNumber,
            releaseChecksum: releaseChecksum,
            bundleChecksum: bundleChecksum,
            title: title,
            createdAt: createdAt,
            authoringMode: executionMode,
            runnerNonce: runnerNonce,
            runnerHTML: runnerHTML,
            releaseJSON: releaseData,
            codebookJSON: codebookData,
            originalBundle: data
        )
    }

    static func checksum(for value: Any) -> String? {
        guard JSONSerialization.isValidJSONObject(value),
              let data = try? JSONSerialization.data(
                withJSONObject: value,
                options: [.sortedKeys, .withoutEscapingSlashes]
              )
        else { return nil }
        let digest = SHA256.hash(data: data)
        return "sha256:" + digest.map { String(format: "%02x", $0) }.joined()
    }

    private static func number(_ value: Any?) -> Int? {
        guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() else {
            return nil
        }
        let integer = number.intValue
        return number.doubleValue == Double(integer) ? integer : nil
    }

    private static func isValidChecksum(_ value: String) -> Bool {
        guard value.hasPrefix("sha256:"), value.count == 71 else { return false }
        return value.dropFirst(7).allSatisfy { character in
            character.isNumber || ("a"..."f").contains(String(character))
        }
    }

    static func isValidIdentifier(_ value: String) -> Bool {
        guard (1...100).contains(value.utf8.count) else { return false }
        return value.unicodeScalars.allSatisfy { scalar in
            CharacterSet.alphanumerics.contains(scalar) || scalar == "_" || scalar == "-"
        }
    }

    private static func parseISO8601Date(_ value: String) -> Date? {
        if let date = ISO8601DateFormatter().date(from: value) {
            return date
        }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: value)
    }

    private static func runnerNonce(in html: String) -> String? {
        let pattern = #"<script id="study-spec" nonce="([A-Za-z0-9_-]{16,64})" type="application/json">"#
        guard let expression = try? NSRegularExpression(pattern: pattern),
              let match = expression.firstMatch(
                in: html,
                range: NSRange(html.startIndex..., in: html)
              ),
              let range = Range(match.range(at: 1), in: html)
        else { return nil }
        return String(html[range])
    }
}
