# MrCodevaa editor design system

This UI extends the pinned Code OSS workbench and the bundled `codeva.codeva-studio` sidebar. Native editor behavior remains native; the extension sidebar owns Codeva account, project and preference controls.

## Theme tokens

| Role | Workbench token | Existing dark value |
| --- | --- | --- |
| Main canvas | `--vscode-editor-background` | `#0B0C0F` |
| Sidebar canvas | `--vscode-sideBar-background` | `#0B0C0F` |
| Elevated surface | `--vscode-editorWidget-background` | Theme supplied |
| Primary text | `--vscode-foreground` | `#F6F1E7` |
| Secondary text | `--vscode-descriptionForeground` | Theme supplied |
| Brand action / keyboard focus | `--vscode-button-background`, `--vscode-focusBorder` | `#C4622D` |
| Dividers and card outlines | `--vscode-widget-border` | Theme supplied |
| Error | `--vscode-errorForeground` | Theme supplied |

Dark and light mode inherit the selected workbench theme. Component CSS uses the VS Code theme variables; the bundled `2026 Dark` theme supplies Codeva’s current charcoal, cream and terracotta palette.

## Layout and interaction

- Keep the central Welcome screen to two columns when space allows. Switch to the workbench’s native constrained layout at smaller widths.
- Give sign-in and project continuation a clear action hierarchy. Keep secondary account, settings and project actions grouped together.
- The extension sidebar must fit at 280px and 340px widths; forms collapse to one column below 340px.
- Use 36px minimum controls, visible keyboard focus, readable wrapping and a reduced-motion path.
- Use the active theme’s surface, text, border and focus tokens. Do not introduce a second accent palette.
- Respect existing account, authorization, project ownership and API behavior when changing presentation.
