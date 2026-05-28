import { readFileTool } from './builtin/read-file.js';
import { writeFileTool } from './builtin/write-file.js';
import { editTool } from './builtin/edit.js';
import { listDirTool } from './builtin/list-dir.js';
import { grepTool } from './builtin/grep.js';
import { runCommandTool } from './builtin/run-command.js';
import type { AgentTool } from './core-types.js';

/**
 * The set of built-in tools every CyberMind session starts with. Skills can
 * register additional tools at runtime (M4). Order matters for /help listing.
 */
export function builtinTools(): AgentTool[] {
  return [readFileTool, writeFileTool, editTool, listDirTool, grepTool, runCommandTool];
}

export function findTool(name: string): AgentTool | undefined {
  return builtinTools().find((t) => t.schema.name === name);
}
