import { ChevronRight } from 'lucide-react'
import { Link } from 'wouter'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-6" aria-label="Breadcrumb">
      <Link href="/">
        <a className="text-muted-foreground hover:text-foreground transition-colors">Accueil</a>
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          {item.href ? (
            <Link href={item.href}>
              <a className="text-muted-foreground hover:text-foreground transition-colors">
                {item.label}
              </a>
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
