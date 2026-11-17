import type { ThreadHistory } from '../shared/contracts'

export type RecoverableTaskState = Exclude<ThreadHistory['lastTaskState'], 'running' | 'completed' | null>

interface TaskRecoveryNoticeProps {
  state: ThreadHistory['lastTaskState']
  disabled?: boolean
  onContinue: () => void
}

const stateLabel: Record<RecoverableTaskState, string> = {
  interrupted: 'The previous run was interrupted.',
  failed: 'The previous run did not finish.',
  cancelled: 'The previous run was stopped.',
}

export default function TaskRecoveryNotice({ state, disabled = false, onContinue }: TaskRecoveryNoticeProps) {
  if (state !== 'interrupted' && state !== 'failed' && state !== 'cancelled') return null

  return (
    <section className="task-recovery-notice" aria-label="Continue saved task">
      <div className="task-recovery-copy">
        <strong>{stateLabel[state]}</strong>
        <p>Saved chat text and project files remain available. Continuing starts a new run that checks the current project first. Earlier tool actions are not replayed, and Codic will ask for approval again.</p>
      </div>
      <button type="button" className="secondary-button task-recovery-action" onClick={onContinue} disabled={disabled}>
        Continue from saved history
      </button>
    </section>
  )
}
