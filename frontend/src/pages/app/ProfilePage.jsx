import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Camera, Mail, User, Calendar, Zap } from 'lucide-react'
import { useAuthStore } from '@stores/authStore.js'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState({
    name: 'Loading...',
    email: 'Loading...',
    joinDate: '-',
    plan: 'Free',
    messagesSent: 0,
    threadsCreated: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        email: user.email,
        joinDate: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        plan: user.user_metadata?.plan_tier || 'Free',
        messagesSent: 0,
        threadsCreated: 0,
      })
      setLoading(false)
    }
  }, [user])

  return (
    <div className="min-h-screen pt-20 pb-12 bg-background-primary">
      <div className="section-padding">
        <div className="container-custom max-w-2xl">
          <Link to="/chat" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to chat
          </Link>

          <div className="card p-8 mb-6">
            <div className="flex items-center gap-6 mb-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-accent">DU</span>
                </div>
                <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background-tertiary border border-border-subtle flex items-center justify-center hover:bg-background-elevated transition-colors">
                  <Camera className="w-3.5 h-3.5 text-foreground-muted" />
                </button>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground-primary">{profile.name}</h1>
                <p className="text-sm text-foreground-muted">{profile.email}</p>
                <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                  <Zap className="w-3 h-3" />
                  {profile.plan} Plan
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-xl bg-background-tertiary">
                <div className="text-2xl font-bold text-foreground-primary">{profile.messagesSent}</div>
                <div className="text-xs text-foreground-muted mt-1">Messages</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-background-tertiary">
                <div className="text-2xl font-bold text-foreground-primary">{profile.threadsCreated}</div>
                <div className="text-xs text-foreground-muted mt-1">Threads</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-background-tertiary">
                <div className="text-2xl font-bold text-foreground-primary">8</div>
                <div className="text-xs text-foreground-muted mt-1">Providers</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-background-tertiary">
                <User className="w-5 h-5 text-foreground-muted" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground-primary">Display Name</p>
                  <p className="text-xs text-foreground-muted">{profile.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-background-tertiary">
                <Mail className="w-5 h-5 text-foreground-muted" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground-primary">Email</p>
                  <p className="text-xs text-foreground-muted">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-background-tertiary">
                <Calendar className="w-5 h-5 text-foreground-muted" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground-primary">Joined</p>
                  <p className="text-xs text-foreground-muted">{profile.joinDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
