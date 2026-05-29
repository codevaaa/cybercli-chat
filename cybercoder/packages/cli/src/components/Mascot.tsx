import React from 'react';
import { Text } from 'ink';

/**
 * Claude-Code-style pixel art mascot for CyberCoder.
 * Stocky terminal-friendly creature with legs.
 */
export const Mascot: React.FC = () => {
  return (
    <Text>
      <Text color="cyan">    ▛███▜{'\n'}</Text>
      <Text color="cyan">   ▟█████▙{'\n'}</Text>
      <Text color="cyan">  ▐▛     ▜▌{'\n'}</Text>
      <Text color="cyan">  ▐  ◉ ◉  ▌{'\n'}</Text>
      <Text color="cyan">  ▐   ╳   ▌{'\n'}</Text>
      <Text color="cyan">   ▜█████▛{'\n'}</Text>
      <Text color="magentaBright">    ▟▙   ▟▙{'\n'}</Text>
      <Text color="magentaBright">    █    █</Text>
    </Text>
  );
};
