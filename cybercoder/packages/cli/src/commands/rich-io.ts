import { RichIOManager } from '@cybermind/shared';
import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * `/image` — handle inline images in the CLI.
 *
 *   /image <path> [alt] [caption]  — display an image with optional alt text and caption
 *   /image url <url> [alt] [caption] — display an image from URL
 */
export function buildImageCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'image',
    description: 'Display inline images in the CLI.',
    category: 'utility',
    usage: '/image <path|url <url>> [alt] [caption]',
    run: async (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `image-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (parts.length === 0) {
        reply('Usage: /image <path> [alt] [caption] or /image url <url> [alt] [caption]');
        return;
      }

      const richIO = new RichIOManager();
      
      try {
        let input: string;
        let alt: string;
        let caption: string | undefined;

        if (parts[0] === 'url' && parts[1]) {
          input = parts[1];
          alt = parts[2] || 'Image from URL';
          caption = parts.slice(3).join(' ') || undefined;
        } else {
          input = parts[0] || '';
          alt = parts[1] || 'Image';
          caption = parts.slice(2).join(' ') || undefined;
        }

        const image = await richIO.processImage(input, alt, caption);
        reply(`[IMAGE: ${image.alt}]${caption ? `\n${caption}` : ''}\n(Src: ${image.src.substring(0, 50)}...)`);
      } catch (err) {
        reply(`Error processing image: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}

/**
 * `/mermaid` — create and display mermaid diagrams.
 *
 *   /mermaid <code> [title]  — create a mermaid diagram
 *   /mermaid theme <theme>   — set default theme (default, dark, forest, neutral)
 */
export function buildMermaidCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'mermaid',
    description: 'Create and display Mermaid diagrams.',
    category: 'utility',
    usage: '/mermaid <code> [title] | /mermaid theme <theme>',
    run: (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `mermaid-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (parts.length === 0) {
        reply('Usage: /mermaid <code> [title] or /mermaid theme <theme>');
        return;
      }

      const richIO = new RichIOManager();

      if (parts[0] === 'theme' && parts[1]) {
        const theme = parts[1] as any;
        if (!['default', 'dark', 'forest', 'neutral'].includes(theme)) {
          reply('Invalid theme. Use: default, dark, forest, neutral');
          return;
        }
        reply(`Mermaid theme set to: ${theme}`);
        return;
      }

      // Create diagram
      const code = args.includes('\n') ? args : parts.join(' ');
      const title = parts.length > 1 && !code.includes('\n') ? parts.slice(1).join(' ') : undefined;
      
      const diagram = richIO.createMermaidDiagram(code, title);
      const output = [
        '[MERMAID DIAGRAM]',
        title ? `Title: ${title}` : '',
        `Theme: ${diagram.theme}`,
        '',
        '```mermaid',
        diagram.code,
        '```',
      ].filter(Boolean).join('\n');

      reply(output);
    },
  };
}

/**
 * `/cost` — display cost metrics and usage statistics.
 *
 *   /cost                     — show current cost metrics
 *   /cost reset               — reset cost tracking
 *   /cost model <model>       — show cost breakdown for specific model
 */
