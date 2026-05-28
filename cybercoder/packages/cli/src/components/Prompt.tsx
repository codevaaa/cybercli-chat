import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface PromptProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export const Prompt: React.FC<PromptProps> = ({ onSubmit, disabled }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (text: string) => {
    onSubmit(text);
    setValue('');
  };

  if (disabled) {
    return (
      <Box>
        <Text color="gray">⏳ (waiting…)</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color="cyan">{'› '}</Text>
      <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} placeholder="Try /help or describe what you want…" />
    </Box>
  );
};
