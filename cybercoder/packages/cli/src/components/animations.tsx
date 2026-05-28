import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

interface AnimationProps {
  text: string;
  onComplete?: () => void;
}

export function TypingAnimation({ text, onComplete }: AnimationProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 30 + Math.random() * 20); // Variable typing speed
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  return <Text color="cyan">{displayedText}</Text>;
}

export function PulsingDot() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(v => !v);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return <Text color={visible ? 'green' : 'gray'}>●</Text>;
}

export function LoadingSpinner({ text = 'Thinking' }: { text?: string }) {
  const [frame, setFrame] = useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % frames.length);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <Text color="yellow">{frames[frame]}</Text>
      <Text> {text}...</Text>
    </Box>
  );
}

export function ProgressAnimation({ 
  current, 
  total, 
  text = 'Processing' 
}: { 
  current: number; 
  total: number; 
  text?: string;
}) {
  const percentage = Math.round((current / total) * 100);
  const barWidth = 20;
  const filledWidth = Math.round((percentage / 100) * barWidth);
  const bar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">{text}: </Text>
        <Text color="green">[{bar}]</Text>
        <Text> {percentage}%</Text>
      </Box>
      <Box>
        <Text color="gray">Step {current} of {total}</Text>
      </Box>
    </Box>
  );
}

export function WaveAnimation({ text }: { text: string }) {
  const [colors, setColors] = useState<string[]>(
    text.split('').map(() => 'gray')
  );

  useEffect(() => {
    let wave = 0;
    const interval = setInterval(() => {
      setColors(text.split('').map((_, i) => {
        const distance = Math.abs(i - wave);
        if (distance === 0) return 'cyan';
        if (distance === 1) return 'blue';
        if (distance === 2) return 'gray';
        return 'gray';
      }));
      wave = (wave + 1) % text.length;
    }, 100);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <Box>
      {text.split('').map((char, i) => (
        <Text key={i} color={colors[i]}>
          {char}
        </Text>
      ))}
    </Box>
  );
}

export function CyberMindLoading() {
  const [phase, setPhase] = useState(0);
  const phases = [
    '🧠 Initializing neural networks...',
    '⚡ Synthesizing AI responses...',
    '🔍 Analyzing context patterns...',
    '💡 Generating intelligent solutions...',
    '🚀 Optimizing output quality...'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => (p + 1) % phases.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="magenta">
          ▟███████▙  CyberMind AI
          █  ◉  ◉  █
          █   ╳   █
          ▜███████▛
        </Text>
      </Box>
      <Box>
        <LoadingSpinner text={phases[phase]} />
      </Box>
    </Box>
  );
}

export function CommandProcessing({ command }: { command: string }) {
  const [step, setStep] = useState(0);
  const steps = [
    `Parsing command: /${command}`,
    'Validating parameters...',
    'Connecting to AI models...',
    'Processing request...',
    'Generating response...'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => Math.min(s + 1, steps.length - 1));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="column">
      {steps.slice(0, step + 1).map((stepText, i) => (
        <Box key={i}>
          <Text color={i === step ? 'yellow' : 'green'}>
            {i === step ? '▶' : '✓'} {stepText}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

export function ModelSwitching({ fromModel, toModel }: { fromModel: string; toModel: string }) {
  const [stage, setStage] = useState(0);
  const stages = [
    { text: `Disconnecting from ${fromModel}`, color: 'yellow' },
    { text: 'Clearing model cache', color: 'cyan' },
    { text: `Connecting to ${toModel}`, color: 'blue' },
    { text: 'Model ready!', color: 'green' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStage(s => Math.min(s + 1, stages.length - 1));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="magenta">🔄 Switching AI Models</Text>
      </Box>
      {stages.slice(0, stage + 1).map((stageData, i) => (
        <Box key={i}>
          <Text color={stageData.color}>
            {i === stage ? '⟳' : '✓'} {stageData.text}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

export function SkillActivation({ skillName }: { skillName: string }) {
  const [activating, setActivating] = useState(true);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (activating) {
      const interval = setInterval(() => {
        setDots(d => (d.length >= 3 ? '' : d + '.'));
      }, 300);
      return () => clearInterval(interval);
    }
  }, [activating]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActivating(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box>
      <Text color="cyan">
        {activating ? `⚡ Activating ${skillName}${dots}` : `✅ ${skillName} activated!`}
      </Text>
    </Box>
  );
}

export function CostCounter({ cost }: { cost: number }) {
  const [displayCost, setDisplayCost] = useState(0);

  useEffect(() => {
    const increment = cost / 20;
    const interval = setInterval(() => {
      setDisplayCost(c => Math.min(c + increment, cost));
    }, 50);
    return () => clearInterval(interval);
  }, [cost]);

  return (
    <Box>
      <Text color="green">
        💰 Session cost: ${displayCost.toFixed(4)}
      </Text>
    </Box>
  );
}

// Claude Code style animations
export function ClaudeCodeStyleLoading() {
  const [dots, setDots] = useState('');
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 400);

    const thinkingInterval = setInterval(() => {
      setThinking(t => !t);
    }, 2000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(thinkingInterval);
    };
  }, []);

  return (
    <Box>
      <Text color={thinking ? 'blue' : 'cyan'}>
        Claude{thinking ? ' is thinking' : ' is processing'}{dots}
      </Text>
    </Box>
  );
}

export function ModelThinking({ modelName }: { modelName: string }) {
  const [thought, setThought] = useState(0);
  const thoughts = [
    `${modelName} is analyzing your request...`,
    `${modelName} is considering multiple approaches...`,
    `${modelName} is optimizing the response...`,
    `${modelName} is generating the best solution...`
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setThought(t => (t + 1) % thoughts.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="magenta">🤖 {modelName}</Text>
      </Box>
      <Box>
        <Text color="cyan">{thoughts[thought]}</Text>
      </Box>
      <Box marginTop={1}>
        <LoadingSpinner />
      </Box>
    </Box>
  );
}
