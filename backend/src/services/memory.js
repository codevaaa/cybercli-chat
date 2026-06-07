/**
 * Shared Agent Memory (Zero-Context Loss Blackboard)
 * 
 * This service manages real-time context sharing between the Agentic Swarm.
 * Instead of passing the entire prompt/context to every model, the Context
 * Agent writes to this Blackboard, and other agents (Developer, Reviewer) 
 * read from it. This prevents context loss across the user's session.
 */

// In production, this should be backed by Redis for multi-server scaling.
// For now, we use an in-memory Map keyed by the user's session/conversation ID.
const sessionMemory = new Map();

export const MemoryManager = {
  /**
   * Initialize or retrieve a session's blackboard.
   */
  getSession(sessionId) {
    if (!sessionMemory.has(sessionId)) {
      sessionMemory.set(sessionId, {
        plan: null,
        contextSummary: "",
        discoveredFiles: [],
        securityAlerts: [],
        lastUpdated: Date.now(),
        // Store conversation history for zero context loss
        conversationHistory: [] 
      });
    }
    return sessionMemory.get(sessionId);
  },

  /**
   * The Planner agent writes the blueprint.
   */
  updatePlan(sessionId, planText) {
    const session = this.getSession(sessionId);
    session.plan = planText;
    session.lastUpdated = Date.now();
  },

  /**
   * The Context agent (Kimi) writes the compressed summary of the codebase.
   */
  updateContext(sessionId, summary, files) {
    const session = this.getSession(sessionId);
    if (summary) session.contextSummary = summary;
    if (files) {
      const uniqueFiles = new Set([...session.discoveredFiles, ...files]);
      session.discoveredFiles = Array.from(uniqueFiles);
    }
    session.lastUpdated = Date.now();
  },

  /**
   * Security/Reviewer agents post warnings here.
   */
  addSecurityAlert(sessionId, alert) {
    const session = this.getSession(sessionId);
    session.securityAlerts.push(alert);
    session.lastUpdated = Date.now();
  },

  /**
   * Append to the persistent conversation history so we never forget.
   */
  appendHistory(sessionId, role, content) {
    const session = this.getSession(sessionId);
    session.conversationHistory.push({ role, content, timestamp: Date.now() });
    session.lastUpdated = Date.now();
  },

  /**
   * Get the complete structured context for the Core Developer or Synthesizer.
   */
  getSwarmContext(sessionId) {
    const session = this.getSession(sessionId);
    return {
      plan: session.plan,
      context: session.contextSummary,
      files: session.discoveredFiles,
      alerts: session.securityAlerts,
      history: session.conversationHistory
    };
  },

  /**
   * Optional: Clear memory (usually happens when a session officially ends)
   */
  clearSession(sessionId) {
    sessionMemory.delete(sessionId);
  }
};
