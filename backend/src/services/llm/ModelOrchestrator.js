import OpenAI from 'openai'

// Provider configurations
const PROVIDER_CONFIGS = {
  'openai': {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
  },
  'anthropic': {
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
  },
  'groq': {
    name: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it']
  },
  'gemini': {
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro']
  },
  'openrouter': {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'meta-llama/llama-3.1-70b-instruct']
  },
  'cerebras': {
    name: 'Cerebras',
    baseURL: 'https://api.cerebras.ai/v1',
    models: ['llama3.1-70b', 'llama3.1-8b']
  },
  'ollama': {
    name: 'Ollama (Local)',
    baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    models: ['llama3.2', 'codellama', 'mistral', 'mixtral']
  }
}

// Model pricing (per 1M tokens)
const MODEL_PRICING = {
  'gpt-4o': { input: 2.50, output: 10.00, quality: 0.97, latency: 1.5 },
  'gpt-4o-mini': { input: 0.15, output: 0.60, quality: 0.92, latency: 0.8 },
  'gpt-4-turbo': { input: 10.00, output: 30.00, quality: 0.96, latency: 2.0 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00, quality: 0.98, latency: 1.8 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00, quality: 0.99, latency: 3.5 },
  'claude-3-sonnet-20240229': { input: 3.00, output: 15.00, quality: 0.95, latency: 1.5 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25, quality: 0.88, latency: 0.5 },
  'llama-3.1-70b-versatile': { input: 0.59, output: 0.79, quality: 0.90, latency: 0.6 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08, quality: 0.82, latency: 0.3 },
  'gemini-2.0-flash-exp': { input: 0.00, output: 0.00, quality: 0.94, latency: 0.7 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30, quality: 0.90, latency: 0.5 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00, quality: 0.95, latency: 1.2 }
}

class ModelOrchestrator {
  constructor() {
    this.clients = new Map()
    this.initializeClients()
  }

