import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import DataTable from '../components/shared/DataTable'
import StatusBadge from '../components/shared/StatusBadge'
import Modal from '../components/shared/Modal'

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '-')

const methodOptions = [
  { value: 'cash', label: 'מזומן' },
  { value: 'transfer', label: 'העברה' },
  { value: 'check', label: "צ'ק" },
  { value: 'credit', label: 'אשראי' },
]

export default function Billing() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('open')
  const [showPayment, setShowPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    clientId: '',
    amount: '',
    method: 'cash',
    notes: '',
  })

  const { data: billings = [], isLoading } = useQuery({
    queryKey: ['billings'],
    queryFn: () => api.get('/billings').then((r) => r.data),
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  })

  const payMutation = useMutation({
    mutationFn: (data) => api.post('/payments', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billings'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success('התשלום נרשם בהצלחה')
      setShowPayment(false)
      setPaymentForm({ clientId: '', amount: '', method: 'cash', notes: '' })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'שגיאה ברישום תשלום')
    },
  })

  const reminderMutation = useMutation({
    mutationFn: (id) => api.post(`/billings/${id}/remind`).then((r) => r.data),
    onSuccess: () => {
      toast.success('התזכורת נשלחה')
    },
    onError: () => {
      toast.error('שגיאה בשליחת תזכורת')
    },
  })

  const openBillings = billings.filter((b) => b.status === 'PENDING' || b.status === 'OVERDUE')
  const displayed = activeTab === 'open' ? openBillings : billings

  const totalOpenDebt = openBillings.reduce((sum, b) => sum + (b.amount || 0), 0)
  const overdueCount = billings.filter((b) => b.status === 'OVERDUE').length

  const handlePaymentSubmit = (e) => {
    e.preventDefault()
    payMutation.mutate({
      ...paymentForm,
      amount: Number(paymentForm.amount),
    })
  }

  const columns = [
    { key: 'clientName', label: 'לקוח' },
    {
      key: 'computerInternalId',
      label: 'מחשב',
      render: (val) =>
        val ? (
          <span className="text-xs font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded">
            {val}
          </span>
        ) : (
          '-'
        ),
    },
    {
      key: 'amount',
      label: 'סכום',
      render: (val) => (
        <span className="font-semibold">
          {val ? `${Number(val).toLocaleString('he-IL')} \u20AA` : '-'}
        </span>
      ),
    },
    {
      key: 'date',
      label: 'תאריך',
      render: (val) => formatDate(val),
    },
    {
      key: 'status',
      label: 'סטטוס',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'actions',
      label: 'פעולות',
      render: (_, row) =>
        row.status === 'PENDING' || row.status === 'OVERDUE' ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              reminderMutation.mutate(row._id || row.id)
            }}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Bell className="w-3 h-3" />
            שלח תזכורת
          </button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">חיובים</h1>
        <button
          onClick={() => setShowPayment(true)}
          className="flex items-center gap-2 px-4 py-2 bg-text-primary text-white text-sm font-semibold rounded-sm hover:opacity-90 transition-all duration-150"
        >
          <CreditCard className="w-4 h-4" />
          רשום תשלום
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface rounded-lg border border-border shadow-sm p-5 hover:shadow-md hover:-translate-y-px transition-all duration-150">
          <div className="text-xs text-text-secondary mb-1">סה"כ חוב פתוח</div>
          <div className="text-2xl font-bold text-red-status">
            {totalOpenDebt.toLocaleString('he-IL')} {'\u20AA'}
          </div>
        </div>
        <div className="bg-surface rounded-lg border border-border shadow-sm p-5 hover:shadow-md hover:-translate-y-px transition-all duration-150">
          <div className="text-xs text-text-secondary mb-1">חיובים באיחור</div>
          <div className="text-2xl font-bold text-orange-status">{overdueCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        <button
          onClick={() => setActiveTab('open')}
          className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-150 ${
            activeTab === 'open'
              ? 'bg-accent text-white'
              : 'bg-surface border border-border text-text-secondary hover:text-accent hover:border-accent'
          }`}
        >
          חיובים פתוחים
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-150 ${
            activeTab === 'all'
              ? 'bg-accent text-white'
              : 'bg-surface border border-border text-text-secondary hover:text-accent hover:border-accent'
          }`}
        >
          כל החיובים
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-text-tertiary text-sm">טוען...</p>
      ) : (
        <DataTable columns={columns} data={displayed} emptyMessage="לא נמצאו חיובים" />
      )}

      {/* Payment Modal */}
      {showPayment && (
        <Modal
          title="רישום תשלום"
          onClose={() => {
            setShowPayment(false)
            setPaymentForm({ clientId: '', amount: '', method: 'cash', notes: '' })
          }}
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">לקוח</label>
              <select
                value={paymentForm.clientId}
                onChange={(e) => setPaymentForm((f) => ({ ...f, clientId: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
              >
                <option value="">בחר לקוח</option>
                {clients.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}
                    {c.balance > 0 ? ` (חוב: ${Number(c.balance).toLocaleString('he-IL')} \u20AA)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">סכום</label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                required
                min="1"
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">אמצעי תשלום</label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
              >
                {methodOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">הערות</label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150 resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPayment(false)
                  setPaymentForm({ clientId: '', amount: '', method: 'cash', notes: '' })
                }}
                className="px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={payMutation.isPending}
                className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
              >
                {payMutation.isPending ? 'שומר...' : 'רשום תשלום'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
