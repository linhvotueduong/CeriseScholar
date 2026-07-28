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
                    Text("What Phase 7.1 does—and deliberately does not do.")
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
                    detail: "A withdrawal checkpoint removes earlier checkpoints for that session and clears response, timing, event, and trial payloads before the withdrawal record is retained."
                )
                safetyCard(
                    "LAN mode is structured-only",
                    icon: "network.badge.shield.half.filled",
                    detail: "Trusted-LAN participant pages use local HTTP. Phase 7.1 disables camera, microphone, and geolocation. Audio is Phase 7.2 and will be same-computer-only until a trustworthy HTTPS boundary exists."
                )
                safetyCard(
                    "Research limits remain visible",
                    icon: "clock.badge.exclamationmark",
                    detail: "Timing is browser-measured. This host does not claim PsychoPy/Gorilla parity, certified millisecond precision, eye tracking, public remote recruitment, or medical-device validation."
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
