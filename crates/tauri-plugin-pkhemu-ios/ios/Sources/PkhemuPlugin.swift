import AVFoundation
import Tauri
import UIKit
import UniformTypeIdentifiers
import WebKit

struct ReadArgs: Decodable {
  let path: String
}

struct StopArgs: Decodable {
  let id: String
}

struct DownloadArgs: Decodable {
  let paths: [String]
}

struct ShareArgs: Decodable {
  let paths: [String]
}

struct WatchAudioArgs: Decodable {
  let events: Channel
}

struct SilentModeArgs: Decodable {
  let on: Bool
}

struct GameScreenArgs: Decodable {
  let playing: Bool
}

struct Folder: Encodable {
  let path: String
  let name: String
}

struct Picked: Encodable {
  let folder: Folder?
}

struct Started: Encodable {
  let id: String?
}

class FolderPicker: NSObject, UIDocumentPickerDelegate, UIAdaptivePresentationControllerDelegate {
  private var done: ((URL?) -> Void)?

  init(_ done: @escaping (URL?) -> Void) {
    self.done = done
  }

  private func finish(_ url: URL?) {
    done?(url)
    done = nil
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    finish(urls.first)
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    finish(nil)
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    finish(nil)
  }
}

class PkhemuPlugin: Plugin {
  private let state = DispatchQueue(label: "pkhemu-ios.reading")
  private var picker: FolderPicker?
  // Only the URL the picker returned carries access to its folder, so the app keeps it until it quits.
  private var folders: [URL] = []
  private var stops: [String: () -> Void] = [:]
  private let audio = DispatchQueue(label: "pkhemu-ios.audio")
  private var audioEvents: Channel?
  private var playInSilentMode = false
  private weak var webview: WKWebView?
  private lazy var gameScreen = GameScreenView()

  // The page leaves the game's area clear for the game screen under it.
  override func load(webview: WKWebView) {
    self.webview = webview
    webview.backgroundColor = .clear
    webview.scrollView.backgroundColor = .clear
  }

  // Rust waits for the answer on the main thread, so it comes before the view changes.
  @objc public func setGameScreenPlaying(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(GameScreenArgs.self)
    invoke.resolve()
    DispatchQueue.main.async {
      guard let webview = self.webview else { return NSLog("pkhemu: no webview to show the game under") }
      self.gameScreen.play(args.playing, under: webview)
    }
  }

  @objc public func pickFolder(_ invoke: Invoke) {
    DispatchQueue.main.async {
      guard self.picker == nil else { return invoke.reject("The folder picker is already open") }
      guard let presenter = self.manager.viewController else {
        return invoke.reject("Couldn't open the folder picker")
      }
      let controller = UIDocumentPickerViewController(forOpeningContentTypes: [.folder])
      let picker = FolderPicker { url in
        self.picker = nil
        guard let url = url else { return invoke.resolve(Picked(folder: nil)) }
        DispatchQueue.global(qos: .userInitiated).async { self.check(url, invoke) }
      }
      self.picker = picker
      controller.delegate = picker
      controller.presentationController?.delegate = picker
      presenter.present(controller, animated: true)
    }
  }

  // Folders in Dropbox, Google Drive and other providers often can't be read, so the picker's error shows now.
  private func check(_ folder: URL, _ invoke: Invoke) {
    let scoped = folder.startAccessingSecurityScopedResource()
    defer {
      if scoped { folder.stopAccessingSecurityScopedResource() }
    }
    var coordinated: NSError?
    var listed: Error?
    NSFileCoordinator().coordinate(readingItemAt: folder, options: [], error: &coordinated) { url in
      do {
        _ = try FileManager.default.contentsOfDirectory(atPath: url.path)
      } catch {
        listed = error
      }
    }
    if let error = coordinated ?? listed {
      return invoke.reject(error.localizedDescription)
    }
    state.sync {
      folders.removeAll { $0.path == folder.path }
      folders.append(folder)
    }
    let name = (try? folder.resourceValues(forKeys: [.localizedNameKey]))?.localizedName
    invoke.resolve(Picked(folder: Folder(path: folder.path, name: name ?? folder.lastPathComponent)))
  }

  private func folder(containing path: String) -> URL? {
    state.sync { folders.last { path == $0.path || path.hasPrefix($0.path + "/") } }
  }

