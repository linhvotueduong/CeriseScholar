// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "CeriseLocalResearchHost",
    platforms: [.macOS(.v14)],
    products: [
        .executable(
            name: "CeriseLocalResearchHost",
            targets: ["CeriseLocalResearchHost"]
        ),
    ],
    targets: [
        .executableTarget(
            name: "CeriseLocalResearchHost",
            linkerSettings: [.linkedLibrary("sqlite3")]
        ),
    ],
    swiftLanguageModes: [.v5]
)
