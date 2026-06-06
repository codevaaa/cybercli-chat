import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, Folder, MessageSquare, Pin, Tag, Clock, MoreVertical } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Tooltip } from '../../components/ui/Tooltip.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import api from '../../lib/api.js'

const SAMPLE_CHATS = [
  { id: '1', title: 'Python async patterns', folder: 'Coding', pinned: true, tags: ['coding', 'python'], updated: '2m ago', messages: 24 },
  { id: '2', title: 'Startup idea validation', folder: 'Business', pinned: true, tags: ['business'], updated: '1h ago', messages: 56 },
  { id: '3', title: 'Travel itinerary Japan', folder: 'Personal', pinned: false, tags: ['travel'], updated: '3h ago', messages: 18 },
  { id: '4', title: 'Research: Quantum computing', folder: 'Research', pinned: false, tags: ['research', 'science'], updated: '1d ago', messages: 112 },
  { id: '5', title: 'Creative writing prompts', folder: 'Creative', pinned: false, tags: ['creative'], updated: '2d ago', messages: 34 },
]

const FOLDERS = ['All', 'Coding', 'Business', 'Personal', 'Research', 'Creative']

export default function LibraryPage() {
  const { data: libraryChats = [], isLoading } = useQuery({
    queryKey: ['libraryChats'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/library')
        return data || SAMPLE_CHATS
      } catch {
        return SAMPLE_CHATS
      }
    }
  })
  const [activeFolder, setActiveFolder] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = libraryChats.filter(c => {
    const matchesFolder = activeFolder === 'All' || c.folder === activeFolder
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.tags.some(t => t.includes(search.toLowerCase()))
    return matchesFolder && matchesSearch
  })

  return (
    <div className="min-h-screen pt-20 pb-12 bg-background-primary">
      <div className="section-padding">
        <div className="container-custom max-w-4xl">
          <Tooltip content="Return to Chat" position="right">
            <Link to="/chat" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-primary transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" />
              Back to chat
            </Link>
          </Tooltip>

          <h1 className="text-h2 mb-6">Library</h1>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats, tags, folders..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background-secondary border border-border-subtle text-foreground-primary text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {FOLDERS.map((folder) => (
              <button
                key={folder}
                onClick={() => setActiveFolder(folder)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFolder === folder
                    ? 'bg-accent text-white'
                    : 'bg-background-secondary text-foreground-muted hover:text-foreground-primary border border-border-subtle'
                }`}
              >
                {folder}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-background-secondary border border-border-subtle">
                    <Skeleton variant="rectangular" width="40px" height="40px" className="rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" width="40%" />
                      <Skeleton variant="text" width="60%" className="h-3" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              filtered.map((chat) => (
              <Link
                key={chat.id}
                to={`/chat/${chat.id}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-background-secondary border border-border-subtle hover:border-border-medium transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-background-tertiary flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-foreground-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-foreground-primary truncate">{chat.title}</h3>
                    {chat.pinned && <Pin className="w-3 h-3 text-accent flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-foreground-muted">
                    <span className="flex items-center gap-1"><Folder className="w-3 h-3" />{chat.folder}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{chat.messages}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{chat.updated}</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  {chat.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
                <Tooltip content="Options" position="left">
                  <button className="p-2 rounded-lg hover:bg-background-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4 text-foreground-muted" />
                  </button>
                </Tooltip>
              </Link>
            )))}
          </div>
        </div>
      </div>
    </div>
  )
}
