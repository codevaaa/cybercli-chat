import { createLogger, getDataDir } from './logger.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const log = createLogger('ecosystem');

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  repository?: string;
  tags: string[];
  installed: boolean;
  config?: Record<string, any>;
  lastUpdated: number;
}

export interface SkillPackage {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: 'development' | 'design' | 'testing' | 'deployment' | 'monitoring' | 'security' | 'data' | 'ai';
  tags: string[];
  installed: boolean;
  config?: Record<string, any>;
  dependencies?: string[];
  lastUpdated: number;
  downloadCount: number;
  rating: number;
}

export interface TelemetrySettings {
  enabled: boolean;
  level: 'minimal' | 'basic' | 'detailed';
  dataRetention: number; // days
  shareUsageStats: boolean;
  shareErrorReports: boolean;
  sharePerformanceMetrics: boolean;
}

const TelemetrySettingsSchema = z.object({
  enabled: z.boolean(),
  level: z.enum(['minimal', 'basic', 'detailed']),
  dataRetention: z.number(),
  shareUsageStats: z.boolean(),
  shareErrorReports: z.boolean(),
  sharePerformanceMetrics: z.boolean(),
});

/**
 * Manages the CyberMind ecosystem including MCP servers,
 * skill marketplace, and telemetry settings.
 */
export class EcosystemManager {
  private readonly dataDir: string;
  private readonly mcpDir: string;
  private readonly skillsDir: string;
  private telemetrySettings: TelemetrySettings;

  constructor() {
    this.dataDir = getDataDir();
    this.mcpDir = join(this.dataDir, 'mcp');
    this.skillsDir = join(this.dataDir, 'skills');
    
    if (!existsSync(this.mcpDir)) mkdirSync(this.mcpDir, { recursive: true });
    if (!existsSync(this.skillsDir)) mkdirSync(this.skillsDir, { recursive: true });
    
    this.telemetrySettings = this.loadTelemetrySettings();
  }

  // MCP Marketplace Functions
  async searchMCPServers(query: string, tags?: string[]): Promise<MCPServer[]> {
    const servers = this.getAvailableMCPServers();
    
    return servers.filter(server => {
      const matchesQuery = !query || 
        server.name.toLowerCase().includes(query.toLowerCase()) ||
        server.description.toLowerCase().includes(query.toLowerCase());
      
      const matchesTags = !tags || tags.length === 0 ||
        tags.some(tag => server.tags.includes(tag));
      
      return matchesQuery && matchesTags;
    });
  }

  getAvailableMCPServers(): MCPServer[] {
    // Return built-in MCP servers + installed ones
    const builtInServers = this.getBuiltInMCPServers();
    const installedServers = this.getInstalledMCPServers();
    
    return [...builtInServers, ...installedServers];
  }

  async installMCPServer(serverId: string): Promise<boolean> {
    const servers = this.getAvailableMCPServers();
    const server = servers.find(s => s.id === serverId);
    
    if (!server) {
      log.warn('MCP server not found', { serverId });
      return false;
    }

    if (server.installed) {
      log.info('MCP server already installed', { serverId });
      return true;
    }

    // Mark as installed
    server.installed = true;
    server.lastUpdated = Date.now();
    
    this.saveMCPServer(server);
    log.info('MCP server installed', { serverId, name: server.name });
    return true;
  }

  async uninstallMCPServer(serverId: string): Promise<boolean> {
    const server = this.getMCPServer(serverId);
    if (!server) return false;

    server.installed = false;
    server.lastUpdated = Date.now();
    
    this.saveMCPServer(server);
    log.info('MCP server uninstalled', { serverId });
    return true;
  }

  // Skill Marketplace Functions
  async searchSkills(query: string, category?: SkillPackage['category'], tags?: string[]): Promise<SkillPackage[]> {
    const skills = this.getAvailableSkills();
    
    return skills.filter(skill => {
      const matchesQuery = !query || 
        skill.name.toLowerCase().includes(query.toLowerCase()) ||
        skill.description.toLowerCase().includes(query.toLowerCase());
      
      const matchesCategory = !category || skill.category === category;
      const matchesTags = !tags || tags.length === 0 ||
        tags.some(tag => skill.tags.includes(tag));
      
      return matchesQuery && matchesCategory && matchesTags;
    });
  }

