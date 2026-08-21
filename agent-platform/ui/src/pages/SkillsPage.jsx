import React, { useState } from 'react'
import { usePlatformStore } from '../store/platformStore.js'
import { BookOpen, Plus, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

export default function SkillsPage() {
  const { skills, fetchSkills } = usePlatformStore()
  const [search, setSearch] = useState('')

  const filtered = skills.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">Skills</h1>
          <p className="text-xs text-muted mt-0.5">Domain knowledge injected into agents as context</p>
        </div>
        <button className="btn-ghost text-xs flex items-center gap-1.5" onClick={fetchSkills}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="px-6 py-3 border-b border-border">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search skills..."
          className="input w-full max-w-xs text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
            <p>No skills installed</p>
            <p className="text-xs mt-1">Add .md files to .codeva/skills/ or create SKILLS.md at project root</p>
            <code className="text-xs bg-surface px-2 py-1 rounded mt-2 inline-block">codeva skills add my-skill.md</code>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-2xl">
            {filtered.map(skill => (
              <div key={skill.id} className="agent-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-white">{skill.name}</div>
                    <div className="text-xs text-muted mt-0.5 line-clamp-2">{skill.description}</div>
                  </div>
                  <span className="badge bg-white/5 text-muted flex-shrink-0">{skill.source}</span>
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {(skill.agents || []).map(a => (
                    <span key={a} className="badge bg-accent/10 text-accent text-xs">{a}</span>
                  ))}
                  {(skill.tags || []).map(t => (
                    <span key={t} className="badge bg-white/5 text-muted text-xs">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
