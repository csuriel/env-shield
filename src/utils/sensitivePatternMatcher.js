const SENSITIVE_PATTERNS = [
    'secret',
    'password',
    'token',
    'key',
    'auth',
    'credential',
    'private'
];

class SensitivePatternMatcher {
    static isSensitiveKey(key) {
        return SENSITIVE_PATTERNS.some(pattern => 
            key.toLowerCase().includes(pattern.toLowerCase())
        );
    }
}

module.exports = { SensitivePatternMatcher };