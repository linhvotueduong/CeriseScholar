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
              let bundleVersion = number(root["bundleVersion"]),
              [1, 2, 3, 4, 5].contains(bundleVersion),
              root["participantResponsesIncluded"] as? Bool == false,
              let createdAtText = root["createdAt"] as? String,
              createdAtText.utf8.count <= 40,
              let createdAt = parseISO8601Date(createdAtText),
              let bundleChecksum = root["bundleChecksum"] as? String,
              isValidChecksum(bundleChecksum),
              let executionMode = root["executionMode"] as? String,
              ["pilot", "production"].contains(executionMode),
              let runner = root["runner"] as? [String: Any],
              let runnerVersion = number(runner["packageVersion"]),
              (bundleVersion == 1
                ? runnerVersion == 4
                : bundleVersion == 2
                    ? runnerVersion == 5
                    : runnerVersion == 6),
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
              let blocks = studio["blocks"] as? [[String: Any]],
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
        let manifest = release["manifest"] as? [String: Any] ?? [:]
        if bundleVersion == 4 {
            guard dataPolicy["pilotDataIsolation"] as? String == "separate-mode-exports",
                  dataPolicy["productionLaunchGate"] as? String == "local-preflight-and-rehearsal"
            else {
                throw HostError.invalidBundle("The Local Host launch-readiness policy is missing or unsupported.")
            }
        }
        if bundleVersion >= 5 {
            guard dataPolicy["pilotDataIsolation"] as? String == "separate-mode-exports",
                  dataPolicy["productionLaunchGate"] as? String == "local-preflight-and-rehearsal"
            else {
                throw HostError.invalidBundle("The Local Host launch-readiness policy is missing or unsupported.")
            }
        }

        let audioBlockCount = blocks.filter { $0["type"] as? String == "audio-response" }.count
        let containsAudioResponses = audioBlockCount > 0
        let audioMaxChunkBytes: Int
        var audioLimits: [String: HostAudioBlockLimit] = [:]
        if bundleVersion >= 2 {
            guard dataPolicy["audioResponses"] as? String == "local-only",
                  dataPolicy["audioExecutionBoundary"] as? String == "localhost-only",
                  number(dataPolicy["audioMaxChunkBytes"]) == 1_048_576,
                  number(manifest["audioResponseCount"]) == audioBlockCount,
                  let containsSensitiveMedia = manifest["containsSensitiveMedia"] as? Bool,
                  (containsAudioResponses
                    ? manifest["audioCaptureBoundary"] as? String == "localhost-only"
                    : manifest["audioCaptureBoundary"] is NSNull),
                  let audioCodebook = codebook["audioResponses"] as? [[String: Any]],
                  audioCodebook.count == audioBlockCount
            else {
                throw HostError.invalidBundle("The Local Host audio policy does not match the frozen release.")
            }
            if bundleVersion == 2 && containsSensitiveMedia != containsAudioResponses {
                throw HostError.invalidBundle("The Local Host audio policy does not match the frozen release.")
            }
            for item in audioCodebook {
                guard let blockId = item["blockId"] as? String,
                      isValidIdentifier(blockId),
                      let maxDurationSeconds = number(item["maxDurationSeconds"]),
                      (5...300).contains(maxDurationSeconds),
                      let maxBytes = number(item["maxBytes"]),
                      (256 * 1_024...25 * 1_024 * 1_024).contains(maxBytes),
                      audioLimits[blockId] == nil
                else {
                    throw HostError.invalidBundle("An audio-response limit in the codebook is invalid.")
                }
                audioLimits[blockId] = HostAudioBlockLimit(
                    blockId: blockId,
                    maxDurationSeconds: maxDurationSeconds,
                    maxBytes: maxBytes
                )
            }
            let frozenAudioIds = Set(blocks.compactMap { block -> String? in
                guard block["type"] as? String == "audio-response" else { return nil }
                return block["id"] as? String
            })
            guard Set(audioLimits.keys) == frozenAudioIds else {
                throw HostError.invalidBundle("The audio codebook does not match the frozen audio blocks.")
            }
            let endpoint = runner["audioEndpoint"]
            guard containsAudioResponses
                ? (endpoint as? String == "/api/audio")
                : (endpoint is NSNull)
            else {
                throw HostError.invalidBundle("The audio endpoint does not match the frozen release.")
            }
            audioMaxChunkBytes = 1_048_576
        } else {
            guard !containsAudioResponses else {
                throw HostError.invalidBundle("Audio responses require a version 2 Local Host bundle.")
            }
            audioMaxChunkBytes = 0
        }

        let videoBlockCount = blocks.filter { $0["type"] as? String == "video-response" }.count
        let containsVideoResponses = videoBlockCount > 0
        let videoMaxChunkBytes: Int
        var videoLimits: [String: HostVideoBlockLimit] = [:]
        if bundleVersion >= 3 {
            guard dataPolicy["videoResponses"] as? String == "local-only",
                  dataPolicy["videoExecutionBoundary"] as? String == "localhost-only",
                  number(dataPolicy["videoMaxChunkBytes"]) == 2_097_152,
                  number(manifest["videoResponseCount"]) == videoBlockCount,
                  manifest["containsSensitiveMedia"] as? Bool == (containsAudioResponses || containsVideoResponses),
                  (containsVideoResponses
                    ? manifest["videoCaptureBoundary"] as? String == "localhost-only"
                    : manifest["videoCaptureBoundary"] is NSNull),
                  let videoCodebook = codebook["videoResponses"] as? [[String: Any]],
                  videoCodebook.count == videoBlockCount
            else {
                throw HostError.invalidBundle("The Local Host video policy does not match the frozen release.")
            }
            for item in videoCodebook {
                guard let blockId = item["blockId"] as? String,
                      isValidIdentifier(blockId),
                      let maxDurationSeconds = number(item["maxDurationSeconds"]),
                      (5...300).contains(maxDurationSeconds),
                      let maxBytes = number(item["maxBytes"]),
                      (1_024 * 1_024...100 * 1_024 * 1_024).contains(maxBytes),
                      let includeAudio = item["includeAudio"] as? Bool,
                      let cameraFacing = item["cameraFacing"] as? String,
                      ["user", "environment"].contains(cameraFacing),
                      videoLimits[blockId] == nil
                else {
                    throw HostError.invalidBundle("A video-response limit in the codebook is invalid.")
                }
                videoLimits[blockId] = HostVideoBlockLimit(
                    blockId: blockId,
                    maxDurationSeconds: maxDurationSeconds,
                    maxBytes: maxBytes,
                    includeAudio: includeAudio
                )
            }
            let frozenVideoIds = Set(blocks.compactMap { block -> String? in
                guard block["type"] as? String == "video-response" else { return nil }
                return block["id"] as? String
            })
            guard Set(videoLimits.keys) == frozenVideoIds else {
                throw HostError.invalidBundle("The video codebook does not match the frozen video blocks.")
            }
            let endpoint = runner["videoEndpoint"]
            guard containsVideoResponses
                ? (endpoint as? String == "/api/video")
                : (endpoint is NSNull)
            else {
                throw HostError.invalidBundle("The video endpoint does not match the frozen release.")
            }
            videoMaxChunkBytes = 2_097_152
        } else {
            guard !containsVideoResponses else {
                throw HostError.invalidBundle("Video responses require a version 3 or newer Local Host bundle.")
            }
            videoMaxChunkBytes = 0
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
        if containsAudioResponses && !runnerHTML.contains("/api/audio") {
            throw HostError.invalidBundle("The participant runner is missing its local audio endpoint.")
        }
        if containsVideoResponses && !runnerHTML.contains("/api/video") {
            throw HostError.invalidBundle("The participant runner is missing its local video endpoint.")
        }

        var analysisContractData: Data?
        if bundleVersion >= 5 {
            guard number(manifest["formatVersion"]) == 5,
                  number(manifest["analysisContractSchemaVersion"]) == 1,
                  let analysisContractChecksum = manifest["analysisContractChecksum"] as? String,
                  isValidChecksum(analysisContractChecksum),
                  let analysisContract = manifest["analysisContract"] as? [String: Any],
                  number(analysisContract["schemaVersion"]) == 1,
                  analysisContract["projectId"] as? String == projectId,
                  checksum(for: analysisContract) == analysisContractChecksum,
                  let readiness = analysisContract["readiness"] as? [String: Any],
                  let readinessStatus = readiness["status"] as? String,
                  ["ready", "needs-planning"].contains(readinessStatus),
                  let warningCount = number(readiness["warningCount"]),
                  warningCount >= 0,
                  let researchQuestions = analysisContract["researchQuestions"] as? [[String: Any]],
                  let analysisCodebook = codebook["analysisContract"] as? [String: Any],
                  number(analysisCodebook["schemaVersion"]) == 1,
                  analysisCodebook["checksum"] as? String == analysisContractChecksum,
                  analysisCodebook["readinessStatus"] as? String == readinessStatus,
                  number(analysisCodebook["warningCount"]) == warningCount,
                  let researchQuestionIds = analysisCodebook["researchQuestionIds"] as? [String],
                  researchQuestionIds == researchQuestions.compactMap({ $0["id"] as? String })
            else {
                throw HostError.invalidBundle("The Phase 8 analysis contract is missing, altered, or inconsistent with the codebook.")
            }
            analysisContractData = try JSONSerialization.data(
                withJSONObject: analysisContract,
                options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
            )
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
            containsAudioResponses: containsAudioResponses,
            audioMaxChunkBytes: audioMaxChunkBytes,
            audioLimits: audioLimits,
            containsVideoResponses: containsVideoResponses,
            videoMaxChunkBytes: videoMaxChunkBytes,
            videoLimits: videoLimits,
            runnerNonce: runnerNonce,
            runnerHTML: runnerHTML,
            releaseJSON: releaseData,
            codebookJSON: codebookData,
            analysisContractJSON: analysisContractData,
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
