# Editor UI lessons

- MrCodevaa is a pinned native workbench plus the bundled Codeva Studio extension. Keep both visual layers in their canonical sources: `phase3-workbench.mjs` for workbench overlays and `studio-client/view.css` for the project/account sidebar.
- The editor's secondary Chat pane is a normal workbench surface. Keep its width adaptive to available window space; a narrow right pane makes welcome copy and prompts hard to read.
- Keep the Welcome actions connected to native commands. A visual restyle must not invent status or project data.
- Extension webviews can be resized to narrow sidebars and maximized views. Check 280px, 340px and wide views, including reduced-motion and keyboard focus.
- Theme colors should come from `--vscode-*` variables so user light, dark and high-contrast themes remain legible.
