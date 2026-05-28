import { spawn } from 'node:child_process';
import type { AgentTool } from '../types.js';

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_BYTES = 200_000;

const SHELL = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
const SHELL_ARG = process.platform === 'win32' ? '-NoProfile' : '-lc';

export const runCommandTool: AgentTool = {
  schema: {
    name: 'run_command',
    description:
      'Execute a shell command in the user\'s default shell (PowerShell on Windows, bash on Unix). Returns combined stdout/stderr (up to ~200KB) and the exit code. Always destructive — requires approval.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command line to run.' },
        cwd: { type: 'string', description: 'Optional working directory.' },
        timeout_ms: { type: 'integer', description: 'Optional timeout (defaults 60s).' },
      },
      required: ['command'],
    },
  },
  destructive: true,
  async execute(input, ctx) {
    const command = String(input.command ?? '');
    if (!command) throw new Error('run_command requires a command');
    const cwd = (input.cwd as string | undefined) ?? ctx.cwd;
    const timeoutMs = Number(input.timeout_ms ?? DEFAULT_TIMEOUT_MS);

    return await new Promise<string>((resolveResult) => {
      const child = spawn(SHELL, [SHELL_ARG, command], {
        cwd,
        env: process.env,
        windowsHide: true,
      });

      const chunks: Buffer[] = [];
      let totalBytes = 0;
      let truncated = false;

      const onData = (buf: Buffer) => {
        if (totalBytes >= MAX_OUTPUT_BYTES) {
          truncated = true;
          return;
        }
        const room = MAX_OUTPUT_BYTES - totalBytes;
        const slice = buf.byteLength > room ? buf.subarray(0, room) : buf;
        chunks.push(slice);
        totalBytes += slice.byteLength;
        if (totalBytes >= MAX_OUTPUT_BYTES) {
          truncated = true;
          child.kill();
        }
      };
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);

      const killer = setTimeout(() => {
        truncated = true;
        chunks.push(Buffer.from(`\n[timeout: killed after ${timeoutMs}ms]\n`));
        child.kill();
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(killer);
        const out = Buffer.concat(chunks).toString('utf8');
        const tail = truncated ? `\n[truncated at ${MAX_OUTPUT_BYTES} bytes]` : '';
        resolveResult(`exit ${code ?? 0}\n${out}${tail}`);
      });
      child.on('error', (err) => {
        clearTimeout(killer);
        resolveResult(`exit -1\n[spawn error] ${err.message}`);
      });
    });
  },
};
