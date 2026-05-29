import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import gradient from 'gradient-string';
import { CYBERMIND_VERSION, CYBERMIND_NAME } from '@cybermind/shared';
import { Mascot } from './Mascot.js';

const cyber = gradient(['#00e5ff', '#7b5cff', '#ff5c8a']);

interface OnboardingProps {
  onComplete: (method: string) => void;
}

const LOGIN_METHODS = [
  {
    id: 'cybercli',
    label: 'CyberCli account with subscription',
    desc: 'Pro, Max, Team, or Enterprise',
  },
  {
    id: 'apikey',
    label: 'API key (BYOK)',
    desc: 'Bring Your Own Key — API usage billing',
  },
  {
    id: 'thirdparty',
    label: '3rd-party platform',
    desc: 'OpenRouter, Groq, or local Ollama',
  },
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [selected, setSelected] = useState(0);

  useInput((_, key) => {
    if (key.upArrow) {
      setSelected((s) => Math.max(0, s - 1));
    } else if (key.downArrow) {
      setSelected((s) => Math.min(LOGIN_METHODS.length - 1, s + 1));
    } else if (key.return) {
      const method = LOGIN_METHODS[selected];
      if (method) onComplete(method.id);
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>{cyber(`╭─ Welcome to ${CYBERMIND_NAME} Code v${CYBERMIND_VERSION} ─────────────────────────────╮`)}</Text>

      <Box flexDirection="row" marginTop={1}>
        <Box flexDirection="column" width={28} paddingLeft={2}>
          <Mascot />
        </Box>
        <Box flexDirection="column" flexGrow={1} paddingRight={2}>
          <Text bold color="white">
            {CYBERMIND_NAME} Code can be used with your CyberCli subscription or
            billed based on API usage through your own keys.
          </Text>
          <Box marginTop={1} />
          <Text bold color="#D97736">Select login method:</Text>
          <Box marginTop={1} />

          {LOGIN_METHODS.map((method, i) => (
            <Box key={method.id} flexDirection="row" marginBottom={1}>
              <Text>
                {i === selected ? (
                  <Text color="#D97736">{'› '}</Text>
                ) : (
                  <Text color="gray">{'  '}</Text>
                )}
                <Text color={i === selected ? 'white' : 'gray'} bold={i === selected}>
                  {i + 1}. {method.label}
                </Text>
              </Text>
              <Box marginTop={0} />
              <Text color="gray">   {method.desc}</Text>
            </Box>
          ))}

          <Box marginTop={1} />
          <Text color="gray">Use arrow keys to navigate, Enter to select</Text>
        </Box>
      </Box>

      <Text>{cyber('╰──────────────────────────────────────────────────────────────────╯')}</Text>
    </Box>
  );
};
