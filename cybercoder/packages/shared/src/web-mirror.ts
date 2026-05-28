import { createLogger, getDataDir } from './logger.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, Server } from 'node:http';
import { z } from 'zod';

const log = createLogger('web-mirror');

export interface MirrorSession {
  id: string;
  sessionId: string; // Collaboration session ID
  name: string;
  createdAt: number;
  /** WebSocket server port */
  port: number;
  /** Connected clients */
  clients: MirrorClient[];
  /** Session state */
  state: MirrorState;
}

export interface MirrorClient {
  id: string;
  type: 'cli' | 'web';
  connectedAt: number;
  lastActivity: number;
  metadata?: Record<string, any>;
}

export interface MirrorState {
  /** Current messages in the session */
  messages: any[];
  /** Active agents and their status */
  agents: Record<string, any>;
  /** Shared cursor positions */
  cursors: Record<string, { line: number; column: number; file: string }>;
  /** UI state sync */
  ui: {
    activePanel?: string;
    scrollPosition?: number;
    focusedInput?: boolean;
  };
}

const MirrorSessionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  name: z.string(),
  createdAt: z.number(),
  port: z.number(),
  clients: z.array(z.object({
    id: z.string(),
    type: z.enum(['cli', 'web']),
    connectedAt: z.number(),
    lastActivity: z.number(),
    metadata: z.record(z.unknown()).optional(),
  })),
  state: z.object({
    messages: z.array(z.unknown()),
    agents: z.record(z.unknown()),
    cursors: z.record(z.object({
      line: z.number(),
      column: z.number(),
      file: z.string(),
    })),
    ui: z.object({
      activePanel: z.string().optional(),
      scrollPosition: z.number().optional(),
      focusedInput: z.boolean().optional(),
    }),
  }),
});

/**
 * Web UI mirror system that provides real-time synchronization
 * between CLI and web interfaces for collaborative sessions.
 */
export class WebMirrorManager {
  private readonly mirrorsDir: string;
  private readonly servers: Map<string, Server> = new Map();
  private readonly sessions: Map<string, MirrorSession> = new Map();

  constructor() {
    this.mirrorsDir = join(getDataDir(), 'collaboration', 'mirrors');
    if (!existsSync(this.mirrorsDir)) mkdirSync(this.mirrorsDir, { recursive: true });
    this.loadExistingSessions();
  }

  /** Create a new mirror session for a collaboration session */
  createMirror(sessionId: string, name: string): MirrorSession {
    const mirror: MirrorSession = {
      id: crypto.randomUUID(),
      sessionId,
      name,
      createdAt: Date.now(),
      port: this.allocatePort(),
      clients: [],
      state: {
        messages: [],
        agents: {},
        cursors: {},
        ui: {},
      },
    };

    this.sessions.set(mirror.id, mirror);
    this.saveMirror(mirror);
    this.startMirrorServer(mirror);
    
    log.info('Created web mirror', { mirrorId: mirror.id, sessionId, port: mirror.port });
    return mirror;
  }

  /** Get a mirror session by ID */
  getMirror(mirrorId: string): MirrorSession | null {
    return this.sessions.get(mirrorId) || null;
  }

  /** Get mirror by collaboration session ID */
  getMirrorBySession(sessionId: string): MirrorSession | null {
    for (const mirror of this.sessions.values()) {
      if (mirror.sessionId === sessionId) return mirror;
    }
    return null;
  }

  /** Add a client to a mirror session */
  addClient(mirrorId: string, clientType: 'cli' | 'web', metadata?: Record<string, any>): string | null {
    const mirror = this.sessions.get(mirrorId);
    if (!mirror) return null;

    const client: MirrorClient = {
      id: crypto.randomUUID(),
      type: clientType,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      metadata,
    };

    mirror.clients.push(client);
    this.saveMirror(mirror);
    this.broadcastClientUpdate(mirror, 'join', client);
    
    log.info('Added client to mirror', { mirrorId, clientId: client.id, type: clientType });
    return client.id;
  }

  /** Remove a client from a mirror session */
  removeClient(mirrorId: string, clientId: string): boolean {
    const mirror = this.sessions.get(mirrorId);
    if (!mirror) return false;

    const index = mirror.clients.findIndex(c => c.id === clientId);
    if (index === -1) return false;

    const client = mirror.clients[index];
    if (!client) return false;
    
    const clientType = client.type;
    mirror.clients.splice(index, 1);
    this.saveMirror(mirror);
    this.broadcastClientUpdate(mirror, 'leave', client);
    
    log.info('Removed client from mirror', { mirrorId, clientId, type: clientType });
    return true;
  }

  /** Update mirror state */
  updateState(mirrorId: string, updates: Partial<MirrorState>): boolean {
    const mirror = this.sessions.get(mirrorId);
    if (!mirror) return false;

    mirror.state = { ...mirror.state, ...updates };
    this.saveMirror(mirror);
    this.broadcastStateUpdate(mirror);
    
    return true;
  }

  /** Update cursor position for an agent */
  updateCursor(mirrorId: string, agentId: string, position: { line: number; column: number; file: string }): boolean {
    const mirror = this.sessions.get(mirrorId);
    if (!mirror) return false;

    mirror.state.cursors[agentId] = position;
    this.saveMirror(mirror);
    this.broadcastCursorUpdate(mirror, agentId, position);
    
    return true;
  }

  /** Add a message to the mirror */
  addMessage(mirrorId: string, message: any): boolean {
    const mirror = this.sessions.get(mirrorId);
    if (!mirror) return false;

    mirror.state.messages.push(message);
    this.saveMirror(mirror);
    this.broadcastMessage(mirror, message);
    
    return true;
  }

