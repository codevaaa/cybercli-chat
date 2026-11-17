import { AlertCircle, Apple, ArrowRight, Check, CheckCircle2, Code2, Command, Download, FileCode2, GitBranch, Globe2, Layers3, LoaderCircle, MonitorDown, RefreshCw, ShieldCheck, Sparkles, Terminal, Workflow } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SEOHead from '@components/seo/SEOHead'
import { API_BASE } from '@lib/api'

const features = [
  { icon: FileCode2, title: 'Work in your project', status: 'In preview', copy: 'Open a local folder, ask questions about its files, and review project-scoped edits.' },
  { icon: ShieldCheck, title: 'Review before changes land', status: 'In preview', copy: 'See proposed workspace changes and approve actions before the local agent runs them.' },
  { icon: Terminal, title: 'Run project commands', status: 'In preview', copy: 'Run commands in the selected project folder with an isolated environment and visible output.' },
  { icon: Layers3, title: 'Coordinate sub-agents', status: 'Preview', copy: 'Delegate bounded research, planning, and code review to parallel read-only helpers that inherit your selected model.' },
  { icon: GitBranch, title: 'Worktree isolation', status: 'In development', copy: 'Give parallel coding tasks their own branches and directories, with clear ownership of every change.' },
  { icon: Globe2, title: 'Browse alongside code', status: 'In preview', copy: 'Open a secure browser window while you research a project. Deeper browser-agent workflows are in development.' },
]

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#111210] shadow-[0_32px_100px_rgba(0,0,0,.45)]" aria-label="Codic desktop interface preview">
      <div className="flex h-11 items-center gap-2 border-b border-white/[0.07] px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ed786c]" /><span className="h-2.5 w-2.5 rounded-full bg-[#e3ba64]" /><span className="h-2.5 w-2.5 rounded-full bg-[#72b786]" />
        <span className="ml-3 text-[11px] text-[#9b9d95]">Codic <span className="ml-2 text-[#666961]">Local coding workspace</span></span>
      </div>
      <div className="grid min-h-[390px] grid-cols-[54px_minmax(0,1fr)] md:grid-cols-[58px_210px_minmax(0,1fr)] xl:grid-cols-[58px_220px_minmax(0,1fr)_230px]">
        <div className="flex flex-col items-center gap-4 border-r border-white/[0.06] py-5 text-[#888b81]">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#282923] text-[#e49577]"><Code2 size={17} /></div>
          <Command size={17} /><GitBranch size={17} /><Terminal size={17} />
        </div>
        <aside className="hidden border-r border-white/[0.06] p-4 md:block">
          <div className="mb-6 flex items-center justify-between text-xs font-semibold text-[#e8e8e2]">Projects <span className="text-[#8d9087]">+</span></div>
          <div className="rounded-lg bg-white/[0.06] px-2.5 py-2 text-xs text-[#f0a184]">⌂ &nbsp; gptulternative</div>
          <p className="mb-2 mt-6 text-[9px] font-semibold uppercase tracking-[.18em] text-[#676a63]">Recent tasks</p>
          <div className="space-y-1.5 text-[11px] text-[#a8aaa2]"><div className="rounded-md px-2.5 py-2 text-[#e6e6df]">Refresh project settings</div><div className="truncate px-2.5 py-2">Review authentication flow</div><div className="truncate px-2.5 py-2">Add responsive navigation</div></div>
          <div className="mt-7 rounded-lg border border-white/[0.07] p-3"><p className="text-[10px] font-semibold text-[#ededeb]">Codeva account</p><p className="mt-1 text-[9px] text-[#85887f]">Connected · Free plan</p></div>
        </aside>
        <main className="flex min-w-0 flex-col p-4 md:p-5">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3"><div className="text-[10px] text-[#9a9c94]">gptulternative <span className="mx-1 text-[#4f514b]">/</span><strong className="font-medium text-[#ededeb]">Assistant</strong></div><span className="rounded-md border border-white/[0.09] px-2 py-1 text-[9px] text-[#a8aaa2]">Workspace ▾</span></div>
          <div className="mx-auto mt-8 w-full max-w-[580px] flex-1">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#82857b]"><Sparkles size={12} className="text-[#e29577]" />Agent activity</div>
            <div className="rounded-xl border border-white/[0.07] bg-[#181916] p-4">
              <p className="text-xs leading-5 text-[#e8e9e3]">I found the authentication callback and traced the desktop handoff. I’m checking the redirect validation before suggesting a change.</p>
              <div className="mt-4 space-y-2.5 text-[10px] text-[#a8aaa0]">
                <div className="flex items-center gap-2"><Check size={12} className="text-[#82b892]" /> Read auth callback route</div>
                <div className="flex items-center gap-2"><Check size={12} className="text-[#82b892]" /> Inspect Codic session flow</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-[#e39b7c]" /> Review redirect handling</div>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-[#d89576]/20 bg-[#d89576]/[0.06] p-3">
              <div className="flex items-center gap-2 text-[10px] font-medium text-[#e7b099]"><ShieldCheck size={13} /> Approval required</div>
              <p className="mt-1 text-[10px] text-[#b4b4ac]">Allow this command to run in the selected project?</p>
              <div className="mt-2 rounded-md bg-black/20 px-2 py-1.5 font-mono text-[9px] text-[#d5d4ca]">npm run build</div>
              <div className="mt-2 flex justify-end gap-2"><span className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-[#aaa99f]">Deny</span><span className="rounded-md bg-[#d99575] px-2 py-1 text-[9px] font-medium text-[#181613]">Approve</span></div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-white/[0.09] bg-[#1b1c19] p-3 text-[10px] text-[#74776e]">Ask Codic to explain, plan, or change something…</div>
        </main>
        <aside className="hidden border-l border-white/[0.06] p-4 xl:block">
          <div className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#74776e]">Project review</div>
          <div className="mt-4 flex gap-3 text-[10px] text-[#a8aaa1]"><span className="text-[#82b892]">+12</span><span className="text-[#de8b7c]">−3</span><span>Changes</span></div>
          <div className="mt-4 space-y-2 text-[10px] text-[#b7b8b0]"><div className="rounded-md bg-white/[0.04] p-2">M &nbsp; src/auth/callback.tsx</div><div className="rounded-md bg-white/[0.04] p-2">A &nbsp; src/auth/handoff.ts</div></div>
          <div className="mt-6 border-t border-white/[0.06] pt-4"><div className="flex items-center gap-2 text-[10px] font-semibold text-[#d7d8d1]"><Workflow size={12} /> Run activity</div><p className="mt-2 text-[9px] leading-4 text-[#85877f]">Every tool action stays visible in the task timeline.</p></div>
        </aside>
      </div>
    </div>
  )
}

const downloadPlatforms = [
  { id: 'windows', label: 'Windows', detail: 'Windows · x64', icon: MonitorDown },
  { id: 'macos', label: 'macOS', detail: 'macOS · universal', icon: Apple },
  { id: 'linux', label: 'Linux', detail: 'Linux · x64', icon: Terminal },
]

function safeDownloadUrl(platform, artifact) {
  if (!artifact || artifact.available !== true || typeof artifact.url !== 'string') return null
  try {
    const apiBase = API_BASE.replace(/\/+$/, '')
    const expected = new URL(`${apiBase}/downloads/codic/${platform}`)
    const supplied = new URL(artifact.url, apiBase)
    if (supplied.origin !== expected.origin || supplied.pathname !== expected.pathname || supplied.search || supplied.hash) return null
    return supplied.href
  } catch {
    return null
  }
}

function formatArtifactSize(size) {
  if (!Number.isSafeInteger(size) || size <= 0) return null
  return `${(size / 1_048_576).toFixed(1)} MB`
}

function safeArtifactLabel(value, maxLength) {
  if (typeof value !== 'string') return null
  const label = value.trim()
  if (!label || label.length > maxLength || /[\u0000-\u001f\u007f]/.test(label)) return null
  return label
}

function PlatformDownloadCard({ platform, catalogState, artifact }) {
  const Icon = platform.icon
  const url = safeDownloadUrl(platform.id, artifact)
  const available = Boolean(url)
  const listedWithoutUrl = catalogState === 'ready' && artifact?.available === true && !url
  const loading = catalogState === 'loading'
  const failed = catalogState === 'error'
  const version = safeArtifactLabel(artifact?.version, 48)
  const architecture = safeArtifactLabel(artifact?.arch, 64)
  const status = loading
    ? 'Checking release catalog'
    : failed
      ? 'Availability not checked'
      : available
        ? 'Published preview'
        : listedWithoutUrl
          ? 'Download link unavailable'
          : 'Coming soon'

  return (
    <article className={`group relative flex min-h-[242px] flex-col overflow-hidden rounded-2xl border p-5 transition-colors sm:p-6 ${available ? 'border-[#d99575]/35 bg-[#241f1b]' : 'border-white/[0.09] bg-[#1d1e1b]'}`}>
      <div aria-hidden="true" className={`pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full blur-3xl transition-opacity ${available ? 'bg-[#d99575]/[0.12] opacity-100' : 'bg-white/[0.025] opacity-60'}`} />
      <div className="relative flex items-start justify-between gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${available ? 'border-[#d99575]/25 bg-[#d99575]/[0.1] text-[#e5a184]' : 'border-white/[0.08] bg-white/[0.035] text-[#a9aa9f]'}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
        <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-medium tracking-[.02em] ${available ? 'border-[#90c4a0]/20 bg-[#90c4a0]/[0.08] text-[#a8d5b4]' : 'border-white/[0.09] bg-white/[0.025] text-[#a0a197]'}`}>
          {loading ? <LoaderCircle size={12} className="animate-spin" aria-hidden="true" /> : available ? <CheckCircle2 size={12} aria-hidden="true" /> : failed || listedWithoutUrl ? <AlertCircle size={12} aria-hidden="true" /> : null}
          {status}
        </span>
      </div>
      <div className="relative mt-5">
        <h3 className="text-lg font-semibold tracking-[-.02em] text-[#f2f0e9]">{platform.label}</h3>
        <p className="mt-1 text-xs text-[#8e9087]">{platform.detail}</p>
        {available ? (
          <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-[11px] leading-5 text-[#a9aaa0]">
            {version && <span>Version {version}</span>}
            {architecture && <span>{architecture}</span>}
            {formatArtifactSize(artifact.size) && <span>{formatArtifactSize(artifact.size)}</span>}
            {artifact.signed === true ? <span>Signed installer</span> : artifact.signed === false ? <span>Unsigned preview installer</span> : null}
          </p>
        ) : (
          <p className="mt-3 max-w-[34ch] text-xs leading-5 text-[#92948a]">
            {loading ? 'Reading current published release information…' : failed ? 'We couldn’t reach the release catalog. Downloads stay disabled until availability can be verified.' : listedWithoutUrl ? 'The catalog lists a release but did not provide its expected Codic download path.' : `A ${platform.label} installer will appear here after it is published.`}
          </p>
        )}
      </div>
      <div className="relative mt-auto pt-5">
        {available ? (
          <a href={url} download className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d99575] px-4 text-sm font-semibold text-[#201814] transition-colors hover:bg-[#e5a184] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c1a7]">
            <Download size={15} aria-hidden="true" />Download for {platform.label}<ArrowRight size={14} aria-hidden="true" />
          </a>
        ) : (
          <button type="button" disabled className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-medium text-[#777a71]">
            {failed ? 'Availability unavailable' : 'Not available yet'}
          </button>
        )}
      </div>
    </article>
  )
}

export default function DownloadCodicPage() {
  const [catalog, setCatalog] = useState(null)
  const [catalogState, setCatalogState] = useState('loading')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setCatalog(null)
    setCatalogState('loading')
    fetch(`${API_BASE}/downloads/codic`, { signal: controller.signal, credentials: 'omit', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('The Codic release catalog is unavailable.')
        const value = await response.json()
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The Codic release catalog response is invalid.')
        setCatalog(value)
        setCatalogState('ready')
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setCatalog(null)
        setCatalogState('error')
      })
    return () => controller.abort()
  }, [refreshKey])

  const listedCount = downloadPlatforms.filter(({ id }) => catalog?.[id]?.available === true).length
  const availableCount = downloadPlatforms.filter(({ id }) => Boolean(safeDownloadUrl(id, catalog?.[id]))).length
  const catalogSummary = catalogState === 'loading'
    ? 'Checking the live release catalog…'
    : catalogState === 'error'
      ? 'Release availability could not be checked.'
      : listedCount > availableCount
        ? 'A catalog entry needs a valid Codic download link before it can be offered.'
        : availableCount > 0
        ? `${availableCount} platform${availableCount === 1 ? '' : 's'} currently ${availableCount === 1 ? 'has' : 'have'} a published installer.`
        : 'No Codic installers are currently published.'

  return (
    <main className="min-h-screen overflow-hidden bg-[#191a17] pb-24 pt-28 text-[#f5f4ef]">
      <SEOHead title="Codic desktop downloads for Windows, macOS, and Linux | Codeva" path="/codic" description="Check published Codic desktop installers for Windows, macOS, and Linux against the live release catalog." />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-10rem] top-20 h-[520px] w-[620px] rounded-full bg-[#C96442]/[0.09] blur-[140px]" />
      <div className="relative mx-auto max-w-[1180px] px-5 sm:px-8">
        <section className="grid items-center gap-12 pb-16 pt-4 lg:grid-cols-[.82fr_1.18fr] lg:gap-14 lg:pb-24">
          <div>
            <Link to="/downloads" className="mb-8 inline-flex items-center gap-2 text-xs text-[#aaa99f] transition-colors hover:text-white">← All downloads</Link>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d99575]/25 bg-[#d99575]/[0.08] px-3 py-1.5 text-[11px] font-medium text-[#e4a083]"><span className="h-1.5 w-1.5 rounded-full bg-[#e4a083]" />Codic desktop · availability by platform</div>
            <h1 className="max-w-[640px] font-serif text-5xl font-normal leading-[1.02] tracking-[-.045em] sm:text-6xl">A coding workspace built around your project.</h1>
            <p className="mt-5 max-w-[560px] text-base leading-7 text-[#aaa9a1]">Codic brings Codeva’s models into a desktop workspace for local repositories, visible agent progress, controlled actions, and reviewable code changes.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#codic-downloads" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d99575] px-4 text-sm font-semibold text-[#1b1714] transition-colors hover:bg-[#e5a184] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c1a7]"><Download size={15} />Check downloads<ArrowRight size={14} /></a>
              <Link to="/downloads" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.12] px-4 text-sm text-[#e4e3dc] transition-colors hover:bg-white/[0.05]">Explore Codeva <ArrowRight size={15} /></Link>
            </div>
            <p className="mt-4 max-w-[55ch] text-xs leading-5 text-[#82847c]">Installer availability is checked from the release catalog below. Each platform is shown only when its artifact has been published.</p>
          </div>
          <div>
            <ProductPreview />
            <p className="mt-3 text-center text-[10px] uppercase tracking-[.16em] text-[#767970]">Codic interface preview · product details may change</p>
          </div>
        </section>

        <section id="codic-downloads" className="scroll-mt-28 border-t border-white/[0.08] py-12 sm:py-16" aria-labelledby="codic-download-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#d99575]">Choose your platform</p>
              <h2 id="codic-download-title" className="font-serif text-3xl font-normal tracking-[-.03em] sm:text-4xl">Codic downloads</h2>
              <p className="mt-2 text-sm leading-6 text-[#a5a69e]">Published installers only. Unreleased platforms stay disabled until their downloads are ready.</p>
            </div>
            <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={catalogState === 'loading'} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-white/[0.11] bg-white/[0.025] px-3 text-xs font-medium text-[#d3d3ca] transition-colors hover:bg-white/[0.07] disabled:cursor-wait disabled:opacity-60 sm:self-auto" aria-label="Refresh Codic release availability">
              <RefreshCw size={13} className={catalogState === 'loading' ? 'animate-spin' : ''} aria-hidden="true" />Refresh status
            </button>
          </div>
          <p className="mt-5 flex min-h-5 items-center gap-2 text-xs text-[#92948a]" role="status" aria-live="polite">
            {catalogState === 'error' ? <AlertCircle size={14} className="text-[#d99575]" aria-hidden="true" /> : catalogState === 'ready' && availableCount > 0 ? <CheckCircle2 size={14} className="text-[#a8d5b4]" aria-hidden="true" /> : null}
            {catalogSummary}
          </p>
          {catalogState === 'error' && <p className="mt-1 text-xs text-[#d0a18a]" role="alert">Downloads are disabled until the catalog responds.</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            {downloadPlatforms.map((platform) => <PlatformDownloadCard key={platform.id} platform={platform} catalogState={catalogState} artifact={catalog?.[platform.id]} />)}
          </div>
        </section>

        <section className="border-t border-white/[0.08] py-16 sm:py-20">
          <div className="max-w-2xl"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#d99575]">Built for the whole coding loop</p><h2 className="font-serif text-3xl font-normal tracking-[-.03em] sm:text-4xl">Understand a codebase. Make a change. See what happened.</h2><p className="mt-4 text-sm leading-6 text-[#a5a69e]">Codic keeps the work in view, from the first prompt through local execution and review. Your repository remains on your computer; only the context needed for a model request is sent to Codeva.</p></div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {features.map(({ icon: Icon, title, status, copy }) => <article key={title} className="rounded-2xl border border-white/[0.08] bg-[#20211e] p-5"><div className="mb-4 flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d99575]/[0.1] text-[#e3a081]"><Icon size={17} /></span><span className="rounded-full border border-white/[0.09] px-2 py-1 text-[9px] text-[#999b92]">{status}</span></div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-[#9c9e95]">{copy}</p></article>)}
          </div>
        </section>

        <section className="grid gap-8 border-t border-white/[0.08] py-16 sm:grid-cols-2 sm:py-20">
          <div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#d99575]">Private by default</p><h2 className="font-serif text-3xl font-normal tracking-[-.03em]">Your project stays on your machine.</h2><p className="mt-4 text-sm leading-6 text-[#a5a69e]">Codic runs project tools locally and scopes them to the folder you open. Commands and sensitive actions can ask for approval, and every proposed edit can be reviewed before you keep it.</p></div>
          <div className="grid content-start gap-3">
            <div className="flex gap-3 rounded-xl border border-white/[0.08] bg-[#20211e] p-4"><ShieldCheck className="mt-0.5 shrink-0 text-[#d99575]" size={17} /><div><h3 className="text-xs font-semibold">Clear permissions</h3><p className="mt-1 text-xs leading-5 text-[#9c9e95]">Review shell, network, and file actions within an explicit project boundary.</p></div></div>
            <div className="flex gap-3 rounded-xl border border-white/[0.08] bg-[#20211e] p-4"><GitBranch className="mt-0.5 shrink-0 text-[#d99575]" size={17} /><div><h3 className="text-xs font-semibold">Reviewable changes</h3><p className="mt-1 text-xs leading-5 text-[#9c9e95]">Inspect diffs and restore a local checkpoint when you want to roll a task back.</p></div></div>
            <div className="flex gap-3 rounded-xl border border-white/[0.08] bg-[#20211e] p-4"><Layers3 className="mt-0.5 shrink-0 text-[#d99575]" size={17} /><div><h3 className="text-xs font-semibold">A shared Codeva account</h3><p className="mt-1 text-xs leading-5 text-[#9c9e95]">Sign in through the Codeva website to use your account and available models.</p></div></div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#d99575]/20 bg-gradient-to-br from-[#d99575]/[0.11] to-[#20211e] p-6 sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#e2a184]">Codic desktop</p><h2 className="font-serif text-3xl font-normal tracking-[-.03em]">A local-first workspace for your next build.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaa99f]">The preview includes bounded, read-only research, planning, and review helpers. Isolated write-capable agents and remaining release workflows are still in development.</p></div><a href="#codic-downloads" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.12] px-4 text-sm text-[#f0eee8] transition-colors hover:bg-white/[0.05]">Check platform availability <ArrowRight size={15} /></a></div>
        </section>
      </div>
    </main>
  )
}
