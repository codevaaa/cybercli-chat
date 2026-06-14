import mongoose from 'mongoose'

/**
 * HuntSession — stores everything about one bug bounty hunt run.
 * Persists across sessions so AI learns from previous targets.
 */
const huntSessionSchema = new mongoose.Schema({
  user_id:    { type: String, required: true, index: true },
  target:     { type: String, required: true },
  status:     { type: String, enum: ['queued', 'recon', 'scanning', 'validating', 'reporting', 'done', 'failed', 'web3'], default: 'queued' },
  mode:       { type: String, enum: ['autopilot', 'recon_only', 'scan_only', 'web3', 'token'], default: 'autopilot' },

  // Recon output
  recon: {
    subdomains_count: { type: Number, default: 0 },
    live_hosts_count: { type: Number, default: 0 },
    urls_count:       { type: Number, default: 0 },
    tech_stack:       [String],
    nuclei_findings:  [String],
    priority_hosts:   [String],
    attack_surface_summary: String,
  },

  // Scan findings (raw, before validation)
  raw_findings: [{
    category:  String,   // xss, sqli, ssrf, idor, etc.
    endpoint:  String,
    evidence:  String,
    severity:  String,
    tool:      String,
  }],

  // Validated findings (passed 7-Question Gate)
  validated_findings: [{
    category:    String,
    endpoint:    String,
    evidence:    String,
    severity:    String,
    verdict:     String,   // SUBMIT, CHAIN, DROP
    gate_result: String,   // full 7Q reasoning
    chain:       String,   // if CHAIN, what to combine with
  }],

  // Final reports
  reports: [{
    platform:  { type: String, enum: ['hackerone', 'bugcrowd', 'intigriti', 'immunefi'] },
    title:     String,
    severity:  String,
    cvss:      String,
    content:   String,    // full markdown report
    created_at: { type: Date, default: Date.now },
  }],

  // Cross-session memory — what worked on this target
  patterns: [{
    vuln_class: String,
    technique:  String,
    endpoint:   String,
    payout_estimate: Number,
    confirmed:  Boolean,
  }],

  // Live progress log (streamed to frontend)
  progress_log: [{
    phase:   String,
    message: String,
    ts:      { type: Date, default: Date.now },
  }],

  // Stats
  started_at:  { type: Date, default: Date.now },
  finished_at: Date,
  duration_ms: Number,
  error:       String,
}, {
  timestamps: true,
  collection: 'hunt_sessions',
})

// Index for quick user+target lookup
huntSessionSchema.index({ user_id: 1, target: 1, createdAt: -1 })

export default mongoose.model('HuntSession', huntSessionSchema)
