import SwiftUI

@main
struct AnotherDimensionApp: App {
    private let sharedCore: SharedCoreMobileApi = IOSSharedCoreBoundary()

    var body: some Scene {
        WindowGroup {
            ContentView(sharedCore: sharedCore)
        }
    }
}
