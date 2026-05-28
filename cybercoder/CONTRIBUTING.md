# Contributing to CyberMind CLI

Thank you for your interest in contributing to CyberMind CLI! We welcome contributions of all kinds, including bug reports, feature requests, documentation improvements, and code contributions.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Git
- Docker (for sandbox features)

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/your-username/cybermind-cli.git
   cd cybermind-cli
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development**
   ```bash
   pnpm dev
   ```

4. **Run tests**
   ```bash
   pnpm test
   ```

5. **Type checking**
   ```bash
   pnpm typecheck
   ```

## 📁 Project Structure

```
cybermind-cli/
├── packages/
│   ├── cli/              # Main CLI application
│   │   ├── src/
│   │   │   ├── commands/  # Slash command implementations
│   │   │   ├── components/ # React components for UI
│   │   │   └── index.tsx  # CLI entry point
│   │   └── package.json
│   ├── shared/           # Shared utilities and types
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── logger.ts
│   │   │   ├── collaboration.ts
│   │   │   ├── rich-io.ts
│   │   │   └── ecosystem.ts
│   │   └── package.json
│   ├── core/             # Core agent logic
│   ├── providers/        # AI provider integrations
│   ├── skills/           # Built-in skills
│   ├── tools/            # Tool implementations
│   ├── auth/             # Authentication
│   ├── config/           # Configuration management
│   └── telemetry/        # Usage analytics
├── scripts/              # Build and utility scripts
├── .github/workflows/    # CI/CD configurations
└── docs/                 # Documentation
```

## 🛠️ How to Contribute

### Reporting Bugs

1. Check existing issues first
2. Use the bug report template
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Relevant logs or screenshots

### Suggesting Features

1. Check existing feature requests
2. Use the feature request template
3. Describe the use case and benefits
4. Consider implementation complexity

### Contributing Code

#### 1. Create an Issue

Discuss your proposed changes in an issue first for major features.

#### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

#### 3. Make Changes

Follow our coding standards:
- Use TypeScript
- Follow ESLint configuration
- Write tests for new functionality
- Update documentation

#### 4. Test Your Changes

```bash
# Run all tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Build
pnpm build
```

#### 5. Submit a Pull Request

- Fill out the PR template
- Link related issues
- Include screenshots for UI changes
- Ensure CI passes

## 🎯 Development Guidelines

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Format code
pnpm lint:fix

# Check formatting
pnpm lint
```

### TypeScript

- Use strict TypeScript settings
- Provide proper type annotations
- Avoid `any` when possible
- Use interfaces for object shapes

### Testing

- Write unit tests for new functions
- Test edge cases and error conditions
- Use descriptive test names
- Mock external dependencies

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update CHANGELOG.md for significant changes

## 🔧 Adding New Features

### Adding a New Command

1. Create command file in `packages/cli/src/commands/`
2. Implement the command handler:
   ```typescript
   export function buildYourCommand(ctx: CommandContext): SlashCommandHandler {
     return {
       name: 'your-command',
       description: 'Command description',
       category: 'utility',
       usage: '/your-command <args>',
       run: (args: string) => {
         // Implementation
       }
     };
   }
   ```
3. Register in `packages/cli/src/commands/index.ts`
4. Add tests

### Adding a New Skill

1. Create skill in `packages/skills/src/`
2. Implement skill interface:
   ```typescript
   export const yourSkill: Skill = {
     name: 'your-skill',
     description: 'What this skill does',
     category: 'development',
     async execute(context, args) {
       // Skill implementation
       return { success: true, data: 'result' };
     }
   };
   ```
3. Register in skills index
4. Add tests and documentation

### Adding a New AI Provider

1. Create provider in `packages/providers/src/`
2. Implement provider interface
3. Add configuration options
4. Add tests
5. Update documentation

## 🧪 Testing

### Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @cybermind/cli test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Test Structure

```
packages/
└── your-package/
    ├── src/
    └── test/
        ├── setup.ts
        ├── your-file.test.ts
        └── fixtures/
```

### Writing Tests

```typescript
import { yourFunction } from '../src/your-file';

describe('yourFunction', () => {
  it('should do something', () => {
    const result = yourFunction(input);
    expect(result).toBe(expected);
  });
});
```

## 📦 Building and Publishing

### Local Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @cybermind/cli build
```

### Publishing

We use Changesets for version management:

```bash
# Add changeset
pnpm changeset

# Version packages
pnpm changeset version

# Publish
pnpm release
```

## 🏗️ Architecture

### Core Concepts

- **Commands**: Slash commands for CLI interaction
- **Skills**: Extensible AI capabilities
- **Providers**: AI model integrations
- **Tools**: System interaction capabilities
- **Collaboration**: Multi-agent features

### Key Patterns

- **Dependency Injection**: Services injected via context
- **Event-Driven**: Async communication between components
- **Plugin Architecture**: Extensible via skills and providers
- **Type Safety**: Comprehensive TypeScript usage

## 🤝 Community

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

### Getting Help

- **Discord**: [Join our community](https://discord.gg/cybermind)
- **GitHub Discussions**: [Ask questions](https://github.com/cybermind/cli/discussions)
- **Documentation**: [docs.cybermind.ai](https://docs.cybermind.ai)

### Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Annual contributor highlights

## 📋 Release Process

1. **Development**: Work on feature branches
2. **Testing**: Ensure all tests pass
3. **Documentation**: Update relevant docs
4. **PR**: Submit pull request for review
5. **Merge**: PR merged to main branch
6. **Release**: Automated release via CI

## 🔍 Troubleshooting

### Common Issues

**Build fails:**
- Clear node_modules: `pnpm clean && pnpm install`
- Check Node version: `node --version` (should be 18+)

**Tests fail:**
- Check test environment setup
- Verify dependencies are installed
- Check for missing test files

**TypeScript errors:**
- Run `pnpm typecheck`
- Check imports and exports
- Verify type definitions

### Getting Help

1. Check existing issues and discussions
2. Search documentation
3. Ask in Discord community
4. Create an issue with details

---

Thank you for contributing to CyberMind CLI! 🎉
