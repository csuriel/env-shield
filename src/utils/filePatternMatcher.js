const vscode = require("vscode");
const path = require("path");

class FilePatternMatcher {
  static shouldProcessFile(fileName) {
    // Get configuration
    const config = vscode.workspace.getConfiguration("env-secrets-blur");
    const additionalFiles = config.get("additionalFiles") || [];
    const sensitiveFiles = config.get("sensitiveFiles") || [];

    // Check if file is .env or .env.*
    if (path.basename(fileName).startsWith(".env")) {
      return true;
    }

    // Check if file is in additional files or sensitive files list
    return additionalFiles.some((pattern) => new RegExp(pattern).test(fileName)) ||
           sensitiveFiles.some((pattern) => new RegExp(pattern).test(fileName));
  }

  static isSensitiveContentFile(fileName) {
    const config = vscode.workspace.getConfiguration("env-secrets-blur");
    const sensitiveFiles = config.get("sensitiveFiles") || [];
    return sensitiveFiles.some((pattern) => new RegExp(pattern).test(fileName));
  }
}

module.exports = { FilePatternMatcher };
