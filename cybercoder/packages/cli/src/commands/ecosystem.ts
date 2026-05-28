import { EcosystemManager } from '@cybermind/shared';
import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * `/mcp` — manage MCP (Model Context Protocol) servers.
 *
 *   /mcp list                    — list available MCP servers
 *   /mcp search <query>          — search MCP servers
 *   /mcp install <server-id>     — install an MCP server
 *   /mcp uninstall <server-id>   — uninstall an MCP server
 *   /mcp info <server-id>        — show MCP server details
 */
export function buildMCPCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'mcp',
    description: 'Manage MCP (Model Context Protocol) servers.',
    category: 'utility',
    usage: '/mcp <list|search|install|uninstall|info> [args...]',
    run: async (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `mcp-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (parts.length === 0) {
        reply('Usage: /mcp <list|search|install|uninstall|info> [args...]');
        return;
      }

      const command = parts[0];
      const ecosystem = new EcosystemManager();

      switch (command) {
        case 'list':
          const servers = ecosystem.getAvailableMCPServers();
          if (servers.length === 0) {
            reply('No MCP servers available.');
            return;
          }
          const lines = ['🔌 Available MCP Servers:'];
          for (const server of servers) {
            const status = server.installed ? '✅' : '⬜';
            lines.push(`${status} ${server.name} (${server.id})`);
            lines.push(`   ${server.description}`);
            lines.push(`   Version: ${server.version} • Author: ${server.author}`);
            if (server.tags.length > 0) {
              lines.push(`   Tags: ${server.tags.join(', ')}`);
            }
            lines.push('');
          }
          reply(lines.join('\n'));
          break;

        case 'search':
          if (parts.length < 2) {
            reply('Usage: /mcp search <query>');
            return;
          }
          const query = parts.slice(1).join(' ');
          if (!query) {
            reply('Query is required for search.');
            return;
          }
          const searchResults = await ecosystem.searchMCPServers(query);
          if (searchResults.length === 0) {
            reply(`No MCP servers found for: ${query}`);
            return;
          }
          const searchLines = [`🔍 MCP servers matching "${query}":`];
          for (const server of searchResults) {
            const status = server.installed ? '✅' : '⬜';
            searchLines.push(`${status} ${server.name} (${server.id})`);
            searchLines.push(`   ${server.description}`);
            searchLines.push('');
          }
          reply(searchLines.join('\n'));
          break;

        case 'install':
          if (parts.length < 2) {
            reply('Usage: /mcp install <server-id>');
            return;
          }
          const serverId = parts[1];
          if (!serverId) {
            reply('Server ID is required.');
            return;
          }
          const installSuccess = await ecosystem.installMCPServer(serverId);
          if (installSuccess) {
            reply(`✅ MCP server "${serverId}" installed successfully.`);
          } else {
            reply(`❌ Failed to install MCP server "${serverId}". Does it exist?`);
          }
          break;

        case 'uninstall':
          if (parts.length < 2) {
            reply('Usage: /mcp uninstall <server-id>');
            return;
          }
          const uninstallServerId = parts[1];
          if (!uninstallServerId) {
            reply('Server ID is required.');
            return;
          }
          const uninstallSuccess = await ecosystem.uninstallMCPServer(uninstallServerId);
          if (uninstallSuccess) {
            reply(`🗑️ MCP server "${uninstallServerId}" uninstalled successfully.`);
          } else {
            reply(`❌ Failed to uninstall MCP server "${uninstallServerId}". Does it exist?`);
          }
          break;

        case 'info':
          if (parts.length < 2) {
            reply('Usage: /mcp info <server-id>');
            return;
          }
          const infoServerId = parts[1];
          const allServers = ecosystem.getAvailableMCPServers();
          const server = allServers.find(s => s.id === infoServerId);
          if (!server) {
            reply(`MCP server "${infoServerId}" not found.`);
            return;
          }
          const infoLines = [
            `📋 MCP Server Information`,
            `Name: ${server.name}`,
            `ID: ${server.id}`,
            `Description: ${server.description}`,
            `Version: ${server.version}`,
            `Author: ${server.author}`,
            `Status: ${server.installed ? '✅ Installed' : '⬜ Not installed'}`,
            `Tags: ${server.tags.join(', ') || 'None'}`,
          ];
          if (server.repository) {
            infoLines.push(`Repository: ${server.repository}`);
          }
          infoLines.push(`Last Updated: ${new Date(server.lastUpdated).toLocaleString()}`);
          reply(infoLines.join('\n'));
          break;

        default:
          reply(`Unknown command "${command}". Use: list, search, install, uninstall, info`);
          break;
      }
    },
  };
}

/**
 * `/skills` — manage skill marketplace.
 *
 *   /skills list                     — list available skills
 *   /skills search <query>           — search skills
 *   /skills category <category>      — list skills by category
 *   /skills install <skill-id>       — install a skill
 *   /skills uninstall <skill-id>     — uninstall a skill
 *   /skills info <skill-id>          — show skill details
 */
export function buildSkillsMarketplaceCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'skills',
    description: 'Manage skill marketplace.',
    category: 'utility',
    usage: '/skills <list|search|category|install|uninstall|info> [args...]',
    run: async (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `skills-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (parts.length === 0) {
        reply('Usage: /skills <list|search|category|install|uninstall|info> [args...]');
        return;
      }

      const command = parts[0];
      const ecosystem = new EcosystemManager();

      switch (command) {
        case 'list':
          const skills = ecosystem.getAvailableSkills();
          const categories = new Set(skills.map(s => s.category));
          const categoryLines = ['🎯 Available Skills by Category:', ''];
          
          for (const category of Array.from(categories).sort()) {
            const categorySkills = skills.filter(s => s.category === category);
            categoryLines.push(`📂 ${category.charAt(0).toUpperCase() + category.slice(1)} (${categorySkills.length})`);
            for (const skill of categorySkills.slice(0, 5)) { // Show first 5 per category
              const status = skill.installed ? '✅' : '⬜';
              categoryLines.push(`  ${status} ${skill.name} (${skill.id})`);
              categoryLines.push(`     ⭐ ${skill.rating} • ${skill.downloadCount} downloads`);
            }
            if (categorySkills.length > 5) {
              categoryLines.push(`  ... and ${categorySkills.length - 5} more`);
            }
            categoryLines.push('');
          }
          reply(categoryLines.join('\n'));
          break;

        case 'search':
          if (parts.length < 2) {
            reply('Usage: /skills search <query>');
            return;
          }
          const searchQuery = parts.slice(1).join(' ');
          if (!searchQuery) {
            reply('Query is required for search.');
            return;
          }
          const searchSkillResults = await ecosystem.searchSkills(searchQuery);
          if (searchSkillResults.length === 0) {
            reply(`No skills found for: ${searchQuery}`);
            return;
          }
          const searchSkillLines = [`🔍 Skills matching "${searchQuery}":`];
          for (const skill of searchSkillResults) {
            const status = skill.installed ? '✅' : '⬜';
            searchSkillLines.push(`${status} ${skill.name} (${skill.category})`);
            searchSkillLines.push(`   ${skill.description}`);
            searchSkillLines.push(`   ⭐ ${skill.rating} • ${skill.downloadCount} downloads`);
            searchSkillLines.push('');
          }
          reply(searchSkillLines.join('\n'));
          break;

        case 'category':
          if (parts.length < 2) {
            reply('Usage: /skills category <category>');
            reply('Categories: development, design, testing, deployment, monitoring, security, data, ai');
            return;
          }
          const categoryName = parts[1] as any;
          if (!categoryName) {
            reply('Category is required.');
            return;
          }
          const validCategories = ['development', 'design', 'testing', 'deployment', 'monitoring', 'security', 'data', 'ai'];
          if (!validCategories.includes(categoryName)) {
            reply(`Invalid category. Use: ${validCategories.join(', ')}`);
            return;
          }
          const categorySkills = await ecosystem.searchSkills('', categoryName);
          if (categorySkills.length === 0) {
            reply(`No skills found in category: ${categoryName}`);
            return;
          }
          const categorySkillLines = [`📂 ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Skills:`];
          for (const skill of categorySkills) {
            const status = skill.installed ? '✅' : '⬜';
            categorySkillLines.push(`${status} ${skill.name} (${skill.id})`);
            categorySkillLines.push(`   ${skill.description}`);
            categorySkillLines.push(`   ⭐ ${skill.rating} • ${skill.downloadCount} downloads`);
            if (skill.dependencies && skill.dependencies.length > 0) {
              categorySkillLines.push(`   Dependencies: ${skill.dependencies.join(', ')}`);
            }
            categorySkillLines.push('');
          }
          reply(categorySkillLines.join('\n'));
          break;

        case 'install':
          if (parts.length < 2) {
            reply('Usage: /skills install <skill-id>');
            return;
          }
          const skillId = parts[1];
          if (!skillId) {
            reply('Skill ID is required.');
            return;
          }
          const installSkillSuccess = await ecosystem.installSkill(skillId);
          if (installSkillSuccess) {
            reply(`✅ Skill "${skillId}" installed successfully.`);
          } else {
            reply(`❌ Failed to install skill "${skillId}". Does it exist or are dependencies missing?`);
          }
          break;

        case 'uninstall':
          if (parts.length < 2) {
            reply('Usage: /skills uninstall <skill-id>');
            return;
          }
          const uninstallSkillId = parts[1];
          if (!uninstallSkillId) {
            reply('Skill ID is required.');
            return;
          }
          const uninstallSkillSuccess = await ecosystem.uninstallSkill(uninstallSkillId);
          if (uninstallSkillSuccess) {
            reply(`🗑️ Skill "${uninstallSkillId}" uninstalled successfully.`);
          } else {
            reply(`❌ Failed to uninstall skill "${uninstallSkillId}". Does it exist?`);
          }
          break;

        case 'info':
          if (parts.length < 2) {
            reply('Usage: /skills info <skill-id>');
            return;
          }
          const infoSkillId = parts[1];
          const allSkills = ecosystem.getAvailableSkills();
          const skill = allSkills.find(s => s.id === infoSkillId);
          if (!skill) {
            reply(`Skill "${infoSkillId}" not found.`);
            return;
          }
          const infoSkillLines = [
            `📋 Skill Information`,
            `Name: ${skill.name}`,
            `ID: ${skill.id}`,
            `Description: ${skill.description}`,
            `Version: ${skill.version}`,
            `Author: ${skill.author}`,
            `Category: ${skill.category}`,
            `Status: ${skill.installed ? '✅ Installed' : '⬜ Not installed'}`,
            `Rating: ⭐ ${skill.rating}/5.0`,
            `Downloads: ${skill.downloadCount}`,
            `Tags: ${skill.tags.join(', ') || 'None'}`,
          ];
          if (skill.dependencies && skill.dependencies.length > 0) {
            infoSkillLines.push(`Dependencies: ${skill.dependencies.join(', ')}`);
          }
          infoSkillLines.push(`Last Updated: ${new Date(skill.lastUpdated).toLocaleString()}`);
          reply(infoSkillLines.join('\n'));
          break;

        default:
          reply(`Unknown command "${command}". Use: list, search, category, install, uninstall, info`);
          break;
      }
    },
  };
}

