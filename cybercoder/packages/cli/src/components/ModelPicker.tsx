import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ModelInfo {
  id: string;
  name: string;
  context: string;
  desc: string;
}

interface ModelPickerProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
}

const PROVIDERS = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', context: '200K', desc: 'Best balance of speed and capability' },
      { id: 'claude-opus-4', name: 'Claude Opus 4', context: '200K', desc: 'Most capable for complex tasks' },
      { id: 'claude-haiku-4', name: 'Claude Haiku 4', context: '200K', desc: 'Fastest for simple queries' },
    ] as ModelInfo[],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', context: '128K', desc: 'Versatile multimodal model' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context: '128K', desc: 'Fast and cost-effective' },
      { id: 'o3-mini', name: 'o3 Mini', context: '200K', desc: 'Reasoning-optimized' },
    ] as ModelInfo[],
  },
  {
    id: 'google',
    label: 'Google',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', context: '1M', desc: 'Long context champion' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', context: '1M', desc: 'Fast with long context' },
    ] as ModelInfo[],
  },
  {
    id: 'groq',
    label: 'Groq',
    models: [
      { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', context: '128K', desc: 'Ultra-fast inference' },
      { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', context: '32K', desc: 'Efficient MoE architecture' },
    ] as ModelInfo[],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    models: [
      { id: 'auto', name: 'Auto-router', context: 'Varies', desc: 'Picks best model for each query' },
      { id: 'deepseek-v3', name: 'DeepSeek V3', context: '64K', desc: 'Strong reasoning model' },
    ] as ModelInfo[],
  },
  {
    id: 'local',
    label: 'Local (Ollama)',
    models: [
      { id: 'llama3.1-local', name: 'Llama 3.1 (local)', context: '128K', desc: 'Runs on your machine' },
      { id: 'codellama-local', name: 'CodeLlama (local)', context: '16K', desc: 'Code-specialized local model' },
    ] as ModelInfo[],
  },
];

export const ModelPicker: React.FC<ModelPickerProps> = ({ currentModel, onSelect, onClose }) => {
  const [providerIdx, setProviderIdx] = useState(0);
  const [modelIdx, setModelIdx] = useState(0);
  const [stage, setStage] = useState<'provider' | 'model'>('provider');

  useInput((_, key) => {
    if (key.escape) {
      if (stage === 'model') {
        setStage('provider');
        setModelIdx(0);
      } else {
        onClose();
      }
      return;
    }

    if (stage === 'provider') {
      if (key.upArrow) {
        setProviderIdx((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setProviderIdx((i) => Math.min(PROVIDERS.length - 1, i + 1));
      } else if (key.return) {
        const prov = PROVIDERS[providerIdx];
        if (prov) {
          // Check if current model is in this provider, pre-select it
          const currentInProv = prov.models.findIndex((m) => m.id === currentModel);
          setModelIdx(currentInProv >= 0 ? currentInProv : 0);
          setStage('model');
        }
      }
    } else {
      const prov = PROVIDERS[providerIdx];
      if (!prov) return;
      if (key.upArrow) {
        setModelIdx((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setModelIdx((i) => Math.min(prov.models.length - 1, i + 1));
      } else if (key.return) {
        const model = prov.models[modelIdx];
        if (model) onSelect(model.id);
      }
    }
  });

  const currentProv = PROVIDERS[providerIdx];

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="#D97736">{'╭─ Model Selection ─────────────────────────────────────────────╮'}</Text>

      <Box flexDirection="column" paddingLeft={2} paddingRight={2} marginTop={1}>
        {stage === 'provider' && (
          <>
            <Text bold color="white">Select a provider:</Text>
            <Box marginTop={1} />
            {PROVIDERS.map((prov, i) => (
              <Box key={prov.id} flexDirection="row" marginBottom={1}>
                <Text>
                  {i === providerIdx ? (
                    <Text color="#D97736">{'› '}</Text>
                  ) : (
                    <Text color="gray">{'  '}</Text>
                  )}
                  <Text color={i === providerIdx ? 'white' : 'gray'} bold={i === providerIdx}>
                    {prov.label}
                  </Text>
                  <Text color="gray"> ({prov.models.length} models)</Text>
                </Text>
              </Box>
            ))}
            <Box marginTop={1} />
            <Text color="gray">Arrow keys to navigate, Enter to select, ESC to close</Text>
          </>
        )}

        {stage === 'model' && currentProv && (
          <>
            <Text bold color="white">{currentProv.label} — Select model:</Text>
            <Box marginTop={1} />
            {currentProv.models.map((m, i) => (
              <Box key={m.id} flexDirection="column" marginBottom={1}>
                <Text>
                  {i === modelIdx ? (
                    <Text color="#D97736">{'› '}</Text>
                  ) : (
                    <Text color="gray">{'  '}</Text>
                  )}
                  <Text color={i === modelIdx ? 'white' : 'gray'} bold={i === modelIdx}>
                    {m.name}
                  </Text>
                  {m.id === currentModel && <Text color="green">{' (current)'}</Text>}
                </Text>
                <Text color="gray">     Context: {m.context} · {m.desc}</Text>
              </Box>
            ))}
            <Box marginTop={1} />
            <Text color="gray">Arrow keys to navigate, Enter to select, ESC to go back</Text>
          </>
        )}
      </Box>

      <Text color="#D97736">{'╰──────────────────────────────────────────────────────────────────╯'}</Text>
    </Box>
  );
};
