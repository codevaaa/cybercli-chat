import { Command } from 'commander';
import { render } from 'ink';
import { CYBERMIND_VERSION, createLogger } from '@cybermind/shared';
import { App } from './app.js';
import { runChat } from './runtime/chat.js';
import { clearLogin, isOnboardingComplete } from './utils/config.js';
import type { SessionMessage } from './state/session.js';

const log = createLogger('cli');

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('cm')
    .description('CyberCoder CLI — fullstack agentic coding assistant')
    .version(CYBERMIND_VERSION, '-v, --version', 'print the CyberCoder version')
    .option('-d, --debug', 'enable debug logging')
    .option('--no-welcome', 'skip the welcome screen on startup')
    .option('-p, --print <prompt>', 'print mode: run a single prompt non-interactively and exit')
    .option('--model <name>', 'override the default model for this session')
    .option('--provider <name>', 'override the default provider for this session')
    .action((opts) => {
      if (opts.debug) {
        process.env.CYBERMIND_LOG_LEVEL = 'debug';
        process.env.CYBERMIND_LOG_STDERR = 'true';
      }

      log.debug('starting CyberMind CLI', { opts });

      if (opts.print) {
        void runPrintMode(opts.print as string, opts.model as string | undefined);
        return;
      }

      const { waitUntilExit } = render(
        <App
          showWelcome={opts.welcome !== false}
          initialModel={opts.model}
          initialProvider={opts.provider}
        />,
        {
          exitOnCtrlC: false, // we handle Ctrl+C ourselves to confirm exits
        },
      );

      waitUntilExit().then(
        () => process.exit(0),
        (err) => {
          log.error('CLI exited with error', err instanceof Error ? err.message : err);
          process.exit(1);
        },
      );
    });

  // ── Status subcommand (like `claude status`) ──
  program
    .command('status')
    .description('Show CyberCoder authentication status')
    .action(() => {
      const loggedIn = isOnboardingComplete();
      // eslint-disable-next-line no-console
      console.log('🔐 CyberCoder Status');
      // eslint-disable-next-line no-console
      console.log(`   Authentication: ${loggedIn ? '✅ Logged in' : '❌ Not logged in'}`);
      // eslint-disable-next-line no-console
      console.log(`   Version: ${CYBERMIND_VERSION}`);
      if (!loggedIn) {
        // eslint-disable-next-line no-console
        console.log('   Run `cm` to start the login flow.');
      }
      process.exit(0);
    });

  // ── Login subcommand (like `claude login`) ──
  program
    .command('login')
    .description('Login to CyberCoder (opens browser)')
    .action(() => {
      const loggedIn = isOnboardingComplete();
      if (loggedIn) {
        // eslint-disable-next-line no-console
        console.log('✅ Already logged in to CyberCoder.');
        // eslint-disable-next-line no-console
        console.log('   Run `cm` to start coding.');
      } else {
        // eslint-disable-next-line no-console
        console.log('🔐 CyberCoder Login');
        // eslint-disable-next-line no-console
        console.log('   Opening browser to https://cybermindcli.info/login ...');
        import('open').then((mod) => {
          mod.default('https://cybermindcli.info/login?redirect=cli');
          // eslint-disable-next-line no-console
          console.log('   Browser opened. Complete login there, then run `cm`.');
          process.exit(0);
        }).catch(() => {
          // eslint-disable-next-line no-console
          console.log('   Visit: https://cybermindcli.info/login?redirect=cli');
          process.exit(0);
        });
        return;
      }
      process.exit(0);
    });

  // ── Logout subcommand (like `claude logout`) ──
  program
    .command('logout')
    .description('Logout from CyberCoder and clear all session data')
    .action(() => {
      clearLogin();
      // eslint-disable-next-line no-console
      console.log('👋 Logged out from CyberCoder.');
      // eslint-disable-next-line no-console
      console.log('   All session data and API keys cleared.');
      // eslint-disable-next-line no-console
      console.log('   Run `cm` again to log in.');
      process.exit(0);
    });

  program.parseAsync(process.argv).catch((err) => {
    log.error('failed to parse args', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

/**
 * Non-interactive print mode: runs a single user prompt through the agent loop
 * and streams the assistant response to stdout. Exits non-zero on error.
 */
async function runPrintMode(prompt: string, model?: string): Promise<void> {
  const history: SessionMessage[] = [
    { id: 'u1', role: 'user', content: prompt, createdAt: Date.now() },
  ];
  let exitCode = 0;
  try {
    await runChat(history, {
      model,
      onEvent: (evt) => {
        if (evt.type === 'text') process.stdout.write(evt.text);
        else if (evt.type === 'tool_call') {
          process.stdout.write(`\n[tool call: ${evt.name}] (executor lands in M3)\n`);
        } else if (evt.type === 'done') {
          if (evt.reason === 'error') {
            process.stderr.write(`\n[error] ${evt.error ?? 'unknown'}\n`);
            exitCode = 1;
          } else {
            process.stdout.write('\n');
          }
        }
      },
    });
  } catch (err) {
    process.stderr.write(`\n[fatal] ${err instanceof Error ? err.message : String(err)}\n`);
    exitCode = 1;
  }
  process.exit(exitCode);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[cybermind] fatal:', err);
  process.exit(1);
});
