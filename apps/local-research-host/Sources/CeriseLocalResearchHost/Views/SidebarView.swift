import SwiftUI

struct SidebarView: View {
    @ObservedObject var store: HostStore

    var body: some View {
        List(selection: $store.selectedSection) {
            Section("Local Research Host") {
                ForEach(HostSection.allCases) { section in
                    Label(section.title, systemImage: section.systemImage)
                        .tag(section)
                }
            }
            if let bundle = store.bundle {
                Section("Verified release") {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(bundle.title)
                            .fontWeight(.semibold)
                            .lineLimit(1)
                        Text("Release v\(bundle.releaseNumber)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 3)
                }
            }
        }
        .listStyle(.sidebar)
        .navigationSplitViewColumnWidth(min: 210, ideal: 245, max: 300)
        .safeAreaInset(edge: .bottom) {
            HStack(spacing: 8) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 8, height: 8)
                Text(store.runState.label)
                    .font(.caption)
                    .fontWeight(.medium)
                Spacer()
            }
            .padding(12)
            .background(.regularMaterial)
        }
    }

    private var statusColor: Color {
        switch store.runState {
        case .active: .green
        case .paused, .starting: .orange
        case .failed: .red
        case .stopped: .secondary
        }
    }
}
