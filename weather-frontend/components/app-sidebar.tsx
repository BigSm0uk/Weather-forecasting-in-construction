"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, Activity, GitBranch, CalendarRange } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Главная', href: '/', icon: Home },
  { name: 'Дашборд данных', href: '/data-dashboard', icon: Activity },
  { name: 'Дашборд рисков', href: '/risk-dashboard', icon: ClipboardList },
  { name: 'Анализ графика работ', href: '/schedule-analyzer', icon: CalendarRange },
  { name: 'Справочник', href: '/references', icon: GitBranch },
  { name: 'Модели', href: '/models', icon: GitBranch },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex w-64 flex-col border-r bg-background/50 backdrop-blur-md h-screen sticky top-0">
      <div className="flex h-16 shrink-0 items-center px-6 font-bold text-xl tracking-tight text-primary">
        StroyPredict AI
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              {item.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
