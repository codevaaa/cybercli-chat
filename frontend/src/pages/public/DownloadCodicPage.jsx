import { ArrowRight, Check, Code2, Command, FileCode2, GitBranch, Globe2, Layers3, ShieldCheck, Sparkles, Terminal, Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'
import SEOHead from '@components/seo/SEOHead'

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

export default function DownloadCodicPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#191a17] pb-24 pt-28 text-[#f5f4ef]">
      <SEOHead title="Codic — Local coding workspace, coming soon | Codeva" path="/codic" description="Preview Codic, Codeva’s desktop coding workspace for local projects, coding agents, approvals, and code review." />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-10rem] top-20 h-[520px] w-[620px] rounded-full bg-[#C96442]/[0.09] blur-[140px]" />
      <div className="relative mx-auto max-w-[1180px] px-5 sm:px-8">
        <section className="grid items-center gap-12 pb-16 pt-4 lg:grid-cols-[.82fr_1.18fr] lg:gap-14 lg:pb-24">
          <div>
            <Link to="/downloads" className="mb-8 inline-flex items-center gap-2 text-xs text-[#aaa99f] transition-colors hover:text-white">← All downloads</Link>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d99575]/25 bg-[#d99575]/[0.08] px-3 py-1.5 text-[11px] font-medium text-[#e4a083]"><span className="h-1.5 w-1.5 rounded-full bg-[#e4a083]" />Coming soon · Windows, macOS, and Linux</div>
            <h1 className="max-w-[640px] font-serif text-5xl font-normal leading-[1.02] tracking-[-.045em] sm:text-6xl">A coding workspace built around your project.</h1>
            <p className="mt-5 max-w-[560px] text-base leading-7 text-[#aaa9a1]">Codic brings Codeva’s models into a desktop workspace for local repositories, visible agent progress, controlled actions, and reviewable code changes.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d99575] px-4 text-sm font-semibold text-[#1b1714]"><Sparkles size={15} />Codic is in development</span>
              <Link to="/downloads" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.12] px-4 text-sm text-[#e4e3dc] transition-colors hover:bg-white/[0.05]">Explore Codeva <ArrowRight size={15} /></Link>
            </div>
            <p className="mt-4 text-xs text-[#82847c]">No installer is available yet. This preview describes the current app and planned workflows.</p>
          </div>
          <div>
            <ProductPreview />
            <p className="mt-3 text-center text-[10px] uppercase tracking-[.16em] text-[#767970]">Codic interface preview · product details may change</p>
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
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#e2a184]">Codic · Coming soon</p><h2 className="font-serif text-3xl font-normal tracking-[-.03em]">A local-first workspace for your next build.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaa99f]">The preview includes bounded, read-only research, planning, and review helpers. Isolated write-capable agents and the remaining release workflows are still in development.</p></div><Link to="/downloads" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.12] px-4 text-sm text-[#f0eee8] hover:bg-white/[0.05]">See available apps <ArrowRight size={15} /></Link></div>
        </section>
      </div>
    </main>
  )
}
