import React from 'react';
import { Box, Text } from 'ink';
import type { SessionStatus } from '../state/session.js';

interface Props {
  status: SessionStatus;
  model: string;
  provider: string;
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  idle: 'ready',
  thinking: 'thinking…',
  'awaiting-approval': 'awaiting approval',
  error: 'error',
};

const STATUS_COLOR: Record<SessionStatus, string> = {
  idle: 'green',
  thinking: 'yellow',
  'awaiting-approval': 'magenta',
  error: 'red',
};

export const StatusBar: React.FC<Props> = ({ status, model, provider }) => {
  return (
    <Box marginTop={1}>
      <Text color="gray">[</Text>
      <Text color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Text>
      <Text color="gray">] </Text>
      <Text color="gray">provider=</Text>
      <Text color="cyan">{provider}</Text>
      <Text color="gray">  model=</Text>
      <Text color="cyan">{model}</Text>
      <Text color="gray">  · ? for shortcuts</Text>
    </Box>
  );
};
