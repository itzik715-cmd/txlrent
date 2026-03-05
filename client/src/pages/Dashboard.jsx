import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  MessageCircle,
  Clock,
  CheckCircle2,
  Truck,
  RefreshCw,
  Send,
  X,
  Mail,
  MapPin,
  PackageCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
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
  const queryClient = useQueryClient()
  const [resendPreview, setResendPreview] = useState(null)
  const [resendMessage, setResendMessage] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [debtReminder, setDebtReminder] = useState(null)
  const [debtMessage, setDebtMessage] = useState('')
  const [handlePreview, setHandlePreview] = useState(null)
  const [handleMessage, setHandleMessage] = useState('')
  const [renewDate, setRenewDate] = useState('')
  const [renewMonthly, setRenewMonthly] = useState(false)

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  })

  const handleMutation = useMutation({
    mutationFn: ({ id, newExpectedReturn, recurring }) =>
      api.patch(`/dashboard/responses/${id}/handle`, { newExpectedReturn, recurring }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      toast.success('סומן כטופל')
    },
  })

  const defaultResponseTemplates = {
    renew: `שלום {clientName},\nתודה על בחירתך לחדש את השכרת המחשב {computerId} ({computerName}).\nההשכרה חודשה בהצלחה{renewInfo}.\n\nבברכה, {senderName}`,
    return_pickup: `שלום {clientName},\nתודה על פנייתך. קיבלנו את בקשתך להחזיר את מחשב {computerId} ({computerName}) לאחת מנקודות האיסוף.\n\nניתן להחזיר בשעות 09:00-17:00.\nבברכה, {senderName}`,
    return_courier: `שלום {clientName},\nתודה על פנייתך. קיבלנו את בקשתך להזמנת שליח לאיסוף מחשב {computerId} ({computerName}).\n\nעלות האיסוף: 50 ₪\nניצור איתך קשר בהקדם לתיאום מועד האיסוף.\n\nבברכה, {senderName}`,
  }

  const buildRenewInfo = (date, monthly) => {
    if (monthly) return ' להשכרה חודשית מתחדשת'
    if (date) return ` עד תאריך ${new Date(date).toLocaleDateString('he-IL')}`
    return ' לתקופה נוספת'
  }

  const buildHandleMessage = (item, date, monthly) => {
    const templateKey = `response_template_${item.choice}`
    const rawTemplate = settings[templateKey] || defaultResponseTemplates[item.choice] || ''
    const senderName = settings.wa_sender_name || 'LapTrack'
    return rawTemplate
      .replace(/\{clientName\}/g, item.clientName || '')
      .replace(/\{computerId\}/g, item.computerInternalId || '')
      .replace(/\{computerName\}/g, item.computerName || '')
      .replace(/\{senderName\}/g, senderName)
      .replace(/\{renewInfo\}/g, item.choice === 'renew' ? buildRenewInfo(date, monthly) : '')
      .replace(/\{newDate\}/g, date ? new Date(date).toLocaleDateString('he-IL') : 'חודשי מתחדש')
  }

  const openHandlePreview = (item) => {
    setRenewDate('')
    setRenewMonthly(false)
    const message = buildHandleMessage(item, '', false)
    setHandleMessage(message)
    setHandlePreview(item)
  }

  const updateRenewMessage = (item, date, monthly) => {
    const message = buildHandleMessage(item, date, monthly)
    setHandleMessage(message)
  }

  const sendCustomMutation = useMutation({
    mutationFn: (data) => api.post('/whatsapp/send-custom', data).then(r => r.data),
    onSuccess: (data) => {
      if (data.sent) {
        toast.success('הודעת WhatsApp נשלחה')
        setResendPreview(null)
        setResendMessage('')
        setDebtReminder(null)
        setDebtMessage('')
      } else toast.error(data.reason || 'שליחה נכשלה')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה בשליחה'),
  })

  const openDebtReminder = (item) => {
    const msg = `שלום ${item.clientName},\nברצוננו להזכיר כי קיימת יתרת חוב בסך ${Number(item.amount).toLocaleString('he-IL')} ₪ עבור השכרת מחשב ${item.computerInternalId}.\nמועד התשלום חלף לפני ${item.daysOverdue} ימים.\n\nנשמח להסדרת התשלום בהקדם.\nבברכה, קומפיוטר-רנט`
    setDebtMessage(msg)
    setDebtReminder(item)
  }

  const openResendPreview = async (item) => {
    setResendLoading(true)
    try {
      const { data } = await api.post(`/whatsapp/prepare-alert/${item.rentalId}`)
      setResendMessage(data.message)
      setResendPreview({ rentalId: item.rentalId, phone: item.clientPhone, clientName: item.clientName })
    } catch {
      toast.error('שגיאה בטעינת תבנית')
    } finally {
      setResendLoading(false)
    }
  }

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
          onClick={() => navigate('/computers?status=AVAILABLE')}
        />
        <KPICard
          icon={<Laptop className="w-5 h-5" />}
          iconBg="bg-accent-soft"
          iconColor="text-accent"
          value={`${data.rented || 0}/${totalComputers}`}
          label="מושכרים כרגע"
          onClick={() => navigate('/computers?status=RENTED')}
        />
        <KPICard
          icon={<Wrench className="w-5 h-5" />}
          iconBg="bg-orange-soft"
          iconColor="text-orange-status"
          value={data.maintenance || 0}
          label="בתיקון / לא זמין"
          onClick={() => navigate('/computers?status=MAINTENANCE')}
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-[#F3EAFF]"
          iconColor="text-[#8B5CF6]"
          value={formatCurrency(data.monthlyRevenue)}
          label="הכנסה חודשית"
        />
      </div>

      {/* Row 2: Client Responses & Pending Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client Responses */}
        <div className="bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-bold text-text-primary">תגובות לקוחות</h2>
            {data.clientResponses?.length > 0 && (
              <span className="text-xs font-bold text-white bg-green-600 rounded-full px-2 py-0.5">{data.clientResponses.length}</span>
            )}
          </div>
          <div className="p-5 max-h-[350px] overflow-y-auto">
            {data.clientResponses && data.clientResponses.length > 0 ? (
              <div className="space-y-2">
                {data.clientResponses.map((item) => {
                  const choiceMap = {
                    renew: { label: 'חידוש', icon: <RefreshCw className="w-3.5 h-3.5" />, bg: 'bg-green-soft', color: 'text-green-status' },
                    return_pickup: { label: 'החזרה לנקודת איסוף', icon: <CheckCircle2 className="w-3.5 h-3.5" />, bg: 'bg-accent-soft', color: 'text-accent' },
                    return_courier: { label: 'שליח לאיסוף', icon: <Truck className="w-3.5 h-3.5" />, bg: 'bg-orange-soft', color: 'text-orange-status' },
                  }
                  const c = choiceMap[item.choice] || { label: item.choice, icon: <MessageCircle className="w-3.5 h-3.5" />, bg: 'bg-gray-100', color: 'text-gray-600' }
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2.5 px-3 border border-border rounded-sm hover:bg-accent-soft/20 transition-all cursor-pointer" onClick={() => navigate(`/rentals?detail=${item.rentalId}`)}>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.color}`}>
                          {c.icon}
                          {c.label}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-text-primary">{item.clientName}</span>
                          <span className="text-xs text-text-tertiary mr-2">{item.computerInternalId}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-tertiary">{formatDate(item.answeredAt)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); openHandlePreview(item) }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          טופל
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-text-tertiary text-sm py-4">אין תגובות עדיין</p>
            )}
          </div>
        </div>

        {/* Pending Alerts (sent but not answered) */}
        <div className="bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-status" />
            <h2 className="text-sm font-bold text-text-primary">ממתינים לתגובה</h2>
            {data.pendingAlerts?.length > 0 && (
              <span className="text-xs font-bold text-white bg-orange-status rounded-full px-2 py-0.5">{data.pendingAlerts.length}</span>
            )}
          </div>
          <div className="p-5 max-h-[350px] overflow-y-auto">
            {data.pendingAlerts && data.pendingAlerts.length > 0 ? (
              <div className="space-y-2">
                {data.pendingAlerts.map((item) => {
                  const sentAgo = Math.floor((Date.now() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2.5 px-3 border border-border rounded-sm hover:bg-accent-soft/20 transition-all cursor-pointer" onClick={() => navigate(`/rentals?detail=${item.rentalId}`)}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded">{item.computerInternalId}</span>
                        <span className="text-sm font-semibold text-text-primary">{item.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-tertiary">
                          {sentAgo === 0 ? 'נשלח היום' : `לפני ${sentAgo} ימים`}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); openResendPreview(item) }}
                          disabled={resendLoading}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          שלח שוב
                        </button>
                        <a href={`tel:${item.clientPhone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-transparent border border-border rounded-sm hover:border-accent hover:text-accent transition-all">
                          <Phone className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-text-tertiary text-sm py-4">אין התראות ממתינות</p>
            )}
          </div>
        </div>
      </div>

      {/* Returns: Today + This Week side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Returns */}
        <div className="bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-text-primary">החזרות להיום</h2>
            {data.todayReturns?.length > 0 && (
              <span className="text-xs font-bold text-white bg-accent rounded-full px-2 py-0.5">{data.todayReturns.length}</span>
            )}
          </div>
          <div className="p-5 max-h-[350px] overflow-y-auto">
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

        {/* Week Returns */}
        <div className="bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-status" />
            <h2 className="text-sm font-bold text-text-primary">החזרות לשבוע הקרוב</h2>
            {data.weekReturns?.length > 0 && (
              <span className="text-xs font-bold text-white bg-orange-status rounded-full px-2 py-0.5">{data.weekReturns.length}</span>
            )}
          </div>
          <div className="p-5 max-h-[350px] overflow-y-auto">
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
      </div>

      {/* Open Debts */}
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
                    <span className="text-xs font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded">{item.computerInternalId}</span>
                    <span className="text-sm font-bold text-red-status">{formatCurrency(item.amount)}</span>
                    <span className="text-xs text-text-tertiary">{item.daysOverdue} ימים</span>
                  </div>
                  <button
                    onClick={() => openDebtReminder(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-sm hover:opacity-90 transition-all duration-150"
                  >
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

      {/* Pending Returns Follow-up */}
      {data.pendingReturns && data.pendingReturns.length > 0 && (
        <div className="bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-yellow-600" />
            <h2 className="text-sm font-bold text-text-primary">ממתינים להחזרה</h2>
            <span className="text-xs font-bold text-white bg-yellow-500 rounded-full px-2 py-0.5">{data.pendingReturns.length}</span>
          </div>
          <div className="p-5 max-h-[350px] overflow-y-auto">
            <div className="space-y-2">
              {data.pendingReturns.map((item) => {
                const isOverdue = item.daysLeft !== null && item.daysLeft < 0
                const isToday = item.daysLeft === 0
                return (
                  <div key={item.id} className="flex items-center justify-between py-2.5 px-3 border border-border rounded-sm hover:bg-accent-soft/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.returnType === 'return_courier' ? 'bg-orange-soft text-orange-status' : 'bg-accent-soft text-accent'
                      }`}>
                        {item.returnType === 'return_courier' ? <Truck className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                        {item.returnType === 'return_courier' ? 'שליח' : 'איסוף'}
                      </div>
                      <span className="text-sm font-semibold text-text-primary">{item.clientName}</span>
                      <span className="text-xs text-text-tertiary">{item.computerInternalId}</span>
                      {item.expectedDate && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isOverdue ? 'bg-red-soft text-red-status' : isToday ? 'bg-orange-soft text-orange-status' : 'bg-accent-soft text-accent'
                        }`}>
                          {isOverdue ? `באיחור ${Math.abs(item.daysLeft)} ימים` : isToday ? 'היום' : `עוד ${item.daysLeft} ימים`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          api.patch(`/dashboard/followups/${item.id}/returned`)
                            .then(() => {
                              queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
                              toast.success('המחשב סומן כהוחזר — ממתין לניקוי')
                            })
                            .catch(() => toast.error('שגיאה'))
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        הוחזר
                      </button>
                      {item.clientPhone && (
                        <a href={`tel:${item.clientPhone}`} className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-transparent border border-border rounded-sm hover:border-accent hover:text-accent transition-all">
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction icon={<Plus className="w-4 h-4" />} label="השכרה חדשה" onClick={() => navigate('/rentals')} />
        <QuickAction icon={<Plus className="w-4 h-4" />} label="לקוח חדש" onClick={() => navigate('/clients')} />
        <QuickAction icon={<RotateCcw className="w-4 h-4" />} label="קבל החזרה" onClick={() => navigate('/rentals')} />
        <QuickAction icon={<CreditCard className="w-4 h-4" />} label="רשום תשלום" onClick={() => navigate('/billing')} />
      </div>

      {/* Resend WhatsApp Preview Modal */}
      {resendPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setResendPreview(null); setResendMessage('') }}>
          <div className="bg-surface rounded-lg border border-border shadow-xl w-full max-w-lg mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-bold text-text-primary">שלח שוב — {resendPreview.clientName}</h3>
                <span className="text-xs text-text-tertiary">({resendPreview.phone})</span>
              </div>
              <button onClick={() => { setResendPreview(null); setResendMessage('') }} className="text-text-tertiary hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={resendMessage}
              onChange={(e) => setResendMessage(e.target.value)}
              rows={10}
              dir="rtl"
              className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent transition-all duration-150 resize-y leading-relaxed"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setResendPreview(null); setResendMessage('') }}
                className="px-4 py-2 text-xs font-medium bg-transparent border border-border rounded-sm hover:border-accent hover:text-accent transition-all"
              >
                ביטול
              </button>
              <button
                onClick={() => sendCustomMutation.mutate({ phone: resendPreview.phone, message: resendMessage })}
                disabled={!resendMessage.trim() || sendCustomMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {sendCustomMutation.isPending ? 'שולח...' : 'שלח WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handle Response Modal */}
      {handlePreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setHandlePreview(null); setHandleMessage('') }}>
          <div className="bg-surface rounded-lg border border-border shadow-xl w-full max-w-lg mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-bold text-text-primary">טיפול בתגובה — {handlePreview.clientName}</h3>
              </div>
              <button onClick={() => { setHandlePreview(null); setHandleMessage('') }} className="text-text-tertiary hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <span>מחשב: {handlePreview.computerInternalId}</span>
              {handlePreview.clientPhone && <span>טלפון: {handlePreview.clientPhone}</span>}
              {handlePreview.clientEmail && <span>אימייל: {handlePreview.clientEmail}</span>}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-text-secondary">בחירת הלקוח:</span>
              <span className={`px-2 py-0.5 rounded-full font-semibold ${
                handlePreview.choice === 'renew' ? 'bg-green-soft text-green-status' :
                handlePreview.choice === 'return_pickup' ? 'bg-accent-soft text-accent' :
                'bg-orange-soft text-orange-status'
              }`}>
                {handlePreview.choice === 'renew' ? 'חידוש' : handlePreview.choice === 'return_pickup' ? 'החזרה לנקודת איסוף' : 'שליח לאיסוף'}
              </span>
            </div>

            {/* Renewal options - date picker + monthly */}
            {handlePreview.choice === 'renew' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-bold text-green-700">חידוש השכרה — עד מתי?</h4>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="renewType"
                      checked={!renewMonthly}
                      onChange={() => {
                        setRenewMonthly(false)
                        updateRenewMessage(handlePreview, renewDate, false)
                      }}
                      className="accent-green-600"
                    />
                    <span className="text-xs font-medium text-text-primary">תאריך סיום</span>
                  </label>
                  <input
                    type="date"
                    value={renewDate}
                    onChange={(e) => {
                      setRenewDate(e.target.value)
                      setRenewMonthly(false)
                      updateRenewMessage(handlePreview, e.target.value, false)
                    }}
                    disabled={renewMonthly}
                    min={new Date().toISOString().split('T')[0]}
                    className="px-2 py-1 text-xs border border-border rounded-sm bg-white focus:outline-none focus:border-accent disabled:opacity-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="renewType"
                      checked={renewMonthly}
                      onChange={() => {
                        setRenewMonthly(true)
                        setRenewDate('')
                        updateRenewMessage(handlePreview, '', true)
                      }}
                      className="accent-green-600"
                    />
                    <span className="text-xs font-medium text-text-primary">חודשי מתחדש (ללא תאריך סיום)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Return options - expected return date */}
            {(handlePreview.choice === 'return_pickup' || handlePreview.choice === 'return_courier') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-bold text-blue-700">
                  {handlePreview.choice === 'return_courier' ? 'מתי לתאם איסוף?' : 'מתי צפויה ההחזרה?'}
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-text-primary">תאריך צפוי:</span>
                  <input
                    type="date"
                    value={renewDate}
                    onChange={(e) => setRenewDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="px-2 py-1 text-xs border border-border rounded-sm bg-white focus:outline-none focus:border-accent"
                  />
                </div>
                <p className="text-xs text-blue-600">המערכת תיצור מעקב ותזכיר לך לבדוק את הסטטוס עד שהמחשב יחזור</p>
              </div>
            )}

            <textarea
              value={handleMessage}
              onChange={(e) => setHandleMessage(e.target.value)}
              rows={8}
              dir="rtl"
              className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent transition-all duration-150 resize-y leading-relaxed"
            />
            <div className="flex gap-2 justify-between">
              <button
                onClick={() => {
                  handleMutation.mutate({ id: handlePreview.id, newExpectedReturn: renewDate || undefined, recurring: renewMonthly || undefined })
                  setHandlePreview(null)
                  setHandleMessage('')
                }}
                className="px-3 py-2 text-xs font-medium text-text-secondary border border-border rounded-sm hover:border-accent hover:text-accent transition-all"
              >
                סמן כטופל בלי לשלוח
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { setHandlePreview(null); setHandleMessage('') }}
                  className="px-4 py-2 text-xs font-medium bg-transparent border border-border rounded-sm hover:border-accent hover:text-accent transition-all"
                >
                  סגור
                </button>
                {handlePreview.clientEmail && (
                  <button
                    onClick={() => {
                      api.post('/whatsapp/send-email', { email: handlePreview.clientEmail, subject: 'עדכון מ-LapTrack', message: handleMessage, clientId: handlePreview.clientId })
                        .then((res) => {
                          if (res.data.sent) {
                            toast.success('אימייל נשלח')
                            handleMutation.mutate({ id: handlePreview.id, newExpectedReturn: renewDate || undefined, recurring: renewMonthly || undefined })
                            setHandlePreview(null)
                            setHandleMessage('')
                          } else toast.error(res.data.reason || 'שליחת אימייל נכשלה')
                        })
                        .catch(() => toast.error('שליחת אימייל נכשלה'))
                    }}
                    disabled={!handleMessage.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    שלח אימייל
                  </button>
                )}
                {handlePreview.clientPhone && (
                  <button
                    onClick={() => {
                      sendCustomMutation.mutate({ phone: handlePreview.clientPhone, message: handleMessage, clientId: handlePreview.clientId })
                      handleMutation.mutate({ id: handlePreview.id, newExpectedReturn: renewDate || undefined, recurring: renewMonthly || undefined })
                      setHandlePreview(null)
                      setHandleMessage('')
                    }}
                    disabled={!handleMessage.trim() || sendCustomMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {sendCustomMutation.isPending ? 'שולח...' : 'שלח WhatsApp'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debt Reminder Modal */}
      {debtReminder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setDebtReminder(null); setDebtMessage('') }}>
          <div className="bg-surface rounded-lg border border-border shadow-xl w-full max-w-lg mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-bold text-text-primary">תזכורת חוב — {debtReminder.clientName}</h3>
                <span className="text-sm font-bold text-red-status">{formatCurrency(debtReminder.amount)}</span>
              </div>
              <button onClick={() => { setDebtReminder(null); setDebtMessage('') }} className="text-text-tertiary hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-tertiary">
              {debtReminder.phone && <span>טלפון: {debtReminder.phone}</span>}
              {debtReminder.clientEmail && <span>אימייל: {debtReminder.clientEmail}</span>}
            </div>
            <textarea
              value={debtMessage}
              onChange={(e) => setDebtMessage(e.target.value)}
              rows={8}
              dir="rtl"
              className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent transition-all duration-150 resize-y leading-relaxed"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDebtReminder(null); setDebtMessage('') }}
                className="px-4 py-2 text-xs font-medium bg-transparent border border-border rounded-sm hover:border-accent hover:text-accent transition-all"
              >
                ביטול
              </button>
              {debtReminder.clientEmail && (
                <button
                  onClick={() => {
                    api.post('/whatsapp/send-email', { email: debtReminder.clientEmail, subject: 'תזכורת חוב - LapTrack', message: debtMessage, clientId: debtReminder.clientId })
                      .then((res) => {
                        if (res.data.sent) { toast.success('אימייל נשלח ללקוח'); setDebtReminder(null); setDebtMessage('') }
                        else toast.error(res.data.reason || 'שליחת אימייל נכשלה')
                      })
                      .catch(() => toast.error('שליחת אימייל נכשלה'))
                  }}
                  disabled={!debtMessage.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  שלח אימייל
                </button>
              )}
              {debtReminder.phone && (
                <button
                  onClick={() => sendCustomMutation.mutate({ phone: debtReminder.phone, message: debtMessage, clientId: debtReminder.clientId })}
                  disabled={!debtMessage.trim() || sendCustomMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all disabled:opacity-50"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {sendCustomMutation.isPending ? 'שולח...' : 'שלח WhatsApp'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KPICard({ icon, iconBg, iconColor, value, label, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-lg border border-border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150 p-5 ${onClick ? 'cursor-pointer' : ''}`}
    >
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
