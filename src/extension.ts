import * as vscode from "vscode";
import { SecretBlurManager } from "./secretBlurManager";
import { StatusBarManager } from "./statusBarManager";
import { ConfigManager } from "./ConfigManager";

let secretBlurManager: SecretBlurManager;
let statusBarManager: StatusBarManager;
let configManager: ConfigManager;

export function activate(context: vscode.ExtensionContext): void {
  try {
    configManager = new ConfigManager();
    secretBlurManager = new SecretBlurManager(configManager);
    statusBarManager = new StatusBarManager();
  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error}`);
  }

  // Register the toggle command
  const toggleCommand = vscode.commands.registerCommand(
    "env-secrets-blur.toggleBlur",
    () => {
      secretBlurManager.toggleBlur();
      statusBarManager.updateStatus(secretBlurManager.isBlurred);
    }
  );

  // Add command to subscriptions
  context.subscriptions.push(toggleCommand);

  // Start watching for relevant files
  secretBlurManager.startWatching();

  // Initialize the status bar
  statusBarManager.initialize();
}

export function deactivate(): void {
  if (secretBlurManager) {
    secretBlurManager.dispose();
  }
  if (statusBarManager) {
    statusBarManager.dispose();
  }
}
