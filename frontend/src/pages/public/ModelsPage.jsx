import { useEffect, useRef } from 'react'
import { Server, Activity, Zap, Globe, Cpu, Database, Cloud, Flame } from 'lucide-react'
import { MODELS } from '@lib/constants'

const iconMap = {
  openrouter: Zap,
  gemini: Globe,
  groq: Flame,
  cerebras: Cpu,
  cloudflare: Cloud,
  huggingface: Database,
  bytez: Server,
  nvidia: Activity,
}

export default function ModelsPage() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const items = entry.target.querySelectorAll('.model-card')
            items.forEach((item, i) => {
              setTimeout(() => {
                item.style.opacity = '1'
                item.style.transform = 'translateY(0)'
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
    <div className="pt-28 pb-20">
      <div className="section-padding mb-16">
        <div className="container-custom text-center">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Models</span>
          <h1 className="text-h1 mb-5">Every model, <span className="text-gradient-accent">one platform</span></h1>
          <p className="text-body-lg text-foreground-muted max-w-2xl mx-auto">
            Access 200,000+ AI models from 8+ providers. We automatically route to the best free model with intelligent failover.
          </p>
        </div>
      </div>

      <div ref={sectionRef} className="section-padding">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {MODELS.map((model, i) => {
              const Icon = iconMap[model.id] || Server
              return (
                <div
                  key={model.id}
                  className="model-card card p-6 gpu-accelerate"
                  style={{
                    opacity: 0,
                    transform: 'translateY(30px)',
                    transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms`,
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground-primary mb-1">{model.name}</h3>
                  <p className="text-sm text-foreground-muted mb-4">{model.models} models available</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-muted">Latency: {model.latency}</span>
                    <span className="flex items-center gap-1.5 text-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-background-secondary border border-border-subtle">
            <h3 className="text-lg font-semibold text-foreground-primary mb-3">Model Routing Intelligence</h3>
            <p className="text-sm text-foreground-muted leading-relaxed">
              CyberCli&apos;s AI Gateway automatically selects the optimal model for your query type. 
              Coding tasks go to Groq for speed. Reasoning tasks go to Cerebras for depth. 
              Creative tasks go to Gemini for flair. If one provider fails, we instantly failover to the next.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
