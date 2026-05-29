import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import gradient from 'gradient-string';

const cyber = gradient(['#00e5ff', '#7b5cff', '#ff5c8a']);

export interface ThemeConfig {
  mode: 'auto' | 'dark' | 'light' | 'dark-colorblind' | 'light-colorblind' | 'dark-ansi' | 'light-ansi';
  syntaxTheme: string;
}

interface ThemePickerProps {
  onComplete: (theme: ThemeConfig) => void;
}

const THEMES = [
  { id: 'auto', label: 'Auto (match terminal)' },
  { id: 'dark', label: 'Dark mode' },
  { id: 'light', label: 'Light mode' },
  { id: 'dark-colorblind', label: 'Dark mode (colorblind-friendly)' },
  { id: 'light-colorblind', label: 'Light mode (colorblind-friendly)' },
  { id: 'dark-ansi', label: 'Dark mode (ANSI colors only)' },
  { id: 'light-ansi', label: 'Light mode (ANSI colors only)' },
];

const SYNTAX_THEMES = [
  'Monokai Extended',
  'Dracula',
  'One Dark',
  'Solarized Dark',
  'GitHub Light',
];

export const ThemePicker: React.FC<ThemePickerProps> = ({ onComplete }) => {
  const [selected, setSelected] = useState(1); // Default to dark mode
  const [syntaxIdx, setSyntaxIdx] = useState(0);
  const [stage, setStage] = useState<'theme' | 'syntax'>('theme');

  useInput((_, key) => {
    if (stage === 'theme') {
      if (key.upArrow) {
        setSelected((s) => Math.max(0, s - 1));
      } else if (key.downArrow) {
        setSelected((s) => Math.min(THEMES.length - 1, s + 1));
      } else if (key.return) {
        setStage('syntax');
      }
    } else {
      if (key.upArrow) {
        setSyntaxIdx((s) => Math.max(0, s - 1));
      } else if (key.downArrow) {
        setSyntaxIdx((s) => Math.min(SYNTAX_THEMES.length - 1, s + 1));
      } else if (key.return) {
        const theme = THEMES[selected];
        const syntax = SYNTAX_THEMES[syntaxIdx];
        if (theme && syntax) {
          onComplete({
            mode: theme.id as ThemeConfig['mode'],
            syntaxTheme: syntax,
          });
        }
      }
    }
  });

  const previewLines = [
    { line: 1, text: 'function greet() {', color: 'cyan' as const },
    { line: 2, text: '  console.log("Hello, World!");', old: true },
    { line: 2, text: '  console.log("Hello, CyberCoder!");', new: true },
    { line: 3, text: '}', color: 'cyan' as const },
  ];

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>{cyber('╭─ Theme Selection ────────────────────────────────────────────────╮')}</Text>

      <Box flexDirection="column" paddingLeft={2} paddingRight={2} marginTop={1}>
        <Text bold color="white">Let&apos;s get started.</Text>
        <Box marginTop={1} />
        <Text bold color="#D97736">Choose the text style that looks best with your terminal</Text>
        <Text color="gray">To change this later, run /theme</Text>
        <Box marginTop={1} />

        {stage === 'theme' && (
          <>
            {THEMES.map((t, i) => (
              <Box key={t.id} flexDirection="row">
                <Text>
                  {i === selected ? (
                    <Text color="#D97736">{'› '}</Text>
                  ) : (
                    <Text color="gray">{'  '}</Text>
                  )}
                  <Text color={i === selected ? 'white' : 'gray'} bold={i === selected}>
                    {i + 1}. {t.label}
                  </Text>
                  {i === selected && <Text color="green">{'  ✓'}</Text>}
                </Text>
              </Box>
            ))}
            <Box marginTop={1} />
            <Text color="gray">Use arrow keys, Enter to confirm</Text>
          </>
        )}

        {stage === 'syntax' && (
          <>
            <Text bold color="#D97736">Choose syntax highlighting theme:</Text>
            <Box marginTop={1} />
            {SYNTAX_THEMES.map((t, i) => (
              <Box key={t} flexDirection="row">
                <Text>
                  {i === syntaxIdx ? (
                    <Text color="#D97736">{'› '}</Text>
                  ) : (
                    <Text color="gray">{'  '}</Text>
                  )}
                  <Text color={i === syntaxIdx ? 'white' : 'gray'} bold={i === syntaxIdx}>
                    {i + 1}. {t}
                  </Text>
                </Text>
              </Box>
            ))}
            <Box marginTop={1} />
            <Text color="gray">Use arrow keys, Enter to confirm</Text>
          </>
        )}

        {/* Code Preview */}
        <Box marginTop={1} />
        <Text color="gray">─────────────────────────────────────────</Text>
        {previewLines.map((p, idx) => (
          <Box key={idx} flexDirection="row">
            <Text color="gray">{p.line.toString().padStart(2)} </Text>
            {'old' in p && p.old && (
              <Text color="red">{'- '}{p.text}</Text>
            )}
            {'new' in p && p.new && (
              <Text color="green">{'+ '}{p.text}</Text>
            )}
            {'color' in p && (
              <Text color={p.color}>{'  '}{p.text}</Text>
            )}
          </Box>
        ))}
        <Text color="gray">─────────────────────────────────────────</Text>
        <Text color="gray">
          Syntax theme: {SYNTAX_THEMES[syntaxIdx]} (ctrl+t to disable)
        </Text>
      </Box>

      <Text>{cyber('╰──────────────────────────────────────────────────────────────────╯')}</Text>
    </Box>
  );
};