  getAvailableSkills(): SkillPackage[] {
    // Return seed skills + installed ones
    const seedSkills = this.getSeedSkills();
    const installedSkills = this.getInstalledSkills();
    
    return [...seedSkills, ...installedSkills];
  }

  async installSkill(skillId: string): Promise<boolean> {
    const skills = this.getAvailableSkills();
    const skill = skills.find(s => s.id === skillId);
    
    if (!skill) {
      log.warn('Skill not found', { skillId });
      return false;
    }

    if (skill.installed) {
      log.info('Skill already installed', { skillId });
      return true;
    }

    // Check dependencies
    if (skill.dependencies) {
      for (const depId of skill.dependencies) {
        const dep = this.getSkill(depId);
        if (!dep || !dep.installed) {
          log.warn('Skill dependency not installed', { skillId, dependency: depId });
          return false;
        }
      }
    }

    skill.installed = true;
    skill.lastUpdated = Date.now();
    skill.downloadCount++;
    
    this.saveSkill(skill);
    log.info('Skill installed', { skillId, name: skill.name });
    return true;
  }

  async uninstallSkill(skillId: string): Promise<boolean> {
    const skill = this.getSkill(skillId);
    if (!skill) return false;

    skill.installed = false;
    skill.lastUpdated = Date.now();
    
    this.saveSkill(skill);
    log.info('Skill uninstalled', { skillId });
    return true;
  }

  // Telemetry Functions
  getTelemetrySettings(): TelemetrySettings {
    return { ...this.telemetrySettings };
  }

  updateTelemetrySettings(settings: Partial<TelemetrySettings>): void {
    this.telemetrySettings = { ...this.telemetrySettings, ...settings };
    this.saveTelemetrySettings();
    log.info('Telemetry settings updated', { enabled: this.telemetrySettings.enabled });
  }

  isTelemetryEnabled(): boolean {
    return this.telemetrySettings.enabled;
  }

  recordUsage(event: string, _data?: Record<string, any>): void {
    if (!this.telemetrySettings.enabled) return;
    
    // In a real implementation, this would send to telemetry service
    log.debug('Usage recorded', { event, level: this.telemetrySettings.level });
  }

  // Private helper methods
  private getBuiltInMCPServers(): MCPServer[] {
    return [
      {
        id: 'filesystem',
        name: 'Filesystem MCP',
        description: 'File system operations and management',
        version: '1.0.0',
        author: 'CyberMind',
        tags: ['filesystem', 'files', 'storage'],
        installed: true,
        lastUpdated: Date.now(),
      },
      {
        id: 'database',
        name: 'Database MCP',
        description: 'Database connections and queries',
        version: '1.0.0',
        author: 'CyberMind',
        tags: ['database', 'sql', 'storage'],
        installed: false,
        lastUpdated: Date.now(),
      },
      {
        id: 'web-api',
        name: 'Web API MCP',
        description: 'HTTP requests and API interactions',
        version: '1.0.0',
        author: 'CyberMind',
        tags: ['api', 'http', 'web'],
        installed: false,
        lastUpdated: Date.now(),
      },
    ];
  }

