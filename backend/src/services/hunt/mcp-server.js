#!/usr/bin/env node
/**
 * Codeva Cybersecurity Skills MCP Server
 *
 * Exposes 754 cybersecurity skills from Anthropic-Cybersecurity-Skills
 * as a Model Context Protocol (MCP) server.
 *
 * Compatible with:
 *   - Claude Code, GitHub Copilot, Cursor, Gemini CLI
 *   - Codeva Hunter Engine (internal)
 *   - Any MCP-compatible AI harness
 *
 * Usage:
 *   node mcp-server.js
 *   # or via npx in .kiro/settings/mcp.json:
 *   {
 *     "cybersecurity-skills": {
 *       "command": "node",
 *       "args": ["path/to/mcp-server.js"]
 *     }
 *   }
 */

import { createServer } from 'http'
import { CybersecurityMCP, MCP_TOOLS } from './CybersecurityMCP.js'

const PORT = process.env.MCP_PORT || 3099

// ── MCP JSON-RPC handler ──────────────────────────────────────────────────────
async function handleMCPRequest(body) {
  const { jsonrpc, id, method, params } = body

  if (jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' } }
  }

  // initialize
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'codeva-cybersecurity-skills',
          version: '1.0.0',
          description: '754 cybersecurity skills mapped to MITRE ATT&CK, NIST CSF 2.0, D3FEND. 26 security domains.',
        },
      },
    }
  }

  // tools/list
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0', id,
      result: {
        tools: MCP_TOOLS.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    }
  }

  // tools/call
  if (method === 'tools/call') {
    const { name, arguments: args } = params || {}
    const tool = MCP_TOOLS.find(t => t.name === name)

    if (!tool) {
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Tool '${name}' not found` } }
    }

    try {
      const result = await tool.handler(args || {})
      return {
        jsonrpc: '2.0', id,
        result: {
          content: [{
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          }],
          isError: false,
        },
      }
    } catch (err) {
      return {
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        },
      }
    }
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method '${method}' not found` } }
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      server: 'codeva-cybersecurity-skills-mcp',
      tools: MCP_TOOLS.length,
      skills: 754,
      domains: 26,
    }))
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405); res.end('Method Not Allowed'); return
  }

  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body)
      const response = await handleMCPRequest(parsed)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(response))
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        jsonrpc: '2.0', id: null,
        error: { code: -32700, message: 'Parse error' },
      }))
    }
  })
})

server.listen(PORT, () => {
  console.log(`[CybersecurityMCP] Server running on http://localhost:${PORT}`)
  console.log(`[CybersecurityMCP] Tools: ${MCP_TOOLS.length} | Skills: 754 | Domains: 26`)
  console.log(`[CybersecurityMCP] Health: http://localhost:${PORT}/health`)
})

export default server
