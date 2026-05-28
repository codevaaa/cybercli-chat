import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, FolderOpen, Calendar, MessageSquare, Cpu, Trash2, X } from 'lucide-react'
import api from '../../lib/api.js'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '', model: 'Madhav' })
  const [submitting, setSubmitting] = useState(false)

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/projects')
      if (data?.success) {
        setProjects(data.projects)
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newProject.name.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post('/projects', {
        name: newProject.name,
        description: newProject.description,
        model: newProject.model
      })
      if (data?.success) {
        setProjects(prev => [data.project, ...prev])
        setNewProject({ name: '', description: '', model: 'Madhav' })
        setCreateModalOpen(false)
      }
    } catch (err) {
      console.error('Failed to create project:', err)
      alert(err.response?.data?.error || 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this project?')) return
    try {
      const { data } = await api.delete(`/projects/${id}`)
      if (data?.success) {
        setProjects(prev => prev.filter(p => p._id !== id && p.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete project:', err)
      alert(err.response?.data?.error || 'Failed to delete project')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 6000)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins <= 0 ? 'Just now' : `${diffMins}m ago`}`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
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
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Your Projects</h1>
              <p className="text-xs text-foreground-muted mt-1 leading-normal">
                Organize your chats, files, and configurations inside isolated context workspaces.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(124,58,237,0.2)]"
            >
              <Plus className="w-4 h-4" />
              New Project
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
                  <div className="h-3 bg-white/5 rounded w-4/5" />
                  <div className="pt-4 border-t border-border-subtle/50 flex justify-between">
                    <div className="h-3 bg-white/5 rounded w-1/4" />
                    <div className="h-3 bg-white/5 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {projects.map((proj) => (
                <div
                  key={proj._id || proj.id}
                  onClick={() => navigate(`/chat?project=${proj._id || proj.id}`)}
                  className="card p-6 flex flex-col justify-between hover:border-white/[0.12] hover:bg-background-secondary transition-all cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <FolderOpen className="w-4 h-4 text-accent" />
                      </div>
                      <button
                        onClick={(e) => handleDeleteProject(proj._id || proj.id, e)}
                        className="p-1.5 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="text-base font-bold text-foreground-primary mb-2 group-hover:text-accent transition-colors">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-foreground-muted leading-relaxed mb-6 font-medium line-clamp-3">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border-subtle/50 text-[11px] font-semibold text-foreground-muted">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5" />
                        {proj.model}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {proj.threads || 0} threads
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      Updated {formatDate(proj.updatedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && projects.length === 0 && (
            <div className="text-center py-20 card flex flex-col items-center justify-center gap-4">
              <FolderOpen className="w-12 h-12 text-foreground-muted opacity-30" />
              <h3 className="text-base font-bold text-foreground-primary">No projects found</h3>
              <p className="text-xs text-foreground-muted max-w-xs leading-normal">
                Create a project context to keep your code review and automation workspace separate.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-light transition-all"
              >
                Create First Project
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
                    <h2 className="text-lg font-bold text-white">Create Project Context</h2>
                    <button
                      onClick={() => setCreateModalOpen(false)}
                      disabled={submitting}
                      className="p-1 rounded text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateProject} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Project Name</label>
                      <input
                        type="text"
                        value={newProject.name}
                        onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Serverless Audio API"
                        required
                        disabled={submitting}
                        className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
                      <textarea
                        value={newProject.description}
                        onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Explain the context of this project..."
                        rows={3}
                        disabled={submitting}
                        className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent resize-none disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Default Model</label>
                      <select
                        value={newProject.model}
                        onChange={e => setNewProject(prev => ({ ...prev, model: e.target.value }))}
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
                        {submitting ? 'Creating...' : 'Create Project'}
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
