export const SECRET_PATTERNS = [
  // AWS
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
  // GitHub
  { name: 'GitHub Token', regex: /(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}/g },
  // Stripe
  { name: 'Stripe Secret Key', regex: /sk_(live|test)_[0-9a-zA-Z]{24}/g },
  // Generic / OpenAI API Key
  { name: 'Generic API Key (sk-...)', regex: /sk-[a-zA-Z0-9-]{32,64}/g },
  // Codeva / CyberCoder API Key
  { name: 'CyberCoder API Key', regex: /sk_cyber_[a-zA-Z0-9]{24,64}/g },
  // Google / GCP
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/g },
  // RSA Private Key
  { name: 'RSA Private Key', regex: /-----BEGIN RSA PRIVATE KEY-----(?:.|\n)*?-----END RSA PRIVATE KEY-----/g }
];

export class SecretScanner {
  static redact(text) {
    if (!text || typeof text !== 'string') return text;
    let redactedText = text;
    for (const pattern of SECRET_PATTERNS) {
      redactedText = redactedText.replace(pattern.regex, `***[REDACTED ${pattern.name}]***`);
    }
    return redactedText;
  }
}
