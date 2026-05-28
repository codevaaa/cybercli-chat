import React from 'react';
import { Box, Text } from 'ink';
import type { SessionMessage } from '../state/session.js';

interface Props {
  messages: SessionMessage[];
}

const ROLE_COLOR: Record<SessionMessage['role'], string> = {
  user: 'cyan',
  assistant: 'white',
  system: 'gray',
  tool: 'magenta',
};

const ROLE_LABEL: Record<SessionMessage['role'], string> = {
  user: 'you',
  assistant: 'cybermind',
  system: 'info',
  tool: 'tool',
};

export const MessageList: React.FC<Props> = ({ messages }) => {
  if (messages.length === 0) return null;
  return (
    <Box flexDirection="column" marginBottom={1}>
      {messages.map((m) => (
        <Box key={m.id} flexDirection="column" marginBottom={1}>
          <Text color={ROLE_COLOR[m.role]} bold>
            {ROLE_LABEL[m.role]}
          </Text>
          <Text color={m.role === 'system' ? 'gray' : undefined}>{m.content}</Text>
        </Box>
      ))}
    </Box>
  );
};
