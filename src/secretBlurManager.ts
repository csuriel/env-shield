import * as vscode from "vscode";
import { FilePatternMatcher } from "./utils/filePatternMatcher";
import { SensitivePatternMatcher } from "./utils/sensitivePatternMatcher";
import { EnvShieldConfig } from "./types";
import { DEFAULT_BLUR_STRENGTH, SENSITIVE_PATTERNS } from "./constants";
import { ConfigManager } from "./ConfigManager";

export class SecretBlurManager {
  private _isBlurred: boolean = true;
  private decorationType: vscode.TextEditorDecorationType;
  private fileWatcher?: vscode.FileSystemWatcher;
  private config: EnvShieldConfig;
  private filePatternMatcher: FilePatternMatcher;
  private sensitivePatternMatcher: SensitivePatternMatcher;
  private configManager: ConfigManager;
  private disposables: vscode.Disposable[] = [];

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.decorationType = this.createDecorationType();
    this.config = configManager.getConfig();
    this.filePatternMatcher = new FilePatternMatcher(this.config);
    this.sensitivePatternMatcher = new SensitivePatternMatcher([
      ...this.config.customPatterns,
      ...this.config.additionalFiles,
      ...this.config.sensitiveFiles,
      ...SENSITIVE_PATTERNS,
    ]);

    // Subscribe to configuration changes
    this.disposables.push(
      configManager.onDidChangeConfiguration((newConfig) => {
        this.config = newConfig;
        this.filePatternMatcher = new FilePatternMatcher(newConfig);
        this.sensitivePatternMatcher = new SensitivePatternMatcher([
          ...newConfig.customPatterns,
          ...SENSITIVE_PATTERNS,
        ]);
        // Recreate decoration type with new blur strength
        this.decorationType.dispose();
        this.decorationType = this.createDecorationType();
        // Update decorations in all visible editors
        vscode.window.visibleTextEditors.forEach((editor) => {
          this.updateDecorations(editor);
        });
      })
    );
  }

  public get isBlurred(): boolean {
    return this._isBlurred;
  }

  public startWatching(): void {
    // Watch for .env files and configured JSON files
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      "**/{.env,.env.*,*.json}"
    );

    this.disposables.push(
      this.fileWatcher.onDidChange(this.handleFileChange.bind(this)),
      this.fileWatcher.onDidCreate(this.handleFileChange.bind(this))
    );

    // Initial decoration of open editors
    vscode.window.visibleTextEditors.forEach((editor) => {
      this.updateDecorations(editor);
    });

    // Handle future editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.updateDecorations(editor);
        }
      })
    );
  }

  public toggleBlur(): void {
    this._isBlurred = !this._isBlurred;
    vscode.window.visibleTextEditors.forEach((editor) => {
      this.updateDecorations(editor);
    });
  }

  public async handleFileChange(uri: vscode.Uri): Promise<void> {
    const editor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document.uri.toString() === uri.toString()
    );
    if (editor) {
      this.updateDecorations(editor);
    }
  }

  private createDecorationType(): vscode.TextEditorDecorationType {
    const blurStrength =
      this.configManager.getConfig().blurStrength ?? DEFAULT_BLUR_STRENGTH;
    return vscode.window.createTextEditorDecorationType({
      textDecoration: `none; filter: blur(${blurStrength}px);`,
    });
  }

  private updateDecorations(editor: vscode.TextEditor): void {
    const document = editor.document;
    if (!this.filePatternMatcher.shouldProcessFile(document.fileName)) {
      return;
    }

    const text = document.getText();
    const decorationsArray: vscode.Range[] = [];

    // Check if this is a JSON file
    const isJsonFile = document.fileName.toLowerCase().endsWith(".json");

    if (isJsonFile) {
      try {
        // Try to parse the entire document as JSON to validate
        JSON.parse(text);
      } catch {
        // If it's not valid JSON, don't process
        return;
      }

      // For JSON files, find values using a state machine approach
      const lines = text.split("\n");
      const isSensitiveFile = this.filePatternMatcher.isSensitiveContentFile(
        document.fileName
      );
      let inArrayDepth = 0;

      lines.forEach((line, index) => {
        // For sensitive pattern files, only blur values of sensitive keys
        if (isSensitiveFile) {
          const propertyMatch = line.match(/"([^"]+)"\s*:\s*"([^"]+)"/);
          if (propertyMatch) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [_, key, value] = propertyMatch;
            if (this.sensitivePatternMatcher.isSensitiveKey(key)) {
              const valueStart = line.indexOf(value);
              const range = new vscode.Range(
                index,
                valueStart,
                index,
                valueStart + value.length
              );
              decorationsArray.push(range);
            }
          }
          return;
        }

        // For non-sensitive files (e.g. .env files), use existing logic
        let isInPropertyName = false;

        // Process the line character by character to maintain state
        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
            // Toggle property name state if we find an unescaped quote
            isInPropertyName = !isInPropertyName;
          } else if (char === "[" && !isInPropertyName) {
            inArrayDepth++;
          } else if (char === "]" && !isInPropertyName) {
            inArrayDepth = Math.max(0, inArrayDepth - 1);
          }
        }

        // Look for values to blur
        const valueRegex =
          /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|-?\d+\.?\d*|\btrue\b|\bfalse\b|\bnull\b/g;
        let match;

        while ((match = valueRegex.exec(line)) !== null) {
          const value = match[0];
          const valueIndex = match.index;

          // Only blur if this is not a property name (doesn't have a colon right after)
          const afterValue = line.substring(valueIndex + value.length).trim();
          if (!afterValue.startsWith(":")) {
            const startPos = new vscode.Position(index, valueIndex);
            const endPos = new vscode.Position(
              index,
              valueIndex + value.length
            );
            decorationsArray.push(new vscode.Range(startPos, endPos));
          }
        }
      });
    } else {
      // For non-JSON files, use existing logic
      const lines = text.split("\n");
      lines.forEach((line, index) => {
        const valueMatch = line.match(/[=:]\s*(.+)$/);
        if (valueMatch) {
          const startPos = new vscode.Position(
            index,
            line.indexOf(valueMatch[1])
          );
          const endPos = new vscode.Position(index, line.length);
          decorationsArray.push(new vscode.Range(startPos, endPos));
        }
      });
    }

    if (this._isBlurred) {
      editor.setDecorations(this.decorationType, decorationsArray);
    } else {
      editor.setDecorations(this.decorationType, []);
    }
  }

  public dispose(): void {
    this.decorationType.dispose();
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
  }
}
