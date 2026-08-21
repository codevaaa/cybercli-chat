---
name: code-review-checklist
description: Comprehensive code review checklist covering security, performance, maintainability, and correctness. Use when reviewing PRs, auditing code, or checking implementation quality.
agents: [code-reviewer, security-engineer, reviewer]
tags: [review, quality, security, best-practices]
version: 1.0.0
author: CodeVaa Team
---

# Code Review Checklist

## Goal
Ensure every code review is thorough, consistent, and catches issues across all quality dimensions.

## Review Dimensions (check ALL)

### 1. Correctness
- [ ] Does the code do what the PR description/ticket says?
- [ ] Are all edge cases handled (null, empty, max values, concurrent access)?
- [ ] Are off-by-one errors possible in loops/slices?
- [ ] Is the logic correct for all branches (if/else/switch)?
- [ ] Are race conditions possible in async code?

### 2. Security
- [ ] Input validation on all user-facing data?
- [ ] SQL/NoSQL injection possible? (parameterized queries?)
- [ ] XSS vectors? (output encoding/sanitization?)
- [ ] Secrets/keys/tokens hardcoded or logged?
- [ ] Auth checks on all protected endpoints?
- [ ] CORS configured correctly?
- [ ] File upload validation (type, size, path traversal)?

### 3. Performance
- [ ] O(n²) or worse algorithms where O(n) is possible?
- [ ] N+1 query patterns in database access?
- [ ] Unnecessary allocations in hot paths?
- [ ] Missing indexes for new query patterns?
- [ ] Unbounded growth (maps/arrays that never get cleaned)?
- [ ] Missing pagination for list endpoints?

### 4. Maintainability
- [ ] Clear, descriptive names (no `x`, `temp`, `data2`)?
- [ ] Functions under 50 lines? Classes under 300?
- [ ] No code duplication (DRY without over-abstraction)?
- [ ] Consistent patterns with the rest of the codebase?
- [ ] Exported functions have documentation?

### 5. Error Handling
- [ ] All async operations have try/catch or .catch()?
- [ ] Errors propagated meaningfully (not swallowed silently)?
- [ ] User-facing errors are helpful but don't leak internals?
- [ ] Cleanup in finally blocks where needed?
- [ ] Timeouts set for external calls?

### 6. Testing
- [ ] Happy path tested?
- [ ] Error cases tested?
- [ ] Edge cases tested?
- [ ] Mocks/stubs for external dependencies?
- [ ] No flaky tests (time-dependent, order-dependent)?

## Verdict Format
After reviewing all dimensions, render exactly ONE verdict:
- **APPROVED** — Ready to merge. No issues or only nitpicks.
- **APPROVED WITH SUGGESTIONS** — Merge-ready but has non-blocking improvements.
- **CHANGES REQUIRED** — Must fix critical/important issues before merge.

## Constraints
- Never approve code with security vulnerabilities (always CHANGES REQUIRED)
- Never block a PR solely for style preferences
- Be constructive — explain WHY and provide a fix suggestion
