import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Package, Users, DollarSign, Calendar, AlertTriangle, Cpu, Activity, Download, Search, Filter } from 'lucide-react'
import api from '../lib/api'

const tabs = [
  { key: 'inventory', label: 'מלאי מחשבים', icon: Package },
  { key: 'by-client', label: 'מחשבים לפי לקוח', icon: Users },
  { key: 'by-specs', label: 'לפי מפרט', icon: Cpu },
  { key: 'revenue-computer', label: 'הכנסות למחשב', icon: DollarSign },
  { key: 'monthly-revenue', label: 'הכנסות חודשיות', icon: BarChart3 },
  { key: 'debts', label: 'חובות פתוחים', icon: AlertTriangle },
  { key: 'rental-history', label: 'היסטוריית השכרות', icon: Calendar },
  { key: 'utilization', label: 'ניצולת מחשבים', icon: Activity },
]

const statusLabels = {
  AVAILABLE: 'זמין',
  RENTED: 'מושכר',
  MAINTENANCE: 'תחזוקה',
  PENDING_RETURN: 'ממתין להחזרה',
  PENDING_CLEANING: 'ממתין לניקוי',
  LOST: 'אבוד',
  SOLD: 'נמכר',
  ARCHIVED: 'ארכיון',
}

const rentalStatusLabels = {
  ACTIVE: 'פעיל',
  RETURNED: 'הוחזר',
  OVERDUE: 'באיחור',
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('he-IL') : '-'
const formatCurrency = (n) => `${(n || 0).toLocaleString('he-IL')} ₪`

function exportCSV(headers, rows, filename) {
  const bom = '\uFEFF'
  const csv = bom + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState('inventory')

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-text-primary">דוחות</h1>

      <div className="flex flex-wrap gap-1 border-b border-border pb-3">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-sm text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-bg hover:text-text-primary'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'inventory' && <InventoryReport />}
      {activeTab === 'by-client' && <ByClientReport />}
      {activeTab === 'by-specs' && <BySpecsReport />}
      {activeTab === 'revenue-computer' && <RevenuePerComputerReport />}
      {activeTab === 'monthly-revenue' && <MonthlyRevenueReport />}
      {activeTab === 'debts' && <DebtsReport />}
      {activeTab === 'rental-history' && <RentalHistoryReport />}
      {activeTab === 'utilization' && <UtilizationReport />}
    </div>
  )
}

