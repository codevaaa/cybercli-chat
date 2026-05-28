import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Cpu, Play, Trash2, X, FileText } from 'lucide-react'
import api from '../../lib/api.js'

export default function WorkflowsPage() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '', prompt: '', model: 'Madhav' })
  const [submitting, setSubmitting] = useState(false)

  const fetchWorkflows = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/workflows')
      if (data?.success) {
        setWorkflows(data.workflows)
      }
    } catch (err) {
      console.error('Failed to fetch workflows:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const handleCreateWorkflow = async (e) => {
    e.preventDefault()
    if (!newWorkflow.name.trim() || !newWorkflow.prompt.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post('/workflows', {
        name: newWorkflow.name,
        description: newWorkflow.description,
        prompt: newWorkflow.prompt,
        model: newWorkflow.model
      })
      if (data?.success) {
        setWorkflows(prev => [data.workflow, ...prev])
        setNewWorkflow({ name: '', description: '', prompt: '', model: 'Madhav' })
        setCreateModalOpen(false)
      }
    } catch (err) {
      console.error('Failed to create workflow:', err)
      alert(err.response?.data?.error || 'Failed to create workflow')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteWorkflow = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this workflow template?')) return
    try {
      const { data } = await api.delete(`/workflows/${id}`)
      if (data?.success) {
        setWorkflows(prev => prev.filter(w => w._id !== id && w.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete workflow:', err)
      alert(err.response?.data?.error || 'Failed to delete workflow')
    }
  }

  const handleRunWorkflow = (promptText) => {
    navigate(`/chat?prompt=${encodeURIComponent(promptText)}`)
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background-primary text-foreground-primary">
      <div className="section-padding">
        <div className="container-custom max-w-5xl">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <div>
              <Link to="/chat" className="inline-flex items-center gap-2 text-xs font-semibold text-foreground-muted hover:text-foreground-primary transition-colors mb-4 group">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                Back to chat
              </Link>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Saved Workflows</h1>
              <p className="text-xs text-foreground-muted mt-1 leading-normal">
                Save your standard prompt templates and run them with one click inside the Chat interface.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(124,58,237,0.2)]"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </button>
          </div>

          {/* Skeletons or list */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="card p-6 animate-pulse space-y-4">
                  <div className="w-9 h-9 rounded-xl bg-white/5" />
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="pt-4 border-t border-border-subtle/50 space-y-3">
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                    <div className="h-8 bg-white/5 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {workflows.map((wf) => (
                <div
                  key={wf._id || wf.id}
                  className="card p-6 flex flex-col justify-between hover:border-white/[0.12] transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-accent" />
                      </div>
                      <button
                        onClick={(e) => handleDeleteWorkflow(wf._id || wf.id, e)}
                        className="p-1.5 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="text-base font-bold text-foreground-primary mb-2">
                      {wf.name}
                    </h3>
                    <p className="text-xs text-foreground-muted leading-relaxed mb-6 font-medium line-clamp-3">
                      {wf.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border-subtle/50">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-foreground-muted">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5" />
                        {wf.model}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRunWorkflow(wf.prompt)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-accent hover:border-accent hover:text-white transition-all text-xs font-bold text-foreground-primary"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Run Workflow
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && workflows.length === 0 && (
            <div className="text-center py-20 card flex flex-col items-center justify-center gap-4">
              <FileText className="w-12 h-12 text-foreground-muted opacity-30" />
              <h3 className="text-base font-bold text-foreground-primary">No workflow templates found</h3>
              <p className="text-xs text-foreground-muted max-w-xs leading-normal">
                Save complex templates you run regularly to trigger them in one click.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-light transition-all"
              >
                Create First Template
              </button>
            </div>
          )}

          {/* Create Modal */}
          <AnimatePresence>
            {createModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-xs"
                  onClick={() => !submitting && setCreateModalOpen(false)}
                />
                
                {/* Panel */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative w-full max-w-md bg-[#0F0F14] border border-border-subtle rounded-2xl p-6 shadow-2xl z-10"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white">Create Workflow Template</h2>
                    <button
                      onClick={() => setCreateModalOpen(false)}
                      disabled={submitting}
                      className="p-1 rounded text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateWorkflow} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Workflow Name</label>
                      <input
                        type="text"
                        value={newWorkflow.name}
                        onChange={e => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Unit Test Generator"
                        required
                        disabled={submitting}
                        className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Short Description</label>
                      <input
                        type="text"
                        value={newWorkflow.description}
                        onChange={e => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g. Reviews files and writes complete Jest test suites"
                        disabled={submitting}
                        className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Prompt Template</label>
                      <textarea
                        value={newWorkflow.prompt}
                        onChange={e => setNewWorkflow(prev => ({ ...prev, prompt: e.target.value }))}
                        placeholder="Write the exact template instructions..."
                        rows={4}
                        required
                        disabled={submitting}
                        className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent resize-none disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Model Quota Group</label>
                      <select
                        value={newWorkflow.model}
                        onChange={e => setNewWorkflow(prev => ({ ...prev, model: e.target.value }))}
                        disabled={submitting}
                        className="w-full bg-background-tertiary text-sm text-foreground-primary border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:border-accent disabled:opacity-60"
                      >
                        {['Madhav', 'Nakul', 'Bheem', 'Arjun', 'Vishwakarma', 'Ashwatthama'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setCreateModalOpen(false)}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border-subtle text-xs font-bold text-foreground-secondary hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submitting && <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                        {submitting ? 'Saving...' : 'Save Workflow'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
