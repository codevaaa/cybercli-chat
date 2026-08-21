import mongoose from 'mongoose'

const platformSettingsSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true, index: true },

  // General
  queuedMessages:   { type: String, default: 'Queue' },
  securityPreset:   { type: String, default: 'Default' },
  agentAutonomy:    { type: String, default: 'Autopilot' },
  defaultModel:     { type: String, default: 'auto' },
  artifactReview:   { type: String, default: 'Always Ask' },
  usageSummary:     { type: Boolean, default: true },
  tabAutocomplete:  { type: Boolean, default: false },
  terminalTimeout:  { type: String, default: 'Default' },

  // Appearance
  theme:             { type: String, default: 'dark' },
  verboseChat:       { type: Boolean, default: true },
  conversationWidth: { type: String, default: 'Default' },
  lightPreset:       { type: String, default: 'Default Light' },
  lightBg:           { type: String, default: '#EEEEEE' },
  lightFg:           { type: String, default: '#101010' },
  lightAccent:       { type: String, default: '#D97757' },
  darkPreset:        { type: String, default: 'Default Dark' },
  darkBg:            { type: String, default: '#0A0A0F' },
  darkFg:            { type: String, default: '#F0F0F0' },
  darkAccent:        { type: String, default: '#D97757' },

  // Browser
  webBrowsing:      { type: Boolean, default: true },
  jsExecution:      { type: Boolean, default: false },
  browserJsPolicy:  { type: String, default: 'Request Review' },
  maxFetchSize:     { type: Number, default: 100 },

  // App
  startupMode:      { type: String, default: 'Code' },
  updates:          { type: String, default: 'Default' },
  debugLogs:        { type: Boolean, default: false },
  preventSleep:     { type: Boolean, default: false },
  keepInMenuBar:    { type: Boolean, default: false },

  // MCP
  mcpEnabled:       { type: String, default: 'Enabled' },
  mcpServers:       { type: [{ name: String, command: String, disabled: Boolean }], default: [] },

  // Notifications
  notifAction:      { type: Boolean, default: true },
  notifFailure:     { type: Boolean, default: false },
  notifSuccess:     { type: Boolean, default: false },
  notifBilling:     { type: Boolean, default: true },

  // Privacy
  telemetry:         { type: Boolean, default: true },
  marketingEmails:   { type: Boolean, default: false },
  usageAnalytics:    { type: Boolean, default: true },
  contentCollection: { type: Boolean, default: true },
  codeReferences:    { type: Boolean, default: false },

  // Credits
  creditOverages:    { type: Boolean, default: false },

  // Customizations
  customInstructions: { type: String, default: '' },
  agentsMdPath:       { type: String, default: './AGENTS.md' },

  // File permissions (stored as JSON array)
  fileAccessRules:    { type: [{ path: String, mode: String }], default: [] },
  allowedDomains:     { type: [String], default: ['*'] },

}, { timestamps: true })

export default mongoose.model('PlatformSettings', platformSettingsSchema)
