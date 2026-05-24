import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, FolderOpen, Calendar, MessageSquare, Cpu, Trash2, X } from 'lucide-react'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([
    {
      id: 'proj-1',
      name: 'Security Audit Tool',
      description: 'Analyzing local server configurations and auditing Dockerfiles for vulnerability patterns.',
      model: 'Chanakya (Reasoning)',
      updatedAt: '2 hours ago',
      threads: 4
    },
    {
      id: 'proj-2',
      name: 'E-commerce React v19 Migration',
      description: 'Upgrading state management and layouts to React 19 and Tailwind CSS v4 styling rules.',
      model: 'Vishwakarma (Coder)',
      updatedAt: '1 day ago',
      threads: 8
    },
    {
      id: 'proj-3',
      name: 'Serverless Audio Transcriber',
      description: 'Express backend endpoint for transcribing audio files using Gemini TTS engine.',
      model: 'Sahadeva (Flash)',
      updatedAt: '3 days ago',
      threads: 2
    }
  ])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '', model: 'Madhav (Flagship)' })

  const handleCreateProject = (e) => {
    e.preventDefault()
    if (!newProject.name.trim()) return
    const id = `proj-${Date.now()}`
    const created = {
      id,
      name: newProject.name,
      description: newProject.description,
      model: newProject.model,
      updatedAt: 'Just now',
      threads: 0
    }
    setProjects(prev => [created, ...prev])
    setNewProject({ name: '', description: '', model: 'Madhav (Flagship)' })
    setCreateModalOpen(false)
  }

  const handleDeleteProject = (id, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this project?')) return
    setProjects(prev => prev.filter(p => p.id !== id))
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

          {/* Grid list */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => navigate(`/chat?project=${proj.id}`)}
                className="card p-6 flex flex-col justify-between hover:border-white/[0.12] hover:bg-background-secondary transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <FolderOpen className="w-4 h-4 text-accent" />
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
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
                      {proj.threads} threads
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {proj.updatedAt}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {projects.length === 0 && (
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
                  onClick={() => setCreateModalOpen(false)}
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
                      className="p-1 rounded text-gray-500 hover:text-white transition-colors"
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
                        className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
                      <textarea
                        value={newProject.description}
                        onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Explain the context of this project..."
                        rows={3}
                        className="w-full bg-background-tertiary text-sm text-foreground-primary placeholder:text-foreground-muted border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-accent resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Default Model</label>
                      <select
                        value={newProject.model}
                        onChange={e => setNewProject(prev => ({ ...prev, model: e.target.value }))}
                        className="w-full bg-background-tertiary text-sm text-foreground-primary border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:border-accent"
                      >
                        {['Madhav (Flagship)', 'Nakul (Reasoning)', 'Bheem (Core)', 'Arjun (Swift)', 'Vishwakarma (Coder)', 'Ashwatthama (Uncensored)'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setCreateModalOpen(false)}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border-subtle text-xs font-bold text-foreground-secondary hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-white text-xs font-bold transition-all"
                      >
                        Create Project
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
