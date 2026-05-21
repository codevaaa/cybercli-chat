import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { FOOTER_SECTIONS } from '@lib/constants'
import { CyberCliWordmark } from '@components/ui/CyberCliLogo'

const SOCIAL_LINKS = [
  { label: 'Twitter', href: 'https://twitter.com/cybercli' },
  { label: 'GitHub', href: 'https://github.com/cybercli' },
  { label: 'Discord', href: 'https://discord.gg/cybercli' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/cybercli' },
]

export default function Footer() {
  return (
    <footer className="bg-background-secondary text-foreground-primary relative overflow-hidden border-t border-border-subtle">
      {/* Main footer content */}
      <div className="section-padding pt-16 pb-8 lg:pt-24 lg:pb-12 relative z-10">
        <div className="container-custom">
          {/* Top row: Brand + Contact + Social */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12 lg:gap-20 mb-16">
            {/* Brand Logo & Contact */}
            <div>
              <div className="mb-6">
                <CyberCliWordmark size={28} />
              </div>
              <h3 className="text-xl font-light text-foreground-primary mb-2 tracking-tight">
                Get in touch
              </h3>
              <a
                href="mailto:hello@cybercli.chat"
                className="group inline-flex items-center gap-2 text-foreground-muted hover:text-accent transition-colors text-base"
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
              <div className="text-right sm:text-left">
                <p className="text-sm text-foreground-muted">
                  &copy; {new Date().getFullYear()} CyberCli. All rights reserved.
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-4">
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
    </footer>
  )
}
