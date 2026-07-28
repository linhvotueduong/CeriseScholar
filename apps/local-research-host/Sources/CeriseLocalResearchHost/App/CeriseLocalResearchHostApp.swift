import AppKit
import Darwin
import SwiftUI

final class HostAppDelegate: NSObject, NSApplicationDelegate {
    var shutdownHandler: (() -> Void)?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationWillTerminate(_ notification: Notification) {
        shutdownHandler?()
    }
}

@main
struct CeriseLocalResearchHostApp: App {
    @NSApplicationDelegateAdaptor(HostAppDelegate.self) private var appDelegate
    @StateObject private var store: HostStore

    init() {
        let commandLineMode = CommandLine.arguments.contains("--self-test")
            || CommandLine.arguments.contains("--verify-bundle")
        _store = StateObject(wrappedValue: HostStore(recoverOnLaunch: !commandLineMode))
        if let flagIndex = CommandLine.arguments.firstIndex(of: "--verify-bundle"),
           CommandLine.arguments.indices.contains(flagIndex + 1) {
            do {
                let url = URL(fileURLWithPath: CommandLine.arguments[flagIndex + 1])
                let bundle = try HostBundleVerifier.verify(data: Data(contentsOf: url))
                print("LOCAL_HOST_BUNDLE_VERIFIED release=\(bundle.id) version=\(bundle.releaseNumber)")
                exit(EXIT_SUCCESS)
            } catch {
                fputs("LOCAL_HOST_BUNDLE_REJECTED: \(error.localizedDescription)\n", stderr)
                exit(EXIT_FAILURE)
            }
        }
        guard CommandLine.arguments.contains("--self-test") else { return }
        do {
            try HostSelfTest.run()
            print("LOCAL_HOST_SELF_TEST_OK")
            exit(EXIT_SUCCESS)
        } catch {
            fputs("LOCAL_HOST_SELF_TEST_FAILED: \(error.localizedDescription)\n", stderr)
            exit(EXIT_FAILURE)
        }
    }

    var body: some Scene {
        WindowGroup("Cerise Local Research Host", id: "main") {
            ContentView(store: store)
                .frame(minWidth: 980, minHeight: 680)
                .onAppear {
                    appDelegate.shutdownHandler = { [weak store] in
                        store?.shutdown()
                    }
                }
        }
        .defaultSize(width: 1120, height: 760)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("Import Local Host Study…") {
                    store.chooseAndImportBundle()
                }
                .keyboardShortcut("o")
            }
            CommandMenu("Collection") {
                Button("Start Collection") { store.startHosting() }
                    .keyboardShortcut("r", modifiers: [.command, .shift])
                    .disabled(store.bundle == nil || store.isHosting)
                Button(store.runState == .paused ? "Resume Collection" : "Pause Collection") {
                    store.pauseOrResume()
                }
                .disabled(store.runState != .active && store.runState != .paused)
                Button("Stop Collection") { store.stopHosting() }
                    .keyboardShortcut(".", modifiers: .command)
                    .disabled(!store.isHosting)
            }
        }
    }
}
