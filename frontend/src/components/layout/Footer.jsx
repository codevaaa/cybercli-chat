import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { FOOTER_SECTIONS } from '@lib/constants'

const SOCIAL_LINKS = [
  { label: 'Twitter', href: 'https://twitter.com/cybercli' },
  { label: 'GitHub', href: 'https://github.com/cybercli' },
  { label: 'Discord', href: 'https://discord.gg/cybercli' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/cybercli' },
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0f0f12] border-t border-white/[0.04]">
      {/* Main footer content */}
      <div className="section-padding pt-16 pb-8 lg:pt-24 lg:pb-12">
        <div className="container-custom">
          {/* Top row: Contact + Social */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12 lg:gap-20 mb-20">
            {/* Contact */}
            <div>
              <h3 className="text-3xl sm:text-4xl font-light text-foreground-primary mb-4 tracking-tight">
                Contacts
              </h3>
              <a
                href="mailto:hello@cybercli.chat"
                className="group inline-flex items-center gap-2 text-foreground-muted hover:text-accent transition-colors text-lg"
              >
                <span className="relative">
                  hello@cybercli.chat
                  <span className="absolute bottom-0 left-0 w-0 h-px bg-accent group-hover:w-full transition-all duration-300" />
                </span>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>

            {/* Copyright + Social */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 sm:gap-16">
              <div className="text-right">
                <p className="text-sm text-foreground-muted">
                  &copy; {new Date().getFullYear()} CyberCli
                </p>
              </div>

              <div className="flex items-center gap-6">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground-primary transition-colors"
                  >
                    {social.label}
                    <ArrowUpRight className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-4">
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="group inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground-primary transition-colors"
                      >
                        {link.label}
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Giant watermark */}
      <div className="relative overflow-hidden pb-4">
        <div className="container-custom">
          <div className="relative">
            <span
              className="block text-[12vw] sm:text-[10vw] lg:text-[8vw] font-black tracking-tighter leading-none text-white/[0.03] select-none whitespace-nowrap"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              CYBERCLI
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
