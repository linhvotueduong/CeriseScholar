import SwiftUI

struct ReadinessView: View {
    @ObservedObject var store: HostStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header
                launchStatus
                automatedChecks
                storagePlan
                rehearsalChecklist
                dataSeparation
            }
            .padding(24)
            .frame(maxWidth: 920, alignment: .leading)
        }
        .frame(maxWidth: .infinity)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Launch readiness")
                .font(.largeTitle)
                .fontWeight(.semibold)
            Text("Rehearse locally, verify recovery, and keep pilot responses out of production analysis.")
                .foregroundStyle(.secondary)
        }
    }

    private var launchStatus: some View {
        GroupBox {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: store.productionLaunchReady
                    ? "checkmark.seal.fill"
                    : "lock.trianglebadge.exclamationmark")
                    .font(.title2)
                    .foregroundStyle(store.productionLaunchReady ? .green : .orange)
                VStack(alignment: .leading, spacing: 5) {
                    Text(store.bundle?.authoringMode == "production"
                         ? (store.productionLaunchReady
                            ? "Production launch unlocked"
                            : "Production launch remains locked")
                         : "Pilot collection can start")
                        .fontWeight(.semibold)
                    Text(store.bundle?.authoringMode == "production"
                         ? "All automated checks and researcher rehearsals must remain complete before collection starts."
                         : "Run the complete pilot, consent/refusal, withdrawal, device, and recovery rehearsals before exporting a production bundle.")
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var automatedChecks: some View {
        GroupBox("Automated local preflight") {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(store.preflight.checks) { check in
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: check.passed
                            ? "checkmark.circle.fill"
                            : "exclamationmark.triangle.fill")
                            .foregroundStyle(check.passed ? .green : .orange)
                            .frame(width: 20)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(check.title)
                                .fontWeight(.medium)
                            Text(check.detail)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 9)
                    if check.id != store.preflight.checks.last?.id {
                        Divider()
                    }
                }
                Button("Run preflight again") {
                    store.refresh()
                }
                .padding(.top, 12)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var storagePlan: some View {
        GroupBox("Production capacity plan") {
            VStack(alignment: .leading, spacing: 12) {
                Stepper(
                    "Expected production sessions: \(store.readiness.expectedProductionSessions.formatted())",
                    value: Binding(
                        get: { store.readiness.expectedProductionSessions },
                        set: { store.setExpectedProductionSessions($0) }
                    ),
                    in: 1...100_000,
                    step: 25
                )
                capacityRow(
                    "Estimated collection data",
                    bytes: store.preflight.estimatedCollectionBytes
                )
                capacityRow(
                    "Currently available on this volume",
                    bytes: store.preflight.availableBytes
                )
                Text("The check also reserves 100 MB for SQLite, temporary chunks, and safe export operations. Media estimates use the maximum size frozen into this release.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var rehearsalChecklist: some View {
        GroupBox("Researcher rehearsal gate") {
            VStack(alignment: .leading, spacing: 13) {
                readinessToggle(
                    "Representative devices and browsers tested",
                    detail: "Run the pilot on every planned browser/device class; verify viewport, input, timing behavior, and media codec support.",
                    keyPath: \.representativeDevicesRehearsed
                )
                readinessToggle(
                    "Consent and refusal paths rehearsed",
                    detail: "Confirm consent wording, refusal behavior, debriefing, and that refusal does not retain research responses.",
                    keyPath: \.consentAndRefusalRehearsed
                )
                readinessToggle(
                    "Withdrawal deletion verified",
                    detail: "Confirm a pilot withdrawal removes structured payloads and all local audio/video files for that session.",
                    keyPath: \.withdrawalDeletionRehearsed
                )
                readinessToggle(
                    "Failure recovery rehearsed",
                    detail: "Interrupt a pilot, restart the host, resume the participant flow, and verify newest-checkpoint recovery.",
                    keyPath: \.failureRecoveryRehearsed
                )
                readinessToggle(
                    "Conditions, variables, and missing data reviewed",
                    detail: "Inspect allocations, trial order, codebook names, incomplete sessions, and expected analysis columns.",
                    keyPath: \.conditionAndVariablesReviewed
                )
                readinessToggle(
                    "Pilot exclusion confirmed",
                    detail: "Use only the production/ export folder for analysis; pilot/ remains separate for validation records.",
                    keyPath: \.pilotExclusionConfirmed
                )
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var dataSeparation: some View {
        GroupBox("Pilot and production separation") {
            HStack(spacing: 28) {
                modeCount("Pilot", counts: store.pilotCounts)
                Divider()
                modeCount("Production", counts: store.productionCounts)
                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func readinessToggle(
        _ title: String,
        detail: String,
        keyPath: WritableKeyPath<HostLaunchReadiness, Bool>
    ) -> some View {
        Toggle(
            isOn: Binding(
                get: { store.readiness[keyPath: keyPath] },
                set: { store.setReadiness(keyPath, to: $0) }
            )
        ) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .fontWeight(.medium)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .toggleStyle(.checkbox)
    }

    private func capacityRow(_ label: String, bytes: Int64) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(HostFormatters.bytes.string(fromByteCount: max(0, bytes)))
                .fontWeight(.semibold)
        }
    }

    private func modeCount(_ title: String, counts: HostSessionCounts) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title)
                .fontWeight(.semibold)
            Text("\(counts.completed) completed · \(counts.started) incomplete · \(counts.refused) refused · \(counts.withdrawn) withdrawn")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}
