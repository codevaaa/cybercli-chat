import React from 'react'
import { NavLink } from 'react-router-dom'
import { usePlatformStore } from '../store/platformStore.js'
import {
  Layers, BookOpen, Users, Settings, Zap, Circle,
  MessageSquare, Activity
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/',         icon: MessageSquare,   label: 'Chat'          },
  { to: '/manager',  icon: Activity,        label: 'Agent Manager' },
  { to: '/sessions', icon: Layers,          label: 'Sessions'      },
  { to: '/skills',   icon: BookOpen,        label: 'Skills'        },
  { to: '/agents',   icon: Users,           label: 'Agents'        },
]

export default function Sidebar({ onOpenSettings }) {
  const { connected, platformOnline } = usePlatformStore()

  return (
    <aside className="w-56 flex-shrink-0 bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="CodeVaa" className="w-7 h-7" />
          <div>
            <div className="font-bold text-sm text-white">CodeVaa</div>
            <div className="text-xs text-muted">Agent Platform</div>
          </div>
        </div>
      </div>

      {/* Status pill */}
      <div className="px-4 py-2 border-b border-border">
        <div className={clsx(
          'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full w-fit',
          connected ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
        )}>
          <Circle size={6} fill="currentColor" />
          {connected ? 'Connected' : 'Ready (HTTP)'}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
              isActive
                ? 'bg-accent/15 text-accent font-medium'
                : 'text-muted hover:text-white hover:bg-white/5'
            )}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Settings button (opens overlay) */}
      <div className="px-2 pb-2">
        <button
          onClick={() => onOpenSettings?.()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:text-white hover:bg-white/5 transition-all duration-150"
        >
          <Settings size={15} />
          Settings
        </button>
      </div>

      {/* Bottom info */}
      <div className="px-4 py-3 border-t border-border">
        <div className="text-xs text-muted">
          <div>CodeVaa v1.0.0</div>
          <div className="mt-0.5">by Chandan Pandey</div>
        </div>
      </div>
    </aside>
  )
}
