const vscode = require("vscode");
const { SecretBlurManager } = require("./secretBlurManager");
const { StatusBarManager } = require("./statusBarManager");

let secretBlurManager;
let statusBarManager;

function activate(context) {
  // Initialize managers
  secretBlurManager = new SecretBlurManager();
  statusBarManager = new StatusBarManager();

  // Register the toggle command
  let toggleCommand = vscode.commands.registerCommand(
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

function deactivate() {
  if (secretBlurManager) {
    secretBlurManager.dispose();
  }
  if (statusBarManager) {
    statusBarManager.dispose();
  }
}

module.exports = {
  activate,
  deactivate,
};
