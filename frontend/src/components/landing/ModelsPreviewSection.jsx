import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Activity, Server } from 'lucide-react'
import { MODELS } from '@lib/constants'

export default function ModelsPreviewSection() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const items = entry.target.querySelectorAll('.model-item')
            items.forEach((item, i) => {
              setTimeout(() => {
                item.style.opacity = '1'
                item.style.transform = 'translateX(0)'
              }, i * 80)
            })
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="section-padding py-24 lg:py-32 border-y border-border-subtle">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">
              Model Aggregation
            </span>
            <h2 className="text-h2 mb-5">
              One platform, <span className="text-gradient-accent">every model</span>
            </h2>
            <p className="text-body-lg text-foreground-muted mb-8 leading-relaxed">
              No more switching between ChatGPT, Claude, Gemini, and Perplexity. 
              CyberCli connects to 8+ providers and automatically routes your query 
              to the best available free model with intelligent failover.
            </p>
            <Link
              to="/models"
              className="btn-primary inline-flex"
            >
              View All Models
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {MODELS.map((model, i) => (
              <div
                key={model.id}
                className="model-item flex items-center justify-between p-4 rounded-xl bg-background-secondary border border-border-subtle hover:border-border-medium transition-all gpu-accelerate"
                style={{
                  opacity: 0,
                  transform: 'translateX(30px)',
                  transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms`,
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-background-tertiary flex items-center justify-center">
                    <Server className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground-primary text-sm">
                      {model.name}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      {model.models} models
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                    <Activity className="w-3.5 h-3.5 text-success" />
                    <span>{model.latency}</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
