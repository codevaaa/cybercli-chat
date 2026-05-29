import React from 'react';
import { Box, Text } from 'ink';

interface HintBarProps {
  status?: 'idle' | 'thinking' | 'awaiting-approval' | 'error';
}

/**
 * Claude-Code-style bottom hint bar.
 * Shows contextual shortcuts based on current status.
 */
export const HintBar: React.FC<HintBarProps> = ({ status = 'idle' }) => {
  if (status === 'thinking') {
    return (
      <Box flexDirection="row" marginTop={1}>
        <Text color="gray">{'─'.repeat(58)}</Text>
        <Box flexDirection="row" marginTop={1}>
          <Text color="gray">? for shortcuts · </Text>
          <Text color="gray">Esc to interrupt</Text>
        </Box>
      </Box>
    );
  }

  if (status === 'awaiting-approval') {
    return (
      <Box flexDirection="row" marginTop={1}>
        <Text color="gray">{'─'.repeat(58)}</Text>
        <Box flexDirection="row" marginTop={1}>
          <Text color="gray">? for shortcuts · </Text>
          <Text color="gray">y/n to approve</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">{'─'.repeat(58)}</Text>
      <Box flexDirection="row" marginTop={1}>
        <Text color="gray">? for shortcuts · </Text>
        <Text color="gray">/ for commands</Text>
      </Box>
    </Box>
  );
};
