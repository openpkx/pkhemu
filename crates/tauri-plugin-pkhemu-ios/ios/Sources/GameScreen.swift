import OpenGLES
import QuartzCore
import UIKit
import WebKit

public typealias ScreenShown = @convention(c) (UnsafeMutableRawPointer, Int32, Int32) -> Void
public typealias ScreenGone = @convention(c) () -> Void

private var onShown: ScreenShown?
private var onGone: ScreenGone?

@_cdecl("pkhemu_ios_watch_game_screen")
public func watchGameScreen(_ shown: ScreenShown, _ gone: ScreenGone) {
  DispatchQueue.main.async {
    onShown = shown
    onGone = gone
  }
}

// Rust draws the game on this view's layer, under the WebView and at its size, so page pixels are layer pixels. Rust
// holds the layer between shown and gone, and lets go of it before gone returns. iOS kills an app that draws with
// OpenGL in the background, so the layer goes before that.
class GameScreenView: UIView {
  override class var layerClass: AnyClass { CAEAGLLayer.self }

  private var playing = false
  private var foreground = true
  private var shown: (Int32, Int32)?

  init() {
    super.init(frame: .zero)
    isHidden = true
    isUserInteractionEnabled = false
    let layer = self.layer as! CAEAGLLayer
    layer.isOpaque = true
    layer.drawableProperties = [
      kEAGLDrawablePropertyRetainedBacking: false,
      kEAGLDrawablePropertyColorFormat: kEAGLColorFormatRGBA8,
    ]
    let center = NotificationCenter.default
    center.addObserver(
      self, selector: #selector(background), name: UIApplication.didEnterBackgroundNotification, object: nil)
    center.addObserver(
      self, selector: #selector(foregroundAgain), name: UIApplication.willEnterForegroundNotification, object: nil)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  func play(_ playing: Bool, under webview: WKWebView) {
    if superview == nil, let parent = webview.superview {
      frame = webview.frame
      autoresizingMask = webview.autoresizingMask
      parent.insertSubview(self, belowSubview: webview)
    }
    self.playing = playing
    isHidden = !playing
    update()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if let screen = window?.windowScene?.screen {
      contentScaleFactor = screen.scale
    }
    update()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    update()
  }

  @objc private func background() {
    foreground = false
    update()
  }

  @objc private func foregroundAgain() {
    foreground = true
    update()
  }

  private func update() {
    let width = Int32((bounds.width * contentScaleFactor).rounded())
    let height = Int32((bounds.height * contentScaleFactor).rounded())
    guard playing, foreground, window != nil, width > 0, height > 0 else {
      if shown != nil {
        shown = nil
        onGone?()
      }
      return
    }
    if shown.map({ $0 != (width, height) }) ?? true {
      shown = (width, height)
      onShown?(Unmanaged.passUnretained(layer).toOpaque(), width, height)
    }
  }
}
