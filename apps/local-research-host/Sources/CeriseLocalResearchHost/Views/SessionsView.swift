import SwiftUI

struct SessionsView: View {
    @ObservedObject var store: HostStore
    @State private var modeFilter = "all"

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Participant sessions")
                        .font(.largeTitle)
                        .fontWeight(.semibold)
                    Text("Anonymous local session identifiers and collection status.")
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Picker("Response mode", selection: $modeFilter) {
                    Text("All").tag("all")
                    Text("Pilot").tag("pilot")
                    Text("Production").tag("production")
                }
                .pickerStyle(.segmented)
                .frame(width: 280)
                Button("Refresh") { store.refresh() }
            }
            if filteredSessions.isEmpty {
                ContentUnavailableView(
                    modeFilter == "all" ? "No sessions yet" : "No \(modeFilter) sessions yet",
                    systemImage: "person.2.slash",
                    description: Text("Start collection and open the participant URL to create a local session.")
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Table(filteredSessions) {
                    TableColumn("Session") { session in
                        Text(session.id)
                            .font(.system(.caption, design: .monospaced))
                            .lineLimit(1)
                    }
                    TableColumn("Status") { session in
                        Text(session.status.capitalized)
                    }
                    TableColumn("Mode") { session in
                        Text(session.executionMode.capitalized)
                    }
                    TableColumn("Condition") { session in
                        Text(session.conditionName.isEmpty ? "—" : session.conditionName)
                    }
                    TableColumn("Updated") { session in
                        Text(session.updatedAt)
                            .font(.caption)
                    }
                }
            }
        }
        .padding(24)
    }

    private var filteredSessions: [HostSession] {
        modeFilter == "all"
            ? store.sessions
            : store.sessions.filter { $0.executionMode == modeFilter }
    }
}
