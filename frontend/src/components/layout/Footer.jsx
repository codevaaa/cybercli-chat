import { Link } from 'react-router-dom'
import { Zap, ArrowUpRight } from 'lucide-react'
import { FOOTER_SECTIONS, SOCIAL_LINKS } from '@lib/constants'

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-background-secondary">
      <div className="section-padding py-16 lg:py-20">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 lg:gap-8">
            <div className="col-span-2 md:col-span-3 lg:col-span-2">
              <Link to="/" className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">
                  Cyber<span className="text-accent">Cli</span>
                </span>
              </Link>
              <p className="text-foreground-muted text-sm leading-relaxed max-w-xs mb-6">
                The most powerful AI chat platform. Multi-model, uncensored, voice-enabled, and entirely yours.
              </p>
              <div className="flex items-center gap-3">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-background-tertiary border border-border-subtle flex items-center justify-center text-foreground-muted hover:text-foreground-primary hover:border-border-medium transition-all"
                    aria-label={social.label}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-semibold text-foreground-primary mb-4">
                  {section.title}
                </h4>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-sm text-foreground-muted hover:text-foreground-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-foreground-muted">
              &copy; {new Date().getFullYear()} CyberCli. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy-policy" className="text-sm text-foreground-muted hover:text-foreground-primary transition-colors">
                Privacy
              </Link>
              <Link to="/terms-of-service" className="text-sm text-foreground-muted hover:text-foreground-primary transition-colors">
                Terms
              </Link>
              <Link to="/cookie-policy" className="text-sm text-foreground-muted hover:text-foreground-primary transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
