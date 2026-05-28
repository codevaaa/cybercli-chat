import React from 'react';
import { Text } from 'ink';

/**
 * CyberMind mascot — a stocky terminal-friendly creature inspired by the Claude
 * Code mascot but recoloured in CyberMind cyan/purple.
 *
 * Rendered at ~6 lines tall to fit comfortably in the welcome card.
 */
export const Mascot: React.FC = () => {
  return (
    <Text>
      <Text color="cyan">  ▟███████▙{'\n'}</Text>
      <Text color="cyan">  █  ◉  ◉  █{'\n'}</Text>
      <Text color="cyan">  █   ╳   █{'\n'}</Text>
      <Text color="cyan">  ▜███████▛{'\n'}</Text>
      <Text color="magentaBright">    ┃┃ ┃┃   </Text>
    </Text>
  );
};
