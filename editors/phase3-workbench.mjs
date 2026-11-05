// Canonical, bounded patches to the same pinned workbench; no second shell.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = path.dirname(fileURLToPath(import.meta.url)), checkout = path.join(root, 'code-oss')
const { parse } = createRequire(path.join(checkout, 'build/package.json'))('jsonc-parser')
const original = file => execFileSync('git', ['show', `HEAD:${file}`], { cwd: checkout, encoding: 'utf8' })
const prism = fs.readFileSync(path.join(root, 'brand/prism-m.svg')).toString('base64')
function patch(file, update) { const before = original(file), after = update(before); if (before === after) throw new Error(`Pinned workbench patch did not match: ${file}`); fs.writeFileSync(path.join(checkout, file), after) }
const overrides = { 'editor.background': '#0B0C0F', 'titleBar.activeBackground': '#0B0C0F', 'titleBar.inactiveBackground': '#0B0C0F', 'activityBar.background': '#0B0C0F', 'sideBar.background': '#0B0C0F', 'statusBar.background': '#0B0C0F', 'statusBar.noFolderBackground': '#0B0C0F', 'statusBar.inactiveBackground': '#0B0C0F', 'statusBar.foreground': '#F6F1E7', 'foreground': '#F6F1E7', 'editor.foreground': '#F6F1E7', 'titleBar.activeForeground': '#F6F1E7', 'activityBar.foreground': '#F6F1E7', 'button.background': '#C4622D', 'button.foreground': '#F6F1E7', 'button.hoverBackground': '#8C3E1C', 'focusBorder': '#C4622D', 'progressBar.background': '#C4622D', 'testing.iconPassed': '#C4622D', 'statusBarItem.prominentForeground': '#C4622D', 'inputOption.activeBackground': '#C4622D44', 'inputOption.activeBorder': '#C4622D', 'textLink.foreground': '#E7A27A', 'textLink.activeForeground': '#F6F1E7' }
const palette = colors => Object.fromEntries(Object.entries({ ...colors, ...overrides }).map(([key, value]) => [key, /^#(?:0078d4|005fb8|2488db|4daafc|6caddf)$/i.test(value) ? '#C4622D' : value]))
patch('extensions/theme-defaults/themes/dark_modern.json', text => { const theme = parse(text); theme.colors = palette(theme.colors); return JSON.stringify(theme, null, '\t') + '\n' })
patch('extensions/theme-defaults/themes/2026-dark.json', text => { const theme = parse(text); theme.colors = palette(theme.colors); return JSON.stringify(theme, null, '\t') + '\n' })
patch('src/vs/workbench/services/themes/common/workbenchThemeService.ts', text => text.replace(/export const COLOR_THEME_DARK_INITIAL_COLORS = \{([\s\S]*?)\n\};/, (_, contents) => {
  const colors = Object.fromEntries([...contents.matchAll(/'([^']+)': '([^']+)'/g)].map(match => [match[1], match[2]]))
  return `export const COLOR_THEME_DARK_INITIAL_COLORS = {\n${Object.entries(palette(colors)).map(([key, value]) => `\t'${key}': '${value}'`).join(',\n')}\n};`
}))
patch('src/vs/workbench/browser/parts/editor/editorGroupWatermark.ts', text => text.replace("h('.letterpress'),", "h('.letterpress'),\n\t\t\t\t\th('h1.mrcodevaa-name', ['MrCodevaa']),\n\t\t\t\t\th('p.mrcodevaa-prompt', ['Tell MrCodevaa what to build.']),"))
patch('src/vs/workbench/browser/parts/editor/media/editorgroupview.css', text => text + '\n.mrcodevaa-name{font-size:32px;color:#F6F1E7;margin:8px 0;text-align:center}.mrcodevaa-prompt{color:#F6F1E7;text-align:center}.editor-group-watermark .shortcuts{display:none}.mrcodevaa-about{display:flex;align-items:center;gap:20px;font-size:28px;color:#F6F1E7}.mrcodevaa-about img{width:96px;height:96px}\n')
for (const variant of ['light', 'dark', 'hcLight', 'hcDark']) fs.copyFileSync(path.join(root, 'brand/prism-m.svg'), path.join(checkout, `src/vs/workbench/browser/parts/editor/media/letterpress-${variant}.svg`))
// Keep native Start/Recent/walkthrough and Chat/Sessions components.
for (const file of ['src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.contribution.ts', 'src/vs/workbench/contrib/chat/browser/chat.shared.contribution.ts', 'src/vs/workbench/contrib/chat/browser/widget/input/chatInputPart.ts']) fs.writeFileSync(path.join(checkout, file), original(file))
patch('src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.ts', text => text.replace("$('h1.product-name.caption', {}, this.productService.nameLong),", `$('img.mrcodevaa-welcome-mark', { src: 'data:image/svg+xml;base64,${fs.readFileSync(path.join(root, 'brand/prism-m.svg')).toString('base64')}', alt: 'Prism M' }),\n\t\t\t$('h1.product-name.caption', {}, this.productService.nameLong),`).replace('"Editing evolved"', '"Tell MrCodevaa what to build."'))
patch('src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts', text => text.replace('export const startEntries: GettingStartedStartEntryContent = [', `export const startEntries: GettingStartedStartEntryContent = [\n\t{ id: 'mrcodevaa.chat', title: 'Open MrCodevaa Chat...', description: 'Chat with Codeva and build reviewed projects', icon: Codicon.commentDiscussion, content: { type: 'startEntry', command: 'command:codeva.openChat' } },\n\t{ id: 'mrcodevaa.signIn', title: 'Sign in to Codeva...', description: 'Use your existing cybermindcli.info account', icon: Codicon.account, content: { type: 'startEntry', command: 'command:codeva.signIn' } },`).replaceAll('Get started with VS Code', 'Get started with MrCodevaa').replaceAll('Setup VS Code', 'Setup MrCodevaa').replaceAll("VS Code's key features", "MrCodevaa's editor features").replace(/^\s*createCopilotSetupStep\([^\n]+\),\r?\n/gm, '').replace(/const CopilotStepTitle =[\s\S]*?\n}\n\n(?=export const walkthroughs)/, ''))
patch('src/vs/workbench/contrib/welcomeGettingStarted/browser/media/gettingStarted.css', text => text + `
/* MrCodevaa welcome: clear hierarchy and responsive, theme-aware action cards. */
.monaco-workbench .part.editor > .content .gettingStartedContainer {
	--mrcodevaa-card: var(--vscode-editorWidget-background);
	--mrcodevaa-outline: var(--vscode-widget-border);
	--mrcodevaa-accent: var(--vscode-focusBorder);
	line-height: 1.5;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories {
	padding: clamp(20px, 4vh, 48px) clamp(20px, 3vw, 48px);
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories > .gettingStartedCategoriesContainer {
	max-width: 1320px;
	grid-template-rows: max-content minmax(min-content, auto) min-content;
	grid-template-columns: minmax(0, .65fr) minmax(260px, 5fr) minmax(28px, .7fr) minmax(260px, 5fr) minmax(0, .65fr);
}
.monaco-workbench .part.editor > .content .gettingStartedContainer.width-semi-constrained .gettingStartedSlideCategories > .gettingStartedCategoriesContainer {
	grid-template-columns: minmax(0, 1fr);
	grid-template-rows: min-content minmax(min-content, auto) minmax(min-content, auto) min-content;
	grid-template-areas: 'header' 'left-column' 'right-column' 'footer';
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories > .gettingStartedCategoriesContainer > .header {
	display: grid;
	grid-template-columns: 64px minmax(0, 1fr);
	grid-template-rows: min-content min-content;
	grid-template-areas: 'mark title' 'mark subtitle';
	column-gap: 16px;
	align-content: end;
	align-items: center;
	padding-bottom: clamp(24px, 4vh, 48px);
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .mrcodevaa-welcome-mark {
	grid-area: mark;
	width: 64px;
	height: 64px;
	margin: 0;
	filter: drop-shadow(0 8px 16px #0004);
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .header .product-name {
	grid-area: title;
	align-self: end;
	padding: 0;
	color: var(--vscode-foreground);
	font-size: clamp(28px, 3.2vw, 38px);
	font-weight: 650;
	letter-spacing: -.035em;
	line-height: 1.15;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .header .subtitle {
	grid-area: subtitle;
	align-self: start;
	margin: 6px 0 0;
	color: var(--vscode-descriptionForeground);
	font-size: 14px;
	line-height: 1.45;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .categories-column > div {
	margin-bottom: 24px;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .categories-column h2 {
	margin: 0 0 12px;
	color: var(--vscode-foreground);
	font-size: 14px;
	font-weight: 650;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .start-container {
	min-height: 0;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .start-container ul {
	display: grid;
	gap: 7px;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .start-container li {
	white-space: normal;
	overflow: visible;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .start-container .button-link {
	display: flex;
	align-items: center;
	width: 100%;
	min-height: 42px;
	margin: 0;
	padding: 9px 12px;
	border: 1px solid var(--mrcodevaa-outline);
	border-radius: 9px;
	background: var(--mrcodevaa-card);
	color: var(--vscode-foreground);
	font-size: 13px;
	line-height: 1.35;
	text-decoration: none;
	transition: background-color 120ms ease, border-color 120ms ease;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .start-container .button-link:hover {
	border-color: var(--mrcodevaa-accent);
	background: var(--vscode-list-hoverBackground);
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .start-container .button-link:focus-visible {
	outline: 2px solid var(--mrcodevaa-accent);
	outline-offset: 2px;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .start-container .button-link .icon-widget,
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .start-container .button-link .codicon {
	flex: 0 0 20px;
	width: 20px;
	margin-right: 10px;
	padding: 0;
	color: var(--mrcodevaa-accent);
	font-size: 16px;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlide .getting-started-category {
	width: 100%;
	min-height: 64px;
	margin: 0 0 8px;
	padding: 12px 14px;
	border: 1px solid var(--mrcodevaa-outline);
	border-radius: 10px;
	background: var(--mrcodevaa-card);
	transition: background-color 120ms ease, border-color 120ms ease;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlide .getting-started-category:hover,
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlide .getting-started-category:focus-visible {
	border-color: var(--mrcodevaa-accent);
	background: var(--vscode-list-hoverBackground);
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlide .getting-started-category .category-title {
	color: var(--vscode-foreground);
	font-size: 13px;
	font-weight: 650;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlide .getting-started-category .description-content {
	color: var(--vscode-descriptionForeground);
	font-size: 12px;
	line-height: 1.45;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .recently-opened li {
	min-height: 34px;
	border-bottom: 1px solid color-mix(in srgb, var(--mrcodevaa-outline) 65%, transparent);
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .recently-opened li:last-child {
	border-bottom: 0;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .recently-opened .button-link {
	color: var(--vscode-foreground);
	font-size: 12px;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories .recently-opened .path {
	color: var(--vscode-descriptionForeground);
	font-size: 11px;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories > .gettingStartedCategoriesContainer > .footer {
	padding-top: 16px;
	color: var(--vscode-descriptionForeground);
	font-size: 11px;
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories > .gettingStartedCategoriesContainer > .footer > .agents-banner .agents-banner-button {
	border: 1px solid var(--mrcodevaa-outline);
	background: var(--mrcodevaa-card);
	color: var(--vscode-foreground);
}
.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories > .gettingStartedCategoriesContainer > .footer > .agents-banner .agents-banner-button:hover {
	border-color: var(--mrcodevaa-accent);
	background: var(--vscode-list-hoverBackground);
}
.monaco-workbench .part.editor > .content .gettingStartedContainer button.button-link {
	color: var(--vscode-textLink-foreground);
}
@media (max-width: 900px) {
	.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories { padding: 20px 18px; }
	.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories > .gettingStartedCategoriesContainer { gap: 20px; }
	.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories > .gettingStartedCategoriesContainer > .header { padding-bottom: 20px; }
}
@media (max-height: 760px) {
	.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories { padding-top: 18px; padding-bottom: 18px; }
	.monaco-workbench .part.editor > .content .gettingStartedContainer .gettingStartedSlideCategories > .gettingStartedCategoriesContainer > .header { padding-bottom: 18px; }
}
@media (prefers-reduced-motion: reduce) {
	.monaco-workbench .part.editor > .content .gettingStartedContainer *,
	.monaco-workbench .part.editor > .content .gettingStartedContainer *::before,
	.monaco-workbench .part.editor > .content .gettingStartedContainer *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
`)
patch('src/vs/workbench/contrib/chat/browser/chatParticipant.contribution.ts', text => text.replaceAll('"Chat"', '"MrCodevaa"').replace('"&&Chat"', '"&&MrCodevaa"'))
patch('src/vs/workbench/api/common/extHostTypeConverters.ts', text => text.replace('toolReferences: ChatLanguageModelToolReferences.to(revive(mode.toolReferences)),', 'toolReferences: mode.toolReferences ? ChatLanguageModelToolReferences.to(revive(mode.toolReferences)) : [],'))
fs.copyFileSync(path.join(root, 'brand/prism-m.svg'), path.join(checkout, 'src/vs/sessions/browser/media/sessions-icon.svg'))
patch('src/vs/workbench/contrib/chat/electron-browser/agentSessions/media/openInAgents.css', text => text.replace('filter: grayscale(1);', 'filter: none;'))
patch('src/vs/workbench/contrib/chat/browser/widgetHosts/viewPane/media/chatViewPane.css', text => text + `\n.monaco-workbench .codicon-copilot,.monaco-workbench .codicon-copilot-large,.chat-welcome-view-container .codicon-chat-sparkle{background-image:url('data:image/svg+xml;base64,${prism}');background-position:center;background-size:contain;background-repeat:no-repeat}.monaco-workbench .codicon-copilot::before,.monaco-workbench .codicon-copilot-large::before,.chat-welcome-view-container .codicon-chat-sparkle::before{content:''!important}\n`)
patch('src/vs/workbench/contrib/chat/browser/widget/media/chatViewWelcome.css', text => text + `
.chat-welcome-view-container .chat-welcome-view-icon .codicon-chat-sparkle { display: inline-block; width: 48px; height: 48px; }
.monaco-workbench .codicon-copilot, .monaco-workbench .codicon-copilot-large { min-width: 1em; min-height: 1em; }
.monaco-workbench .pane-body > .chat-view-welcome { padding: 20px 14px; }
.monaco-workbench div.chat-welcome-view { gap: 2px; padding: 20px 12px; }
.monaco-workbench div.chat-welcome-view > .chat-welcome-view-icon.custom-icon { width: 48px; height: 48px; }
.monaco-workbench div.chat-welcome-view > .chat-welcome-view-title { max-width: 26ch; font-size: 15px; line-height: 1.35; }
.monaco-workbench div.chat-welcome-view > .chat-welcome-view-message { max-width: 34ch; padding: 0 8px; font-size: 12px; line-height: 1.55; }
.monaco-workbench div.chat-welcome-view > .chat-welcome-view-tips { max-width: 34ch; }
`)
patch('src/vs/workbench/browser/layout.ts', text => text.replace('Math.min(300, mainContainerDimension.width / 4)', 'Math.min(360, mainContainerDimension.width / 5)'))
// Leave navigation icons in the activity bar; account/preferences move to the title bar.
patch('src/vs/workbench/browser/parts/activitybar/activitybarPart.ts', text => text.replace("import './media/activitybarpart.css';", "import './media/activitybarpart.css';\nimport product from '../../../../platform/product/common/product.js';").replace('if (globalActivities) {', "if (globalActivities && product.applicationName !== 'mrcodevaa') {"))
patch('src/vs/workbench/contrib/chat/browser/widget/chatWidget.ts', text => text.replace('"Ask about your code"', '"Ask MrCodevaa about your code"').replace('"Edit in context"', '"Review changes with MrCodevaa"').replace('"Build with Agent"', '"Build with MrCodevaa"'))
patch('src/vs/workbench/contrib/chat/browser/chatSetup/chatSetupContributions.ts', text => text
  .replace("title: localize2('triggerChatSetupFromAccounts', \"Sign in to use GitHub Copilot...\"),", "title: localize2('triggerChatSetupFromAccounts', 'Sign in to Codeva...'),")
  .replace("title: localize2('forceSignIn', \"Sign in to use GitHub Copilot\")", "title: localize2('forceSignIn', 'Sign in to Codeva')")
  .replace("title: localize('signInIndicatorTitleBarAction', 'Sign In'),", "title: localize('signInIndicatorTitleBarAction', 'Sign in to Codeva'),")
  .replace("localize('toggle.chatSignIn', 'Copilot Sign In')", "localize('toggle.chatSignIn', 'Codeva Sign In')")
  .replace("localize('toggle.chatSignInDescription', \"Toggle visibility of the Copilot Sign In button in title bar\")", "localize('toggle.chatSignInDescription', 'Toggle the Codeva sign-in button in the title bar')")
  .replace('return commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { forceSignInDialog: true, telemetrySource: ChatSetupSource.ForcedSignInCommand });', "return product.applicationName === 'mrcodevaa' ? commandService.executeCommand('codeva.signIn') : commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { forceSignInDialog: true, telemetrySource: ChatSetupSource.ForcedSignInCommand });")
  .replace('return commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { telemetrySource: ChatSetupSource.Accounts });', "return product.applicationName === 'mrcodevaa' ? commandService.executeCommand('codeva.signIn') : commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { telemetrySource: ChatSetupSource.Accounts });")
  .replace('return commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { telemetrySource: ChatSetupSource.TitleBar });', "return product.applicationName === 'mrcodevaa' ? commandService.executeCommand('codeva.signIn') : commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { telemetrySource: ChatSetupSource.TitleBar });")
  .replace("import * as dom from '../../../../../base/browser/dom.js';", "import * as dom from '../../../../../base/browser/dom.js';\nimport { Codicon } from '../../../../../base/common/codicons.js';")
  + `\nif (product.applicationName === 'mrcodevaa') {\n\tfor (const entry of [{ id: 'workbench.action.mrcodevaa.account', title: 'Codeva Account', icon: Codicon.account, command: 'codeva.openAccount', order: 1 }, { id: 'workbench.action.mrcodevaa.preferences', title: 'MrCodevaa Preferences', icon: Codicon.settingsGear, command: 'codeva.openSettings', order: 2 }]) {\n\t\tregisterAction2(class extends Action2 {\n\t\t\tconstructor() { super({ id: entry.id, title: entry.title, icon: entry.icon, menu: { id: MenuId.TitleBar, group: 'navigation', order: entry.order } }); }\n\t\t\tasync run(accessor: ServicesAccessor): Promise<void> { await accessor.get(ICommandService).executeCommand(entry.command); }\n\t\t});\n\t}\n}\n`)
// Keep upstream diagnostic data for other builds, but don't brand the Codeva About panel with Copilot SDK versions.
patch('src/vs/platform/dialogs/electron-browser/dialog.ts', text => text.replace(
  "\tconst details = getDetails(true);\n\tconst detailsToCopy = getDetails(false);",
  "\tlet details = getDetails(true);\n\tlet detailsToCopy = getDetails(false);\n\tif (productService.applicationName === 'mrcodevaa') {\n\t\tdetails = details.replace(/\\n@github\\/copilot(?:-sdk)?: [^\\n]*/g, '');\n\t\tdetailsToCopy = detailsToCopy.replace(/\\n@github\\/copilot(?:-sdk)?: [^\\n]*/g, '');\n\t}"
))
patch('src/vs/workbench/contrib/chat/browser/agentSessions/agentSessionsBanner.ts', text => text.replaceAll('Try out the new Agents window', 'Open Codeva Projects'))
// Code OSS normally supplies a default model only from GitHub Copilot. MrCodevaa's
// default participant must resolve its own API-backed model instead.
patch('src/vs/workbench/api/common/extHostLanguageModels.ts', text => text.replace(
  "\t\tfor (const [modelIdentifier, modelData] of this._localModels) {\n\t\t\tif (modelData.metadata.isDefaultForLocation[ChatAgentLocation.Chat] && modelData.metadata.vendor === COPILOT_VENDOR_ID) {\n\t\t\t\tdefaultModelId = modelIdentifier;\n\t\t\t\tbreak;\n\t\t\t}\n\t\t}\n\t\tif (!defaultModelId && !forceResolveModels)",
  "\t\tfor (const [modelIdentifier, modelData] of this._localModels) {\n\t\t\tif (modelData.metadata.isDefaultForLocation[ChatAgentLocation.Chat] && modelData.metadata.vendor === COPILOT_VENDOR_ID) {\n\t\t\t\tdefaultModelId = modelIdentifier;\n\t\t\t\tbreak;\n\t\t\t}\n\t\t}\n\t\tif (!defaultModelId && extension.identifier.value.toLowerCase() === 'codeva.codeva-studio') {\n\t\t\tfor (const [modelIdentifier, modelData] of this._localModels) {\n\t\t\t\tif (modelData.metadata.vendor === 'codeva' && modelData.metadata.id === 'auto') { defaultModelId = modelIdentifier; break; }\n\t\t\t}\n\t\t}\n\t\tif (!defaultModelId && !forceResolveModels)"
))
// MrCodevaa uses server-owned dossier tools, not vendor SDK agent hosts.
patch('src/vs/workbench/contrib/terminalContrib/inlineHint/browser/terminal.initialHint.contribution.ts', text => text
  .replace("import { ICommandService } from '../../../../../platform/commands/common/commands.js';", "import { ICommandService } from '../../../../../platform/commands/common/commands.js';\nimport product from '../../../../../platform/product/common/product.js';")
  .replace('\t\tif (!aiFeaturesHidden) {', "\t\tif (!aiFeaturesHidden && product.applicationName === 'mrcodevaa') {\n\t\t\tconst hint = localize('mrcodevaaTerminalHint', 'Select terminal output, then [[ask MrCodevaa]].');\n\t\t\thintElement.appendChild(renderFormattedText(hint, { actionHandler: { disposables: this._toDispose, callback: () => { void this._commandService.executeCommand('codeva.askAboutTerminal'); } } }));\n\t\t\tariaLabelParts.push('Select terminal output, then ask MrCodevaa.');\n\t\t} else if (!aiFeaturesHidden) {"))
// Keep their upstream source; do not start account checks for unused providers.
patch('src/vs/platform/agentHost/node/agentHostMain.ts', text => text
  .replace('providerService.registerProvider(instantiationService.createInstance(CopilotAgent));', "if (product.applicationName !== 'mrcodevaa') { providerService.registerProvider(instantiationService.createInstance(CopilotAgent)); }")
  .replace('if (isAgentEnabled(process.env[AgentHostClaudeAgentEnabledEnvVar]', "if (product.applicationName !== 'mrcodevaa' && isAgentEnabled(process.env[AgentHostClaudeAgentEnabledEnvVar]")
  .replace('if (!environmentService.isBuilt || agentSdkDownloader.isAvailable(CodexSdkPackage)) {', "if (product.applicationName !== 'mrcodevaa' && (!environmentService.isBuilt || agentSdkDownloader.isAvailable(CodexSdkPackage))) {"))
// The vendor account wizard must not intercept our first-launch Welcome page.
patch('src/vs/workbench/contrib/welcomeOnboarding/browser/onboardingVariationA.ts', text => text
  .replace("assertDefined(product.defaultChatAgent, 'Onboarding requires a default chat agent product configuration.');", "if (product.applicationName !== 'mrcodevaa') { assertDefined(product.defaultChatAgent, 'Onboarding requires a default chat agent product configuration.'); }")
  .replace('const defaultChat = product.defaultChatAgent;', 'const defaultChat = product.defaultChatAgent!;')
  .replace('\tshow(): void {', "\tshow(): void {\n\t\tif (product.applicationName === 'mrcodevaa') { this._onDidDismiss.fire(); return; }"))
patch('src/vs/workbench/services/accounts/browser/defaultAccount.ts', text => text
  .replace('this.defaultAccountConfig = toDefaultAccountConfig(productService.defaultChatAgent);', "this.defaultAccountConfig = productService.applicationName === 'mrcodevaa' ? { preferredExtensions: [], authenticationProvider: { default: { id: 'codeva', name: 'Codeva' }, enterprise: { id: 'codeva-enterprise', name: 'Codeva' }, enterpriseProviderConfig: 'codeva.authProvider', enterpriseProviderUriSetting: 'codeva.enterpriseUri', scopes: [[]] }, entitlementUrl: '', tokenEntitlementUrl: '', mcpRegistryDataUrl: '', managedSettingsUrl: '' } : toDefaultAccountConfig(productService.defaultChatAgent!);")
  .replace('private async init(): Promise<void> {', "private async init(): Promise<void> {\n\t\tif (this.productService.applicationName === 'mrcodevaa') { this.accountStatusContext.set(DefaultAccountStatus.Unavailable); return; }")
  .replace('super();\n\t\tconst defaultAccountProvider = this._register(instantiationService.createInstance(DefaultAccountProvider, toDefaultAccountConfig(productService.defaultChatAgent)));', "super();\n\t\tif (productService.applicationName === 'mrcodevaa') { return; }\n\t\tconst defaultAccountProvider = this._register(instantiationService.createInstance(DefaultAccountProvider, toDefaultAccountConfig(productService.defaultChatAgent!)));")
  .replace("\tasync run(accessor: ServicesAccessor): Promise<void> {\n\t\tconst defaultAccountService = accessor.get(IDefaultAccountService);", "\tasync run(accessor: ServicesAccessor): Promise<void> {\n\t\tif (accessor.get(IProductService).applicationName === 'mrcodevaa') { await accessor.get(ICommandService).executeCommand('codeva.signIn'); return; }\n\t\tconst defaultAccountService = accessor.get(IDefaultAccountService);"))
patch('src/vs/workbench/contrib/chat/electron-browser/agentSessions/agentSessionsActions.ts', text => text
  .replace('"Open in Agents"', '"Open MrCodevaa Projects"')
  .replace('"Open in Agents Window"', '"Open MrCodevaa Projects"')
  .replace('"Open Agents Window"', '"Open MrCodevaa Projects"')
  .replace('"Open in Agents Window"', '"Open MrCodevaa Projects"')
  .replace("'Open in Agents Window'", "'Open MrCodevaa Projects'")
  .replace('Try out the new Agents window', 'Open Codeva Projects')
  .replace('"Toggle visibility of the Open in Agents Window button in title bar"', '"Show the MrCodevaa Projects shortcut in the title bar"')
  .replace('"Open in Agents Window"', '"Open MrCodevaa Projects"')
  .replace('async function openCurrentWorkspaceInAgentsWindow(accessor: ServicesAccessor, source: AgentsWindowOpenSource, sessionResource?: URI, draftOptions?: Pick<IOpenAgentsWindowOptions, \'draft\' | \'folderUriIsDefault\'>): Promise<void> {\n\tensureAgentModeEnabled(accessor.get(IConfigurationService));', "async function openCurrentWorkspaceInAgentsWindow(accessor: ServicesAccessor, source: AgentsWindowOpenSource, sessionResource?: URI, draftOptions?: Pick<IOpenAgentsWindowOptions, 'draft' | 'folderUriIsDefault'>): Promise<void> {\n\tif (accessor.get(IProductService).applicationName === 'mrcodevaa') { await accessor.get(ICommandService).executeCommand('codeva.openAgents'); return; }\n\tensureAgentModeEnabled(accessor.get(IConfigurationService));")
  .replace('async run(accessor: ServicesAccessor, args?: IOpenAgentsWindowOptions): Promise<void> {\n\t\tensureAgentModeEnabled(accessor.get(IConfigurationService));', "async run(accessor: ServicesAccessor, args?: IOpenAgentsWindowOptions): Promise<void> {\n\t\tif (accessor.get(IProductService).applicationName === 'mrcodevaa') { await accessor.get(ICommandService).executeCommand('codeva.openAgents'); return; }\n\t\tensureAgentModeEnabled(accessor.get(IConfigurationService));")
  .replace("async run(accessor: ServicesAccessor, ...rest: unknown[]): Promise<void> {\n\t\tensureAgentModeEnabled(accessor.get(IConfigurationService));", "async run(accessor: ServicesAccessor, ...rest: unknown[]): Promise<void> {\n\t\tif (accessor.get(IProductService).applicationName === 'mrcodevaa') { await accessor.get(ICommandService).executeCommand('codeva.openAgents'); return; }\n\t\tensureAgentModeEnabled(accessor.get(IConfigurationService));"))
patch('src/vs/workbench/electron-browser/desktop.contribution.ts', text => text.replace("'window.dialogStyle': {\n\t\t\t\t'type': 'string',\n\t\t\t\t'enum': ['native', 'custom'],\n\t\t\t\t'default': 'native',", "'window.dialogStyle': {\n\t\t\t\t'type': 'string',\n\t\t\t\t'enum': ['native', 'custom'],\n\t\t\t\t'default': 'custom',"))
const svg = fs.readFileSync(path.join(root, 'brand/prism-m.svg')).toString('base64')
patch('src/vs/workbench/browser/parts/dialogs/dialogHandler.ts', text => text.replace("parent.classList.add(...(customOptions.classes || []));", "parent.classList.add(...(customOptions.classes || []));").replace("const renderBody = customOptions ? (parent: HTMLElement) => {", `const renderBody = customOptions || message === 'MrCodevaa' ? (parent: HTMLElement) => {\n\t\t\tif (message === 'MrCodevaa') {\n\t\t\t\tconst brand = document.createElement('div'); brand.className = 'mrcodevaa-about';\n\t\t\t\tconst mark = document.createElement('img'); mark.src = 'data:image/svg+xml;base64,${svg}'; mark.alt = 'Prism M';\n\t\t\t\tconst name = document.createElement('span'); name.textContent = 'MrCodevaa'; brand.append(mark, name); parent.appendChild(brand);\n\t\t\t}\n`).replace('customOptions.classes', 'customOptions?.classes').replace('customOptions.markdownDetails', 'customOptions?.markdownDetails'))
console.log('Applied MrCodevaa default dark palette, Prism M empty window and branded About in the existing workbench')
