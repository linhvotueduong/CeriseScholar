import SwiftUI

struct HostOverviewView: View {
    @ObservedObject var store: HostStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header
                releaseCard
                executionCard
                if let url = store.participantURL {
                    participantCard(url)
                }
                metricRow
                if !store.message.isEmpty {
                    Label(store.message, systemImage: "info.circle")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .padding(.top, 2)
                }
            }
            .padding(24)
            .frame(maxWidth: 920, alignment: .leading)
        }
        .frame(maxWidth: .infinity)
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 5) {
                Text("Local collection")
                    .font(.largeTitle)
                    .fontWeight(.semibold)
                Text("Start, pause, recover, and export a verified experiment without cloud response storage.")
                    .foregroundStyle(.secondary)
            }
            Spacer()
            StatusBadge(state: store.runState)
        }
    }

    private var releaseCard: some View {
        GroupBox {
            if let bundle = store.bundle {
                Grid(alignment: .leading, horizontalSpacing: 24, verticalSpacing: 10) {
                    GridRow {
                        Text("Study").foregroundStyle(.secondary)
                        Text(bundle.title).fontWeight(.semibold)
                    }
                    GridRow {
                        Text("Frozen release").foregroundStyle(.secondary)
                        Text("v\(bundle.releaseNumber) · \(HostFormatters.date.string(from: bundle.createdAt))")
                    }
                    GridRow {
                        Text("Response mode").foregroundStyle(.secondary)
                        Text(bundle.authoringMode == "production" ? "Production" : "Pilot")
                            .fontWeight(.semibold)
                            .foregroundStyle(bundle.authoringMode == "production"
                                ? Color.primary
                                : Color.orange)
                    }
                    GridRow {
                        Text("Release checksum").foregroundStyle(.secondary)
                        Text(bundle.releaseChecksum)
                            .font(.system(.caption, design: .monospaced))
                            .textSelection(.enabled)
                            .lineLimit(1)
                    }
                    GridRow {
                        Text("Bundle checksum").foregroundStyle(.secondary)
                        Text(bundle.bundleChecksum)
                            .font(.system(.caption, design: .monospaced))
                            .textSelection(.enabled)
                            .lineLimit(1)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        } label: {
            Label("Verified release", systemImage: "checkmark.seal.fill")
                .foregroundStyle(.green)
        }
    }

    private var executionCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 15) {
                Picker("Execution boundary", selection: $store.executionMode) {
                    ForEach((store.bundle?.containsAudioResponses == true
                             || store.bundle?.containsVideoResponses == true)
                        ? [HostExecutionMode.sameComputer]
                        : HostExecutionMode.allCases
                    ) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .disabled(store.isHosting)
                Text(store.executionMode.detail)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                if store.bundle?.containsAudioResponses == true {
                    Label(
                        "This release contains voice recordings. Microphone permission and audio collection are limited to the participant browser on this Mac.",
                        systemImage: "mic.and.signal.meter"
                    )
                    .font(.callout)
                    .foregroundStyle(.secondary)
                }
                if store.bundle?.containsVideoResponses == true {
                    Label(
                        "This release contains camera recordings. Camera preview and video collection are limited to the participant browser on this Mac.",
                        systemImage: "video.and.waveform"
                    )
                    .font(.callout)
                    .foregroundStyle(.secondary)
                }
                HStack {
                    Button(store.bundle?.authoringMode == "production"
                           ? "Start production"
                           : "Start pilot") {
                        store.startHosting()
                    }
                        .buttonStyle(.borderedProminent)
                        .disabled(store.isHosting || !store.productionLaunchReady)
                    if store.bundle?.authoringMode == "production"
                        && !store.productionLaunchReady {
                        Button("Complete launch review") {
                            store.selectedSection = .readiness
                        }
                    }
                    Button(store.runState == .paused ? "Resume" : "Pause") {
                        store.pauseOrResume()
                    }
                    .disabled(store.runState != .active && store.runState != .paused)
                    Button("Stop") { store.stopHosting() }
                        .disabled(!store.isHosting)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } label: {
            Label("Execution mode", systemImage: "network")
        }
    }

    private func participantCard(_ url: URL) -> some View {
        GroupBox {
            HStack(alignment: .top, spacing: 20) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Participant URL")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(url.absoluteString)
                        .font(.system(.body, design: .monospaced))
                        .textSelection(.enabled)
                    HStack {
                        Button("Copy link") { store.copyParticipantURL() }
                        Button("Open participant view") { store.openParticipantURL() }
                    }
                    Text(store.executionMode == .trustedLAN
                         ? "Share only on a trusted in-person network. Keep this Mac awake throughout collection."
                         : "Use this link only on the same Mac.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if let image = QRCodeImage.make(from: url.absoluteString) {
                    Image(nsImage: image)
                        .interpolation(.none)
                        .resizable()
                        .frame(width: 116, height: 116)
                        .accessibilityLabel("QR code for participant URL")
                }
            }
        } label: {
            Label("Participant launcher", systemImage: "qrcode")
        }
    }

    private var metricRow: some View {
        HStack(spacing: 12) {
            MetricCard(title: "In progress", value: store.counts.started, systemImage: "clock")
            MetricCard(title: "Completed", value: store.counts.completed, systemImage: "checkmark.circle")
            MetricCard(title: "Refused", value: store.counts.refused, systemImage: "hand.raised")
            MetricCard(title: "Withdrawn", value: store.counts.withdrawn, systemImage: "xmark.circle")
            MetricCard(
                title: "Local storage",
                valueText: HostFormatters.bytes.string(fromByteCount: store.storage.totalBytes),
                systemImage: "externaldrive"
            )
        }
    }
}

private struct StatusBadge: View {
    let state: HostRunState

    var body: some View {
        Text(state.label)
            .font(.caption)
            .fontWeight(.semibold)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(color.opacity(0.12), in: Capsule())
            .foregroundStyle(color)
    }

    private var color: Color {
        switch state {
        case .active: .green
        case .paused, .starting: .orange
        case .failed: .red
        case .stopped: .secondary
        }
    }
}

private struct MetricCard: View {
    let title: String
    var value: Int?
    var valueText: String?
    let systemImage: String

    init(title: String, value: Int, systemImage: String) {
        self.title = title
        self.value = value
        self.systemImage = systemImage
    }

    init(title: String, valueText: String, systemImage: String) {
        self.title = title
        self.valueText = valueText
        self.systemImage = systemImage
    }

    var body: some View {
        GroupBox {
            HStack {
                Image(systemName: systemImage)
                    .foregroundStyle(.secondary)
                VStack(alignment: .leading, spacing: 3) {
                    Text(valueText ?? String(value ?? 0))
                        .font(.title3)
                        .fontWeight(.semibold)
                    Text(title)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
        }
        .frame(maxWidth: .infinity)
    }
}
