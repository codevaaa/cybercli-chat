---
name: codevaa-security-practices
description: Secure defaults for React and Node.js full-stack applications.
source: CodeVaa-authored
revision: internal-v1
license: CodeVaa-authored
---

# Security Practices

- Treat all browser input, uploaded files, model output, and third-party responses as untrusted.
- Validate types, lengths, formats, and allowed values on the server. Use parameterized database operations.
- Keep API keys and signing secrets server-side. Never put secrets in `VITE_*`, source maps, client bundles, prompts, or logs.
- Use secure, HTTP-only, SameSite cookies for browser sessions and CSRF protection where cookie authentication is used.
- Set an explicit CORS origin allowlist, security headers, request limits, rate limits, and upstream timeouts.
- Render user content as text by default. Sanitize any intentionally supported HTML and avoid unsafe DOM APIs.
- Restrict file paths to a dedicated workspace; reject traversal, symlinks, special files, and oversized uploads.
- Run generated or user-supplied code in a container with no network, a read-only root, resource limits, no capabilities, and one dedicated writable project mount.
- Avoid shell interpolation. Use argument arrays and a command allowlist.
- Test that unauthorized requests fail, secrets do not reach responses/logs, and sandbox boundaries hold.
