import SwiftUI

struct SessionsView: View {
    @ObservedObject var store: HostStore

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
                Button("Refresh") { store.refresh() }
            }
            if store.sessions.isEmpty {
                ContentUnavailableView(
                    "No sessions yet",
                    systemImage: "person.2.slash",
                    description: Text("Start collection and open the participant URL to create a local session.")
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Table(store.sessions) {
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
}