  initializeClients() {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.clients.set('openai', new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      }))
    }

    // Groq (OpenAI compatible)
    if (process.env.GROQ_API_KEY) {
      this.clients.set('groq', new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1'
      }))
    }

    // OpenRouter (OpenAI compatible)
    if (process.env.OPENROUTER_API_KEY) {
      this.clients.set('openrouter', new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1'
      }))
    }

    // Cerebras (OpenAI compatible)
    if (process.env.CEREBRAS_API_KEY) {
      this.clients.set('cerebras', new OpenAI({
        apiKey: process.env.CEREBRAS_API_KEY,
        baseURL: 'https://api.cerebras.ai/v1'
      }))
    }

    // Ollama (local)
    if (process.env.ENABLE_OLLAMA !== 'false') {
      this.clients.set('ollama', new OpenAI({
        apiKey: 'ollama',
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
      }))
    }
  }

  // Analyze request complexity
  analyzeComplexity(prompt, context = {}) {
    const factors = {
      length: prompt.length,
      codeBlocks: (prompt.match(/```/g) || []).length / 2,
      questions: (prompt.match(/\?/g) || []).length,
      technicalTerms: [
        'refactor', 'architecture', 'microservices', 'optimization',
        'algorithm', 'complexity', 'security', 'performance', 'scale'
      ].filter(term => prompt.toLowerCase().includes(term)).length,
      languageIndicators: [
        'typescript', 'python', 'rust', 'go', 'java', 'c++',
        'react', 'kubernetes', 'docker', 'aws', 'terraform'
      ].filter(term => prompt.toLowerCase().includes(term)).length
    }

    // Calculate complexity score
    let score = 0
    if (factors.length > 500) score += 2
    if (factors.length > 2000) score += 3
    score += factors.codeBlocks
    score += factors.questions * 0.5
    score += factors.technicalTerms
    score += factors.languageIndicators * 0.5

    if (score <= 3) return 'simple'
    if (score <= 6) return 'medium'
    if (score <= 10) return 'complex'
    return 'expert'
  }

  // Select optimal model based on constraints
  selectOptimalModel(complexity, userPlan, budget, maxLatency, preferences = {}) {
    const availableModels = []

    // Build available models list based on plan
    for (const [provider, client] of this.clients) {
      const config = PROVIDER_CONFIGS[provider]
      if (!config) continue

      for (const model of config.models) {
        const pricing = MODEL_PRICING[model]
        if (!pricing) continue

        // Check if model meets constraints
        if (pricing.latency > maxLatency) continue
        if ((pricing.input + pricing.output) > budget * 100) continue

        availableModels.push({
          provider,
          model,
          pricing,
          score: this.calculateModelScore(pricing, complexity, preferences)
        })
      }
    }

    // Sort by score (quality/cost ratio)
    availableModels.sort((a, b) => b.score - a.score)

    return availableModels[0] || null
  }

  calculateModelScore(pricing, complexity, preferences) {
    // Quality weight based on complexity
    const qualityWeight = {
      'simple': 0.3,
      'medium': 0.5,
      'complex': 0.7,
      'expert': 0.9
    }[complexity] || 0.5

    // Cost weight (inverse - lower is better)
    const costWeight = 0.3

    // Latency weight (inverse - lower is better)
    const latencyWeight = 0.2

    const qualityScore = pricing.quality * qualityWeight
    const costScore = (1 / (pricing.input + pricing.output + 0.1)) * costWeight * 10
    const latencyScore = (1 / (pricing.latency + 0.1)) * latencyWeight * 5

    return qualityScore + costScore + latencyScore
  }

  // Main routing method
  async routeRequest(request) {
    const {
      prompt,
      messages,
      userPlan = 'free',
      userId,
      context = {},
      preferredModel,
      maxCost = userPlan === 'free' ? 0 : userPlan === 'basic' ? 10 : userPlan === 'pro' ? 25 : 100,
      maxLatency = 10,
      stream = false
    } = request

    // Analyze complexity
    const complexity = this.analyzeComplexity(prompt || messages?.[messages.length - 1]?.content, context)

    // If preferred model is specified and available, use it
    if (preferredModel) {
      const [provider, modelName] = preferredModel.includes('/') 
        ? preferredModel.split('/') 
        : [null, preferredModel]
      
      for (const [p, client] of this.clients) {
        if (!provider || p === provider) {
          const config = PROVIDER_CONFIGS[p]
          if (config?.models.includes(modelName)) {
            return { provider: p, model: modelName, client }
          }
        }
      }
    }

    // Select optimal model
    const selection = this.selectOptimalModel(complexity, userPlan, maxCost, maxLatency, context.preferences)
    
    if (!selection) {
      throw new Error('No suitable model available for the given constraints')
    }

    return {
      provider: selection.provider,
      model: selection.model,
      client: this.clients.get(selection.provider),
      estimatedCost: selection.pricing,
      complexity
    }
  }

  // Execute chat completion
  async chatCompletion(request) {
    const startTime = Date.now()
    const routing = await this.routeRequest(request)
    
    const { client, model } = routing
    
    const messages = request.messages || [
      { role: 'system', content: request.system || 'You are a helpful AI coding assistant.' },
      { role: 'user', content: request.prompt }
    ]

    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        stream: request.stream ?? false
      })

      const duration = Date.now() - startTime

      // Calculate cost
      const inputTokens = response.usage?.prompt_tokens || 0
      const outputTokens = response.usage?.completion_tokens || 0
      const pricing = MODEL_PRICING[model] || { input: 0, output: 0 }
      const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output

      return {
        content: response.choices[0]?.message?.content || '',
        model: `${routing.provider}/${model}`,
        provider: routing.provider,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens
        },
        cost,
        duration_ms: duration,
        complexity: routing.complexity,
        response
      }
    } catch (error) {
      console.error(`Model ${model} failed:`, error.message)
      
      // Try fallback model
      if (request.attempt === undefined) {
        request.attempt = 1
        request.preferredModel = null // Clear preferred to trigger auto-selection
        return this.chatCompletion(request)
      }
      
      throw error
    }
  }

  // Streaming completion
  async *streamCompletion(request) {
    const routing = await this.routeRequest(request)
    const { client, model } = routing

    const messages = request.messages || [
      { role: 'system', content: request.system || 'You are a helpful AI coding assistant.' },
      { role: 'user', content: request.prompt }
    ]

    const stream = await client.chat.completions.create({
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
      stream: true
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        yield {
          content,
          model: `${routing.provider}/${model}`,
          provider: routing.provider,
          done: false
        }
      }
    }

    yield { done: true }
  }

  // Multi-model consensus
  async consensusQuery(prompt, models = ['gpt-4o', 'claude-3-5-sonnet-20241022'], strategy = 'weighted') {
    const responses = await Promise.allSettled(
      models.map(async (model) => {
        try {
          return await this.chatCompletion({
            prompt,
            preferredModel: model,
            temperature: 0.3
          })
        } catch (error) {
          return { error: error.message, model }
        }
      })
    )

    const successful = responses
      .filter(r => r.status === 'fulfilled' && !r.value.error)
      .map(r => r.value)

    if (successful.length === 0) {
      throw new Error('All models failed to respond')
    }

    // Aggregate based on strategy
    if (strategy === 'best') {
      // Return the response with highest quality model
      const modelRank = { 'claude-3-opus': 5, 'claude-3-5-sonnet': 4, 'gpt-4o': 3, 'gpt-4': 2 }
      return successful.sort((a, b) => 
        (modelRank[a.model] || 0) - (modelRank[b.model] || 0)
      )[0]
    }

    return {
      responses: successful,
      aggregated: this.aggregateResponses(successful, strategy),
      consensus: this.detectConsensus(successful)
    }
  }

  aggregateResponses(responses, strategy) {
    // Simple aggregation - could be enhanced with semantic similarity
    const contents = responses.map(r => r.content)
    
    // Find common patterns
    const patterns = this.extractCommonPatterns(contents)
    
    return {
      combinedContent: this.mergeResponses(contents),
      commonPatterns: patterns,
      totalTokens: responses.reduce((sum, r) => sum + r.tokens.total, 0),
      totalCost: responses.reduce((sum, r) => sum + r.cost, 0)
    }
  }

  extractCommonPatterns(contents) {
    // Simple pattern extraction - look for common code blocks and recommendations
    const patterns = new Set()
    
    for (const content of contents) {
      const codeBlocks = content.match(/```[\w]*\n([\s\S]*?)```/g) || []
      codeBlocks.forEach(block => patterns.add(block))
    }
    
    return Array.from(patterns).slice(0, 5)
  }

  mergeResponses(contents) {
    // Simple merge strategy - concatenate with separators
    return contents.join('\n\n---\n\nAlternative approach:\n\n')
  }

  detectConsensus(responses) {
    // Check if responses agree on key points
    const agreements = {
      totalResponses: responses.length,
      highConfidence: responses.length >= 2,
      // Could implement semantic similarity check here
    }
    
    return agreements
  }

  // Get available models for user
  getAvailableModels(userPlan = 'free') {
    const models = []
    
    for (const [provider, client] of this.clients) {
      const config = PROVIDER_CONFIGS[provider]
      if (!config) continue

      for (const model of config.models) {
        const pricing = MODEL_PRICING[model]
        
        models.push({
          id: `${provider}/${model}`,
          name: model,
          provider: config.name,
          pricing: pricing || { input: 0, output: 0 },
          available: true,
          features: this.getModelFeatures(model)
        })
      }
    }

    // Filter based on plan
    if (userPlan === 'free') {
      return models.filter(m => m.pricing.input === 0 && m.pricing.output === 0)
    }

    return models
  }

  getModelFeatures(model) {
    const features = []
    
    if (model.includes('vision') || model.includes('gpt-4o')) {
      features.push('vision')
    }
    if (MODEL_PRICING[model]?.quality > 0.95) {
      features.push('high-quality')
    }
    if (MODEL_PRICING[model]?.latency < 1) {
      features.push('fast')
    }
    
    return features
  }
}

const orchestrator = new ModelOrchestrator()

export default orchestrator
export { ModelOrchestrator, PROVIDER_CONFIGS, MODEL_PRICING }
