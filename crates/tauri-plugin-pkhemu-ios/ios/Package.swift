// swift-tools-version:5.3

import PackageDescription

let package = Package(
  name: "tauri-plugin-pkhemu-ios",
  platforms: [
    .iOS("18.0")
  ],
  products: [
    .library(
      name: "tauri-plugin-pkhemu-ios",
      type: .static,
      targets: ["tauri-plugin-pkhemu-ios"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "tauri-plugin-pkhemu-ios",
      dependencies: [
        .byName(name: "Tauri")
      ],
      path: "Sources")
  ]
)
