import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Cpu, Play, Trash2, X, FileText, Sparkles } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@components/ui/Skeleton.jsx'
import { Tooltip } from '@components/ui/Tooltip.jsx'
import api from '../../lib/api.js'

export default function WorkflowsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '', prompt: '', model: 'Codeva-Pro' })

  const { data: workflows = [], isLoading: loading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const { data } = await api.get('/workflows')
      return data?.workflows || []
    }
  })

  const createMutation = useMutation({
    mutationFn: async (newWf) => {
      const { data } = await api.post('/workflows', newWf)
      return data.workflow
    },
    onMutate: async (newWf) => {
      await queryClient.cancelQueries({ queryKey: ['workflows'] })
      const previousWorkflows = queryClient.getQueryData(['workflows'])
      const optimisticWf = { _id: Date.now().toString(), ...newWf }
      queryClient.setQueryData(['workflows'], old => [optimisticWf, ...(old || [])])
      return { previousWorkflows }
    },
    onError: (err, newWf, context) => {
      queryClient.setQueryData(['workflows'], context.previousWorkflows)
      alert(err.response?.data?.error || 'Failed to create workflow')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/workflows/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['workflows'] })
      const previousWorkflows = queryClient.getQueryData(['workflows'])
      queryClient.setQueryData(['workflows'], old => old.filter(w => w._id !== id && w.id !== id))
      return { previousWorkflows }
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['workflows'], context.previousWorkflows)
      alert('Failed to delete workflow')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    }
  })

  const handleCreateWorkflow = (e) => {
    e.preventDefault()
    if (!newWorkflow.name.trim() || !newWorkflow.prompt.trim()) return
    createMutation.mutate(newWorkflow, {
      onSuccess: () => {
        setNewWorkflow({ name: '', description: '', prompt: '', model: 'Codeva-Pro' })
        setCreateModalOpen(false)
      }
    })
  }

  const handleDeleteWorkflow = (id, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this workflow template?')) return
    deleteMutation.mutate(id)
  }

  const submitting = createMutation.isPending

  const handleRunWorkflow = (promptText) => {
    navigate(`/chat?prompt=${encodeURIComponent(promptText)}`)
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background-primary text-foreground-primary selection:bg-accent/20 selection:text-accent font-sans">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
          <div>
            <Link to="/chat" className="inline-flex items-center gap-2 text-xs font-medium text-foreground-secondary hover:text-foreground-primary transition-colors mb-4 group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Return to Workspace
            </Link>
            <h1 className="text-3xl md:text-4xl font-serif font-medium tracking-tight text-foreground-primary">
              Workflows
            </h1>
            <p className="text-sm text-foreground-secondary/80 mt-2 leading-relaxed max-w-lg">
              Automate complex chains of reasoning by saving your standard instruction sets and running them with one click.
            </p>
          </div>
          <Tooltip content="Create a new workflow template" position="left">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-all shadow-[0_2px_10px_rgba(217,119,87,0.2)]"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </button>
          </Tooltip>
        </div>

        {/* Skeletons or list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-background-elevated border border-border-subtle rounded-2xl p-6 space-y-4">
                <Skeleton variant="rectangular" className="w-10 h-10 rounded-xl" />
                <Skeleton variant="text" width="50%" />
                <Skeleton variant="text" />
                <div className="pt-5 border-t border-border-subtle/50 space-y-3">
                  <Skeleton variant="text" width="30%" />
                  <Skeleton variant="rectangular" className="w-full h-9 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((wf) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={wf._id || wf.id}
                className="bg-background-elevated/40 backdrop-blur-sm border border-border-subtle hover:border-accent/30 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 group hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-background-primary border border-border-subtle shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FileText className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <Tooltip content="Delete Workflow" position="top">
                      <button
                        onClick={(e) => handleDeleteWorkflow(wf._id || wf.id, e)}
                        className="p-2 rounded-lg text-foreground-secondary/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </div>
                  <h3 className="text-lg font-serif font-medium text-foreground-primary mb-2 group-hover:text-accent transition-colors">
                    {wf.name}
                  </h3>
                  <p className="text-sm text-foreground-secondary/80 leading-relaxed mb-6 line-clamp-3">
                    {wf.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-4 pt-5 border-t border-border-subtle/50">
                  <div className="flex items-center justify-between text-[11px] font-medium text-foreground-secondary/70 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5 bg-background-primary px-2 py-1 rounded border border-border-subtle">
                      <Cpu className="w-3 h-3 text-accent" />
                      {wf.model || 'Codeva'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRunWorkflow(wf.prompt)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-background-primary border border-border-subtle hover:bg-accent hover:border-accent hover:text-white transition-all text-sm font-semibold text-foreground-primary shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Run Workflow
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && workflows.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-24 bg-background-elevated/20 border border-border-subtle border-dashed rounded-3xl flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-background-primary border border-border-subtle shadow-sm flex items-center justify-center mb-2">
              <Sparkles className="w-8 h-8 text-foreground-secondary/40" />
            </div>
            <h3 className="text-xl font-serif font-medium text-foreground-primary">No workflows yet</h3>
            <p className="text-sm text-foreground-secondary/70 max-w-sm leading-relaxed mb-4">
              Save complex prompt templates that you run regularly, and trigger them with a single click.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-background-primary border border-border-subtle text-foreground-primary text-sm font-medium hover:border-accent/50 hover:text-accent transition-all shadow-sm"
            >
              Create first workflow
            </button>
          </motion.div>
        )}

        {/* Create Modal */}
        <AnimatePresence>
          {createModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background-primary/80 backdrop-blur-sm"
                onClick={() => !submitting && setCreateModalOpen(false)}
              />
              
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="relative w-full max-w-xl bg-background-elevated border border-border-subtle rounded-2xl p-8 shadow-2xl z-10 flex flex-col max-h-[90vh]"
              >
                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                  <h2 className="text-xl font-serif font-medium text-foreground-primary">New Workflow Template</h2>
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    disabled={submitting}
                    className="p-1.5 rounded-md text-foreground-secondary hover:text-foreground-primary hover:bg-background-secondary transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateWorkflow} className="space-y-5 overflow-y-auto custom-scrollbar flex-1 pr-2">
                  <div>
                    <label className="block text-[11px] font-bold text-foreground-secondary/70 mb-2 uppercase tracking-widest">Workflow Name</label>
                    <input
                      type="text"
                      value={newWorkflow.name}
                      onChange={e => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Code Reviewer"
                      required
                      disabled={submitting}
                      className="w-full bg-background-primary text-sm text-foreground-primary placeholder:text-foreground-secondary/40 border border-border-subtle rounded-xl px-4 py-3 focus:outline-none focus:border-accent disabled:opacity-60 transition-colors shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground-secondary/70 mb-2 uppercase tracking-widest">Short Description</label>
                    <input
                      type="text"
                      value={newWorkflow.description}
                      onChange={e => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="e.g. Scans diffs for security vulnerabilities"
                      disabled={submitting}
                      className="w-full bg-background-primary text-sm text-foreground-primary placeholder:text-foreground-secondary/40 border border-border-subtle rounded-xl px-4 py-3 focus:outline-none focus:border-accent disabled:opacity-60 transition-colors shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground-secondary/70 mb-2 uppercase tracking-widest">Prompt Template</label>
                    <textarea
                      value={newWorkflow.prompt}
                      onChange={e => setNewWorkflow(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="Write the exact template instructions..."
                      rows={5}
                      required
                      disabled={submitting}
                      className="w-full bg-background-primary text-sm text-foreground-primary placeholder:text-foreground-secondary/40 border border-border-subtle rounded-xl px-4 py-3 focus:outline-none focus:border-accent resize-none disabled:opacity-60 transition-colors shadow-inner font-mono text-[13px] custom-scrollbar"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground-secondary/70 mb-2 uppercase tracking-widest">Model Quota Group</label>
                    <select
                      value={newWorkflow.model}
                      onChange={e => setNewWorkflow(prev => ({ ...prev, model: e.target.value }))}
                      disabled={submitting}
                      className="w-full bg-background-primary text-sm text-foreground-primary border border-border-subtle rounded-xl px-4 py-3 focus:outline-none focus:border-accent disabled:opacity-60 transition-colors shadow-inner appearance-none cursor-pointer"
                    >
                      {['Codeva-Swift', 'Codeva-Pro', 'Codeva-Max', 'Codeva-Enterprise', 'Claude 3.5 Sonnet', 'GPT-4o'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-border-subtle/50 mt-8 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setCreateModalOpen(false)}
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-border-subtle text-sm font-medium text-foreground-secondary hover:text-foreground-primary hover:bg-background-secondary transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-foreground-primary hover:bg-white text-background-primary text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                    >
                      {submitting && <div className="w-3.5 h-3.5 rounded-full border-2 border-background-primary/30 border-t-background-primary animate-spin" />}
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
  )
}
