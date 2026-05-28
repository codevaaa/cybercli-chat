import { ProfileManager } from '@cybermind/shared';
import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * `/profile` — manage CyberMind profiles.
 *
 *   /profile                     — list profiles and show active
 *   /profile <name>              — switch to profile
 *   /profile <name> <key>=<val>  — update profile setting
 *   /profile reset <name>        — reset profile to defaults
 *
 * Profiles bundle model, provider, approval mode, telemetry, and other preferences.
 */
export function buildProfileCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'profile',
    description: 'Manage CyberMind profiles (model, provider, approval mode, etc.).',
    category: 'config',
    usage: '/profile [<name> [<key>=<val>]] | /profile reset <name>',
    run: (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `profile-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      const manager = new ProfileManager();

      if (parts.length === 0) {
        const profiles = manager.listProfiles();
        const active = manager.getActiveProfile();
        const lines = [`Active profile: ${active.name}`, '', 'Available profiles:'];
        for (const [name, profile] of Object.entries(profiles)) {
          const marker = name === active.name ? '→' : ' ';
          lines.push(`${marker} ${name}`);
          lines.push(`   model: ${profile.model}`);
          lines.push(`   provider: ${profile.provider}`);
          lines.push(`   approval: ${profile.approvalMode}`);
          lines.push(`   telemetry: ${profile.telemetryEnabled ? 'on' : 'off'}`);
          lines.push(`   auto-checkpoint: ${profile.autoCheckpoint ? 'on' : 'off'}`);
          lines.push(`   accent: ${profile.accentColor ?? 'none'}`);
          lines.push('');
        }
        reply(lines.join('\n'));
        return;
      }

      if (parts[0] === 'reset' && parts[1]) {
        const name = parts[1];
        const success = manager.resetProfile(name);
        if (success) {
          reply(`Reset profile '${name}' to defaults.`);
        } else {
          reply(`Cannot reset profile '${name}'. Available: ${Object.keys(manager.listProfiles()).join(', ')}`);
        }
        return;
      }

      const name = parts[0];
      if (!name) {
        reply('Profile name is required.');
        return;
      }
      if (parts.length === 1) {
        // Switch to profile
        const success = manager.setActiveProfile(name);
        if (success) {
          const profile = manager.getActiveProfile();
          reply(`Switched to profile '${name}'.\nModel: ${profile.model}\nProvider: ${profile.provider}`);
          // Update app state if setters are available
          if (ctx.setModel) ctx.setModel(profile.model);
          if (ctx.setProvider) ctx.setProvider(profile.provider);
          if (ctx.setColor && profile.accentColor) ctx.setColor(profile.accentColor);
        } else {
          reply(`Profile '${name}' not found. Available: ${Object.keys(manager.listProfiles()).join(', ')}`);
        }
        return;
      }

      // Update profile setting: key=value
      const kvParts = parts[1]?.split('=') || [];
      if (kvParts.length !== 2) {
        reply('Usage: /profile <name> <key>=<value>');
        return;
      }
      const [key, value] = kvParts;
      if (!key || !value) {
        reply('Both key and value must be provided.');
        return;
      }
      const updates: Record<string, any> = {};

      // Parse known keys
      if (key === 'model' || key === 'provider' || key === 'accentColor') {
        updates[key] = value;
      } else if (key === 'approvalMode') {
        if (!['always-ask', 'session-bypass', 'persistent-bypass'].includes(value)) {
          reply('Invalid approvalMode. Use: always-ask, session-bypass, or persistent-bypass');
          return;
        }
        updates[key] = value;
      } else if (key === 'telemetryEnabled' || key === 'autoCheckpoint') {
        updates[key] = value === 'true' || value === '1';
      } else {
        reply(`Unknown key '${key}'. Valid: model, provider, approvalMode, telemetryEnabled, autoCheckpoint, accentColor`);
        return;
      }

      const success = manager.updateProfile(name, updates);
      if (success) {
        reply(`Updated profile '${name}': ${key} = ${value}`);
        // If this is the active profile, update app state
        if (manager.getActiveProfile().name === name) {
          if (key === 'model' && ctx.setModel) ctx.setModel(value);
          if (key === 'provider' && ctx.setProvider) ctx.setProvider(value);
          if (key === 'accentColor' && ctx.setColor) ctx.setColor(value);
        }
      } else {
        reply(`Failed to update profile '${name}'. Does it exist?`);
      }
    },
  };
}
