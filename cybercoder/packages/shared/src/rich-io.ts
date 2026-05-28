import { createLogger, getDataDir } from './logger.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const log = createLogger('rich-io');

export interface ImageContent {
  type: 'image';
  src: string; // data URL or file path
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface MermaidDiagram {
  type: 'mermaid';
  code: string;
  title?: string;
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
}

export interface CostMetrics {
  totalTokens: number;
  totalCost: number; // in USD
  modelBreakdown: Record<string, { tokens: number; cost: number }>;
  sessionStart: number;
  lastUpdate: number;
}

export interface HotkeyBinding {
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: string;
  description: string;
  category: 'navigation' | 'editing' | 'session' | 'tools' | 'custom';
}

export interface ScreenshotAnalysis {
  type: 'screenshot';
  imagePath: string;
  analysis: {
    description: string;
    elements: Array<{
      type: string;
      description: string;
      position?: { x: number; y: number; width: number; height: number };
    }>;
    suggestions?: string[];
  };
  timestamp: number;
}

const CostMetricsSchema = z.object({
  totalTokens: z.number(),
  totalCost: z.number(),
  modelBreakdown: z.record(z.object({
    tokens: z.number(),
    cost: z.number(),
  })),
  sessionStart: z.number(),
  lastUpdate: z.number(),
});

/**
 * Manages rich I/O features for the CyberMind CLI including
 * image handling, diagrams, cost tracking, and hotkeys.
 */
export class RichIOManager {
  private readonly dataDir: string;
  private readonly imagesDir: string;
  private readonly screenshotsDir: string;
  private costMetrics: CostMetrics;

  constructor() {
    this.dataDir = getDataDir();
    this.imagesDir = join(this.dataDir, 'images');
    this.screenshotsDir = join(this.dataDir, 'screenshots');
    
    if (!existsSync(this.imagesDir)) mkdirSync(this.imagesDir, { recursive: true });
    if (!existsSync(this.screenshotsDir)) mkdirSync(this.screenshotsDir, { recursive: true });
    
    this.costMetrics = this.loadCostMetrics();
  }

  /** Process and store an image from various sources */
  async processImage(input: string | Buffer, alt: string, caption?: string): Promise<ImageContent> {
    let src: string;
    
    if (typeof input === 'string') {
      if (input.startsWith('data:')) {
        // Already a data URL
        src = input;
      } else if (input.startsWith('http')) {
        // URL - would need to download in real implementation
        src = input;
        log.info('Image URL provided', { url: input });
      } else {
        // File path
        if (!existsSync(input)) {
          throw new Error(`Image file not found: ${input}`);
        }
        const buffer = readFileSync(input);
        const base64 = buffer.toString('base64');
        const mimeType = this.getMimeType(input);
        src = `data:${mimeType};base64,${base64}`;
      }
    } else {
      // Buffer
      const base64 = input.toString('base64');
      src = 'data:image/png;base64,' + base64;
    }

    const image: ImageContent = {
      type: 'image',
      src,
      alt,
      caption,
    };

    log.info('Processed image', { alt, hasCaption: !!caption });
    return image;
  }

  /** Create a mermaid diagram */
  createMermaidDiagram(code: string, title?: string, theme: MermaidDiagram['theme'] = 'default'): MermaidDiagram {
    const diagram: MermaidDiagram = {
      type: 'mermaid',
      code,
      title,
      theme,
    };

    log.info('Created mermaid diagram', { title, theme, codeLength: code.length });
    return diagram;
  }

  /** Update cost metrics */
  updateCostMetrics(model: string, tokens: number, cost: number): void {
    this.costMetrics.totalTokens += tokens;
    this.costMetrics.totalCost += cost;
    
    if (!this.costMetrics.modelBreakdown[model]) {
      this.costMetrics.modelBreakdown[model] = { tokens: 0, cost: 0 };
    }
    this.costMetrics.modelBreakdown[model].tokens += tokens;
    this.costMetrics.modelBreakdown[model].cost += cost;
    this.costMetrics.lastUpdate = Date.now();
    
    this.saveCostMetrics();
    log.debug('Updated cost metrics', { model, tokens, cost, totalCost: this.costMetrics.totalCost });
  }

  /** Get current cost metrics */
  getCostMetrics(): CostMetrics {
    return { ...this.costMetrics };
  }

  /** Get cost formatted as string */
  getCostString(): string {
    const { totalCost, totalTokens } = this.costMetrics;
    const duration = Date.now() - this.costMetrics.sessionStart;
    const minutes = Math.floor(duration / 60000);
    
    return `$${totalCost.toFixed(4)} • ${totalTokens.toLocaleString()} tokens • ${minutes}m`;
  }

  /** Get default hotkey bindings */
  getDefaultHotkeys(): HotkeyBinding[] {
    return [
      // Navigation
      { key: 'k', modifiers: ['ctrl'], action: 'clear', description: 'Clear screen', category: 'navigation' },
      { key: 'c', modifiers: ['ctrl'], action: 'exit', description: 'Exit CyberMind', category: 'navigation' },
      { key: '/', modifiers: [], action: 'focus-input', description: 'Focus input', category: 'navigation' },
      { key: 'ArrowUp', modifiers: ['ctrl'], action: 'history-prev', description: 'Previous command', category: 'navigation' },
      { key: 'ArrowDown', modifiers: ['ctrl'], action: 'history-next', description: 'Next command', category: 'navigation' },
      
      // Editing
      { key: 'l', modifiers: ['ctrl'], action: 'clear-input', description: 'Clear input', category: 'editing' },
      { key: 'a', modifiers: ['ctrl'], action: 'select-all', description: 'Select all', category: 'editing' },
      { key: 'z', modifiers: ['ctrl'], action: 'undo', description: 'Undo', category: 'editing' },
      { key: 'y', modifiers: ['ctrl'], action: 'redo', description: 'Redo', category: 'editing' },
      
      // Session
      { key: 's', modifiers: ['ctrl'], action: 'save-session', description: 'Save session', category: 'session' },
      { key: 'r', modifiers: ['ctrl'], action: 'rewind', description: 'Open rewind menu', category: 'session' },
      { key: 'p', modifiers: ['ctrl'], action: 'profile', description: 'Switch profile', category: 'session' },
      
      // Tools
      { key: 't', modifiers: ['ctrl'], action: 'trust', description: 'Trust settings', category: 'tools' },
      { key: 'm', modifiers: ['ctrl'], action: 'model', description: 'Model settings', category: 'tools' },
      { key: 'h', modifiers: ['ctrl'], action: 'help', description: 'Show help', category: 'tools' },
    ];
  }

