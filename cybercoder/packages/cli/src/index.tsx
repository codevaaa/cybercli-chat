import { Command } from 'commander';
import { render } from 'ink';
import { CYBERMIND_VERSION, createLogger } from '@cybermind/shared';
import { App } from './app.js';
import { runChat } from './runtime/chat.js';
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