function InventoryReport() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { data = [], isLoading } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => api.get('/reports/inventory').then(r => r.data),
  })

  const filtered = data.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return c.internalId.toLowerCase().includes(s) || c.brand.toLowerCase().includes(s) || c.model.toLowerCase().includes(s) || (c.currentClient || '').toLowerCase().includes(s)
    }
    return true
  })

  const handleExport = () => {
    const headers = ['מזהה', 'מותג', 'דגם', 'סריאלי', 'סטטוס', 'דרגה', 'מחיר חודשי', 'RAM', 'CPU', 'אחסון', 'לקוח נוכחי']
    const rows = filtered.map(c => [c.internalId, c.brand, c.model, c.serial, statusLabels[c.status], c.tier, c.priceMonthly, c.specs?.ram, c.specs?.cpu, c.specs?.storage, c.currentClient])
    exportCSV(headers, rows, 'inventory')
  }

  if (isLoading) return <p className="text-text-tertiary text-sm">טוען...</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." className="w-full pr-9 pl-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent">
          <option value="">כל הסטטוסים</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all">
          <Download className="w-3.5 h-3.5" /> ייצוא CSV
        </button>
        <span className="text-xs text-text-tertiary">{filtered.length} מחשבים</span>
      </div>
      <div className="overflow-x-auto border border-border rounded-sm">
        <table className="w-full text-sm">
          <thead className="bg-bg text-text-secondary text-xs">
            <tr>
              <th className="px-3 py-2 text-right font-semibold">מזהה</th>
              <th className="px-3 py-2 text-right font-semibold">מותג</th>
              <th className="px-3 py-2 text-right font-semibold">דגם</th>
              <th className="px-3 py-2 text-right font-semibold">סטטוס</th>
              <th className="px-3 py-2 text-right font-semibold">דרגה</th>
              <th className="px-3 py-2 text-right font-semibold">מחיר חודשי</th>
              <th className="px-3 py-2 text-right font-semibold">RAM</th>
              <th className="px-3 py-2 text-right font-semibold">CPU</th>
              <th className="px-3 py-2 text-right font-semibold">אחסון</th>
              <th className="px-3 py-2 text-right font-semibold">לקוח נוכחי</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-bg/50">
                <td className="px-3 py-2 font-mono font-semibold">{c.internalId}</td>
                <td className="px-3 py-2">{c.brand}</td>
                <td className="px-3 py-2">{c.model}</td>
                <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                <td className="px-3 py-2">{c.tier || '-'}</td>
                <td className="px-3 py-2">{formatCurrency(c.priceMonthly)}</td>
                <td className="px-3 py-2">{c.specs?.ram || '-'}</td>
                <td className="px-3 py-2">{c.specs?.cpu || '-'}</td>
                <td className="px-3 py-2">{c.specs?.storage || '-'}</td>
                <td className="px-3 py-2">{c.currentClient || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ByClientReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['report-by-client'],
    queryFn: () => api.get('/reports/by-client').then(r => r.data),
  })

  const handleExport = () => {
    const headers = ['לקוח', 'איש קשר', 'טלפון', 'אימייל', 'מחשבים', 'סה"כ חודשי']
    const rows = data.map(cl => [cl.name, cl.contactName, cl.phone, cl.email, cl.computerCount, cl.totalMonthly])
    exportCSV(headers, rows, 'computers-by-client')
  }

  if (isLoading) return <p className="text-text-tertiary text-sm">טוען...</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-tertiary">{data.length} לקוחות עם מחשבים פעילים</span>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all">
          <Download className="w-3.5 h-3.5" /> ייצוא CSV
        </button>
      </div>
      <div className="space-y-3">
        {data.filter(cl => cl.computerCount > 0).map(cl => (
          <div key={cl.id} className="bg-surface border border-border rounded-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold text-text-primary">{cl.name}</span>
                <span className="text-xs text-text-tertiary mr-3">{cl.contactName} | {cl.phone}</span>
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-accent">{formatCurrency(cl.totalMonthly)}</span>
                <span className="text-xs text-text-tertiary mr-1">/ חודש</span>
                <span className="text-xs bg-accent-soft text-accent px-2 py-0.5 rounded-full mr-2">{cl.computerCount} מחשבים</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-text-tertiary">
                  <tr>
                    <th className="px-2 py-1 text-right">מזהה</th>
                    <th className="px-2 py-1 text-right">מחשב</th>
                    <th className="px-2 py-1 text-right">RAM</th>
                    <th className="px-2 py-1 text-right">מחיר חודשי</th>
                    <th className="px-2 py-1 text-right">תחילת השכרה</th>
                    <th className="px-2 py-1 text-right">החזרה צפויה</th>
                  </tr>
                </thead>
                <tbody>
                  {cl.computers.map((c, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="px-2 py-1 font-mono">{c.internalId}</td>
                      <td className="px-2 py-1">{c.brand} {c.model}</td>
                      <td className="px-2 py-1">{c.specs?.ram || '-'}</td>
                      <td className="px-2 py-1">{formatCurrency(c.priceMonthly)}</td>
                      <td className="px-2 py-1">{formatDate(c.startDate)}</td>
                      <td className="px-2 py-1">{c.recurring ? 'חודשי מתחדש' : formatDate(c.expectedReturn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {data.filter(cl => cl.computerCount === 0).length > 0 && (
          <p className="text-xs text-text-tertiary">{data.filter(cl => cl.computerCount === 0).length} לקוחות ללא מחשבים פעילים</p>
        )}
      </div>
    </div>
  )
}

function BySpecsReport() {
  const [ram, setRam] = useState('')
  const [cpu, setCpu] = useState('')
  const [storage, setStorage] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const params = new URLSearchParams()
  if (ram) params.set('ram', ram)
  if (cpu) params.set('cpu', cpu)
  if (storage) params.set('storage', storage)
  if (statusFilter) params.set('status', statusFilter)

  const { data = [], isLoading } = useQuery({
    queryKey: ['report-by-specs', ram, cpu, storage, statusFilter],
    queryFn: () => api.get(`/reports/by-specs?${params}`).then(r => r.data),
  })

  const handleExport = () => {
    const headers = ['מזהה', 'מותג', 'דגם', 'סטטוס', 'RAM', 'CPU', 'אחסון', 'מחיר חודשי', 'לקוח נוכחי']
    const rows = data.map(c => [c.internalId, c.brand, c.model, statusLabels[c.status], c.specs?.ram, c.specs?.cpu, c.specs?.storage, c.priceMonthly, c.currentClient])
    exportCSV(headers, rows, 'computers-by-specs')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-text-tertiary" />
          <span className="text-xs text-text-secondary font-medium">סינון:</span>
        </div>
        <input value={ram} onChange={e => setRam(e.target.value)} placeholder="RAM (לדוגמה: 16)" className="px-3 py-2 bg-white border border-border rounded-sm text-sm w-[120px] focus:outline-none focus:border-accent" />
        <input value={cpu} onChange={e => setCpu(e.target.value)} placeholder="CPU (לדוגמה: i7)" className="px-3 py-2 bg-white border border-border rounded-sm text-sm w-[120px] focus:outline-none focus:border-accent" />
        <input value={storage} onChange={e => setStorage(e.target.value)} placeholder="אחסון (לדוגמה: 512)" className="px-3 py-2 bg-white border border-border rounded-sm text-sm w-[140px] focus:outline-none focus:border-accent" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent">
          <option value="">כל הסטטוסים</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all">
          <Download className="w-3.5 h-3.5" /> ייצוא CSV
        </button>
        <span className="text-xs text-text-tertiary">{data.length} תוצאות</span>
      </div>

      {isLoading ? <p className="text-text-tertiary text-sm">טוען...</p> : (
        <div className="overflow-x-auto border border-border rounded-sm">
          <table className="w-full text-sm">
            <thead className="bg-bg text-text-secondary text-xs">
              <tr>
                <th className="px-3 py-2 text-right font-semibold">מזהה</th>
                <th className="px-3 py-2 text-right font-semibold">מותג</th>
                <th className="px-3 py-2 text-right font-semibold">דגם</th>
                <th className="px-3 py-2 text-right font-semibold">סטטוס</th>
                <th className="px-3 py-2 text-right font-semibold">RAM</th>
                <th className="px-3 py-2 text-right font-semibold">CPU</th>
                <th className="px-3 py-2 text-right font-semibold">אחסון</th>
                <th className="px-3 py-2 text-right font-semibold">דרגה</th>
                <th className="px-3 py-2 text-right font-semibold">מחיר חודשי</th>
                <th className="px-3 py-2 text-right font-semibold">לקוח נוכחי</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map(c => (
                <tr key={c.id} className="hover:bg-bg/50">
                  <td className="px-3 py-2 font-mono font-semibold">{c.internalId}</td>
                  <td className="px-3 py-2">{c.brand}</td>
                  <td className="px-3 py-2">{c.model}</td>
                  <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-2 font-semibold">{c.specs?.ram || '-'}</td>
                  <td className="px-3 py-2">{c.specs?.cpu || '-'}</td>
                  <td className="px-3 py-2">{c.specs?.storage || '-'}</td>
                  <td className="px-3 py-2">{c.tier || '-'}</td>
                  <td className="px-3 py-2">{formatCurrency(c.priceMonthly)}</td>
                  <td className="px-3 py-2">{c.currentClient || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RevenuePerComputerReport() {
  const [sort, setSort] = useState('revenue')
  const { data = [], isLoading } = useQuery({
    queryKey: ['report-revenue-computer'],
    queryFn: () => api.get('/reports/revenue-per-computer').then(r => r.data),
  })

  const sorted = [...data].sort((a, b) => {
    if (sort === 'revenue') return b.totalRevenue - a.totalRevenue
    if (sort === 'months') return b.totalMonthsRented - a.totalMonthsRented
    return a.internalId.localeCompare(b.internalId)
  })

  const totalRevenue = data.reduce((s, c) => s + c.totalRevenue, 0)

  const handleExport = () => {
    const headers = ['מזהה', 'מותג', 'דגם', 'סטטוס', 'מחיר חודשי', 'סה"כ הכנסות', 'חודשים מושכר', 'מספר השכרות']
    const rows = sorted.map(c => [c.internalId, c.brand, c.model, statusLabels[c.status], c.priceMonthly, c.totalRevenue, c.totalMonthsRented, c.rentalCount])
    exportCSV(headers, rows, 'revenue-per-computer')
  }

  if (isLoading) return <p className="text-text-tertiary text-sm">טוען...</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary">מיון:</span>
          <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent">
            <option value="revenue">הכנסות (גבוה לנמוך)</option>
            <option value="months">חודשים מושכר</option>
            <option value="id">מזהה</option>
          </select>
          <span className="text-xs text-text-tertiary">{data.length} מחשבים</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-accent">סה"כ הכנסות: {formatCurrency(totalRevenue)}</span>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all">
            <Download className="w-3.5 h-3.5" /> ייצוא CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto border border-border rounded-sm">
        <table className="w-full text-sm">
          <thead className="bg-bg text-text-secondary text-xs">
            <tr>
              <th className="px-3 py-2 text-right font-semibold">מזהה</th>
              <th className="px-3 py-2 text-right font-semibold">מחשב</th>
              <th className="px-3 py-2 text-right font-semibold">סטטוס</th>
              <th className="px-3 py-2 text-right font-semibold">מחיר חודשי</th>
              <th className="px-3 py-2 text-right font-semibold">סה"כ הכנסות</th>
              <th className="px-3 py-2 text-right font-semibold">חודשים מושכר</th>
              <th className="px-3 py-2 text-right font-semibold">השכרות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map(c => (
              <tr key={c.id} className="hover:bg-bg/50">
                <td className="px-3 py-2 font-mono font-semibold">{c.internalId}</td>
                <td className="px-3 py-2">{c.brand} {c.model}</td>
                <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                <td className="px-3 py-2">{formatCurrency(c.priceMonthly)}</td>
                <td className="px-3 py-2 font-bold text-accent">{formatCurrency(c.totalRevenue)}</td>
                <td className="px-3 py-2">{c.totalMonthsRented}</td>
                <td className="px-3 py-2">{c.rentalCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MonthlyRevenueReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['report-monthly-revenue'],
    queryFn: () => api.get('/reports/monthly-revenue').then(r => r.data),
  })

  const totalPayments = data.reduce((s, m) => s + m.payments, 0)
  const totalBilling = data.reduce((s, m) => s + m.billing, 0)

  const handleExport = () => {
    const headers = ['חודש', 'תשלומים', 'חיובים ששולמו']
    const rows = data.map(m => [m.month, m.payments, m.billing])
    exportCSV(headers, rows, 'monthly-revenue')
  }

  if (isLoading) return <p className="text-text-tertiary text-sm">טוען...</p>

  const maxVal = Math.max(...data.map(m => Math.max(m.payments, m.billing)), 1)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-text-primary">סה"כ תשלומים: <span className="text-accent">{formatCurrency(totalPayments)}</span></span>
          <span className="text-sm font-bold text-text-primary">סה"כ חיובים: <span className="text-green-600">{formatCurrency(totalBilling)}</span></span>
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all">
          <Download className="w-3.5 h-3.5" /> ייצוא CSV
        </button>
      </div>

      {/* Simple bar chart */}
      <div className="bg-surface border border-border rounded-sm p-4 space-y-2">
        {data.map(m => (
          <div key={m.month} className="flex items-center gap-3">
            <span className="text-xs font-mono text-text-secondary w-[70px] shrink-0">{m.month}</span>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-accent/80 rounded-sm transition-all" style={{ width: `${(m.payments / maxVal) * 100}%`, minWidth: m.payments > 0 ? '4px' : '0' }} />
                <span className="text-xs text-text-tertiary shrink-0">{formatCurrency(m.payments)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 bg-green-500/80 rounded-sm transition-all" style={{ width: `${(m.billing / maxVal) * 100}%`, minWidth: m.billing > 0 ? '4px' : '0' }} />
                <span className="text-xs text-text-tertiary shrink-0">{formatCurrency(m.billing)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-text-tertiary">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-accent/80 rounded-sm inline-block" /> תשלומים</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500/80 rounded-sm inline-block" /> חיובים ששולמו</span>
      </div>
    </div>
  )
}

function DebtsReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['report-debts'],
    queryFn: () => api.get('/reports/debts').then(r => r.data),
  })

  const totalDebt = data.reduce((s, c) => s + c.totalDebt, 0)

  const handleExport = () => {
    const headers = ['לקוח', 'טלפון', 'אימייל', 'סה"כ חוב', 'מספר חיובים פתוחים']
    const rows = data.map(c => [c.clientName, c.clientPhone, c.clientEmail, c.totalDebt, c.cycles.length])
    exportCSV(headers, rows, 'debts')
  }

  if (isLoading) return <p className="text-text-tertiary text-sm">טוען...</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-red-600">סה"כ חובות: {formatCurrency(totalDebt)}</span>
          <span className="text-xs text-text-tertiary">{data.length} לקוחות</span>
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all">
          <Download className="w-3.5 h-3.5" /> ייצוא CSV
        </button>
      </div>

      <div className="space-y-3">
        {data.map(cl => (
          <div key={cl.clientId} className="bg-surface border border-border rounded-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold text-text-primary">{cl.clientName}</span>
                <span className="text-xs text-text-tertiary mr-3">{cl.clientPhone}</span>
                {cl.clientEmail && <span className="text-xs text-text-tertiary mr-2">{cl.clientEmail}</span>}
              </div>
              <span className="text-sm font-bold text-red-600">{formatCurrency(cl.totalDebt)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-text-tertiary">
                  <tr>
                    <th className="px-2 py-1 text-right">מחשב</th>
                    <th className="px-2 py-1 text-right">סכום</th>
                    <th className="px-2 py-1 text-right">תאריך יעד</th>
                    <th className="px-2 py-1 text-right">סטטוס</th>
                    <th className="px-2 py-1 text-right">ימי איחור</th>
                  </tr>
                </thead>
                <tbody>
                  {cl.cycles.map((c, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="px-2 py-1 font-mono">{c.computerInternalId}</td>
                      <td className="px-2 py-1 font-semibold">{formatCurrency(c.amount)}</td>
                      <td className="px-2 py-1">{formatDate(c.dueDate)}</td>
                      <td className="px-2 py-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.status === 'OVERDUE' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'}`}>
                          {c.status === 'OVERDUE' ? 'באיחור' : 'ממתין'}
                        </span>
                      </td>
                      <td className="px-2 py-1">{c.daysOverdue > 0 ? <span className="text-red-600 font-semibold">{c.daysOverdue} ימים</span> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-text-tertiary text-sm text-center py-8">אין חובות פתוחים</p>}
      </div>
    </div>
  )
}

function RentalHistoryReport() {
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (dateFrom) params.set('from', dateFrom)
  if (dateTo) params.set('to', dateTo)

  const { data = [], isLoading } = useQuery({
    queryKey: ['report-rental-history', statusFilter, dateFrom, dateTo],
    queryFn: () => api.get(`/reports/rental-history?${params}`).then(r => r.data),
  })

  const handleExport = () => {
    const headers = ['מחשב', 'שם מחשב', 'לקוח', 'טלפון', 'תחילה', 'החזרה צפויה', 'החזרה בפועל', 'מחיר חודשי', 'סטטוס']
    const rows = data.map(r => [r.computerInternalId, r.computerName, r.clientName, r.clientPhone, formatDate(r.startDate), r.recurring ? 'מתחדש' : formatDate(r.expectedReturn), formatDate(r.actualReturn), r.priceMonthly, rentalStatusLabels[r.status]])
    exportCSV(headers, rows, 'rental-history')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent">
          <option value="">כל הסטטוסים</option>
          {Object.entries(rentalStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-secondary">מתאריך:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-secondary">עד:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent" />
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all">
          <Download className="w-3.5 h-3.5" /> ייצוא CSV
        </button>
        <span className="text-xs text-text-tertiary">{data.length} השכרות</span>
      </div>

      {isLoading ? <p className="text-text-tertiary text-sm">טוען...</p> : (
        <div className="overflow-x-auto border border-border rounded-sm">
          <table className="w-full text-sm">
            <thead className="bg-bg text-text-secondary text-xs">
              <tr>
                <th className="px-3 py-2 text-right font-semibold">מחשב</th>
                <th className="px-3 py-2 text-right font-semibold">שם מחשב</th>
                <th className="px-3 py-2 text-right font-semibold">לקוח</th>
                <th className="px-3 py-2 text-right font-semibold">תחילה</th>
                <th className="px-3 py-2 text-right font-semibold">החזרה צפויה</th>
                <th className="px-3 py-2 text-right font-semibold">החזרה בפועל</th>
                <th className="px-3 py-2 text-right font-semibold">מחיר חודשי</th>
                <th className="px-3 py-2 text-right font-semibold">סטטוס</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-bg/50">
                  <td className="px-3 py-2 font-mono font-semibold">{r.computerInternalId}</td>
                  <td className="px-3 py-2">{r.computerName}</td>
                  <td className="px-3 py-2">{r.clientName}</td>
                  <td className="px-3 py-2">{formatDate(r.startDate)}</td>
                  <td className="px-3 py-2">{r.recurring ? 'מתחדש' : formatDate(r.expectedReturn)}</td>
                  <td className="px-3 py-2">{formatDate(r.actualReturn)}</td>
                  <td className="px-3 py-2">{formatCurrency(r.priceMonthly)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      r.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                      r.status === 'RETURNED' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {rentalStatusLabels[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function UtilizationReport() {
  const [sort, setSort] = useState('utilization')
  const { data = [], isLoading } = useQuery({
    queryKey: ['report-utilization'],
    queryFn: () => api.get('/reports/utilization').then(r => r.data),
  })

  const sorted = [...data].sort((a, b) => {
    if (sort === 'utilization') return b.utilization - a.utilization
    if (sort === 'days') return b.rentedDays - a.rentedDays
    return a.internalId.localeCompare(b.internalId)
  })

  const avgUtilization = data.length > 0 ? Math.round(data.reduce((s, c) => s + c.utilization, 0) / data.length) : 0

  const handleExport = () => {
    const headers = ['מזהה', 'מותג', 'דגם', 'סטטוס', 'ימים במערכת', 'ימים מושכר', 'ניצולת %', 'מספר השכרות']
    const rows = sorted.map(c => [c.internalId, c.brand, c.model, statusLabels[c.status], c.totalDays, c.rentedDays, c.utilization, c.rentalCount])
    exportCSV(headers, rows, 'utilization')
  }

  if (isLoading) return <p className="text-text-tertiary text-sm">טוען...</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-text-primary">ניצולת ממוצעת: <span className="text-accent">{avgUtilization}%</span></span>
          <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent">
            <option value="utilization">ניצולת (גבוה לנמוך)</option>
            <option value="days">ימים מושכר</option>
            <option value="id">מזהה</option>
          </select>
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all">
          <Download className="w-3.5 h-3.5" /> ייצוא CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-border rounded-sm">
        <table className="w-full text-sm">
          <thead className="bg-bg text-text-secondary text-xs">
            <tr>
              <th className="px-3 py-2 text-right font-semibold">מזהה</th>
              <th className="px-3 py-2 text-right font-semibold">מחשב</th>
              <th className="px-3 py-2 text-right font-semibold">סטטוס</th>
              <th className="px-3 py-2 text-right font-semibold">ימים במערכת</th>
              <th className="px-3 py-2 text-right font-semibold">ימים מושכר</th>
              <th className="px-3 py-2 text-right font-semibold w-[200px]">ניצולת</th>
              <th className="px-3 py-2 text-right font-semibold">השכרות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map(c => (
              <tr key={c.id} className="hover:bg-bg/50">
                <td className="px-3 py-2 font-mono font-semibold">{c.internalId}</td>
                <td className="px-3 py-2">{c.brand} {c.model}</td>
                <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                <td className="px-3 py-2">{c.totalDays}</td>
                <td className="px-3 py-2">{c.rentedDays}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${c.utilization >= 70 ? 'bg-green-500' : c.utilization >= 40 ? 'bg-yellow-500' : 'bg-red-400'}`}
                        style={{ width: `${c.utilization}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold w-[36px] text-left">{c.utilization}%</span>
                  </div>
                </td>
                <td className="px-3 py-2">{c.rentalCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = {
    AVAILABLE: 'bg-green-50 text-green-700',
    RENTED: 'bg-blue-50 text-blue-700',
    MAINTENANCE: 'bg-orange-50 text-orange-700',
    PENDING_RETURN: 'bg-yellow-50 text-yellow-700',
    PENDING_CLEANING: 'bg-cyan-50 text-cyan-700',
    LOST: 'bg-red-50 text-red-700',
    SOLD: 'bg-gray-100 text-gray-600',
    ARCHIVED: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {statusLabels[status] || status}
    </span>
  )
}