  /** Show hotkey palette */
  getHotkeyPalette(): { category: string; bindings: HotkeyBinding[] }[] {
    const hotkeys = this.getDefaultHotkeys();
    const grouped = new Map<string, HotkeyBinding[]>();
    
    for (const hotkey of hotkeys) {
      if (!grouped.has(hotkey.category)) {
        grouped.set(hotkey.category, []);
      }
      grouped.get(hotkey.category)!.push(hotkey);
    }
    
    return Array.from(grouped.entries()).map(([category, bindings]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      bindings: bindings.sort((a, b) => a.key.localeCompare(b.key)),
    }));
  }

  /** Analyze a screenshot */
  async analyzeScreenshot(imagePath: string): Promise<ScreenshotAnalysis> {
    if (!existsSync(imagePath)) {
      throw new Error(`Screenshot file not found: ${imagePath}`);
    }

    // In a real implementation, this would use vision models
    // For now, return a mock analysis
    const analysis: ScreenshotAnalysis = {
      type: 'screenshot',
      imagePath,
      analysis: {
        description: 'Screenshot captured successfully',
        elements: [
          {
            type: 'window',
            description: 'Application window',
            position: { x: 0, y: 0, width: 1920, height: 1080 },
          },
        ],
        suggestions: [
          'Consider using this screenshot as reference for UI development',
          'You can ask questions about specific elements in the image',
        ],
      },
      timestamp: Date.now(),
    };

    log.info('Analyzed screenshot', { imagePath, elementCount: analysis.analysis.elements.length });
    return analysis;
  }

  /** Generate mobile-responsive HTML for content */
  generateMobileHTML(content: string, images?: ImageContent[], diagrams?: MermaidDiagram[]): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CyberMind Mobile</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a; 
            color: #fff; 
            line-height: 1.6;
            padding: 1rem;
        }
        .container { max-width: 100%; margin: 0 auto; }
        .content { margin-bottom: 2rem; white-space: pre-wrap; }
        .image { 
            margin: 1rem 0; 
            border-radius: 8px; 
            overflow: hidden;
            max-width: 100%;
        }
        .image img { 
            width: 100%; 
            height: auto; 
            display: block;
        }
        .image-caption { 
            font-size: 0.875rem; 
            color: #9ca3af; 
            margin-top: 0.5rem;
            text-align: center;
        }
        .diagram { 
            margin: 1rem 0; 
            background: #1a1a1a; 
            padding: 1rem; 
            border-radius: 8px;
            overflow-x: auto;
        }
        .diagram-title { 
            font-weight: bold; 
            margin-bottom: 0.5rem; 
        }
        .cost-meter {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #1a1a1a;
            padding: 0.75rem;
            border-top: 1px solid #333;
            font-size: 0.875rem;
            text-align: center;
        }
        @media (min-width: 768px) {
            body { padding: 2rem; }
            .container { max-width: 768px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">${content}</div>
        ${images?.map(img => `
            <div class="image">
                <img src="${img.src}" alt="${img.alt}" />
                ${img.caption ? `<div class="image-caption">${img.caption}</div>` : ''}
            </div>
        `).join('') || ''}
        ${diagrams?.map(diagram => `
            <div class="diagram">
                ${diagram.title ? `<div class="diagram-title">${diagram.title}</div>` : ''}
                <pre class="mermaid">${diagram.code}</pre>
            </div>
        `).join('') || ''}
    </div>
    <div class="cost-meter">${this.getCostString()}</div>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>mermaid.initialize({ theme: 'dark' });</script>
</body>
</html>`;
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
    };
    return mimeTypes[ext || ''] || 'image/png';
  }

  private loadCostMetrics(): CostMetrics {
    const path = join(this.dataDir, 'cost-metrics.json');
    if (!existsSync(path)) {
      const metrics: CostMetrics = {
        totalTokens: 0,
        totalCost: 0,
        modelBreakdown: {},
        sessionStart: Date.now(),
        lastUpdate: Date.now(),
      };
      writeFileSync(path, JSON.stringify(metrics, null, 2), 'utf8');
      return metrics;
    }

    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = JSON.parse(raw);
      return CostMetricsSchema.parse(parsed);
    } catch (err) {
      log.warn('Failed to load cost metrics, using defaults', { error: String(err) });
      return {
        totalTokens: 0,
        totalCost: 0,
        modelBreakdown: {},
        sessionStart: Date.now(),
        lastUpdate: Date.now(),
      };
    }
  }

  private saveCostMetrics(): void {
    const path = join(this.dataDir, 'cost-metrics.json');
    try {
      writeFileSync(path, JSON.stringify(this.costMetrics, null, 2), 'utf8');
    } catch (err) {
      log.error('Failed to save cost metrics', { error: String(err) });
    }
  }
}
