import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Code2, Image as ImageIcon, Copy, Download, Play, Check, ExternalLink } from 'lucide-react'

// ── Parse artifacts from messages ─────────────────────────────────────────────
function parseArtifacts(messages) {
  const artifacts = []
  let id = 0

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue
    const content = msg.content || ''

    // Parse code blocks
    const codeRegex = /```(\w+)?\n?([\s\S]*?)```/g
    let match
    while ((match = codeRegex.exec(content)) !== null) {
      const lang = match[1] || 'text'
      const code = match[2].trim()
      if (code.length < 10) continue
      artifacts.push({
        id: id++,
        type: 'code',
        lang,
        content: code,
        label: `${lang.toUpperCase()} snippet`,
        timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
        msgId: msg._id,
      })
    }

    // Parse image markdown
    const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
    while ((match = imgRegex.exec(content)) !== null) {
      artifacts.push({
        id: id++,
        type: 'image',
        alt: match[1] || 'Image',
        url: match[2],
        label: match[1] || 'Generated image',
        timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
        msgId: msg._id,
      })
    }
  }

  return artifacts
}

// ── Code Card ─────────────────────────────────────────────────────────────────
function CodeCard({ artifact }) {
  const [copied, setCopied] = useState(false)
  const [output, setOutput] = useState(null)
  const [running, setRunning] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(artifact.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const ext = { javascript: 'js', python: 'py', typescript: 'ts', html: 'html', css: 'css', json: 'json', bash: 'sh' }[artifact.lang] || 'txt'
    const blob = new Blob([artifact.content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cybercli-artifact-${artifact.id}.${ext}`
    a.click()
  }

  const run = () => {
    if (!['javascript', 'js'].includes(artifact.lang.toLowerCase())) return
    setRunning(true)
    setOutput(null)
    const logs = []
    const origLog = console.log
    console.log = (...args) => logs.push(args.map(String).join(' '))
    try {
      // eslint-disable-next-line no-new-func
      new Function(artifact.content)()
      setOutput({ success: true, result: logs.join('\n') || '(no output)' })
    } catch (e) {
      setOutput({ success: false, result: e.message })
    }
    console.log = origLog
    setRunning(false)
  }

  const langColors = {
    javascript: '#F7DF1E', typescript: '#3178C6', python: '#3776AB',
    html: '#E34F26', css: '#1572B6', json: '#292929', bash: '#4EAA25',
    rust: '#CE422B', go: '#00ADD8', java: '#ED8B00',
  }
  const langColor = langColors[artifact.lang?.toLowerCase()] || '#888'

  // Truncate preview
  const preview = artifact.content.slice(0, 300) + (artifact.content.length > 300 ? '\n...' : '')

  return (
    <motion.div
      className="rounded-2xl border border-white/[0.07] overflow-hidden group"
      style={{ background: 'rgba(255,255,255,0.025)' }}
      whileHover={{ borderColor: 'rgba(255,255,255,0.12)', y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]" style={{ background: `${langColor}10` }}>
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5" style={{ color: langColor }} />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: langColor }}>{artifact.lang}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {['javascript', 'js'].includes(artifact.lang?.toLowerCase()) && (
            <button onClick={run} title="Run" className="p-1 rounded-md hover:bg-white/10 transition-colors text-green-400">
              <Play className="w-3 h-3" />
            </button>
          )}
          <button onClick={copy} title="Copy" className="p-1 rounded-md hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <button onClick={download} title="Download" className="p-1 rounded-md hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Code preview */}
      <div className="p-3 overflow-hidden">
        <pre className="text-[10px] text-gray-400 leading-relaxed font-mono overflow-hidden" style={{ maxHeight: 100 }}>
          {preview}
        </pre>
      </div>

      {/* Run output */}
      {output && (
        <div
          className="mx-3 mb-3 p-2 rounded-lg text-[10px] font-mono leading-relaxed"
          style={{
            background: output.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            color: output.success ? '#6EE7B7' : '#FCA5A5',
            border: `1px solid ${output.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}
        >
          {output.result}
        </div>
      )}
    </motion.div>
  )
}

// ── Image Card ────────────────────────────────────────────────────────────────
function ImageCard({ artifact }) {
  const [loaded, setLoaded] = useState(false)

  const download = async () => {
    const res = await fetch(artifact.url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cybercli-image-${artifact.id}.png`
    a.click()
  }

  return (
    <motion.div
      className="rounded-2xl border border-white/[0.07] overflow-hidden group relative"
      style={{ background: 'rgba(255,255,255,0.025)' }}
      whileHover={{ borderColor: 'rgba(255,255,255,0.12)', y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <img
        src={artifact.url}
        alt={artifact.alt}
        onLoad={() => setLoaded(true)}
        className={`w-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ maxHeight: 160 }}
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={artifact.url} target="_blank" rel="noopener noreferrer"
          className="p-1.5 rounded-lg bg-black/60 text-white/70 hover:text-white transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
        <button onClick={download} className="p-1.5 rounded-lg bg-black/60 text-white/70 hover:text-white transition-colors">
          <Download className="w-3 h-3" />
        </button>
      </div>
      <div className="px-3 py-2 border-t border-white/[0.06]">
        <p className="text-[11px] text-gray-400 truncate">{artifact.label}</p>
      </div>
    </motion.div>
  )
}

// ── Main Artifacts Gallery ────────────────────────────────────────────────────
export default function ArtifactsGallery({ messages = [], onClose }) {
  const [filter, setFilter] = useState('all') // all | code | image

  const artifacts = useMemo(() => parseArtifacts(messages), [messages])

  const filtered = artifacts.filter(a => filter === 'all' || a.type === filter)

  const codeCount = artifacts.filter(a => a.type === 'code').length
  const imageCount = artifacts.filter(a => a.type === 'image').length

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full"
      style={{ background: 'rgba(10,10,15,0.95)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div>
          <h2 className="text-sm font-semibold text-white">Artifacts Gallery</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">{artifacts.length} artifacts · {codeCount} code · {imageCount} images</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.05]">
        {[['all', 'All'], ['code', `Code (${codeCount})`], ['image', `Images (${imageCount})`]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === val
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              {filter === 'image'
                ? <ImageIcon className="w-7 h-7 text-gray-600" />
                : <Code2 className="w-7 h-7 text-gray-600" />
              }
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">No artifacts yet</p>
              <p className="text-xs text-gray-600 mt-1">
                {filter === 'all'
                  ? 'Code blocks and generated images will appear here'
                  : filter === 'code'
                    ? 'Ask CyberCli to write code to see it here'
                    : 'Ask CyberCli to generate images to see them here'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence>
              {filtered.map((artifact, i) => (
                <motion.div
                  key={artifact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                >
                  {artifact.type === 'code'
                    ? <CodeCard artifact={artifact} />
                    : <ImageCard artifact={artifact} />
                  }
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}
