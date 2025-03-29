import * as vscode from "vscode";
import { EnvShieldConfig } from "./types";
import { DEFAULT_BLUR_STRENGTH } from "./constants";

export class ConfigManager {
  private config: EnvShieldConfig;
  private readonly onConfigChanged: vscode.EventEmitter<EnvShieldConfig> =
    new vscode.EventEmitter<EnvShieldConfig>();
  public readonly onDidChangeConfiguration = this.onConfigChanged.event;

  constructor() {
    this.config = this.loadConfiguration();
    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("env-shield")) {
        this.config = this.loadConfiguration();
        this.onConfigChanged.fire(this.config);
      }
    });
  }

  private loadConfiguration(): EnvShieldConfig {
    const config = vscode.workspace.getConfiguration("env-shield");

    return {
      blurStrength: config.get("blurStrength", DEFAULT_BLUR_STRENGTH),
      sensitiveFiles: config.get("sensitiveFiles", []),
      additionalFiles: config.get("additionalFiles", []),
      customPatterns: config.get("customPatterns", []),
    };
  }

  public getConfig(): EnvShieldConfig {
    return this.config;
  }
}
