import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CodicCheckpointSummary, ReviewComment, WorkspaceDiff, WorkspaceInfo } from '../shared/contracts'

type DiffSide = 'old' | 'new'
type DiffLine = { text: string; kind: 'header' | 'context' | 'add' | 'remove'; lineNumber?: number; side?: DiffSide }
type DiffFile = { path: string; lines: DiffLine[]; untracked?: boolean }
type CommentTarget = { filePath: string; lineNumber: number; side: DiffSide }

interface DiffReviewPanelProps {
  workspace: WorkspaceInfo
  taskId: string | null
  taskRunning: boolean
  refreshToken: number
}

export default function DiffReviewPanel({ workspace, taskId, taskRunning, refreshToken }: DiffReviewPanelProps) {
  const [diff, setDiff] = useState<WorkspaceDiff | null>(null)
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [checkpoints, setCheckpoints] = useState<CodicCheckpointSummary[]>([])
  const [target, setTarget] = useState<CommentTarget | null>(null)
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState<number | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextDiff, nextComments, nextCheckpoints] = await Promise.all([
        window.codic.workspace.getDiff(workspace.path),
        window.codic.review.listComments(workspace.path),
        taskId ? window.codic.runtime.getCheckpoints(taskId) : Promise.resolve([]),
      ])
      setDiff(nextDiff)
      setComments(nextComments)
      setCheckpoints(nextCheckpoints)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this project’s diff.')
    } finally {
      setLoading(false)
    }
  }, [workspace.path, taskId])

  useEffect(() => { void refresh() }, [refresh, refreshToken])

  const files = useMemo(() => diff ? parseDiff(diff) : [], [diff])

  const addComment = async () => {
    if (!target || !commentText.trim()) return
    setSaving(true)
    setError('')
    try {
      const comment = await window.codic.review.addComment({
        workspacePath: workspace.path,
        filePath: target.filePath,
        lineNumber: target.lineNumber,
        side: target.side,
        body: commentText.trim(),
      })
      setComments((current) => [comment, ...current])
      setTarget(null)
      setCommentText('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this review comment.')
    } finally {
      setSaving(false)
    }
  }

  const restore = async (checkpoint: CodicCheckpointSummary) => {
    if (!taskId || taskRunning || restoring !== null) return
    if (!window.confirm(`Restore ${checkpoint.label}? Files changed after this restore point will be reset.`)) return
    setRestoring(checkpoint.seq)
    setError('')
    try {
      const result = await window.codic.runtime.restoreCheckpoint({ taskId, seq: checkpoint.seq })
      await refresh()
      setError(`Restored ${result.restored} file${result.restored === 1 ? '' : 's'}${result.deleted ? ` and removed ${result.deleted} new file${result.deleted === 1 ? '' : 's'}` : ''}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not restore this checkpoint.')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <section className="diff-review" aria-label="Project diff review">
      <div className="diff-toolbar">
        <div><strong>Local changes</strong><span>{files.length ? `${files.length} file${files.length === 1 ? '' : 's'}` : 'Working tree'}</span></div>
        <button type="button" className="icon-button compact" onClick={() => void refresh()} disabled={loading} aria-label="Refresh project diff" title="Refresh diff">↻</button>
      </div>
      {loading && <div className="diff-state">Loading the project diff…</div>}
      {error && <div className="diff-error" role="alert">{error}</div>}
      {diff?.error && <div className="diff-note" role="status">{diff.error}</div>}
      {diff && !diff.isGitRepository && <div className="diff-state"><strong>This folder is not a Git repository.</strong><span>Agent checkpoints are still available for file changes.</span></div>}
      {checkpoints.length > 0 && <section className="checkpoint-list" aria-label="Agent restore points"><div className="checkpoint-heading"><strong>Restore points</strong><span>{checkpoints.length}</span></div>{checkpoints.map((checkpoint) => <div className="checkpoint-row" key={checkpoint.seq}><div><strong>{checkpoint.label}</strong><span>{checkpoint.files.join(', ') || 'Project changes'}</span></div><button type="button" onClick={() => void restore(checkpoint)} disabled={taskRunning || restoring !== null}>{restoring === checkpoint.seq ? 'Restoring…' : 'Restore'}</button></div>)}</section>}
      {diff?.isGitRepository && !loading && files.length === 0 && <div className="diff-state"><strong>No uncommitted changes.</strong><span>Changed and untracked text files will appear here.</span></div>}

      <div className="diff-file-list">
        {files.map((file) => (
          <details className="diff-file" key={file.path} open>
            <summary><span className="diff-file-name">{file.path}</span><span className={file.untracked ? 'diff-badge added' : 'diff-badge'}>{file.untracked ? 'NEW' : 'DIFF'}</span></summary>
            <div className="diff-code" role="list" aria-label={`Changes in ${file.path}`}>
              {file.lines.map((line, index) => {
                const matchingComments = line.side && line.lineNumber
                  ? comments.filter((comment) => comment.filePath === file.path && comment.lineNumber === line.lineNumber && comment.side === line.side)
                  : []
                const key = `${file.path}-${index}`
                return (
                  <div key={key} className="diff-row-wrap">
                    <button
                      type="button"
                      className={`diff-line diff-${line.kind}${line.side ? ' diff-line-commentable' : ''}`}
                      onClick={() => line.side && line.lineNumber && setTarget({ filePath: file.path, lineNumber: line.lineNumber, side: line.side })}
                      disabled={!line.side || !line.lineNumber}
                      title={line.side ? 'Add a local review comment' : undefined}
                    >
                      <span className="diff-line-number">{line.lineNumber ?? ''}</span><code>{line.text || ' '}</code><span className="diff-line-plus">{line.side ? '+' : ''}</span>
                    </button>
                    {matchingComments.map((comment) => <div className="diff-comment" key={comment.id}><span>{comment.lineNumber}</span><p>{comment.body}</p></div>)}
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </div>

      {target && <form className="diff-comment-form" onSubmit={(event) => { event.preventDefault(); void addComment() }}>
        <div className="diff-comment-target"><strong>{target.filePath}</strong><span>Line {target.lineNumber} · {target.side === 'new' ? 'new' : 'removed'}</span></div>
        <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} rows={3} maxLength={5_000} placeholder="Write a local review comment…" aria-label="Review comment" autoFocus />
        <div><button type="button" className="secondary-button small" onClick={() => { setTarget(null); setCommentText('') }}>Cancel</button><button type="submit" className="primary-button small" disabled={!commentText.trim() || saving}>{saving ? 'Saving…' : 'Add comment'}</button></div>
      </form>}
      {comments.length > 0 && <p className="diff-footnote">Comments stay on this device and are not sent to a Git provider.</p>}
    </section>
  )
}

function parseDiff(diff: WorkspaceDiff): DiffFile[] {
  const files: DiffFile[] = []
  let current: DiffFile | undefined
  let oldLine = 0
  let newLine = 0

  const createFile = (filePath: string, untracked = false): DiffFile => {
    const file: DiffFile = { path: filePath, lines: [], ...(untracked ? { untracked: true } : {}) }
    files.push(file)
    return file
  }

  for (const rawLine of diff.patch.split(/\r?\n/)) {
    if (rawLine.startsWith('diff --git ')) {
      const separator = rawLine.lastIndexOf(' b/')
      const filePath = separator >= 0 ? rawLine.slice(separator + 3) : rawLine.slice('diff --git '.length)
      current = createFile(filePath)
      current.lines.push({ text: rawLine, kind: 'header' })
      continue
    }
    if (!current) continue
    const hunk = rawLine.match(/^@@ -([0-9]+)(?:,[0-9]+)? \+([0-9]+)(?:,[0-9]+)? @@/)
    if (hunk) {
      oldLine = Number(hunk[1])
      newLine = Number(hunk[2])
      current.lines.push({ text: rawLine, kind: 'header' })
      continue
    }
    if (rawLine.startsWith('+++ ') || rawLine.startsWith('--- ') || rawLine.startsWith('index ') || rawLine.startsWith('new file mode ') || rawLine.startsWith('deleted file mode ')) {
      current.lines.push({ text: rawLine, kind: 'header' })
      continue
    }
    if (rawLine.startsWith('+')) {
      current.lines.push({ text: rawLine, kind: 'add', lineNumber: newLine, side: 'new' })
      newLine += 1
    } else if (rawLine.startsWith('-')) {
      current.lines.push({ text: rawLine, kind: 'remove', lineNumber: oldLine, side: 'old' })
      oldLine += 1
    } else if (rawLine.startsWith(' ')) {
      current.lines.push({ text: rawLine, kind: 'context', lineNumber: newLine, side: 'new' })
      oldLine += 1
      newLine += 1
    } else if (rawLine) {
      current.lines.push({ text: rawLine, kind: 'header' })
    }
  }

  for (const file of diff.untrackedFiles) {
    const untrackedFile = createFile(file.path, true)
    untrackedFile.lines.push({ text: `+++ ${file.path}`, kind: 'header' })
    const lines = file.content.split(/\r?\n/)
    if (lines.at(-1) === '') lines.pop()
    untrackedFile.lines.push({ text: `@@ -0,0 +1,${lines.length} @@`, kind: 'header' })
    lines.forEach((line, index) => untrackedFile.lines.push({ text: `+${line}`, kind: 'add', lineNumber: index + 1, side: 'new' }))
  }
  return files
}
