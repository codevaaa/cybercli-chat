import React from 'react';
import { Box, Text } from 'ink';

export const ExitConfirm: React.FC = () => (
  <Box marginTop={1}>
    <Text color="yellow">Press Ctrl+C again within 2s to exit, or type /exit.</Text>
  </Box>
);