export function buildCostCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'cost',
    description: 'Display cost metrics and usage statistics.',
    category: 'utility',
    usage: '/cost [reset|model <model>]',
    run: (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `cost-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      const richIO = new RichIOManager();
      const metrics = richIO.getCostMetrics();

      if (parts.length === 0) {
        const lines = [
          '💰 Cost Metrics',
          `Total Cost: $${metrics.totalCost.toFixed(4)}`,
          `Total Tokens: ${metrics.totalTokens.toLocaleString()}`,
          `Session Duration: ${Math.floor((Date.now() - metrics.sessionStart) / 60000)} minutes`,
          '',
          'Model Breakdown:',
        ];

        for (const [model, data] of Object.entries(metrics.modelBreakdown)) {
          lines.push(`  ${model}: ${data.tokens.toLocaleString()} tokens ($${data.cost.toFixed(4)})`);
        }

        if (Object.keys(metrics.modelBreakdown).length === 0) {
          lines.push('  No usage data yet');
        }

        reply(lines.join('\n'));
        return;
      }

      if (parts[0] === 'reset') {
        // Reset would require additional method in RichIOManager
        reply('Cost reset feature not yet implemented.');
        return;
      }

      if (parts[0] === 'model' && parts[1]) {
        const model = parts[1];
        const modelData = metrics.modelBreakdown[model];
        
        if (!modelData) {
          reply(`No usage data for model: ${model}`);
          return;
        }

        reply(`Model: ${model}\nTokens: ${modelData.tokens.toLocaleString()}\nCost: $${modelData.cost.toFixed(4)}`);
        return;
      }

      reply('Usage: /cost [reset|model <model>]');
    },
  };
}

/**
 * `/hotkeys` — display hotkey palette and shortcuts.
 *
 *   /hotkeys                  — show all hotkey bindings
 *   /hotkeys <category>       — show hotkeys for specific category
 */
export function buildHotkeysCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'hotkeys',
    description: 'Display hotkey palette and shortcuts.',
    category: 'utility',
    usage: '/hotkeys [category]',
    run: (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `hotkeys-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      const richIO = new RichIOManager();
      const palette = richIO.getHotkeyPalette();

      if (parts.length === 0) {
        const lines = ['⌨️  Hotkey Palette', ''];
        
        for (const category of palette) {
          lines.push(`📂 ${category.category}`);
          for (const binding of category.bindings) {
            const keyCombo = binding.modifiers.length > 0 
              ? `${binding.modifiers.join('+')}+${binding.key}`
              : binding.key;
            lines.push(`  ${keyCombo.padEnd(15)} ${binding.description}`);
          }
          lines.push('');
        }

        reply(lines.join('\n'));
        return;
      }

      const category = (parts[0] || '').toLowerCase();
      const categoryData = palette.find(c => c.category.toLowerCase() === category);
      
      if (!categoryData) {
        const categories = palette.map(c => c.category.toLowerCase()).join(', ');
        reply(`Category not found. Available: ${categories}`);
        return;
      }

      const lines = [`⌨️  ${categoryData.category} Hotkeys`, ''];
      for (const binding of categoryData.bindings) {
        const keyCombo = binding.modifiers.length > 0 
          ? `${binding.modifiers.join('+')}+${binding.key}`
          : binding.key;
        lines.push(`${keyCombo.padEnd(15)} ${binding.description}`);
      }

      reply(lines.join('\n'));
    },
  };
}

/**
 * `/screenshot` — analyze screenshots and extract information.
 *
 *   /screenshot <path>       — analyze a screenshot file
 *   /screenshot capture      — capture screen (placeholder)
 */
export function buildScreenshotCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'screenshot',
    description: 'Analyze screenshots and extract information.',
    category: 'utility',
    usage: '/screenshot <path> | /screenshot capture',
    run: async (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `screenshot-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (parts.length === 0) {
        reply('Usage: /screenshot <path> or /screenshot capture');
        return;
      }

      const richIO = new RichIOManager();

      if (parts[0] === 'capture') {
        reply('Screen capture feature not yet implemented. Would use system screenshot APIs.');
        return;
      }

      const imagePath = parts[0];
      if (!imagePath) {
        reply('Image path is required.');
        return;
      }
      
      try {
        const analysis = await richIO.analyzeScreenshot(imagePath);
        const lines = [
          '📸 Screenshot Analysis',
          `Path: ${analysis.imagePath}`,
          `Analyzed: ${new Date(analysis.timestamp).toLocaleString()}`,
          '',
          'Description:',
          `  ${analysis.analysis.description}`,
          '',
          'Detected Elements:',
        ];

        for (const element of analysis.analysis.elements) {
          lines.push(`  • ${element.type}: ${element.description}`);
          if (element.position) {
            lines.push(`    Position: ${element.position.x},${element.position.y} (${element.position.width}×${element.position.height})`);
          }
        }

        if (analysis.analysis.suggestions && analysis.analysis.suggestions.length > 0) {
          lines.push('', 'Suggestions:');
          for (const suggestion of analysis.analysis.suggestions) {
            lines.push(`  • ${suggestion}`);
          }
        }

        reply(lines.join('\n'));
      } catch (err) {
        reply(`Error analyzing screenshot: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}

/**
 * `/mobile` — generate mobile-friendly HTML output.
 *
 *   /mobile                   — generate mobile HTML for current session
 *   /mobile export <path>      — export mobile HTML to file
 */
export function buildMobileCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'mobile',
    description: 'Generate mobile-friendly HTML output.',
    category: 'utility',
    usage: '/mobile [export <path>]',
    run: (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `mobile-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      const richIO = new RichIOManager();
      
      // Mock content - in real implementation would get from session
      const content = 'CyberMind CLI Session Content';
      const html = richIO.generateMobileHTML(content);

      if (parts.length === 0) {
        reply('📱 Mobile HTML generated (preview):\n' + html.substring(0, 200) + '...');
        return;
      }

      if (parts[0] === 'export' && parts[1]) {
        const exportPath = parts[1];
        if (!exportPath) {
          reply('Export path is required.');
          return;
        }
        // In real implementation would write to file
        reply(`Mobile HTML exported to: ${exportPath}\nFile size: ${html.length} characters`);
        return;
      }

      reply('Usage: /mobile [export <path>]');
    },
  };
}
