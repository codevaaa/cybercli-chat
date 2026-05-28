import { createLogger } from './logger.js';

const log = createLogger('auto-agent');

export interface TaskAnalysis {
  type: 'coding' | 'debugging' | 'design' | 'documentation' | 'planning' | 'research' | 'testing' | 'deployment' | 'architecture' | 'optimization';
  complexity: 'simple' | 'medium' | 'complex' | 'expert';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  domain: string[];
  estimatedTime: number;
  requiredSkills: string[];
  suggestedModel: string;
  suggestedAgents: string[];
}

export interface AgentProfile {
  id: string;
  name: string;
  specialization: string[];
  capabilities: string[];
  preferredModels: string[];
  performance: {
    accuracy: number;
    speed: number;
    cost: number;
  };
  availability: boolean;
}

export class AutoAgentAssignment {
  private agents: AgentProfile[] = [
    {
      id: 'cybercoder-code',
      name: 'Code Specialist',
      specialization: ['coding', 'debugging', 'optimization'],
      capabilities: ['typescript', 'javascript', 'python', 'rust', 'go'],
      preferredModels: ['cybercoder-code', 'claude-3-sonnet', 'gpt-4'],
      performance: { accuracy: 0.95, speed: 0.88, cost: 0.75 },
      availability: true,
    },
    {
      id: 'cybercoder-architect',
      name: 'System Architect',
      specialization: ['architecture', 'design', 'planning'],
      capabilities: ['system-design', 'microservices', 'scalability', 'security'],
      preferredModels: ['cybercoder-pro', 'claude-3-opus', 'gpt-4'],
      performance: { accuracy: 0.92, speed: 0.75, cost: 0.85 },
      availability: true,
    },
    {
      id: 'cybercoder-debugger',
      name: 'Debug Expert',
      specialization: ['debugging', 'testing', 'optimization'],
      capabilities: ['error-analysis', 'performance-tuning', 'testing-strategies'],
      preferredModels: ['cybercoder-code', 'claude-3-sonnet', 'gpt-4'],
      performance: { accuracy: 0.93, speed: 0.82, cost: 0.70 },
      availability: true,
    },
    {
      id: 'cybercoder-creative',
      name: 'Creative Designer',
      specialization: ['design', 'documentation', 'ui/ux'],
      capabilities: ['ui-design', 'documentation', 'user-experience', 'branding'],
      preferredModels: ['cybercoder-creative', 'claude-3-haiku', 'gpt-4'],
      performance: { accuracy: 0.88, speed: 0.90, cost: 0.65 },
      availability: true,
    },
    {
      id: 'cybercoder-researcher',
      name: 'Research Analyst',
      specialization: ['research', 'analysis', 'planning'],
      capabilities: ['market-research', 'competitive-analysis', 'trend-analysis'],
      preferredModels: ['cybercoder-pro', 'claude-3-opus', 'gpt-4'],
      performance: { accuracy: 0.94, speed: 0.70, cost: 0.80 },
      availability: true,
    },
    {
      id: 'cybercoder-tester',
      name: 'Testing Specialist',
      specialization: ['testing', 'quality assurance', 'automation'],
      capabilities: ['unit-testing', 'integration-testing', 'e2e-testing', 'test-automation'],
      preferredModels: ['cybercoder-code', 'claude-3-sonnet', 'gpt-4'],
      performance: { accuracy: 0.91, speed: 0.85, cost: 0.72 },
      availability: true,
    },
    {
      id: 'cybercoder-deployer',
      name: 'DevOps Engineer',
      specialization: ['deployment', 'devops', 'infrastructure'],
      capabilities: ['docker', 'kubernetes', 'ci-cd', 'cloud-deployment', 'monitoring'],
      preferredModels: ['cybercoder-pro', 'claude-3-sonnet', 'gpt-4'],
      performance: { accuracy: 0.89, speed: 0.78, cost: 0.77 },
      availability: true,
    },
    {
      id: 'cybercoder-optimizer',
      name: 'Performance Expert',
      specialization: ['optimization', 'performance', 'scalability'],
      capabilities: ['code-optimization', 'database-optimization', 'performance-tuning'],
      preferredModels: ['cybercoder-ultra', 'claude-3-opus', 'gpt-4'],
      performance: { accuracy: 0.96, speed: 0.72, cost: 0.90 },
      availability: true,
    },
  ];

