---
name: codevaa-react-practices
description: Maintainable and performant React application patterns.
source: CodeVaa-authored
revision: internal-v1
license: CodeVaa-authored
---

# React Practices

- Keep components focused and compose small pieces around clear data and event contracts.
- Keep state as close as possible to the components that use it. Derive values during render instead of duplicating them in state.
- Use stable keys from domain IDs. Do not use array positions when rows can reorder.
- Keep effects for synchronization with external systems; do not use effects to derive ordinary render state.
- Cancel fetches or ignore stale results on unmount and when inputs change.
- Use `useMemo` and `useCallback` only where they prevent measured work or preserve a required identity contract.
- Make async states explicit and prevent duplicate submissions while a mutation is active.
- Add accessible labels and keyboard behavior to custom controls; prefer native elements when they fit.
- Split large routes and defer expensive assets when it improves initial load.
- Add tests around user-visible behavior and important state transitions, not implementation details.
