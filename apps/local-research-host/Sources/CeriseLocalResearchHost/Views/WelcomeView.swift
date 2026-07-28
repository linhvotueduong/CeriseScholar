import SwiftUI

struct WelcomeView: View {
    @ObservedObject var store: HostStore

    var body: some View {
        VStack(spacing: 22) {
            Image(systemName: "externaldrive.badge.shield.checkmark")
                .font(.system(size: 54, weight: .light))
                .foregroundStyle(.tint)
            VStack(spacing: 8) {
                Text("Run a frozen study locally")
                    .font(.largeTitle)
                    .fontWeight(.semibold)
                Text("Import the .cerisehost file exported from Experimental Studio. The app verifies the release before opening a participant endpoint or creating a database.")
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 620)
            }
            Button("Import Local Host Study…") {
                store.chooseAndImportBundle()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            if !store.message.isEmpty {
                Text(store.message)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 620)
            }
            HStack(spacing: 22) {
                WelcomeBoundary(icon: "checkmark.shield", title: "Integrity checked", detail: "Release and runner checksums")
                WelcomeBoundary(icon: "externaldrive", title: "Local SQLite", detail: "No cloud response upload")
                WelcomeBoundary(icon: "arrow.clockwise.circle", title: "Crash recovery", detail: "WAL-backed checkpoints")
            }
            .padding(.top, 8)
        }
        .padding(44)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
private struct WelcomeBoundary: View {
    let icon: String
    let title: String
    let detail: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.secondary)
            Text(title)
                .fontWeight(.semibold)
            Text(detail)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(width: 150)
    }
}
