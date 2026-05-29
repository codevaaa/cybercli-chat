import React from 'react';
import { Box, Text } from 'ink';
import gradient from 'gradient-string';
import { CYBERMIND_VERSION, CYBERMIND_NAME } from '@cybermind/shared';
import { Mascot } from './Mascot.js';

const cyber = gradient(['#00e5ff', '#7b5cff', '#ff5c8a']);

interface WelcomeProps {
  provider?: string;
  model?: string;
}

/**
 * Claude-Code-style welcome card with the CyberMind mascot, a tips column,
 * and a "What's new" excerpt.
 */
export const Welcome: React.FC<WelcomeProps> = ({ provider = 'auto', model = 'auto' }) => {
  // Use provider in status display
  void provider;
  const cwd = process.cwd();
  const user = process.env.USER ?? process.env.USERNAME ?? 'friend';

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>{cyber(`╭─ ${CYBERMIND_NAME} Code v${CYBERMIND_VERSION} ───────────────────────────────────────╮`)}</Text>
      <Box flexDirection="row">
        <Box flexDirection="column" width={38} paddingLeft={2} paddingRight={2}>
          <Text bold color="white">  Welcome back, {user}!</Text>
          <Box marginTop={1} />
          <Mascot />
          <Box marginTop={1} />
          <Text color="gray">  {model} · API Usage Billing · {user}'s</Text>
          <Text color="gray">  Individual Org</Text>
          <Box marginTop={1} />
          <Text color="gray">  {cwd}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          <Text color="#ff9f43" bold>Tips for getting started</Text>
          <Text>Run <Text color="cyan">/init</Text> to create an AGENTS.md for your project.</Text>
          <Text>Type <Text color="cyan">/help</Text> to list every command.</Text>
          <Text>Type <Text color="cyan">/theme</Text> to change the color scheme.</Text>
          <Box marginTop={1} />
          <Text color="#ff9f43" bold>What's new</Text>
          <Text color="gray">M1 — welcome screen, slash command framework.</Text>
          <Text color="gray">M2 — 8+ AI providers (Anthropic, OpenAI, Groq, Gemini).</Text>
          <Text color="gray">M3 — multi-model Council Mode & conversation branching.</Text>
          <Text color="gray">See <Text color="cyan">/release-notes</Text> for the full changelog.</Text>
        </Box>
      </Box>
      <Text>{cyber('╰──────────────────────────────────────────────────────────────────╯')}</Text>
    </Box>
  );
};
