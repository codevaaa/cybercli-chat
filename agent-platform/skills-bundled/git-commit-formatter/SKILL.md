---
name: git-commit-formatter
description: Formats git commit messages according to Conventional Commits specification. Use this when the user asks to commit changes, write a commit message, or stage code.
agents: [coder, devops]
tags: [git, commits, formatting]
version: 1.0.0
author: CodeVaa Team
---

# Git Commit Formatter

## Goal
Ensure all git commit messages follow the Conventional Commits specification for clean, automated changelogs.

## Format
`<type>[optional scope]: <description>`

## Allowed Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Formatting changes (whitespace, semicolons, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding or correcting tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI configuration
- **chore**: Maintenance tasks (deps, configs)
- **revert**: Reverting a previous commit

## Instructions
1. Analyze the staged changes (git diff --staged) to determine the primary `type`
2. Identify the `scope` if applicable (e.g., specific module, component, or file area)
3. Write a concise `description` in imperative mood ("add feature" not "added feature")
4. Keep the first line under 72 characters
5. Add a body if the change is complex (separated by blank line)
6. If there are breaking changes, add footer: `BREAKING CHANGE: <description>`

## Constraints
- Never use past tense in the subject line
- Never capitalize the first letter of the description
- Never end the subject line with a period
- Scope must be a noun describing the section of the codebase

## Examples
```
feat(auth): implement OAuth2 PKCE flow
fix(api): handle null response from payment provider
docs(readme): add deployment instructions for Render
refactor(gateway): simplify model fallback chain logic
perf(chat): reduce SSE buffer allocation by 40%
```