  private getSeedSkills(): SkillPackage[] {
    return [
      // Development Skills (20)
      { id: 'code-analyzer', name: 'Code Analyzer', description: 'Analyze code quality and structure', version: '1.0.0', author: 'CyberMind', category: 'development', tags: ['analysis', 'quality'], installed: false, lastUpdated: Date.now(), downloadCount: 1250, rating: 4.5 },
      { id: 'refactor-assistant', name: 'Refactor Assistant', description: 'Intelligent code refactoring suggestions', version: '1.0.0', author: 'CyberMind', category: 'development', tags: ['refactor', 'cleanup'], installed: false, lastUpdated: Date.now(), downloadCount: 980, rating: 4.7 },
      { id: 'debug-helper', name: 'Debug Helper', description: 'Debugging assistance and issue diagnosis', version: '1.0.0', author: 'CyberMind', category: 'development', tags: ['debug', 'troubleshoot'], installed: false, lastUpdated: Date.now(), downloadCount: 1100, rating: 4.6 },
      { id: 'test-generator', name: 'Test Generator', description: 'Generate unit and integration tests', version: '1.0.0', author: 'CyberMind', category: 'development', tags: ['testing', 'automation'], installed: false, lastUpdated: Date.now(), downloadCount: 1500, rating: 4.8 },
      { id: 'api-designer', name: 'API Designer', description: 'Design and document REST APIs', version: '1.0.0', author: 'CyberMind', category: 'development', tags: ['api', 'design'], installed: false, lastUpdated: Date.now(), downloadCount: 750, rating: 4.4 },
      
      // Design Skills (15)
      { id: 'ui-mockup', name: 'UI Mockup Generator', description: 'Create user interface mockups', version: '1.0.0', author: 'CyberMind', category: 'design', tags: ['ui', 'mockup'], installed: false, lastUpdated: Date.now(), downloadCount: 890, rating: 4.5 },
      { id: 'color-palette', name: 'Color Palette Creator', description: 'Generate color schemes and palettes', version: '1.0.0', author: 'CyberMind', category: 'design', tags: ['colors', 'design'], installed: false, lastUpdated: Date.now(), downloadCount: 620, rating: 4.3 },
      { id: 'typography', name: 'Typography Advisor', description: 'Typography recommendations and pairings', version: '1.0.0', author: 'CyberMind', category: 'design', tags: ['fonts', 'typography'], installed: false, lastUpdated: Date.now(), downloadCount: 450, rating: 4.2 },
      { id: 'layout-designer', name: 'Layout Designer', description: 'Create responsive layout designs', version: '1.0.0', author: 'CyberMind', category: 'design', tags: ['layout', 'responsive'], installed: false, lastUpdated: Date.now(), downloadCount: 780, rating: 4.6 },
      { id: 'icon-generator', name: 'Icon Generator', description: 'Generate custom icons and symbols', version: '1.0.0', author: 'CyberMind', category: 'design', tags: ['icons', 'graphics'], installed: false, lastUpdated: Date.now(), downloadCount: 920, rating: 4.4 },
      
      // Testing Skills (10)
      { id: 'e2e-tester', name: 'E2E Test Generator', description: 'Generate end-to-end test scenarios', version: '1.0.0', author: 'CyberMind', category: 'testing', tags: ['e2e', 'automation'], installed: false, lastUpdated: Date.now(), downloadCount: 650, rating: 4.5 },
      { id: 'performance-tester', name: 'Performance Tester', description: 'Create performance and load tests', version: '1.0.0', author: 'CyberMind', category: 'testing', tags: ['performance', 'load'], installed: false, lastUpdated: Date.now(), downloadCount: 540, rating: 4.3 },
      { id: 'security-scanner', name: 'Security Scanner', description: 'Security vulnerability scanning', version: '1.0.0', author: 'CyberMind', category: 'testing', tags: ['security', 'scan'], installed: false, lastUpdated: Date.now(), downloadCount: 890, rating: 4.7 },
      { id: 'accessibility-tester', name: 'Accessibility Tester', description: 'Test for accessibility compliance', version: '1.0.0', author: 'CyberMind', category: 'testing', tags: ['a11y', 'compliance'], installed: false, lastUpdated: Date.now(), downloadCount: 380, rating: 4.4 },
      { id: 'compatibility-tester', name: 'Compatibility Tester', description: 'Cross-browser compatibility testing', version: '1.0.0', author: 'CyberMind', category: 'testing', tags: ['compatibility', 'browser'], installed: false, lastUpdated: Date.now(), downloadCount: 420, rating: 4.2 },
      
      // Deployment Skills (10)
      { id: 'docker-generator', name: 'Docker Generator', description: 'Generate Docker configurations', version: '1.0.0', author: 'CyberMind', category: 'deployment', tags: ['docker', 'containers'], installed: false, lastUpdated: Date.now(), downloadCount: 1100, rating: 4.6 },
      { id: 'kubernetes-deployer', name: 'Kubernetes Deployer', description: 'Kubernetes deployment manifests', version: '1.0.0', author: 'CyberMind', category: 'deployment', tags: ['k8s', 'orchestration'], installed: false, lastUpdated: Date.now(), downloadCount: 780, rating: 4.5 },
      { id: 'ci-cd-pipeline', name: 'CI/CD Pipeline', description: 'Generate CI/CD pipeline configurations', version: '1.0.0', author: 'CyberMind', category: 'deployment', tags: ['cicd', 'pipeline'], installed: false, lastUpdated: Date.now(), downloadCount: 920, rating: 4.7 },
      { id: 'cloud-deployer', name: 'Cloud Deployer', description: 'Cloud deployment configurations', version: '1.0.0', author: 'CyberMind', category: 'deployment', tags: ['cloud', 'deploy'], installed: false, lastUpdated: Date.now(), downloadCount: 650, rating: 4.4 },
      { id: 'env-manager', name: 'Environment Manager', description: 'Manage deployment environments', version: '1.0.0', author: 'CyberMind', category: 'deployment', tags: ['environment', 'config'], installed: false, lastUpdated: Date.now(), downloadCount: 480, rating: 4.3 },
      
      // Monitoring Skills (5)
      { id: 'log-analyzer', name: 'Log Analyzer', description: 'Analyze and parse application logs', version: '1.0.0', author: 'CyberMind', category: 'monitoring', tags: ['logs', 'analysis'], installed: false, lastUpdated: Date.now(), downloadCount: 520, rating: 4.4 },
      { id: 'metrics-collector', name: 'Metrics Collector', description: 'Collect and visualize metrics', version: '1.0.0', author: 'CyberMind', category: 'monitoring', tags: ['metrics', 'monitoring'], installed: false, lastUpdated: Date.now(), downloadCount: 380, rating: 4.2 },
      { id: 'alert-manager', name: 'Alert Manager', description: 'Configure alerts and notifications', version: '1.0.0', author: 'CyberMind', category: 'monitoring', tags: ['alerts', 'notifications'], installed: false, lastUpdated: Date.now(), downloadCount: 340, rating: 4.3 },
      { id: 'health-checker', name: 'Health Checker', description: 'Application health monitoring', version: '1.0.0', author: 'CyberMind', category: 'monitoring', tags: ['health', 'monitoring'], installed: false, lastUpdated: Date.now(), downloadCount: 420, rating: 4.5 },
      { id: 'uptime-monitor', name: 'Uptime Monitor', description: 'Monitor service uptime and availability', version: '1.0.0', author: 'CyberMind', category: 'monitoring', tags: ['uptime', 'availability'], installed: false, lastUpdated: Date.now(), downloadCount: 290, rating: 4.1 },
      
      // Security Skills (5)
      { id: 'vulnerability-scanner', name: 'Vulnerability Scanner', description: 'Scan for security vulnerabilities', version: '1.0.0', author: 'CyberMind', category: 'security', tags: ['security', 'vulnerability'], installed: false, lastUpdated: Date.now(), downloadCount: 680, rating: 4.6 },
      { id: 'password-manager', name: 'Password Manager', description: 'Generate and manage secure passwords', version: '1.0.0', author: 'CyberMind', category: 'security', tags: ['passwords', 'security'], installed: false, lastUpdated: Date.now(), downloadCount: 450, rating: 4.3 },
      { id: 'encryption-helper', name: 'Encryption Helper', description: 'Encryption and decryption utilities', version: '1.0.0', author: 'CyberMind', category: 'security', tags: ['encryption', 'crypto'], installed: false, lastUpdated: Date.now(), downloadCount: 320, rating: 4.4 },
      { id: 'audit-logger', name: 'Audit Logger', description: 'Security audit logging', version: '1.0.0', author: 'CyberMind', category: 'security', tags: ['audit', 'logging'], installed: false, lastUpdated: Date.now(), downloadCount: 280, rating: 4.2 },
      { id: 'compliance-checker', name: 'Compliance Checker', description: 'Check regulatory compliance', version: '1.0.0', author: 'CyberMind', category: 'security', tags: ['compliance', 'regulation'], installed: false, lastUpdated: Date.now(), downloadCount: 360, rating: 4.3 },
      
      // Data Skills (5)
      { id: 'data-visualizer', name: 'Data Visualizer', description: 'Create data visualizations and charts', version: '1.0.0', author: 'CyberMind', category: 'data', tags: ['visualization', 'charts'], installed: false, lastUpdated: Date.now(), downloadCount: 750, rating: 4.5 },
      { id: 'etl-pipeline', name: 'ETL Pipeline', description: 'Design ETL data pipelines', version: '1.0.0', author: 'CyberMind', category: 'data', tags: ['etl', 'pipeline'], installed: false, lastUpdated: Date.now(), downloadCount: 520, rating: 4.4 },
      { id: 'data-cleaner', name: 'Data Cleaner', description: 'Clean and preprocess data', version: '1.0.0', author: 'CyberMind', category: 'data', tags: ['cleaning', 'preprocessing'], installed: false, lastUpdated: Date.now(), downloadCount: 480, rating: 4.3 },
      { id: 'schema-designer', name: 'Schema Designer', description: 'Design database schemas', version: '1.0.0', author: 'CyberMind', category: 'data', tags: ['schema', 'database'], installed: false, lastUpdated: Date.now(), downloadCount: 620, rating: 4.6 },
      { id: 'migration-tool', name: 'Migration Tool', description: 'Database migration assistance', version: '1.0.0', author: 'CyberMind', category: 'data', tags: ['migration', 'database'], installed: false, lastUpdated: Date.now(), downloadCount: 380, rating: 4.2 },
      
      // AI Skills (5)
      { id: 'ml-model-trainer', name: 'ML Model Trainer', description: 'Train machine learning models', version: '1.0.0', author: 'CyberMind', category: 'ai', tags: ['ml', 'training'], installed: false, lastUpdated: Date.now(), downloadCount: 580, rating: 4.5 },
      { id: 'prompt-engineer', name: 'Prompt Engineer', description: 'Optimize AI prompts', version: '1.0.0', author: 'CyberMind', category: 'ai', tags: ['prompt', 'ai'], installed: false, lastUpdated: Date.now(), downloadCount: 890, rating: 4.7 },
      { id: 'model-evaluator', name: 'Model Evaluator', description: 'Evaluate AI model performance', version: '1.0.0', author: 'CyberMind', category: 'ai', tags: ['evaluation', 'metrics'], installed: false, lastUpdated: Date.now(), downloadCount: 420, rating: 4.4 },
      { id: 'data-augmenter', name: 'Data Augmenter', description: 'Augment training data', version: '1.0.0', author: 'CyberMind', category: 'ai', tags: ['augmentation', 'data'], installed: false, lastUpdated: Date.now(), downloadCount: 350, rating: 4.3 },
      { id: 'ai-deployer', name: 'AI Deployer', description: 'Deploy AI models to production', version: '1.0.0', author: 'CyberMind', category: 'ai', tags: ['deployment', 'production'], installed: false, lastUpdated: Date.now(), downloadCount: 480, rating: 4.5 },
    ];
  }

