/**
 * usePlanGuard — Client-side plan gate hook.
 *
 * Wraps the 4 advanced feature entry points with a plan check.
 * Only users on the `'max'` plan may call advanced features.
 * Any other plan value (including `'free'` or `'pro'`) causes the
 * wrapped method to return a typed `UpgradePlanError` and skip execution.
 *
 * REQ-11.1, REQ-11.3, REQ-11.5
 */

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/** Returned by a gated feature when the user's plan does not include it. */
export interface UpgradePlanError {
  type: 'PLAN_UPGRADE_REQUIRED'
  feature: string
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface PlanGuard {
  /** Enable E2EE for the current session — MAX plan only. */
  enableE2EE: (fn: () => void) => UpgradePlanError | void
  /** Enable disappearing messages — MAX plan only. */
  enableDisappearing: (fn: () => void) => UpgradePlanError | void
  /** Send a file attachment — MAX plan only. */
  sendFile: (fn: () => void) => UpgradePlanError | void
  /** Send a voice message — MAX plan only. */
  sendVoice: (fn: () => void) => UpgradePlanError | void
  /**
   * `true` when the plan is not `'max'`.
   * Simplified lapse flag — full lapse detection occurs at re-init (REQ-11.3).
   */
  isPlanLapsed: boolean
}

// ---------------------------------------------------------------------------
// Internal names for the 4 gated features
// ---------------------------------------------------------------------------

const GATED_FEATURES = ['enableE2EE', 'enableDisappearing', 'sendFile', 'sendVoice'] as const
type GatedFeature = (typeof GATED_FEATURES)[number]

// ---------------------------------------------------------------------------
// Pure gate function (exported for isolated testing without React)
// ---------------------------------------------------------------------------

/**
 * Check whether `plan` is `'max'`.
 * If yes, call `fn` and return `void`.
 * If no, return an `UpgradePlanError` without calling `fn`.
 */
export function checkPlan(
  plan: string,
  feature: GatedFeature,
  fn: () => void,
): UpgradePlanError | void {
  if (plan !== 'max') {
    return { type: 'PLAN_UPGRADE_REQUIRED', feature }
  }
  fn()
}

// ---------------------------------------------------------------------------
// usePlanGuard hook
// ---------------------------------------------------------------------------

/**
 * Returns a `PlanGuard` object whose methods enforce the `plan` tier.
 *
 * The hook is a pure factory — no React state or effects are used,
 * so it can be called from test code without a React environment.
 *
 * Usage:
 * ```tsx
 * const guard = usePlanGuard(currentUser.plan)
 *
 * const result = guard.enableE2EE(() => setE2eeEnabled(true))
 * if (result?.type === 'PLAN_UPGRADE_REQUIRED') {
 *   openUpgradeModal(result.feature)
 * }
 * ```
 *
 * @param plan - The current user's plan tier: `'max'` | `'pro'` | `'free'`
 */
export function usePlanGuard(plan: string): PlanGuard {
  const make = (feature: GatedFeature) =>
    (fn: () => void): UpgradePlanError | void => checkPlan(plan, feature, fn)

  return {
    enableE2EE: make('enableE2EE'),
    enableDisappearing: make('enableDisappearing'),
    sendFile: make('sendFile'),
    sendVoice: make('sendVoice'),
    isPlanLapsed: plan !== 'max',
  }
}

export default usePlanGuard