  /** Get mirror URL for web access */
  getMirrorUrl(mirrorId: string): string | null {
    const mirror = this.sessions.get(mirrorId);
    if (!mirror) return null;
    return `http://localhost:${mirror.port}`;
  }

  /** Stop a mirror server */
  stopMirror(mirrorId: string): boolean {
    const mirror = this.sessions.get(mirrorId);
    if (!mirror) return false;

    const server = this.servers.get(mirrorId);
    if (server) {
      server.close();
      this.servers.delete(mirrorId);
    }

    this.sessions.delete(mirrorId);
    
    // Remove mirror file
    const mirrorPath = join(this.mirrorsDir, `${mirrorId}.json`);
    try {
      writeFileSync(mirrorPath, '');
    } catch (err) {
      log.warn('Failed to delete mirror file', { mirrorId, error: String(err) });
    }

    log.info('Stopped web mirror', { mirrorId });
    return true;
  }

  private allocatePort(): number {
    // Simple port allocation starting from 8080
    const usedPorts = Array.from(this.sessions.values()).map(s => s.port);
    let port = 8080;
    while (usedPorts.includes(port)) {
      port++;
    }
    return port;
  }

  private startMirrorServer(mirror: MirrorSession): void {
    const server = createServer((_req, res) => {
      // Simple HTTP server for web UI
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(this.generateWebUI(mirror));
    });

    server.listen(mirror.port, () => {
      log.info('Mirror server started', { mirrorId: mirror.id, port: mirror.port });
    });

    this.servers.set(mirror.id, server);
  }

  private generateWebUI(mirror: MirrorSession): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>CyberMind Collaborative Session - ${mirror.name}</title>
    <meta charset="utf-8">
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; background: #0a0a0a; color: #fff; }
        .header { background: #1a1a1a; padding: 1rem; border-bottom: 1px solid #333; }
        .content { display: flex; height: calc(100vh - 60px); }
        .sidebar { width: 250px; background: #1a1a1a; border-right: 1px solid #333; padding: 1rem; }
        .main { flex: 1; padding: 1rem; overflow-y: auto; }
        .message { margin-bottom: 1rem; padding: 0.5rem; border-radius: 4px; }
        .user { background: #1e3a8a; }
        .assistant { background: #14532d; }
        .system { background: #713f12; }
        .clients { margin-top: 1rem; }
        .client { padding: 0.25rem; font-size: 0.875rem; }
        .cursor { font-size: 0.75rem; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CyberMind - ${mirror.name}</h1>
        <p>Session ID: ${mirror.sessionId}</p>
    </div>
    <div class="content">
        <div class="sidebar">
            <h3>Connected Clients (${mirror.clients.length})</h3>
            <div class="clients">
                ${mirror.clients.map(client => `
                    <div class="client">
                        ${client.type === 'cli' ? '🖥️ CLI' : '🌐 Web'} - ${client.id.slice(0, 8)}…
                    </div>
                `).join('')}
            </div>
            <h3>Active Cursors</h3>
            <div class="cursors">
                ${Object.entries(mirror.state.cursors).map(([agent, cursor]) => `
                    <div class="cursor">
                        ${agent}: ${cursor.file}:${cursor.line}:${cursor.column}
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="main" id="messages">
            ${mirror.state.messages.map(msg => `
                <div class="message ${msg.role}">
                    <strong>${msg.role}:</strong> ${msg.content}
                </div>
            `).join('')}
        </div>
    </div>
    <script>
        // WebSocket connection for real-time updates would go here
        console.log('CyberMind collaborative session loaded');
    </script>
</body>
</html>`;
  }

  private broadcastClientUpdate(mirror: MirrorSession, action: 'join' | 'leave', client: MirrorClient): void {
    // In a real implementation, this would broadcast via WebSocket
    log.debug('Broadcasting client update', { mirrorId: mirror.id, action, clientId: client.id });
  }

  private broadcastStateUpdate(mirror: MirrorSession): void {
    // In a real implementation, this would broadcast via WebSocket
    log.debug('Broadcasting state update', { mirrorId: mirror.id });
  }

  private broadcastCursorUpdate(mirror: MirrorSession, agentId: string, position: any): void {
    // In a real implementation, this would broadcast via WebSocket
    log.debug('Broadcasting cursor update', { mirrorId: mirror.id, agentId, position });
  }

  private broadcastMessage(mirror: MirrorSession, message: any): void {
    // In a real implementation, this would broadcast via WebSocket
    log.debug('Broadcasting message', { mirrorId: mirror.id, messageRole: message.role });
  }

  private loadExistingSessions(): void {
    if (!existsSync(this.mirrorsDir)) return;

    // Load existing mirror sessions from disk
    const files = readdirSync(this.mirrorsDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.json')) continue;
      
      const mirrorId = file.name.slice(0, -5);
      const path = join(this.mirrorsDir, file.name);
      
      try {
        const raw = readFileSync(path, 'utf8');
        const parsed = JSON.parse(raw);
        const mirror = MirrorSessionSchema.parse(parsed);
        this.sessions.set(mirrorId, mirror);
      } catch (err) {
        log.warn('Failed to load mirror session', { mirrorId, error: String(err) });
      }
    }
  }

  private saveMirror(mirror: MirrorSession): void {
    const path = join(this.mirrorsDir, `${mirror.id}.json`);
    try {
      writeFileSync(path, JSON.stringify(mirror, null, 2), 'utf8');
    } catch (err) {
      log.error('Failed to save mirror', { mirrorId: mirror.id, error: String(err) });
    }
  }
}
