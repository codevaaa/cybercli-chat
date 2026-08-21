---
name: react-component-patterns
description: React component architecture patterns, accessibility standards, and performance best practices. Use when building UI components, designing component APIs, or refactoring React code.
agents: [coder, frontend-architect]
tags: [react, components, accessibility, performance, ui]
version: 1.0.0
author: CodeVaa Team
---

# React Component Patterns

## Goal
Build accessible, performant, and maintainable React components following modern patterns.

## Component File Structure
```
src/components/
├── MyComponent/
│   ├── MyComponent.jsx       # Main component
│   ├── MyComponent.test.jsx  # Tests
│   ├── useMyComponent.js     # Custom hook (if needed)
│   └── index.js              # Re-export
```

## Component Template
```jsx
import React, { useState, useCallback, memo } from 'react'
import clsx from 'clsx'

/**
 * MyComponent — [one-line description]
 *
 * @param {Object} props
 * @param {string} props.variant - Visual variant: 'primary' | 'secondary'
 * @param {boolean} props.disabled - Whether the component is disabled
 * @param {React.ReactNode} props.children - Child content
 * @param {string} [props.className] - Additional CSS classes
 */
export default function MyComponent({ variant = 'primary', disabled = false, children, className, ...props }) {
  return (
    <div
      className={clsx('base-class', variant === 'primary' && 'primary-class', className)}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </div>
  )
}
```

## Accessibility Requirements (WCAG 2.1 AA)
1. **Keyboard navigation**: Every interactive element reachable via Tab, activated via Enter/Space
2. **Focus management**: Visible focus ring, logical focus order, focus trapping in modals
3. **ARIA labels**: All icons/images have alt text, all controls have accessible names
4. **Color contrast**: 4.5:1 for text, 3:1 for large text and UI components
5. **Screen reader**: Meaningful announcements for dynamic content (aria-live regions)
6. **Reduced motion**: Respect `prefers-reduced-motion` media query

## Performance Patterns
- Use `memo()` for expensive pure components
- Use `useCallback` for functions passed as props to memoized children
- Use `useMemo` for expensive computations
- Lazy load routes and heavy components: `React.lazy(() => import(...))`
- Virtualize long lists (TanStack Virtual, react-window)
- Avoid inline objects/arrays as props (causes re-renders)
- Code-split at route boundaries

## State Management Rules
- Local state: `useState` for UI-only state (open/close, form inputs)
- Shared state: Zustand store for cross-component state
- Server state: TanStack Query for API data (caching, revalidation)
- URL state: React Router for anything that should be shareable via URL
- NEVER put derived state in useState — compute it inline

## Design System (CodeVaa Theme)
```
Background:  #0A0A0F (bg)
Surface:     #111118 (cards, panels)
Border:      #1E1E2E (subtle borders)
Accent:      #D97757 (primary actions, highlights)
Text:        #F9FAFB (primary), #6B7280 (muted)
Success:     #10B981
Warning:     #F59E0B
Danger:      #EF4444
```

## Constraints
- No `any` types in TypeScript components
- No inline styles (use Tailwind classes)
- No direct DOM manipulation (use refs sparingly)
- No business logic in components (extract to hooks or utils)
- Every component must work without JavaScript (progressive enhancement for critical UI)
