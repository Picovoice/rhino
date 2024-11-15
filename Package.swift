// swift-tools-version:5.3
import PackageDescription
let package = Package(
    name: "Rhino-iOS",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "Rhino",
            targets: ["Rhino"]
        )
    ],
    dependencies: [
        .package(
            url: "https://github.com/Picovoice/ios-voice-processor.git",
            .upToNextMajor(from: "1.2.0")
        )
    ],
    targets: [
        .binaryTarget(
            name: "PvRhino",
            path: "lib/ios/PvRhino.xcframework"
        ),
        .target(
            name: "Rhino",
            dependencies: [
                "PvRhino",
                .product(name: "ios_voice_processor", package: "ios-voice-processor")
            ],
            path: ".",
            exclude: [
                "binding/ios/RhinoAppTest",
                "binding/flutter",
                "binding/react-native",
                "binding/unity",
                "demo"
            ],
            sources: [
                "binding/ios/Rhino.swift",
                "binding/ios/RhinoErrors.swift",
                "binding/ios/RhinoManager.swift"
            ],
            resources: [
               .copy("lib/common/rhino_params.pv")
            ]
        )
    ]
)