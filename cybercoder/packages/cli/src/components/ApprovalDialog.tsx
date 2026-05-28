import React from 'react';
import { Box, Text, useInput } from 'ink';

export interface PendingApproval {
  toolName: string;
  summary: string;
  destructive: boolean;
  /** Resolve with the user's choice. */
  resolve: (decision: 'allow' | 'deny' | 'allow-session' | 'allow-persistent') => void;
}

interface Props {
  pending: PendingApproval;
}

/**
 * Inline Ink approval dialog. Rendered above the prompt whenever the agent
 * loop is waiting for the user to allow/deny a tool call.
 *
 * Keys:
 *   y  → allow once
 *   s  → allow for this session
 *   t  → trust persistently (writes to ~/.cybermind/trust.json)
 *   n  → deny
 */
export const ApprovalDialog: React.FC<Props> = ({ pending }) => {
  useInput((input) => {
    const key = input.toLowerCase();
    if (key === 'y') pending.resolve('allow');
    else if (key === 's') pending.resolve('allow-session');
    else if (key === 't') pending.resolve('allow-persistent');
    else if (key === 'n') pending.resolve('deny');
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={pending.destructive ? 'red' : 'yellow'} paddingX={1}>
      <Text bold>
        {pending.destructive ? '⚠ ' : ''}
        Approve tool: <Text color="cyan">{pending.toolName}</Text>
      </Text>
      <Text>{pending.summary}</Text>
      <Box marginTop={1}>
        <Text dimColor>
          [y] allow once · [s] allow this session · [t] trust persistently · [n] deny
        </Text>
      </Box>
    </Box>
  );
};
