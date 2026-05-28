import { createLogger, getSettingsPath } from './logger.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

const log = createLogger('profiles');

export const ProfileSchema = z.object({
  name: z.enum(['default', 'strict-ts', 'hobby', 'paranoid']),
  /** Model to use for this profile */
  model: z.string(),
  /** Provider to use for this profile */
  provider: z.string(),
  /** Approval mode for tools */
  approvalMode: z.enum(['always-ask', 'session-bypass', 'persistent-bypass']),
  /** Whether to enable telemetry */
  telemetryEnabled: z.boolean(),
  /** Whether to enable auto-checkpoint */
  autoCheckpoint: z.boolean(),
  /** Custom accent color */
  accentColor: z.string().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const DEFAULT_PROFILES: Record<string, Profile> = {
  default: {
    name: 'default',
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    approvalMode: 'always-ask',
    telemetryEnabled: false,
    autoCheckpoint: true,
    accentColor: 'blue',
  },
  'strict-ts': {
    name: 'strict-ts',
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    approvalMode: 'always-ask',
    telemetryEnabled: true,
    autoCheckpoint: true,
    accentColor: 'red',
  },
  hobby: {
    name: 'hobby',
    model: 'claude-3-haiku-20241022',
    provider: 'anthropic',
    approvalMode: 'session-bypass',
    telemetryEnabled: false,
    autoCheckpoint: false,
    accentColor: 'green',
  },
  paranoid: {
    name: 'paranoid',
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    approvalMode: 'always-ask',
    telemetryEnabled: false,
    autoCheckpoint: true,
    accentColor: 'orange',
  },
};

interface SettingsFile {
  activeProfile: string;
  profiles: Record<string, Profile>;
}

const SettingsSchema = z.object({
  activeProfile: z.string(),
  profiles: z.record(z.string(), ProfileSchema),
});

export class ProfileManager {
  private readonly settingsPath: string;

  constructor() {
    this.settingsPath = getSettingsPath();
  }

  /** Get the current active profile */
  getActiveProfile(): Profile {
    const settings = this.loadSettings();
    const active = settings.profiles[settings.activeProfile] as Profile | undefined;
    if (!active) {
      log.warn('Active profile not found, falling back to default');
      return DEFAULT_PROFILES.default!;
    }
    return active;
  }

  /** Set the active profile by name */
  setActiveProfile(name: string): boolean {
    const settings = this.loadSettings();
    if (!settings.profiles[name]) {
      log.warn('Profile not found', { name });
      return false;
    }
    settings.activeProfile = name;
    this.saveSettings(settings);
    log.info('Switched profile', { name });
    return true;
  }

  /** Get all available profiles */
  listProfiles(): Record<string, Profile> {
    const settings = this.loadSettings();
    return settings.profiles;
  }

  /** Update a profile's settings */
  updateProfile(name: string, updates: Partial<Omit<Profile, 'name'>>): boolean {
    const settings = this.loadSettings();
    if (!settings.profiles[name]) {
      log.warn('Profile not found for update', { name });
      return false;
    }
    settings.profiles[name] = { ...settings.profiles[name], ...updates };
    this.saveSettings(settings);
    log.info('Updated profile', { name, updates: Object.keys(updates) });
    return true;
  }

  /** Reset a profile to its default configuration */
  resetProfile(name: string): boolean {
    const defaultConfig = DEFAULT_PROFILES[name as keyof typeof DEFAULT_PROFILES];
    if (!defaultConfig) {
      log.warn('Cannot reset unknown profile', { name });
      return false;
    }
    // Extract all fields except name for updates
    const { name: _, ...configWithoutName } = defaultConfig;
    return this.updateProfile(name, configWithoutName);
  }

  private loadSettings(): SettingsFile {
    if (!existsSync(this.settingsPath)) {
      // Initialize with default profiles
      const profiles: Record<string, Profile> = {};
      for (const [name, profile] of Object.entries(DEFAULT_PROFILES)) {
        profiles[name] = { ...profile };
      }
      const settings: SettingsFile = {
        activeProfile: 'default',
        profiles,
      };
      this.saveSettings(settings);
      return settings;
    }

    try {
      const raw = readFileSync(this.settingsPath, 'utf8');
      const parsed = JSON.parse(raw);
      const settings = SettingsSchema.parse(parsed);
      return settings;
    } catch (err) {
      log.error('Failed to load settings, using defaults', { error: String(err) });
      // Fallback to defaults
      const profiles: Record<string, Profile> = {};
      for (const [name, profile] of Object.entries(DEFAULT_PROFILES)) {
        profiles[name] = { ...profile };
      }
      return {
        activeProfile: 'default',
        profiles,
      };
    }
  }

  private saveSettings(settings: SettingsFile): void {
    try {
      writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    } catch (err) {
      log.error('Failed to save settings', { error: String(err) });
    }
  }
}
