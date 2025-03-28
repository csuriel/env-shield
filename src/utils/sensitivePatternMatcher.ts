export class SensitivePatternMatcher {
  private patterns: string[];

  constructor(patterns: string[]) {
    this.patterns = patterns;
  }

  public isSensitiveKey(key: string): boolean {
    return this.patterns.some((pattern: string) =>
      key.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}