  analyzeTask(userInput: string): TaskAnalysis {
    const input = userInput.toLowerCase();
    
    // Task type detection
    let type: TaskAnalysis['type'] = 'coding';
    let complexity: TaskAnalysis['complexity'] = 'medium';
    let priority: TaskAnalysis['priority'] = 'medium';
    let domain: string[] = [];
    let estimatedTime = 30; // minutes

    // Detect task type
    if (input.includes('debug') || input.includes('fix') || input.includes('error') || input.includes('bug')) {
      type = 'debugging';
      complexity = input.includes('complex') || input.includes('difficult') ? 'complex' : 'medium';
    } else if (input.includes('design') || input.includes('architecture') || input.includes('structure')) {
      type = 'architecture';
      complexity = input.includes('system') || input.includes('enterprise') ? 'expert' : 'complex';
    } else if (input.includes('test') || input.includes('testing') || input.includes('spec')) {
      type = 'testing';
      complexity = input.includes('e2e') || input.includes('integration') ? 'complex' : 'medium';
    } else if (input.includes('deploy') || input.includes('deploy') || input.includes('production')) {
      type = 'deployment';
      complexity = input.includes('kubernetes') || input.includes('microservices') ? 'complex' : 'medium';
    } else if (input.includes('document') || input.includes('readme') || input.includes('guide')) {
      type = 'documentation';
      complexity = 'simple';
    } else if (input.includes('research') || input.includes('analyze') || input.includes('investigate')) {
      type = 'research';
      complexity = 'medium';
    } else if (input.includes('optimize') || input.includes('performance') || input.includes('improve')) {
      type = 'optimization';
      complexity = input.includes('performance') ? 'complex' : 'medium';
    } else if (input.includes('plan') || input.includes('planning') || input.includes('roadmap')) {
      type = 'planning';
      complexity = input.includes('project') || input.includes('strategy') ? 'complex' : 'medium';
    }

    // Detect priority
    if (input.includes('urgent') || input.includes('asap') || input.includes('critical')) {
      priority = 'urgent';
    } else if (input.includes('important') || input.includes('priority')) {
      priority = 'high';
    } else if (input.includes('quick') || input.includes('simple') || input.includes('minor')) {
      priority = 'low';
    }

    // Detect domain
    if (input.includes('react') || input.includes('frontend') || input.includes('ui')) domain.push('frontend');
    if (input.includes('node') || input.includes('backend') || input.includes('api')) domain.push('backend');
    if (input.includes('database') || input.includes('sql') || input.includes('nosql')) domain.push('database');
    if (input.includes('mobile') || input.includes('ios') || input.includes('android')) domain.push('mobile');
    if (input.includes('devops') || input.includes('docker') || input.includes('kubernetes')) domain.push('devops');
    if (input.includes('ai') || input.includes('ml') || input.includes('machine learning')) domain.push('ai');

    // Estimate time based on complexity
    const timeMultipliers = { simple: 0.5, medium: 1, complex: 2, expert: 3 };
    estimatedTime = Math.round(30 * timeMultipliers[complexity]);

    // Required skills based on task
    const requiredSkills: string[] = [];
    if (type === 'coding') requiredSkills.push('programming', 'code-analysis');
    if (type === 'debugging') requiredSkills.push('problem-solving', 'code-analysis');
    if (type === 'architecture') requiredSkills.push('system-design', 'scalability');
    if (type === 'testing') requiredSkills.push('testing-strategies', 'quality-assurance');
    if (type === 'deployment') requiredSkills.push('devops', 'infrastructure');
    if (type === 'optimization') requiredSkills.push('performance-tuning', 'analysis');

    // Suggest model based on complexity
    let suggestedModel = 'cybercoder-pro';
    if (complexity === 'simple') suggestedModel = 'cybercoder-speed';
    if (complexity === 'expert') suggestedModel = 'cybercoder-ultra';

    return {
      type,
      complexity,
      priority,
      domain,
      estimatedTime,
      requiredSkills,
      suggestedModel,
      suggestedAgents: [], // Will be filled by assignAgents
    };
  }

