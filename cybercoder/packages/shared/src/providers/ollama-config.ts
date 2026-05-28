import { createLogger } from '../logger.js';

const log = createLogger('ollama-config');

export interface OllamaModel {
  name: string;
  size?: number;
  family?: string;
  parameterSize?: string;
  quantizationLevel?: string;
}

export interface OllamaConfig {
  baseUrl: string;
  models: OllamaModel[];
  timeout: number;
  retries: number;
}

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  models: [
    { name: 'gemma4:31b-cloud', family: 'gemma', parameterSize: '31B', quantizationLevel: 'cloud' },
    { name: 'nemotron-3-super:cloud', family: 'nemotron', parameterSize: 'super', quantizationLevel: 'cloud' },
    { name: 'llama3.1:8b', family: 'llama', parameterSize: '8B' },
    { name: 'qwen2.5:7b', family: 'qwen', parameterSize: '7B' },
  ],
  timeout: 60000,
  retries: 3,
};

export class OllamaManager {
  private config: OllamaConfig;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_OLLAMA_CONFIG, ...config };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) {
        log.warn('Ollama connection failed', { status: response.status });
        return false;
      }

      const data = await response.json();
      log.info('Ollama connected successfully', { models: data.models?.length || 0 });
      return true;
    } catch (error) {
      log.warn('Ollama connection error', { error: String(error) });
      return false;
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      log.error('Failed to list Ollama models', { error: String(error) });
      return this.config.models; // Return default models on error
    }
  }

  async pullModel(modelName: string): Promise<boolean> {
    try {
      log.info('Pulling Ollama model', { model: modelName });
      
      const response = await fetch(`${this.config.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
        signal: AbortSignal.timeout(300000), // 5 minutes timeout for pulling
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status}`);
      }

      log.info('Model pulled successfully', { model: modelName });
      return true;
    } catch (error) {
      log.error('Failed to pull model', { model: modelName, error: String(error) });
      return false;
    }
  }

  async generateResponse(modelName: string, prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 2048,
          },
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      log.error('Failed to generate response', { model: modelName, error: String(error) });
      throw error;
    }
  }

  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...updates };
    log.info('Ollama config updated', { updates: Object.keys(updates) });
  }

  isModelAvailable(modelName: string): boolean {
    return this.config.models.some(model => model.name === modelName);
  }

  getPreferredModels(): OllamaModel[] {
    return this.config.models.filter(model => 
      model.name.includes('gemma4') || 
      model.name.includes('nemotron') ||
      model.name.includes('cloud')
    );
  }
}
