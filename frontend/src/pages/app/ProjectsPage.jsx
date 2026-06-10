import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, FolderOpen, Calendar, MessageSquare, Cpu, Trash2, X, Command } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@components/ui/Skeleton.jsx'
import { Tooltip } from '@components/ui/Tooltip.jsx'
import api from '../../lib/api.js'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '', model: 'Codeva-Swift' })

  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects')
      return data?.projects || []
    }
  })

  const createMutation = useMutation({
    mutationFn: async (newProj) => {
      const { data } = await api.post('/projects', newProj)
      return data.project
    },
    onMutate: async (newProj) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      const previousProjects = queryClient.getQueryData(['projects'])
      const optimisticProject = { _id: Date.now().toString(), ...newProj, updatedAt: new Date().toISOString() }
      queryClient.setQueryData(['projects'], old => [optimisticProject, ...(old || [])])
      return { previousProjects }
    },
    onError: (err, newProj, context) => {
      queryClient.setQueryData(['projects'], context.previousProjects)
      alert(err.response?.data?.error || 'Failed to create project')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/projects/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      const previousProjects = queryClient.getQueryData(['projects'])
      queryClient.setQueryData(['projects'], old => old.filter(p => p._id !== id && p.id !== id))
      return { previousProjects }
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['projects'], context.previousProjects)
      alert('Failed to delete project')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })

  const handleCreateProject = (e) => {
    e.preventDefault()
    if (!newProject.name.trim()) return
    createMutation.mutate(newProject, {
      onSuccess: () => {
        setNewProject({ name: '', description: '', model: 'Codeva-Swift' })
        setCreateModalOpen(false)
      }
    })
  }

  const handleDeleteProject = (id, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this project?')) return
    deleteMutation.mutate(id)
  }

  const submitting = createMutation.isPending

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 6000)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return diffMins <= 0 ? 'Just now' : `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
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
              Projects
            </h1>
            <p className="text-sm text-foreground-secondary/80 mt-2 leading-relaxed max-w-lg">
              Organize your code, architecture discussions, and configurations within isolated cognitive environments.
            </p>
          </div>
          <Tooltip content="Create a new isolated context" position="left">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-all shadow-[0_2px_10px_rgba(217,119,87,0.2)]"
            >
              <Plus className="w-4 h-4" />
              New Project
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
                <Skeleton variant="text" width="80%" />
                <div className="pt-5 mt-5 border-t border-border-subtle/50 flex justify-between">
                  <Skeleton variant="text" width="30%" />
                  <Skeleton variant="text" width="30%" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={proj._id || proj.id}
                onClick={() => navigate(`/chat?project=${proj._id || proj.id}`)}
                className="bg-background-elevated/40 backdrop-blur-sm border border-border-subtle hover:border-accent/30 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer group hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-background-primary border border-border-subtle shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FolderOpen className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <Tooltip content="Delete Project" position="top">
                      <button
                        onClick={(e) => handleDeleteProject(proj._id || proj.id, e)}
                        className="p-2 rounded-lg text-foreground-secondary/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </div>
                  <h3 className="text-lg font-serif font-medium text-foreground-primary mb-2 group-hover:text-accent transition-colors">
                    {proj.name}
                  </h3>
                  <p className="text-sm text-foreground-secondary/80 leading-relaxed mb-6 line-clamp-3">
                    {proj.description || 'No description provided for this project.'}
                  </p>
                </div>

                <div className="space-y-3 pt-5 border-t border-border-subtle/50 text-[11px] font-medium text-foreground-secondary/70 tracking-wide uppercase">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 bg-background-primary px-2 py-1 rounded border border-border-subtle">
                      <Command className="w-3 h-3 text-accent" />
                      {proj.model || 'Codeva'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 opacity-70" />
                      {proj.threads || 0} threads
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground-secondary/50">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {formatDate(proj.updatedAt)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-24 bg-background-elevated/20 border border-border-subtle border-dashed rounded-3xl flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-background-primary border border-border-subtle shadow-sm flex items-center justify-center mb-2">
              <FolderOpen className="w-8 h-8 text-foreground-secondary/40" />
            </div>
            <h3 className="text-xl font-serif font-medium text-foreground-primary">No projects yet</h3>
            <p className="text-sm text-foreground-secondary/70 max-w-sm leading-relaxed mb-4">
              Create a project to give the AI context about your codebase, architecture, or specific problem domain.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-background-primary border border-border-subtle text-foreground-primary text-sm font-medium hover:border-accent/50 hover:text-accent transition-all shadow-sm"
            >
              Create your first project
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
                className="relative w-full max-w-md bg-background-elevated border border-border-subtle rounded-2xl p-8 shadow-2xl z-10"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-serif font-medium text-foreground-primary">New Context Workspace</h2>
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    disabled={submitting}
                    className="p-1.5 rounded-md text-foreground-secondary hover:text-foreground-primary hover:bg-background-secondary transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateProject} className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-foreground-secondary/70 mb-2 uppercase tracking-widest">Project Name</label>
                    <input
                      type="text"
                      value={newProject.name}
                      onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Codeva API Gateway"
                      required
                      disabled={submitting}
                      className="w-full bg-background-primary text-sm text-foreground-primary placeholder:text-foreground-secondary/40 border border-border-subtle rounded-xl px-4 py-3 focus:outline-none focus:border-accent disabled:opacity-60 transition-colors shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground-secondary/70 mb-2 uppercase tracking-widest">Description</label>
                    <textarea
                      value={newProject.description}
                      onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Provide high-level context..."
                      rows={3}
                      disabled={submitting}
                      className="w-full bg-background-primary text-sm text-foreground-primary placeholder:text-foreground-secondary/40 border border-border-subtle rounded-xl px-4 py-3 focus:outline-none focus:border-accent resize-none disabled:opacity-60 transition-colors shadow-inner custom-scrollbar"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground-secondary/70 mb-2 uppercase tracking-widest">Base Intelligence Model</label>
                    <select
                      value={newProject.model}
                      onChange={e => setNewProject(prev => ({ ...prev, model: e.target.value }))}
                      disabled={submitting}
                      className="w-full bg-background-primary text-sm text-foreground-primary border border-border-subtle rounded-xl px-4 py-3 focus:outline-none focus:border-accent disabled:opacity-60 transition-colors shadow-inner appearance-none cursor-pointer"
                    >
                      {['Codeva-Swift', 'Codeva-Pro', 'Codeva-Max', 'Codeva-Enterprise', 'Claude 3.5 Sonnet', 'GPT-4o'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-border-subtle/50 mt-8">
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
                      {submitting ? 'Initializing...' : 'Create Workspace'}
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