  assignAgents(taskAnalysis: TaskAnalysis): AgentProfile[] {
    const availableAgents = this.agents.filter(agent => agent.availability);
    
    // Score agents based on task match
    const scoredAgents = availableAgents.map(agent => {
      let score = 0;
      
      // Specialization match
      if (agent.specialization.includes(taskAnalysis.type)) {
        score += 40;
      }
      
      // Capability match
      taskAnalysis.domain.forEach(domain => {
        if (agent.capabilities.some(cap => cap.toLowerCase().includes(domain))) {
          score += 20;
        }
      });
      
      // Required skills match
      taskAnalysis.requiredSkills.forEach(skill => {
        if (agent.capabilities.some(cap => cap.toLowerCase().includes(skill))) {
          score += 15;
        }
      });
      
      // Performance score
      score += (agent.performance.accuracy * 20);
      score += (agent.performance.speed * 10);
      score -= (agent.performance.cost * 5);
      
      // Complexity bonus
      if (taskAnalysis.complexity === 'expert' && agent.specialization.includes('architecture')) score += 20;
      if (taskAnalysis.complexity === 'complex' && agent.performance.accuracy > 0.9) score += 15;
      
      return { agent, score };
    });
    
    // Sort by score and return top matches
    scoredAgents.sort((a, b) => b.score - a.score);
    
    const assignedAgents = scoredAgents
      .slice(0, taskAnalysis.complexity === 'expert' ? 3 : taskAnalysis.complexity === 'complex' ? 2 : 1)
      .map(item => item.agent);
    
    taskAnalysis.suggestedAgents = assignedAgents.map(agent => agent.id);
    
    log.info('Agents assigned', { 
      taskType: taskAnalysis.type, 
      agents: assignedAgents.map(a => a.name),
      scores: scoredAgents.slice(0, 3).map(s => `${s.agent.name}: ${s.score.toFixed(1)}`)
    });
    
    return assignedAgents;
  }

  getBestModel(taskAnalysis: TaskAnalysis, availableModels: string[]): string {
    // Priority order for model selection
    const modelPreferences = {
      'simple': ['cybercoder-speed', 'cybercoder-code', 'claude-3-haiku'],
      'medium': ['cybercoder-pro', 'cybercoder-code', 'claude-3-sonnet'],
      'complex': ['cybercoder-ultra', 'cybercoder-pro', 'claude-3-opus'],
      'expert': ['cybercoder-ultra', 'claude-3-opus', 'gpt-4'],
    };
    
    const preferences = modelPreferences[taskAnalysis.complexity];
    
    for (const model of preferences) {
      if (availableModels.includes(model)) {
        return model;
      }
    }
    
    // Fallback to first available
    return availableModels[0] || 'cybercoder-pro';
  }

  generateAssignmentSummary(taskAnalysis: TaskAnalysis, agents: AgentProfile[]): string {
    const lines = [
      `🤖 Auto Agent Assignment Complete`,
      '',
      `📋 Task Analysis:`,
      `• Type: ${taskAnalysis.type}`,
      `• Complexity: ${taskAnalysis.complexity}`,
      `• Priority: ${taskAnalysis.priority}`,
      `• Domains: ${taskAnalysis.domain.join(', ') || 'general'}`,
      `• Estimated Time: ${taskAnalysis.estimatedTime} minutes`,
      '',
      `🎯 Assigned Agents:`,
    ];
    
    agents.forEach((agent, index) => {
      lines.push(`${index + 1}. ${agent.name} (${agent.specialization.join(', ')})`);
      lines.push(`   📊 Performance: ${(agent.performance.accuracy * 100).toFixed(0)}% accuracy, ${(agent.performance.speed * 100).toFixed(0)}% speed`);
      lines.push(`   🧠 Preferred Model: ${agent.preferredModels[0]}`);
    });
    
    lines.push('');
    lines.push(`💡 Suggested Model: ${taskAnalysis.suggestedModel}`);
    lines.push(`🔧 Required Skills: ${taskAnalysis.requiredSkills.join(', ')}`);
    
    return lines.join('\n');
  }

  updateUserKnowledge(_userInput: string, taskAnalysis: TaskAnalysis, result: 'success' | 'partial' | 'failed'): void {
    // This would update the user's knowledge graph
    // In a real implementation, this would persist to storage
    log.info('Updating user knowledge', { 
      taskType: taskAnalysis.type, 
      result, 
      domains: taskAnalysis.domain 
    });
  }
}
