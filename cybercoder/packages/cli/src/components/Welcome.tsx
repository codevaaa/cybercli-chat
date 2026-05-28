import React from 'react';
import { Box, Text } from 'ink';
import gradient from 'gradient-string';
import { CYBERMIND_VERSION } from '@cybermind/shared';
import { Mascot } from './Mascot.js';

const cyber = gradient(['#00e5ff', '#7b5cff', '#ff5c8a']);

/**
 * Claude-Code-style welcome card with the CyberMind mascot, a tips column,
 * and a "What's new" excerpt. Pre-M2 the model/org line is a placeholder.
 */
export const Welcome: React.FC = () => {
  const cwd = process.cwd();
  const user = process.env.USER ?? process.env.USERNAME ?? 'friend';

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>{cyber(`╭─ CyberMind v${CYBERMIND_VERSION} ─────────────────────────────────────────────╮`)}</Text>
      <Box flexDirection="row">
        <Box flexDirection="column" width={36} paddingLeft={2} paddingRight={2}>
          <Text bold color="white">  Welcome back, {user}!</Text>
          <Box marginTop={1} />
          <Mascot />
          <Box marginTop={1} />
          <Text color="gray">  auto · BYOK · {process.platform}</Text>
          <Text color="gray">  {cwd}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          <Text color="yellow" bold>Tips for getting started</Text>
          <Text>Run <Text color="cyan">/init</Text> to create an AGENTS.md for your project.</Text>
          <Text>Type <Text color="cyan">/help</Text> to list every command.</Text>
          <Box marginTop={1} />
          <Text color="yellow" bold>What's new</Text>
          <Text color="gray">M1 — welcome screen, slash command framework, /help /clear /exit.</Text>
          <Text color="gray">Coming next: M2 providers (Anthropic + Ollama), multi-model consensus.</Text>
          <Text color="gray">See /release-notes for the full changelog.</Text>
        </Box>
      </Box>
      <Text>{cyber('╰──────────────────────────────────────────────────────────────────╯')}</Text>
    </Box>
  );
};
