import SwiftUI

struct SafetyView: View {
    @ObservedObject var store: HostStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Safety boundary")
                        .font(.largeTitle)
                        .fontWeight(.semibold)
                    Text("What Phase 7.1–7.3 does—and deliberately does not do.")
                        .foregroundStyle(.secondary)
                }
                safetyCard(
                    "Verified before execution",
                    icon: "checkmark.shield",
                    detail: "The app checks both the immutable experiment release and the complete Local Host bundle. An altered runner or study is refused."
                )
                safetyCard(
                    "Participant data stays local",
                    icon: "externaldrive.badge.checkmark",
                    detail: "Responses are written to SQLite inside Application Support. The host contains no Supabase, Azure, OpenRouter, OpenAI, analytics, or public-internet response path."
                )
                safetyCard(
                    "Crash-aware collection",
                    icon: "arrow.triangle.2.circlepath",
                    detail: "SQLite uses write-ahead logging, full synchronous writes, idempotent checkpoints, and newest-sequence wins. A stopped app recovers the last verified study without automatically reopening collection."
                )
                safetyCard(
                    "Withdrawal is scrubbed",
                    icon: "hand.raised",
                    detail: "A withdrawal checkpoint removes earlier checkpoints, local audio/video metadata, and local media files for that session, then retains only a scrubbed withdrawal record."
                )
                safetyCard(
                    "Video is participant-controlled and local-only",
                    icon: "video.and.waveform",
                    detail: "Video releases require separate camera consent, a visible participant-controlled camera check and recording action, bounded duration and size, small chunks, and local checksums. Microphone audio is off by default and requires separate audio consent when enabled."
                )
                safetyCard(
                    "Audio is same-Mac and local-only",
                    icon: "mic.and.signal.meter",
                    detail: "Audio releases require separate recording consent, a participant-controlled microphone check and recording action, bounded duration and size, small chunks, and local media checksums. The browser sends chunks only to this app; there is no transcription or cloud path."
                )
                safetyCard(
                    "LAN mode remains structured-only",
                    icon: "network.badge.shield.half.filled",
                    detail: "Trusted-LAN participant pages use local HTTP. Camera, microphone, and geolocation remain disabled. Any release containing an audio- or video-response block is refused in LAN mode."
                )
                safetyCard(
                    "Research limits remain visible",
                    icon: "clock.badge.exclamationmark",
                    detail: "Timing is browser-measured. Audio is not calibrated acoustic measurement. Video is not biometric, clinical, face-analysis, or eye-tracking measurement. Neither has a certified onset or latency claim, and this host does not claim PsychoPy/Gorilla parity or public remote recruitment."
                )
                GroupBox("Researcher responsibility") {
                    Text("Use an approved consent process, retention schedule, access-control plan, de-identification procedure, and institutional ethics workflow. Keep exported and backup files in approved encrypted storage.")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(24)
            .frame(maxWidth: 900, alignment: .leading)
        }
        .frame(maxWidth: .infinity)
    }

    private func safetyCard(_ title: String, icon: String, detail: String) -> some View {
        GroupBox {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(.tint)
                    .frame(width: 30)
                VStack(alignment: .leading, spacing: 5) {
                    Text(title)
                        .fontWeight(.semibold)
                    Text(detail)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
