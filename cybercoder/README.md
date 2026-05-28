# 🚀 CyberCoder CLI

**AI-powered coding assistant for your terminal. Better than Claude Code, more affordable, and built for developers who ship.**

[![Version](https://img.shields.io/npm/v/@cybermind/cli)](https://www.npmjs.com/package/@cybermind/cli)
[![Downloads](https://img.shields.io/npm/dm/@cybermind/cli)](https://www.npmjs.com/package/@cybermind/cli)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## 🎯 The Fastest Way to Code

CyberCoder brings the power of 8+ AI providers directly to your terminal. Write, refactor, debug, and understand code without ever leaving your workflow.

### Why Developers Choose CyberCoder

| Feature | CyberCoder | Claude Code | Copilot |
|---------|-----------|-------------|---------|
| **Price** | $25/month (Pro) | $350/month | $19/month |
| **Models** | 8+ providers | 1 provider | 1 provider |
| **Local Models** | ✅ Free with Ollama | ❌ | ❌ |
| **Multi-Model Consensus** | ✅ | ❌ | ❌ |
| **Knowledge Graph** | ✅ Learns your style | ❌ | ❌ |
| **Terminal Native** | ✅ | ❌ (Electron) | ❌ (IDE only) |

## 🚀 Quick Start

### One-Command Install

```bash
# macOS / Linux
npm install -g @cybermind/cli

# Windows
npm install -g @cybermind/cli
```

### Get Your API Key

1. **Sign up** at [cybercoder.ai](https://cybercoder.ai)
2. **Go to Settings → API Keys**
3. **Create a new API key**
4. **Copy your key** (starts with `sk_cyber_...`)

### Start Coding

```bash
# Authenticate with your API key
cybercoder login

# Or set API key directly
export CYBERCODER_API_KEY=sk_cyber_your_key_here

# Ask CyberCoder anything
cybercoder ask "Create a React component for a data table with sorting"

# Refactor existing code
cybercoder refactor ./src/components

# Debug an error
cybercoder debug "Why is my useEffect running twice?"
```

## ✨ Core Features

### 🤖 Multi-Model AI Power
Access the best AI models through a single interface:
- **GPT-4o, Claude 3.5, Gemini 1.5, Groq, Cerebras**
- **Local models** via Ollama (free!)
- **Smart routing** picks the best model for each task
- **Multi-model consensus** for critical decisions

### 🧠 Knowledge Graph
CyberCoder learns your coding patterns over time:
- **Preferred languages** and frameworks
- **Coding style** (functional, OOP, etc.)
- **Project patterns** and architecture preferences
- **Context-aware** suggestions

### � Terminal-Native Experience
- **No IDE required** - works in any terminal
- **Shell integration** - bash, zsh, fish, PowerShell
- **Command history** and completion
- **Inline code preview** with syntax highlighting

### � Secure by Design
- **API keys** stored in system keychain
- **Local processing** for sensitive code analysis
- **Encrypted** API communication
- **Audit logs** for enterprise compliance

## 📚 Documentation

### Commands

```bash
# AI Assistance
cybercoder ask "Your question here"     # General coding help
cybercoder code "Write a function..."   # Generate code
cybercoder refactor <path>             # Refactor code
cybercoder debug "Error message"        # Debug issues
cybercoder explain <path>              # Explain code

# Knowledge
cybercoder learn <technology>          # Learn something new
cybercoder review <path>               # Code review

# Session
cybercoder status                      # Check session status
cybercoder usage                      # View usage stats
cybercoder logout                     # End session
```

### Configuration

Create `~/.cybercoder/config.json`:

```json
{
  "default_model": "claude-3-5-sonnet",
  "auto_approve": false,
  "streaming": true,
  "theme": "dark",
  "editor": "vscode"
}
```

### Environment Variables

```bash
export CYBERCODER_API_KEY=sk_cyber_...     # Your API key
export CYBERCODER_MODEL=gpt-4o             # Default model
export CYBERCODER_BASE_URL=https://api.cybercoder.ai  # Custom endpoint
```

## 💰 Pricing

### Free
- **100 requests/month**
- **Local models** (Ollama)
- **Basic code generation**
- **Community support**

### Pro - $25/month
- **5,000 requests/month**
- **All AI providers**
- **Multi-model consensus**
- **Knowledge graph learning**
- **Priority support**

### Enterprise
- **Unlimited requests**
- **Custom model hosting**
- **SSO & advanced security**
- **Dedicated infrastructure**
- **SLA guarantees**

[View full pricing →](https://cybercoder.ai/pricing)

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/stilcybermindcli/cybercoder.git
cd cybercoder

# Install dependencies
pnpm install

# Run in dev mode
pnpm dev

# Build
pnpm build

# Run tests
pnpm test
```

## 🔌 API Reference

CyberCoder provides a REST API for programmatic access:

```bash
# Authenticate
curl -X POST https://api.cybercoder.ai/api/v1/cli/auth \
  -H "Content-Type: application/json" \
  -d '{"api_key": "sk_cyber_...", "machine_id": "..."}'

# Send a completion request
curl -X POST https://api.cybercoder.ai/api/v1/cli/complete \
  -H "Authorization: Bearer sk_cyber_..." \
  -H "X-CLI-Session: sess_..." \
  -d '{"prompt": "Write a Python function to..."}'
```

[View API docs →](https://cybercoder.ai/docs/api)

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

MIT © CyberCoder

---

**Made with ❤️ for developers who ship.**

[Website](https://cybercoder.ai) · [Docs](https://cybercoder.ai/docs) · [Discord](https://discord.gg/cybercoder) · [Twitter](https://twitter.com/cybercoder)
