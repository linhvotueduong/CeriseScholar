import Foundation

enum HostExecutionMode: String, CaseIterable, Codable, Identifiable {
    case sameComputer = "same-computer"
    case trustedLAN = "trusted-lan"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .sameComputer: "This Mac only"
        case .trustedLAN: "Trusted local network"
        }
    }

    var detail: String {
        switch self {
        case .sameComputer:
            "Participants use this Mac. The localhost boundary can support secure browser APIs in later phases."
        case .trustedLAN:
            "Nearby devices can join over HTTP. Phase 7.1 permits structured responses only—no microphone or camera."
        }
    }
}

enum HostRunState: Equatable {
    case stopped
    case starting
    case active
    case paused
    case failed(String)

    var label: String {
        switch self {
        case .stopped: "Stopped"
        case .starting: "Starting"
        case .active: "Collecting"
        case .paused: "Paused"
        case .failed: "Needs attention"
        }
    }
}

enum HostSection: String, CaseIterable, Identifiable {
    case overview
    case sessions
    case storage
    case safety

    var id: String { rawValue }

    var title: String {
        switch self {
        case .overview: "Collection"
        case .sessions: "Sessions"
        case .storage: "Storage & exports"
        case .safety: "Safety boundary"
        }
    }

    var systemImage: String {
        switch self {
        case .overview: "play.rectangle"
        case .sessions: "person.2"
        case .storage: "externaldrive"
        case .safety: "lock.shield"
        }
    }
}

struct VerifiedHostBundle: Identifiable, Equatable {
    let id: String
    let projectId: String
    let releaseNumber: Int
    let releaseChecksum: String
    let bundleChecksum: String
    let title: String
    let createdAt: Date
    let authoringMode: String
    let runnerNonce: String
    let runnerHTML: String
    let releaseJSON: Data
    let codebookJSON: Data
    let originalBundle: Data
}

struct HostSession: Identifiable, Equatable {
    let id: String
    let status: String
    let executionMode: String
    let conditionName: String
    let startedAt: String
    let updatedAt: String
}

struct HostSessionCounts: Equatable {
    var started = 0
    var completed = 0
    var withdrawn = 0

    var total: Int { started + completed + withdrawn }
}

struct HostStorageSnapshot: Equatable {
    var databaseBytes: Int64 = 0
    var assetBytes: Int64 = 0
    var mediaBytes: Int64 = 0
    var totalBytes: Int64 = 0
}

struct ImportedStudyWorkspace {
    let rootURL: URL
    let bundleURL: URL
    let databaseURL: URL
    let assetsURL: URL
    let mediaURL: URL
    let exportsURL: URL
    let backupsURL: URL
}

enum HostError: LocalizedError {
    case invalidBundle(String)
    case storage(String)
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidBundle(let message), .storage(let message), .server(let message):
            message
        }
    }
}