/**
 * `/telemetry` — manage telemetry settings.
 *
 *   /telemetry status              — show current telemetry settings
 *   /telemetry enable              — enable telemetry
 *   /telemetry disable             — disable telemetry
 *   /telemetry level <level>       — set telemetry level (minimal, basic, detailed)
 *   /telemetry retention <days>    — set data retention period
 *   /telemetry share <type> <on|off> — configure sharing settings
 */
export function buildTelemetryCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'telemetry',
    description: 'Manage telemetry settings.',
    category: 'utility',
    usage: '/telemetry <status|enable|disable|level|retention|share> [args...]',
    run: (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `telemetry-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (parts.length === 0) {
        reply('Usage: /telemetry <status|enable|disable|level|retention|share> [args...]');
        return;
      }

      const command = parts[0];
      const ecosystem = new EcosystemManager();

      switch (command) {
        case 'status':
          const settings = ecosystem.getTelemetrySettings();
          const statusLines = [
            '📊 Telemetry Settings',
            `Status: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}`,
            `Level: ${settings.level}`,
            `Data Retention: ${settings.dataRetention} days`,
            '',
            'Sharing Settings:',
            `  Usage Stats: ${settings.shareUsageStats ? '✅' : '❌'}`,
            `  Error Reports: ${settings.shareErrorReports ? '✅' : '❌'}`,
            `  Performance Metrics: ${settings.sharePerformanceMetrics ? '✅' : '❌'}`,
          ];
          reply(statusLines.join('\n'));
          break;

        case 'enable':
          ecosystem.updateTelemetrySettings({ enabled: true });
          reply('✅ Telemetry enabled.');
          ecosystem.recordUsage('telemetry_enabled');
          break;

        case 'disable':
          ecosystem.updateTelemetrySettings({ enabled: false });
          reply('❌ Telemetry disabled.');
          break;

        case 'level':
          if (parts.length < 2) {
            reply('Usage: /telemetry level <minimal|basic|detailed>');
            return;
          }
          const level = parts[1] as any;
          if (!level) {
            reply('Level is required.');
            return;
          }
          if (!['minimal', 'basic', 'detailed'].includes(level)) {
            reply('Invalid level. Use: minimal, basic, detailed');
            return;
          }
          ecosystem.updateTelemetrySettings({ level });
          reply(`📊 Telemetry level set to: ${level}`);
          break;

        case 'retention':
          if (parts.length < 2) {
            reply('Usage: /telemetry retention <days>');
            return;
          }
          const days = parseInt(parts[1] || '0');
          if (isNaN(days) || days < 1) {
            reply('Please provide a valid number of days (minimum 1).');
            return;
          }
          ecosystem.updateTelemetrySettings({ dataRetention: days });
          reply(`📅 Data retention set to: ${days} days`);
          break;

        case 'share':
          if (parts.length < 3) {
            reply('Usage: /telemetry share <usage|errors|performance> <on|off>');
            return;
          }
          const shareType = parts[1];
          const shareValue = parts[2]?.toLowerCase() === 'on';
          
          if (!shareType) {
            reply('Share type is required.');
            return;
          }
          if (!parts[2]) {
            reply('Share value (on/off) is required.');
            return;
          }
          if (shareType === 'usage') {
            ecosystem.updateTelemetrySettings({ shareUsageStats: shareValue });
          } else if (shareType === 'errors') {
            ecosystem.updateTelemetrySettings({ shareErrorReports: shareValue });
          } else if (shareType === 'performance') {
            ecosystem.updateTelemetrySettings({ sharePerformanceMetrics: shareValue });
          } else {
            reply('Invalid type. Use: usage, errors, performance');
            return;
          }
          
          reply(`📤 ${shareType} sharing ${shareValue ? 'enabled' : 'disabled'}`);
          break;

        default:
          reply(`Unknown command "${command}". Use: status, enable, disable, level, retention, share`);
          break;
      }
    },
  };
}
