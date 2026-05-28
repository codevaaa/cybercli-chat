import { createLogger } from '../logger.js';

const log = createLogger('custom-server');

export interface CustomModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextWindow: number;
  inputCost: number; // per 1M tokens
  outputCost: number; // per 1M tokens
  capabilities: string[];
  endpoint: string;
  apiKey?: string;
  isActive: boolean;
}

export interface CustomServerConfig {
  baseUrl: string;
  models: CustomModel[];
  timeout: number;
  retries: number;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export const DEFAULT_CUSTOM_SERVER_CONFIG: CustomServerConfig = {
  baseUrl: 'https://api.cybermind.ai/v1',
  models: [
    {
      id: 'cybermind-ultra',
      name: 'CyberMind Ultra',
      provider: 'CyberMind',
      description: 'Most powerful model for complex tasks',
      contextWindow: 200000,
      inputCost: 5.00,
      outputCost: 15.00,
      capabilities: ['code', 'reasoning', 'analysis', 'multimodal'],
      endpoint: '/chat/completions',
      isActive: true,
    },
    {
      id: 'cybermind-pro',
      name: 'CyberMind Pro',
      provider: 'CyberMind',
      description: 'Balanced model for most tasks',
      contextWindow: 128000,
      inputCost: 2.00,
      outputCost: 6.00,
      capabilities: ['code', 'reasoning', 'analysis'],
      endpoint: '/chat/completions',
      isActive: true,
    },
    {
      id: 'cybermind-speed',
      name: 'CyberMind Speed',
      provider: 'CyberMind',
      description: 'Fast model for quick responses',
      contextWindow: 32000,
      inputCost: 0.50,
      outputCost: 1.50,
      capabilities: ['code', 'basic-reasoning'],
      endpoint: '/chat/completions',
      isActive: true,
    },
    {
      id: 'cybermind-code',
      name: 'CyberMind Code',
      provider: 'CyberMind',
      description: 'Specialized for coding tasks',
      contextWindow: 128000,
      inputCost: 1.50,
      outputCost: 4.50,
      capabilities: ['code', 'debugging', 'refactoring'],
      endpoint: '/chat/completions',
      isActive: true,
    },
    {
      id: 'cybermind-creative',
      name: 'CyberMind Creative',
      provider: 'CyberMind',
      description: 'Creative and design tasks',
      contextWindow: 64000,
      inputCost: 1.00,
      outputCost: 3.00,
      capabilities: ['creative', 'design', 'writing'],
      endpoint: '/chat/completions',
      isActive: true,
    },
  ],
  timeout: 60000,
  retries: 3,
  rateLimit: {
    requestsPerMinute: 60,
    tokensPerMinute: 1000000,
  },
};

export class CustomServerManager {
  private config: CustomServerConfig;
  private apiKey: string | null = null;

  constructor(config: Partial<CustomServerConfig> = {}) {
    this.config = { ...DEFAULT_CUSTOM_SERVER_CONFIG, ...config };
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    log.info('Custom server API key set');
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) {
        log.warn('Custom server connection failed', { status: response.status });
        return false;
      }

      const data = await response.json();
      log.info('Custom server connected successfully', { models: data.data?.length || 0 });
      return true;
    } catch (error) {
      log.warn('Custom server connection error', { error: String(error) });
      return false;
    }
  }

  async listModels(): Promise<CustomModel[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Custom server API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || this.config.models;
    } catch (error) {
      log.error('Failed to list custom server models', { error: String(error) });
      return this.config.models;
    }
  }

  async generateResponse(modelId: string, messages: any[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key required for custom server');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          stream: false,
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      log.error('Failed to generate response from custom server', { model: modelId, error: String(error) });
      throw error;
    }
  }

  getModel(modelId: string): CustomModel | null {
    return this.config.models.find(model => model.id === modelId) || null;
  }

  getActiveModels(): CustomModel[] {
    return this.config.models.filter(model => model.isActive);
  }

  getModelsByCapability(capability: string): CustomModel[] {
    return this.config.models.filter(model => 
      model.isActive && model.capabilities.includes(capability)
    );
  }

  calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.getModel(modelId);
    if (!model) return 0;

    const inputCost = (inputTokens / 1000000) * model.inputCost;
    const outputCost = (outputTokens / 1000000) * model.outputCost;
    return inputCost + outputCost;
  }

  updateConfig(updates: Partial<CustomServerConfig>): void {
    this.config = { ...this.config, ...updates };
    log.info('Custom server config updated', { updates: Object.keys(updates) });
  }

  addCustomModel(model: CustomModel): void {
    this.config.models.push(model);
    log.info('Custom model added', { modelId: model.id, name: model.name });
  }

  removeModel(modelId: string): boolean {
    const index = this.config.models.findIndex(model => model.id === modelId);
    if (index !== -1) {
      this.config.models.splice(index, 1);
      log.info('Model removed', { modelId });
      return true;
    }
    return false;
  }

  getConfig(): CustomServerConfig {
    return { ...this.config };
  }

  // Rate limiting
  private rateLimitTracker = {
    requests: [] as number[],
    tokens: [] as number[],
  };

  async checkRateLimit(): Promise<boolean> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old entries
    this.rateLimitTracker.requests = this.rateLimitTracker.requests.filter(time => time > oneMinuteAgo);
    this.rateLimitTracker.tokens = this.rateLimitTracker.tokens.filter(time => time > oneMinuteAgo);

    // Check limits
    if (this.rateLimitTracker.requests.length >= this.config.rateLimit.requestsPerMinute) {
      log.warn('Rate limit exceeded for requests');
      return false;
    }

    return true;
  }

  recordRequest(tokenCount: number = 0): void {
    this.rateLimitTracker.requests.push(Date.now());
    this.rateLimitTracker.tokens.push(tokenCount);
  }
}
