import * as vscode from "vscode";

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "env-secrets-blur.toggleBlur";
  }

  public initialize(): void {
    this.updateStatus(true);
    this.statusBarItem.show();
  }

  public updateStatus(isBlurred: boolean): void {
    this.statusBarItem.text = isBlurred
      ? "$(eye-closed) Secrets Blurred"
      : "$(eye) Secrets Visible";
    this.statusBarItem.tooltip = isBlurred
      ? "Click to show secret values"
      : "Click to blur secret values";
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
