import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function SubNavbar({ items = [], title, actionNode }) {
  return (
    <div className="sticky top-[72px] z-40 bg-background-primary/80 backdrop-blur-md border-b border-border-subtle py-3">
      <div className="container-custom flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {items.map((item, index) => (
            <div key={item.label} className="flex items-center gap-2">
              <Link 
                to={item.href} 
                className="text-foreground-muted hover:text-foreground-primary transition-colors"
              >
                {item.label}
              </Link>
              {index < items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-border-medium" />
              )}
            </div>
          ))}
          {title && items.length > 0 && (
            <ChevronRight className="w-4 h-4 text-border-medium" />
          )}
          {title && (
            <span className="font-medium text-foreground-primary">{title}</span>
          )}
        </div>
        {actionNode && (
          <div className="flex items-center gap-3">
            {actionNode}
          </div>
        )}
      </div>
    </div>
  )
}