  @objc public func startReading(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ReadArgs.self)
    guard let folder = folder(containing: args.path) else { return invoke.resolve(Started(id: nil)) }
    let url = URL(fileURLWithPath: args.path)
    let id = UUID().uuidString
    DispatchQueue.global(qos: .userInitiated).async {
      let scoped = folder.startAccessingSecurityScopedResource()
      let stopAccess = {
        if scoped { folder.stopAccessingSecurityScopedResource() }
      }
      // Holding a coordinated read on a folder could keep iCloud from writing the files it downloads into it.
      if (try? url.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true {
        self.state.sync { self.stops[id] = stopAccess }
        return invoke.resolve(Started(id: id))
      }
      self.download(url)
      let done = DispatchSemaphore(value: 0)
      self.state.sync { self.stops[id] = { done.signal() } }
      var error: NSError?
      var held = false
      NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &error) { _ in
        held = true
        invoke.resolve(Started(id: id))
        done.wait()
      }
      self.state.sync { self.stops[id] = nil }
      stopAccess()
      if !held {
        invoke.reject(error?.localizedDescription ?? "Couldn't read \(url.lastPathComponent)")
      }
    }
  }

  private func download(_ url: URL) {
    let keys: Set<URLResourceKey> = [.isUbiquitousItemKey, .ubiquitousItemDownloadingStatusKey]
    guard let values = try? url.resourceValues(forKeys: keys), values.isUbiquitousItem == true,
      values.ubiquitousItemDownloadingStatus != .current
    else { return }
    try? FileManager.default.startDownloadingUbiquitousItem(at: url)
  }

  @objc public func download(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(DownloadArgs.self)
    DispatchQueue.global(qos: .utility).async {
      for path in args.paths {
        guard let folder = self.folder(containing: path) else { continue }
        let scoped = folder.startAccessingSecurityScopedResource()
        try? FileManager.default.startDownloadingUbiquitousItem(at: URL(fileURLWithPath: path))
        if scoped { folder.stopAccessingSecurityScopedResource() }
      }
      invoke.resolve()
    }
  }

  @objc public func share(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ShareArgs.self)
    let urls = args.paths.map { URL(fileURLWithPath: $0) }
    DispatchQueue.main.async {
      guard var presenter = self.manager.viewController else {
        return invoke.reject("Couldn't open the share sheet")
      }
      while let shown = presenter.presentedViewController { presenter = shown }
      let controller = UIActivityViewController(activityItems: urls, applicationActivities: nil)
      controller.completionWithItemsHandler = { [weak controller] _, _, _, error in
        controller?.completionWithItemsHandler = nil
        if let error = error { return invoke.reject(error.localizedDescription) }
        invoke.resolve()
      }
      presenter.present(controller, animated: true)
    }
  }

  @objc public func watchAudio(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(WatchAudioArgs.self)
    let session = AVAudioSession.sharedInstance()
    audio.sync {
      audioEvents = args.events
      activateAudio()
    }
    let center = NotificationCenter.default
    center.addObserver(
      self, selector: #selector(audioInterrupted), name: AVAudioSession.interruptionNotification, object: session)
    center.addObserver(
      self, selector: #selector(audioRouteChanged), name: AVAudioSession.routeChangeNotification, object: session)
    center.addObserver(
      self, selector: #selector(audioServicesReset), name: AVAudioSession.mediaServicesWereResetNotification,
      object: session)
    invoke.resolve()
  }

  @objc public func setPlayInSilentMode(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(SilentModeArgs.self)
    audio.sync {
      playInSilentMode = args.on
      activateAudio()
    }
    invoke.resolve()
  }

  // cpal never sets a category, and its stream stays stopped after an interruption, so the app restarts it.
  private func activateAudio() {
    let session = AVAudioSession.sharedInstance()
    do {
      if playInSilentMode {
        try session.setCategory(.playback, options: .mixWithOthers)
      } else {
        try session.setCategory(.ambient)
      }
      try session.setActive(true)
    } catch {
      NSLog("pkhemu: activating the audio session: \(error)")
    }
  }

  private func sendAudio(_ event: String) {
    try? audioEvents?.send(event)
  }

  @objc private func audioInterrupted(_ notification: Notification) {
    guard let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: raw)
    else { return }
    audio.sync {
      switch type {
      case .began:
        sendAudio("pause")
      case .ended:
        activateAudio()
        sendAudio("restart")
      @unknown default:
        break
      }
    }
  }

  @objc private func audioRouteChanged(_ notification: Notification) {
    guard let raw = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
      AVAudioSession.RouteChangeReason(rawValue: raw) == .oldDeviceUnavailable
    else { return }
    audio.sync {
      sendAudio("pause")
      sendAudio("restart")
    }
  }

  @objc private func audioServicesReset(_ notification: Notification) {
    audio.sync {
      activateAudio()
      sendAudio("restart")
    }
  }

  @objc public func stopReading(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(StopArgs.self)
    let stop = state.sync { stops.removeValue(forKey: args.id) }
    stop?()
    invoke.resolve()
  }
}

// tao ignores the URLs a scene connects with, which is how iOS hands over the file that launched the app
// (tao#1248). Tao registers its scene delegate before the app finishes launching, and scenes connect after.
@_cdecl("pkhemu_ios_replay_launch_urls")
public func replayLaunchURLs() {
  _ = NotificationCenter.default.addObserver(
    forName: UIApplication.didFinishLaunchingNotification, object: nil, queue: nil
  ) { _ in
    replayOnConnect()
  }
}

private func replayOnConnect() {
  let selector = NSSelectorFromString("scene:willConnectToSession:options:")
  guard let delegate = NSClassFromString("TaoSceneDelegate"),
    let method = class_getInstanceMethod(delegate, selector)
  else { return NSLog("pkhemu: no TaoSceneDelegate to replay launch URLs through") }
  typealias Connect = @convention(c) (AnyObject, Selector, UIScene, UISceneSession, UIScene.ConnectionOptions) -> Void
  let connect = unsafeBitCast(method_getImplementation(method), to: Connect.self)
  let replaying: @convention(block) (AnyObject, UIScene, UISceneSession, UIScene.ConnectionOptions) -> Void = {
    this, scene, session, options in
    connect(this, selector, scene, session, options)
    if !options.urlContexts.isEmpty {
      scene.delegate?.scene?(scene, openURLContexts: options.urlContexts)
    }
  }
  method_setImplementation(method, imp_implementationWithBlock(replaying))
}

@_cdecl("init_plugin_pkhemu_ios")
public func initPlugin() -> Plugin {
  return PkhemuPlugin()
}
