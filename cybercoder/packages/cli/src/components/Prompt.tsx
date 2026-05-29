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
      <Box flexDirection="row">
        <Text color="gray">{'>'} </Text>
        <Text color="gray">(thinking…)</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="row">
      <Text color="cyan">{'>'} </Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder="write a test for <filepath>"
      />
    </Box>
  );
};
