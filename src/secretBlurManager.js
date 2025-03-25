const vscode = require("vscode");
const { FilePatternMatcher } = require("./utils/filePatternMatcher");
const { SensitivePatternMatcher } = require("./utils/sensitivePatternMatcher");

class SecretBlurManager {
  constructor() {
    this._isBlurred = true;
    this.decorationType = this.createDecorationType();
  }

  get isBlurred() {
    return this._isBlurred;
  }

  startWatching() {
    // Watch for .env files and configured JSON files
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      "**/{.env,.env.*,*.json}"
    );

    this.fileWatcher.onDidChange(this.handleFileChange.bind(this));
    this.fileWatcher.onDidCreate(this.handleFileChange.bind(this));

    // Initial decoration of open editors
    vscode.window.visibleTextEditors.forEach((editor) => {
      this.updateDecorations(editor);
    });

    // Handle future editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        this.updateDecorations(editor);
      }
    });
  }

  toggleBlur() {
    this._isBlurred = !this._isBlurred;
    vscode.window.visibleTextEditors.forEach((editor) => {
      this.updateDecorations(editor);
    });
  }

  async handleFileChange(uri) {
    const editor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document.uri.toString() === uri.toString()
    );
    if (editor) {
      this.updateDecorations(editor);
    }
  }

  createDecorationType() {
    return vscode.window.createTextEditorDecorationType({
      textDecoration: "none; filter: blur(4px);",
    });
  }

  updateDecorations(editor) {
    const document = editor.document;
    if (!FilePatternMatcher.shouldProcessFile(document.fileName)) {
      return;
    }

    const text = document.getText();
    const decorationsArray = [];

    // Check if this is a JSON file
    const isJsonFile = document.fileName.toLowerCase().endsWith('.json');

    if (isJsonFile) {
      try {
        // Try to parse the entire document as JSON to validate
        JSON.parse(text);
      } catch (e) {
        // If it's not valid JSON, don't process
        return;
      }

      // For JSON files, find values using a state machine approach
      const lines = text.split("\n");
      const isSensitiveFile = FilePatternMatcher.isSensitiveContentFile(document.fileName);
      let inArrayDepth = 0;
      
      lines.forEach((line, index) => {
        // For sensitive pattern files, only blur values of sensitive keys
        if (isSensitiveFile) {
          const propertyMatch = line.match(/"([^"]+)"\s*:\s*"([^"]+)"/);
          if (propertyMatch) {
            const [_, key, value] = propertyMatch;
            if (SensitivePatternMatcher.isSensitiveKey(key)) {
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
          
          if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
            // Toggle property name state if we find an unescaped quote
            isInPropertyName = !isInPropertyName;
          } else if (char === '[' && !isInPropertyName) {
            inArrayDepth++;
          } else if (char === ']' && !isInPropertyName) {
            inArrayDepth = Math.max(0, inArrayDepth - 1);
          }
        }
        
        // Look for values to blur
        const valueRegex = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|-?\d+\.?\d*|\btrue\b|\bfalse\b|\bnull\b/g;
        let match;
        
        while ((match = valueRegex.exec(line)) !== null) {
          const value = match[0];
          const valueIndex = match.index;
          const beforeValue = line.substring(0, valueIndex).trim();
          
          // Only blur if this is not a property name (doesn't have a colon right after)
          const afterValue = line.substring(valueIndex + value.length).trim();
          if (!afterValue.startsWith(':')) {
            const startPos = new vscode.Position(index, valueIndex);
            const endPos = new vscode.Position(index, valueIndex + value.length);
            decorationsArray.push({
              range: new vscode.Range(startPos, endPos)
            });
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
          decorationsArray.push({
            range: new vscode.Range(startPos, endPos),
          });
        }
      });
    }

    if (this._isBlurred) {
      editor.setDecorations(this.decorationType, decorationsArray);
    } else {
      editor.setDecorations(this.decorationType, []);
    }
  }

  dispose() {
    this.decorationType.dispose();
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
  }
}

module.exports = { SecretBlurManager };
