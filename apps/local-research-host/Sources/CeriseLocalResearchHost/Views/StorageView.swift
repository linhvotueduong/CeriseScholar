import SwiftUI

struct StorageView: View {
    @ObservedObject var store: HostStore
    @State private var expectedSessions = 100
    @State private var estimatedKilobytesPerSession = 50

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Storage & exports")
                        .font(.largeTitle)
                        .fontWeight(.semibold)
                    Text("Back up and export the frozen release, codebook, response data, and trial-level records.")
                        .foregroundStyle(.secondary)
                }
                GroupBox("Local storage") {
                    Grid(alignment: .leading, horizontalSpacing: 26, verticalSpacing: 12) {
                        storageRow("Response database", bytes: store.storage.databaseBytes)
                        storageRow("Study assets", bytes: store.storage.assetBytes)
                        storageRow("Prepared media directory", bytes: store.storage.mediaBytes)
                        Divider()
                        storageRow("Total", bytes: store.storage.totalBytes, emphasized: true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                GroupBox("Collection storage estimate") {
                    VStack(alignment: .leading, spacing: 12) {
                        Stepper(
                            "Expected participant sessions: \(expectedSessions.formatted())",
                            value: $expectedSessions,
                            in: 1...100_000,
                            step: 25
                        )
                        Picker("Structured data per session", selection: $estimatedKilobytesPerSession) {
                            Text("Light survey · 10 KB").tag(10)
                            Text("Typical experiment · 50 KB").tag(50)
                            Text("Large trial set · 250 KB").tag(250)
                        }
                        HStack {
                            Text("Estimated response database")
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(HostFormatters.bytes.string(
                                fromByteCount: Int64(expectedSessions * estimatedKilobytesPerSession * 1_024)
                            ))
                            .fontWeight(.semibold)
                        }
                        if let bundle = store.bundle, bundle.containsAudioResponses {
                            HStack {
                                Text("Maximum audio at frozen limits")
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text(HostFormatters.bytes.string(
                                    fromByteCount: Int64(
                                        expectedSessions
                                        * bundle.audioLimits.values.reduce(0) { $0 + $1.maxBytes }
                                    )
                                ))
                                .fontWeight(.semibold)
                            }
                        }
                        if let bundle = store.bundle, bundle.containsVideoResponses {
                            HStack {
                                Text("Maximum video at frozen limits")
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text(HostFormatters.bytes.string(
                                    fromByteCount: Int64(
                                        expectedSessions
                                        * bundle.videoLimits.values.reduce(0) { $0 + $1.maxBytes }
                                    )
                                ))
                                .fontWeight(.semibold)
                            }
                        }
                        Text("Planning estimate only. Embedded assets, SQLite overhead, exports, and media chunk metadata add some overhead.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                GroupBox("Research package") {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("The export contains formula-safe CSV, structured JSON, trial-level CSV, local audio/video files and manifests when present, a consistent SQLite backup, the immutable release, codebook, and README.")
                            .foregroundStyle(.secondary)
                        HStack {
                            Button("Export research package…") {
                                store.exportResearchPackage()
                            }
                            .buttonStyle(.borderedProminent)
                            Button("Create local backup") {
                                store.createBackup()
                            }
                            Button("Reveal study folder") {
                                store.revealStudyFolder()
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                if let workspace = store.workspace {
                    GroupBox("Private local location") {
                        Text(workspace.rootURL.path)
                            .font(.system(.caption, design: .monospaced))
                            .foregroundStyle(.secondary)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                if !store.message.isEmpty {
                    Label(store.message, systemImage: "info.circle")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(24)
            .frame(maxWidth: 900, alignment: .leading)
        }
        .frame(maxWidth: .infinity)
    }

    private func storageRow(_ label: String, bytes: Int64, emphasized: Bool = false) -> some View {
        GridRow {
            Text(label)
                .fontWeight(emphasized ? .semibold : .regular)
            Text(HostFormatters.bytes.string(fromByteCount: bytes))
                .fontWeight(emphasized ? .semibold : .regular)
        }
    }
}
