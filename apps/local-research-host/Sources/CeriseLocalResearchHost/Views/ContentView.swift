import SwiftUI

struct ContentView: View {
    @ObservedObject var store: HostStore

    var body: some View {
        NavigationSplitView {
            SidebarView(store: store)
        } detail: {
            if store.bundle == nil {
                WelcomeView(store: store)
            } else {
                detail
            }
        }
        .navigationTitle("Cerise Local Research Host")
        .toolbar {
            ToolbarItemGroup {
                Button {
                    store.refresh()
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(store.bundle == nil)

                Button {
                    store.chooseAndImportBundle()
                } label: {
                    Label("Import study", systemImage: "square.and.arrow.down")
                }
            }
        }
        .tint(Color(red: 0.58, green: 0.36, blue: 0.22))
    }

    @ViewBuilder
    private var detail: some View {
        switch store.selectedSection {
        case .overview:
            HostOverviewView(store: store)
        case .readiness:
            ReadinessView(store: store)
        case .sessions:
            SessionsView(store: store)
        case .storage:
            StorageView(store: store)
        case .safety:
            SafetyView(store: store)
        }
    }
}
