import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Terminal, Monitor, Chrome, Smartphone, Briefcase, ArrowUpRight, Download } from 'lucide-react'

/*
 * "Codeva, everywhere you work" — landing section mirroring Claude's product grid.
 * Links the real new pages (Product/CyberCoder, Downloads, Upgrade) so the
 * surface is well-connected. Warm Claude palette.
 */

const CARDS = [
  {
    title: 'CyberCoder CLI',
    desc: 'Build, debug, and ship from your terminal or IDE with 8+ AI providers.',
    icon: Terminal,
    to: '/product',
    cta: 'Explore CLI',
    span: 'md:col-span-2',
  },
  {
    title: 'Desktop app',
    desc: 'Chat, Cowork, and code in one app — works with your files and apps.',
    icon: Monitor,
    to: '/downloads',
    cta: 'Download',
  },
  {
    title: 'Cowork',
    desc: 'Delegate autonomous tasks that run in the background while you keep working.',
    icon: Briefcase,
    to: '/chat',
    cta: 'Open Cowork',
  },
  {
    title: 'Browser & mobile',
    desc: 'Use Codeva on the web, Chrome, iOS, and Android — your account syncs everywhere.',
    icon: Chrome,
    to: '/downloads',
    cta: 'Get the apps',
    span: 'md:col-span-2',
  },
]

export default function EverywhereSection() {
  return (
    <section className="bg-[#1a1a18] py-24 px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-2/3 h-[360px] blur-[140px] rounded-bl-full pointer-events-none" style={{ backgroundColor: 'rgba(201,100,66,0.06)' }} />
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-serif font-normal text-[#f5f4ef] mb-3" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Codeva, everywhere you work
          </h2>
          <p className="text-[#a0a0a0] max-w-xl mx-auto">
            One account across terminal, desktop, browser, and mobile. Start a task anywhere and pick it up anywhere.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {CARDS.map((c, i) => {
            const Icon = c.icon
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className={c.span || ''}
              >
                <Link
                  to={c.to}
                  className="group block h-full p-6 rounded-2xl border border-white/[0.06] bg-[#211f1c] hover:bg-[#262521] transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(201,100,66,0.15)' }}>
                      <Icon className="w-5 h-5 text-[#C96442]" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#707070] group-hover:text-[#f5f4ef] transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#f5f4ef] mb-1.5">{c.title}</h3>
                  <p className="text-sm text-[#a0a0a0] leading-relaxed mb-4">{c.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C96442]">
                    {c.title === 'Desktop app' && <Download className="w-3.5 h-3.5" />}
                    {c.cta}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
