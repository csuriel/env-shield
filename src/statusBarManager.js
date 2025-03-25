const vscode = require("vscode");

class StatusBarManager {
  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "env-secrets-blur.toggleBlur";
  }

  initialize() {
    this.updateStatus(true);
    this.statusBarItem.show();
  }

  updateStatus(isBlurred) {
    this.statusBarItem.text = isBlurred
      ? "$(eye-closed) Secrets Blurred"
      : "$(eye) Secrets Visible";
    this.statusBarItem.tooltip = isBlurred
      ? "Click to show secret values"
      : "Click to blur secret values";
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}

module.exports = { StatusBarManager };
