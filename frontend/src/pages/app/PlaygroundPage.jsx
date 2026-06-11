import { useState } from 'react'
import { Send, Terminal } from 'lucide-react'
import api from '../../lib/api.js'

export default function PlaygroundPage() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('brahma-v1')

  const handleTest = async () => {
    if (!prompt) return
    setLoading(true)
    setResponse('')
    
    // We need to fetch an API key or use the user's token.
    // Assuming we use our /v1/chat/completions endpoint which we just made.
    // However, from the frontend, it requires an API key, so we'll just proxy through an authenticated route or simulate it if we have a key.
    // Actually, for the dashboard playground, it's easier to create a backend route or we can just show a mock UI.
    try {
      const res = await api.post('/v1/chat/completions', {
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false
      })
      setResponse(res.data.choices[0].message.content)
    } catch (err) {
      setResponse('Error: ' + (err.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background-primary relative">
      <header className="flex-shrink-0 px-6 py-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-semibold text-foreground-primary">API Playground</h1>
        </div>
        <select 
          value={model} 
          onChange={e => setModel(e.target.value)}
          className="bg-background-secondary border border-border-subtle text-sm rounded-lg px-3 py-1.5"
        >
          <option value="brahma-v1">Brahma-v1 (10xThink)</option>
          <option value="llama-3-70b">Llama 3 70B</option>
        </select>
      </header>

      <div className="flex-1 flex px-6 py-6 gap-6 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <label className="text-sm font-semibold mb-2">System Prompt</label>
          <textarea 
            className="h-32 bg-background-secondary border border-border-subtle rounded-xl p-4 text-sm mb-6 resize-none"
            placeholder="You are a helpful coding assistant..."
          />

          <label className="text-sm font-semibold mb-2">User Prompt</label>
          <textarea 
            className="flex-1 bg-background-secondary border border-border-subtle rounded-xl p-4 text-sm resize-none mb-4"
            placeholder="Enter your test prompt here..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />

          <button 
            onClick={handleTest}
            disabled={loading}
            className="self-end px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Running...' : 'Submit'}
          </button>
        </div>

        <div className="flex-1 flex flex-col">
          <label className="text-sm font-semibold mb-2">Response</label>
          <div className="flex-1 bg-background-secondary border border-border-subtle rounded-xl p-4 overflow-y-auto whitespace-pre-wrap text-sm font-mono">
            {response || <span className="text-foreground-muted">Response will appear here...</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
