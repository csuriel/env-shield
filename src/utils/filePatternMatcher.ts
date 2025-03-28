import * as path from "path";
import { EnvShieldConfig } from "../types";

export class FilePatternMatcher {
  private filesToMatchPatterns: string[];
  private sensitiveFilesPatterns: string[];

  constructor(config: EnvShieldConfig) {
    this.filesToMatchPatterns = [
      ...(config.additionalFiles || []),
      ...(config.sensitiveFiles || []),
      ...(config.customPatterns || []),
    ];

    this.sensitiveFilesPatterns = config.sensitiveFiles || [];
  }

  public shouldProcessFile(fileName: string): boolean {
    return (
      path.basename(fileName).startsWith(".env") ||
      this.filesToMatchPatterns.some((pattern) =>
        new RegExp(pattern).test(fileName)
      )
    );
  }

  public isSensitiveContentFile(fileName: string): boolean {
    return this.sensitiveFilesPatterns.some((pattern) =>
      new RegExp(pattern).test(fileName)
    );
  }
}
