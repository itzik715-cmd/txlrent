import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Monitor,
  Laptop,
  Wrench,
  TrendingUp,
  Phone,
  Bell,
  Plus,
  RotateCcw,
  CreditCard,
  Calendar,
} from 'lucide-react'
import api from '../lib/api'
import StatusBadge from '../components/shared/StatusBadge'

const formatCurrency = (n) =>
  (n || 0).toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

const daysRemaining = (d) => {
  if (!d) return 0
  const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-tertiary">טוען נתונים...</p>
      </div>
    )
  }

  const data = summary || {}
  const totalComputers = (data.available || 0) + (data.rented || 0) + (data.maintenance || 0)

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="text-xl font-bold text-text-primary">דשבורד</h1>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Monitor className="w-5 h-5" />}
          iconBg="bg-green-soft"
          iconColor="text-green-status"
          value={data.available || 0}
          label="פנויים להשכרה"
        />
        <KPICard
          icon={<Laptop className="w-5 h-5" />}
          iconBg="bg-accent-soft"
          iconColor="text-accent"
          value={`${data.rented || 0}/${totalComputers}`}
          label="מושכרים כרגע"
        />
        <KPICard
          icon={<Wrench className="w-5 h-5" />}
          iconBg="bg-orange-soft"
          iconColor="text-orange-status"
          value={data.maintenance || 0}
          label="בתיקון / לא זמין"
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-[#F3EAFF]"
          iconColor="text-[#8B5CF6]"
          value={formatCurrency(data.monthlyRevenue)}
          label="הכנסה חודשית"
        />
      </div>

      {/* Row 2: Today's Returns */}
      <div className="bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-bold text-text-primary">החזרות להיום</h2>
        </div>
        <div className="p-5">
          {data.todayReturns && data.todayReturns.length > 0 ? (
            <div className="space-y-3">
              {data.todayReturns.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">{item.clientName}</span>
                    <span className="text-xs text-text-tertiary">{item.computerInternalId || item.computerId}</span>
                    <StatusBadge status={item.status || 'RENTED'} />
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150">
                    <Phone className="w-3 h-3" />
                    התקשר
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-text-tertiary text-sm py-4">אין החזרות להיום</p>
          )}
        </div>
      </div>

      {/* Row 3: Open Debts */}
      <div className="bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-red-status" />
          <h2 className="text-sm font-bold text-text-primary">חובות פתוחים</h2>
        </div>
        <div className="p-5">
          {data.openDebts && data.openDebts.length > 0 ? (
            <div className="space-y-3">
              {data.openDebts.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-text-primary">{item.clientName}</span>
                    <span className="text-sm font-bold text-red-status">{formatCurrency(item.amount)}</span>
                    <span className="text-xs text-text-tertiary">{item.daysOverdue} ימים</span>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150">
                    <Bell className="w-3 h-3" />
                    שלח תזכורת
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-text-tertiary text-sm py-4">אין חובות פתוחים</p>
          )}
        </div>
      </div>

      {/* Row 4: Week Returns */}
      <div className="bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-text-primary">החזרות השבוע</h2>
        </div>
        <div className="p-5">
          {data.weekReturns && data.weekReturns.length > 0 ? (
            <div className="space-y-3">
              {data.weekReturns.map((item, i) => {
                const days = daysRemaining(item.expectedReturn)
                let daysBg = 'bg-accent-soft'
                let daysColor = 'text-accent'
                if (days <= 1) {
                  daysBg = 'bg-red-soft'
                  daysColor = 'text-red-status'
                } else if (days <= 3) {
                  daysBg = 'bg-orange-soft'
                  daysColor = 'text-orange-status'
                }
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded">
                        {item.computerInternalId || item.computerId}
                      </span>
                      <span className="text-sm text-text-primary">{item.clientName}</span>
                      <span className="text-xs text-text-tertiary">{formatDate(item.expectedReturn)}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${daysBg} ${daysColor}`}>
                      {days <= 0 ? 'היום' : `עוד ${days} ימים`}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-text-tertiary text-sm py-4">אין החזרות השבוע</p>
          )}
        </div>
      </div>

      {/* Row 5: Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction icon={<Plus className="w-4 h-4" />} label="השכרה חדשה" onClick={() => navigate('/rentals')} />
        <QuickAction icon={<Plus className="w-4 h-4" />} label="לקוח חדש" onClick={() => navigate('/clients')} />
        <QuickAction icon={<RotateCcw className="w-4 h-4" />} label="קבל החזרה" onClick={() => navigate('/rentals')} />
        <QuickAction icon={<CreditCard className="w-4 h-4" />} label="רשום תשלום" onClick={() => navigate('/billing')} />
      </div>
    </div>
  )
}

function KPICard({ icon, iconBg, iconColor, value, label }) {
  return (
    <div className="bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${iconBg} rounded-md flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-secondary mt-1">{label}</div>
    </div>
  )
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150 p-4 text-sm font-semibold text-text-primary hover:text-accent hover:border-accent"
    >
      {icon}
      {label}
    </button>
  )
}
