import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Laptop, Users, FileText, CreditCard, Settings } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'

const navItems = [
  { to: '/', label: 'דשבורד', icon: LayoutDashboard },
  { to: '/computers', label: 'מחשבים', icon: Laptop },
  { to: '/clients', label: 'לקוחות', icon: Users },
  { to: '/rentals', label: 'השכרות', icon: FileText },
  // { to: '/billing', label: 'חיובים', icon: CreditCard },
  { to: '/settings', label: 'הגדרות', icon: Settings },
]

export default function Sidebar() {
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
    refetchInterval: 60000,
  })

  const total = summary ? (summary.available || 0) + (summary.rented || 0) + (summary.maintenance || 0) : 0
  const rented = summary?.rented || 0
  const utilization = total > 0 ? Math.round((rented / total) * 100) : 0

  return (
    <aside className="w-[220px] min-h-[calc(100vh-56px)] bg-surface border-l border-border sticky top-[56px] flex flex-col">
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent-soft text-accent font-bold border-r-[3px] border-accent'
                  : 'text-text-secondary hover:bg-bg hover:text-text-primary'
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Fleet Utilization Widget */}
      <div className="p-4 mx-3 mb-4 bg-bg rounded-md">
        <div className="text-xs font-semibold text-text-secondary mb-2">ניצולת צי</div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-bold text-text-primary">{utilization}%</span>
          <span className="text-xs text-text-tertiary">מושכרים</span>
        </div>
        <div className="w-full h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${utilization}%` }}
          />
        </div>
        <div className="text-xs text-text-tertiary mt-1.5">
          {rented} מתוך {total} מחשבים
        </div>
      </div>
    </aside>
  )
}
