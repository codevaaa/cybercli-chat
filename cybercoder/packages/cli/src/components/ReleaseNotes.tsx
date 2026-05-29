import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ReleaseNotesProps {
  onClose: () => void;
}

const RELEASES = [
  {
    version: '0.1.18',
    date: 'May 29, 2026',
    highlights: [
      'Added / command discovery — just type / to see all commands',
      'Added HintBar with contextual shortcuts at the bottom',
      'Auto-update check on startup (checks npm registry)',
      'Improved prompt UI with Claude Code style > symbol',
      'Added /login and /subscribe website pages for CLI auth flow',
    ],
  },
  {
    version: '0.1.17',
    date: 'May 29, 2026',
    highlights: [
      'Redesigned welcome screen with sky scene pixel art',
      'New 👾 space invader style mascot',
      'Interactive login subpages: CyberCli, API Key, 3rd Party',
      'Config persistence in ~/.cybercoder/config.json',
      'Theme picker saves selection across sessions',
      '/logout command clears config and returns to onboarding',
    ],
  },
  {
    version: '0.1.16',
    date: 'May 28, 2026',
    highlights: [
      'Added onboarding screen with login method selection',
      'Added theme picker with 7 modes and syntax preview',
      'Added settings screen with 4 category tabs',
      'Screen state machine: onboarding → theme → welcome → chat',
      '/theme and /settings commands open interactive screens',
    ],
  },
  {
    version: '0.1.15',
    date: 'May 27, 2026',
    highlights: [
      'Cross-platform install scripts (install.sh, install.ps1, install.cmd)',
      'Updated product page with tabbed install commands',
      'Removed cybermind command, kept only cm',
      'Claude Code style welcome card and status bar',
    ],
  },
];

export const ReleaseNotes: React.FC<ReleaseNotesProps> = ({ onClose }) => {
  const [selected, setSelected] = useState(0);

  useInput((_, key) => {
    if (key.escape || (key.ctrl && _ === 'c')) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelected((s) => Math.max(0, s - 1));
    } else if (key.downArrow) {
      setSelected((s) => Math.min(RELEASES.length - 1, s + 1));
    }
  });

  const rel = RELEASES[selected];

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="#D97736">{'╭─ Release Notes ─────────────────────────────────────────────────╮'}</Text>

      <Box flexDirection="column" paddingLeft={2} paddingRight={2} marginTop={1}>
        {/* Version selector */}
        <Box flexDirection="row" marginBottom={1}>
          {RELEASES.map((r, i) => (
            <Text key={r.version}>
              <Text color={i === selected ? '#D97736' : 'gray'} bold={i === selected}>
                {' '}{r.version}{' '}
              </Text>
              {i < RELEASES.length - 1 && (
                <Text color="gray">{'│'}</Text>
              )}
            </Text>
          ))}
        </Box>

        <Text color="gray">{'─'.repeat(50)}</Text>

        {rel && (
          <>
            <Text bold color="white">{rel.version} — {rel.date}</Text>
            <Box marginTop={1} />
            {rel.highlights.map((h, i) => (
              <Box key={i} flexDirection="row" marginBottom={1}>
                <Text color="#D97736">{'• '}</Text>
                <Text color="gray">{h}</Text>
              </Box>
            ))}
          </>
        )}

        <Box marginTop={1} />
        <Text color="gray">Arrow keys to switch version, ESC to close</Text>
      </Box>

      <Text color="#D97736">{'╰──────────────────────────────────────────────────────────────────╯'}</Text>
    </Box>
  );
};
