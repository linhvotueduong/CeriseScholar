import AppKit
import Combine
import Foundation
import UniformTypeIdentifiers

@MainActor
final class HostStore: ObservableObject {
    @Published var bundle: VerifiedHostBundle?
    @Published var workspace: ImportedStudyWorkspace?
    @Published var runState: HostRunState = .stopped
    @Published var executionMode: HostExecutionMode = .sameComputer
    @Published var participantURL: URL?
    @Published var sessions: [HostSession] = []
    @Published var counts = HostSessionCounts()
    @Published var storage = HostStorageSnapshot()
    @Published var message = ""
    @Published var selectedSection: HostSection = .overview

    private var database: LocalResponseDatabase?
    private let server = LocalHTTPServer()

    init(recoverOnLaunch: Bool = true) {
        if recoverOnLaunch {
            recoverLastStudy()
        }
    }

    var isHosting: Bool {
        runState == .active || runState == .paused || runState == .starting
    }

    func chooseAndImportBundle() {
        let panel = NSOpenPanel()
        panel.title = "Import a Cerise Local Host study"
        panel.prompt = "Verify and import"
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.allowedContentTypes = [
            UTType(filenameExtension: "cerisehost")
                ?? UTType.json
        ]
        guard panel.runModal() == .OK, let url = panel.url else { return }
        importBundle(from: url)
    }

    func importBundle(from url: URL) {
        stopHosting()
        do {
            let data = try Data(contentsOf: url, options: [.mappedIfSafe])
            let verified = try HostBundleVerifier.verify(data: data)
            let importedWorkspace = try StudyWorkspaceService.importBundle(verified)
            let localDatabase = try LocalResponseDatabase(
                databaseURL: importedWorkspace.databaseURL,
                mediaURL: importedWorkspace.mediaURL
            )
            database?.close()
            bundle = verified
            workspace = importedWorkspace
            database = localDatabase
            if verified.containsAudioResponses || verified.containsVideoResponses {
                executionMode = .sameComputer
            }
            runState = .stopped
            participantURL = nil
            selectedSection = .overview
            message = "Release v\(verified.releaseNumber) verified and imported. Collection remains stopped until you start it."
            refresh()
        } catch {
            message = error.localizedDescription
            runState = .failed(error.localizedDescription)
        }
    }

    func startHosting() {
        guard let bundle, let database else {
            message = "Import a verified .cerisehost study before starting collection."
            return
        }
        guard (!bundle.containsAudioResponses && !bundle.containsVideoResponses)
            || executionMode == .sameComputer
        else {
            runState = .failed("Media responses can run only on this Mac.")
            message = "This release contains audio or video recordings, so Trusted LAN is unavailable. Select This Mac only."
            return
        }
        runState = .starting
        message = ""
        server.start(
            mode: executionMode,
            runnerHTML: bundle.runnerHTML,
            runnerNonce: bundle.runnerNonce,
            database: database,
            releaseId: bundle.id,
            releaseNumber: bundle.releaseNumber,
            releaseChecksum: bundle.releaseChecksum,
            audioLimits: bundle.audioLimits,
            audioMaxChunkBytes: bundle.audioMaxChunkBytes,
            videoLimits: bundle.videoLimits,
            videoMaxChunkBytes: bundle.videoMaxChunkBytes,
            onCheckpoint: { [weak self] in
                Task { @MainActor in self?.refresh() }
            },
            completion: { [weak self] result in
                Task { @MainActor in
                    guard let self else { return }
                    switch result {
                    case .success(let url):
                        self.participantURL = url
                        self.runState = .active
                        self.message = self.executionMode == .sameComputer
                            ? (bundle.containsVideoResponses
                                ? "Video collection is active on this Mac. Camera recordings and structured responses stay in the private local study folder."
                                : bundle.containsAudioResponses
                                ? "Audio collection is active on this Mac. Voice recordings and structured responses stay in the private local study folder."
                                : "Collection is active on this Mac. Participant responses save to local SQLite.")
                            : "Trusted-LAN collection is active. Keep this Mac awake and use structured responses only."
                    case .failure(let error):
                        self.participantURL = nil
                        self.runState = .failed(error.localizedDescription)
                        self.message = error.localizedDescription
                    }
                }
            }
        )
    }

    func pauseOrResume() {
        switch runState {
        case .active:
            server.setPaused(true)
            runState = .paused
            message = "New participant access and checkpoints are paused. Existing local data is unchanged."
        case .paused:
            server.setPaused(false)
            runState = .active
            message = "Collection resumed."
        default:
            break
        }
    }

    func stopHosting() {
        server.stop()
        participantURL = nil
        if isHosting || runState != .stopped {
            runState = .stopped
        }
        database?.close()
        if let workspace {
            database = try? LocalResponseDatabase(
                databaseURL: workspace.databaseURL,
                mediaURL: workspace.mediaURL
            )
        }
        refresh()
    }

    func copyParticipantURL() {
        guard let participantURL else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(participantURL.absoluteString, forType: .string)
        message = "Participant URL copied."
    }

    func openParticipantURL() {
        guard let participantURL else { return }
        NSWorkspace.shared.open(participantURL)
    }

    func revealStudyFolder() {
        guard let workspace else { return }
        NSWorkspace.shared.activateFileViewerSelecting([workspace.rootURL])
    }

    func exportResearchPackage() {
        guard let bundle, let workspace, let database else { return }
        let panel = NSOpenPanel()
        panel.title = "Choose where to create the research export"
        panel.prompt = "Export here"
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.canCreateDirectories = true
        panel.allowsMultipleSelection = false
        guard panel.runModal() == .OK, let directory = panel.url else { return }
        do {
            let exportURL = try ResearchExportService.exportPackage(
                bundle: bundle,
                workspace: workspace,
                database: database,
                to: directory
            )
            message = "Research export created locally."
            NSWorkspace.shared.activateFileViewerSelecting([exportURL])
            refresh()
        } catch {
            message = error.localizedDescription
        }
    }

    func createBackup() {
        guard let bundle, let workspace, let database else { return }
        do {
            let backupURL = try ResearchExportService.createBackup(
                bundle: bundle,
                workspace: workspace,
                database: database
            )
            message = "Consistent local backup created with SQLite and local audio/video media when present."
            NSWorkspace.shared.activateFileViewerSelecting([backupURL])
            refresh()
        } catch {
            message = error.localizedDescription
        }
    }

    func refresh() {
        guard let workspace else {
            sessions = []
            counts = HostSessionCounts()
            storage = HostStorageSnapshot()
            return
        }
        do {
            sessions = try database?.sessions() ?? []
            counts = try database?.counts() ?? HostSessionCounts()
        } catch {
            message = "Local session summaries could not be refreshed."
        }
        storage = StudyWorkspaceService.storageSnapshot(for: workspace)
    }

    func shutdown() {
        server.stop()
        database?.close()
    }

    private func recoverLastStudy() {
        do {
            guard let (recoveredBundle, recoveredWorkspace) = try StudyWorkspaceService.recoverLastBundle() else {
                return
            }
            bundle = recoveredBundle
            workspace = recoveredWorkspace
            database = try LocalResponseDatabase(
                databaseURL: recoveredWorkspace.databaseURL,
                mediaURL: recoveredWorkspace.mediaURL
            )
            message = "Recovered the last verified study. Collection is stopped for safety."
            refresh()
        } catch {
            message = "The previous local study could not be recovered: \(error.localizedDescription)"
        }
    }
}
