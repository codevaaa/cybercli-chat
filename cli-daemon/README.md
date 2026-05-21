# CyberCli Local CLI Daemon Bridge

This lightweight local daemon securely connects your local computer to the CyberCli web interface. Once running, it enables the AI assistant to read/write files and execute developer commands locally, but **only after you explicitly approve each action in this terminal prompt**.

## Installation

Ensure you have Node.js (version 22 or higher recommended) installed.

1. Navigate to this directory in your terminal:
   ```bash
   cd cli-daemon
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Start the daemon using your API key from the CyberCli settings panel (under the Developer tab):

```bash
node daemon.js --key=sk_cyber_your_secret_api_key_here
```

### Configuration Options

You can specify a custom server URL or customize the startup using flags:

- `--key=...` or `-k ...`: Your CyberCli API key (e.g. `sk_cyber_...`). Required.
- `--server=...` or `-s ...`: Custom server endpoint. Defaults to `ws://localhost:3000/api/v1/daemon`.

Example connecting to a staging or production server:
```bash
node daemon.js --key=sk_cyber_xxx --server=wss://api.cybermindcli.com/api/v1/daemon
```

## Security & Human-in-the-Loop

The CyberCli daemon employs a strict **human-in-the-loop** authorization mechanism:
1. When the AI requests to read a file, write a file, or execute a command, the daemon prints the exact request to your console.
2. The daemon pauses execution and prompts you: `[CyberCli] Request: ... Approve? (y/n)`.
3. The request will **only** execute if you type `y` or `yes`.
4. Any other input (or pressing Enter without typing `y`) rejects the request, keeping your environment completely safe.