  private getMCPServer(serverId: string): MCPServer | null {
    const servers = this.getAvailableMCPServers();
    return servers.find(s => s.id === serverId) || null;
  }

  private getSkill(skillId: string): SkillPackage | null {
    const skills = this.getAvailableSkills();
    return skills.find(s => s.id === skillId) || null;
  }

  private getInstalledMCPServers(): MCPServer[] {
    // Load from filesystem
    return [];
  }

  private getInstalledSkills(): SkillPackage[] {
    // Load from filesystem
    return [];
  }

  private saveMCPServer(server: MCPServer): void {
    const path = join(this.mcpDir, `${server.id}.json`);
    try {
      writeFileSync(path, JSON.stringify(server, null, 2), 'utf8');
    } catch (err) {
      log.error('Failed to save MCP server', { serverId: server.id, error: String(err) });
    }
  }

  private saveSkill(skill: SkillPackage): void {
    const path = join(this.skillsDir, `${skill.id}.json`);
    try {
      writeFileSync(path, JSON.stringify(skill, null, 2), 'utf8');
    } catch (err) {
      log.error('Failed to save skill', { skillId: skill.id, error: String(err) });
    }
  }

  private loadTelemetrySettings(): TelemetrySettings {
    const path = join(this.dataDir, 'telemetry-settings.json');
    if (!existsSync(path)) {
      const settings: TelemetrySettings = {
        enabled: false, // Default to off
        level: 'minimal',
        dataRetention: 30,
        shareUsageStats: false,
        shareErrorReports: false,
        sharePerformanceMetrics: false,
      };
      writeFileSync(path, JSON.stringify(settings, null, 2), 'utf8');
      return settings;
    }

    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = JSON.parse(raw);
      return TelemetrySettingsSchema.parse(parsed);
    } catch (err) {
      log.warn('Failed to load telemetry settings, using defaults', { error: String(err) });
      return {
        enabled: false,
        level: 'minimal',
        dataRetention: 30,
        shareUsageStats: false,
        shareErrorReports: false,
        sharePerformanceMetrics: false,
      };
    }
  }

  private saveTelemetrySettings(): void {
    const path = join(this.dataDir, 'telemetry-settings.json');
    try {
      writeFileSync(path, JSON.stringify(this.telemetrySettings, null, 2), 'utf8');
    } catch (err) {
      log.error('Failed to save telemetry settings', { error: String(err) });
    }
  }
}
