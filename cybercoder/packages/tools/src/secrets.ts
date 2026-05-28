import { createLogger, getHomeDir, getSecretsPath } from '@cybermind/shared';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';

const log = createLogger('tools:secrets');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // GCM standard
const SALT_LEN = 16;
const KEY_LEN = 32;

/**
 * Encrypted secrets vault stored at ~/.cybermind/secrets.enc. Secrets are
 * encrypted with AES-256-GCM using a key derived from a per-machine pepper
 * (the machine hostname + a stable salt) so the file is portable but not
 * trivially leaked.
 *
 * This is M3's minimum viable vault. M6 upgrades to the OS keychain via
 * `keytar`, and the cloud-sync feature in M11 will encrypt with a
 * user-derived key for end-to-end privacy.
 *
 * Secrets set here are auto-injected into tool environment but never sent
 * to the LLM (the agent loop redacts them from its context window).
 */
export class SecretsVault {
  private cache: Record<string, string> | null = null;

  list(): string[] {
    return Object.keys(this.load());
  }

  get(name: string): string | undefined {
    return this.load()[name];
  }

  set(name: string, value: string): void {
    const all = this.load();
    all[name] = value;
    this.save(all);
  }

  remove(name: string): boolean {
    const all = this.load();
    if (!(name in all)) return false;
    delete all[name];
    this.save(all);
    return true;
  }

  /** Merge the vault into a process env-like object for tool execution. */
  injectInto(env: Record<string, string>): Record<string, string> {
    return { ...env, ...this.load() };
  }

  private load(): Record<string, string> {
    if (this.cache) return this.cache;
    const path = getSecretsPath();
    if (!existsSync(path)) {
      this.cache = {};
      return this.cache;
    }
    try {
      const buf = readFileSync(path);
      const salt = buf.subarray(0, SALT_LEN);
      const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
      const tag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + 16);
      const ciphertext = buf.subarray(SALT_LEN + IV_LEN + 16);
      const key = scryptSync(this.pepper(), salt, KEY_LEN);
      const decipher = createDecipheriv(ALGO, key, iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      this.cache = JSON.parse(plain.toString('utf8')) as Record<string, string>;
      return this.cache;
    } catch (err) {
      log.error('failed to decrypt secrets vault; treating as empty', String(err));
      this.cache = {};
      return this.cache;
    }
  }

  private save(all: Record<string, string>): void {
    const path = getSecretsPath();
    if (!existsSync(getHomeDir())) mkdirSync(getHomeDir(), { recursive: true });
    const salt = randomBytes(SALT_LEN);
    const iv = randomBytes(IV_LEN);
    const key = scryptSync(this.pepper(), salt, KEY_LEN);
    const cipher = createCipheriv(ALGO, key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(all), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    writeFileSync(path, Buffer.concat([salt, iv, tag, ciphertext]));
    this.cache = { ...all };
  }

  /**
   * Stable per-machine pepper. Not a secret — just makes the encrypted file
   * non-portable between machines. M6 will swap this for an OS-keychain entry.
   */
  private pepper(): Buffer {
    const host = (process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? 'cybermind') + ':cybermind-v1';
    return createHash('sha256').update(host).digest();
  }
}
