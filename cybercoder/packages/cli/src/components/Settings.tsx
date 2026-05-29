import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import gradient from 'gradient-string';

const cyber = gradient(['#00e5ff', '#7b5cff', '#ff5c8a']);

interface SettingsProps {
  onClose: () => void;
}

const SETTINGS_CATEGORIES = [
  {
    id: 'general',
    label: 'General',
    items: [
      { key: 'welcome', label: 'Show welcome screen on startup', value: true },
      { key: 'auto_approve', label: 'Auto-approve non-destructive changes', value: false },
      { key: 'telemetry', label: 'Enable telemetry', value: true },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    items: [
      { key: 'theme', label: 'Theme', value: 'Dark mode' },
      { key: 'syntax', label: 'Syntax highlighting', value: 'Monokai Extended' },
      { key: 'mascot', label: 'Show mascot', value: true },
    ],
  },
  {
    id: 'ai',
    label: 'AI & Providers',
    items: [
      { key: 'default_provider', label: 'Default provider', value: 'auto' },
      { key: 'default_model', label: 'Default model', value: 'auto' },
      { key: 'council_mode', label: 'Council Mode default', value: false },
    ],
  },
  {
    id: 'safety',
    label: 'Safety',
    items: [
      { key: 'confirm_destructive', label: 'Confirm destructive operations', value: true },
      { key: 'max_tokens', label: 'Max tokens per request', value: '4096' },
    ],
  },
];

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [catIdx, setCatIdx] = useState(0);
  const [itemIdx, setItemIdx] = useState(0);

  const currentCat = SETTINGS_CATEGORIES[catIdx];

  useInput((_, key) => {
    if (key.escape || (key.ctrl && _ === 'c')) {
      onClose();
      return;
    }
    if (!currentCat) return;
    if (key.upArrow) {
      setItemIdx((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setItemIdx((i) => Math.min(currentCat.items.length - 1, i + 1));
    } else if (key.leftArrow) {
      setCatIdx((c) => Math.max(0, c - 1));
      setItemIdx(0);
    } else if (key.rightArrow) {
      setCatIdx((c) => Math.min(SETTINGS_CATEGORIES.length - 1, c + 1));
      setItemIdx(0);
    } else if (key.return) {
      // Toggle boolean values
      const item = currentCat.items[itemIdx];
      if (item && typeof item.value === 'boolean') {
        item.value = !item.value;
        // Force re-render
        setItemIdx((i) => i);
      }
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>{cyber('╭─ Settings ──────────────────────────────────────────────────────╮')}</Text>

      <Box flexDirection="column" paddingLeft={2} paddingRight={2} marginTop={1}>
        {/* Category tabs */}
        <Box flexDirection="row" marginBottom={1}>
          {SETTINGS_CATEGORIES.map((cat, i) => (
            <Text key={cat.id}>
              <Text color={i === catIdx ? '#D97736' : 'gray'} bold={i === catIdx}>
                {' '}{cat.label}{' '}
              </Text>
              {i < SETTINGS_CATEGORIES.length - 1 && (
                <Text color="gray">{'│'}</Text>
              )}
            </Text>
          ))}
        </Box>

        <Text color="gray">{'─'.repeat(50)}</Text>

        {/* Settings items */}
        {currentCat && currentCat.items.map((item, i) => (
          <Box key={item.key} flexDirection="row" marginY={1}>
            <Text>
              {i === itemIdx ? (
                <Text color="#D97736">{'› '}</Text>
              ) : (
                <Text color="gray">{'  '}</Text>
              )}
              <Text color={i === itemIdx ? 'white' : 'gray'} bold={i === itemIdx}>
                {item.label}
              </Text>
            </Text>
            <Box flexGrow={1} />
            <Text color={typeof item.value === 'boolean' ? (item.value ? 'green' : 'red') : 'cyan'}>
              {typeof item.value === 'boolean'
                ? (item.value ? '✓ enabled' : '✗ disabled')
                : item.value}
            </Text>
          </Box>
        ))}

        <Box marginTop={1} />
        <Text color="gray">Arrow keys to navigate, Enter to toggle, ESC to close</Text>
      </Box>

      <Text>{cyber('╰──────────────────────────────────────────────────────────────────╯')}</Text>
    </Box>
  );
};
