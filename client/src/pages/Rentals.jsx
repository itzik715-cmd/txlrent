import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import DataTable from '../components/shared/DataTable'
import SearchInput from '../components/shared/SearchInput'
import StatusBadge from '../components/shared/StatusBadge'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'

const statusTabs = [
  { key: 'all', label: 'הכל' },
  { key: 'ACTIVE', label: 'פעילות' },
  { key: 'OVERDUE', label: 'באיחור' },
  { key: 'RETURNED', label: 'הוחזרו' },
]

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '-')

export default function Rentals() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNewRental, setShowNewRental] = useState(false)
  const [returnRental, setReturnRental] = useState(null)

  const [form, setForm] = useState({
    computerId: '',
    clientId: '',
    startDate: new Date().toISOString().split('T')[0],
    expectedReturn: '',
    priceMonthly: '',
  })

  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ['rentals'],
    queryFn: () => api.get('/rentals').then((r) => r.data),
  })

  const { data: computers = [] } = useQuery({
    queryKey: ['computers'],
    queryFn: () => api.get('/computers').then((r) => r.data),
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  })

  const availableComputers = computers.filter((c) => c.status === 'AVAILABLE')

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/rentals', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success('ההשכרה נוצרה בהצלחה')
      setShowNewRental(false)
      resetForm()
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'שגיאה ביצירת השכרה')
    },
  })

  const returnMutation = useMutation({
    mutationFn: (id) => api.put(`/rentals/${id}/return`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success('ההחזרה נרשמה בהצלחה')
      setReturnRental(null)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'שגיאה ברישום החזרה')
    },
  })

  const resetForm = () => {
    setForm({
      computerId: '',
      clientId: '',
      startDate: new Date().toISOString().split('T')[0],
      expectedReturn: '',
      priceMonthly: '',
    })
  }

  const filtered = rentals.filter((r) => {
    const matchesStatus =
      statusFilter === 'all' || r.status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (r.computerInternalId || '').toLowerCase().includes(q) ||
      (r.clientName || '').toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      priceMonthly: Number(form.priceMonthly),
    })
  }

  const columns = [
    {
      key: 'computerInternalId',
      label: 'מחשב',
      render: (val) => (
        <span className="text-xs font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded">
          {val || '-'}
        </span>
      ),
    },
    { key: 'clientName', label: 'לקוח' },
    {
      key: 'startDate',
      label: 'תאריך התחלה',
      render: (val) => formatDate(val),
    },
    {
      key: 'expectedReturn',
      label: 'תאריך החזרה',
      render: (val) => formatDate(val),
    },
    {
      key: 'priceMonthly',
      label: 'מחיר',
      render: (val) => (val ? `${Number(val).toLocaleString('he-IL')} \u20AA` : '-'),
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
        row.status === 'ACTIVE' || row.status === 'OVERDUE' ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setReturnRental(row)
            }}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            החזרה
          </button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">השכרות</h1>
        <button
          onClick={() => setShowNewRental(true)}
          className="flex items-center gap-2 px-4 py-2 bg-text-primary text-white text-sm font-semibold rounded-sm hover:opacity-90 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          השכרה חדשה
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="חיפוש לפי מחשב או לקוח..." />
        </div>
        <div className="flex gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-150 ${
                statusFilter === tab.key
                  ? 'bg-accent text-white'
                  : 'bg-surface border border-border text-text-secondary hover:text-accent hover:border-accent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-text-tertiary text-sm">טוען...</p>
      ) : (
        <DataTable columns={columns} data={filtered} emptyMessage="לא נמצאו השכרות" />
      )}

      {/* New Rental Modal */}
      {showNewRental && (
        <Modal title="השכרה חדשה" onClose={() => { setShowNewRental(false); resetForm() }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">מחשב</label>
              <select
                value={form.computerId}
                onChange={(e) => {
                  const comp = availableComputers.find((c) => (c._id || c.id) === e.target.value)
                  setForm((f) => ({
                    ...f,
                    computerId: e.target.value,
                    priceMonthly: comp?.priceMonthly || f.priceMonthly,
                  }))
                }}
                required
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
              >
                <option value="">בחר מחשב פנוי</option>
                {availableComputers.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.internalId} — {c.brand} {c.model}
                  </option>
                ))}
              </select>
              {availableComputers.length === 0 && (
                <p className="text-xs text-orange-status mt-1">אין מחשבים פנויים</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">לקוח</label>
              <select
                value={form.clientId}
                onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
              >
                <option value="">בחר לקוח</option>
                {clients.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">תאריך התחלה</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">תאריך החזרה צפוי</label>
                <input
                  type="date"
                  value={form.expectedReturn}
                  onChange={(e) => setForm((f) => ({ ...f, expectedReturn: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">מחיר חודשי</label>
              <input
                type="number"
                value={form.priceMonthly}
                onChange={(e) => setForm((f) => ({ ...f, priceMonthly: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => { setShowNewRental(false); resetForm() }}
                className="px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
              >
                {createMutation.isPending ? 'יוצר...' : 'צור השכרה'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Return Confirm */}
      {returnRental && (
        <ConfirmDialog
          title="אישור החזרה"
          message={`האם לרשום החזרה של מחשב ${returnRental.computerInternalId || ''} מ${returnRental.clientName || 'הלקוח'}?`}
          confirmLabel="רשום החזרה"
          onConfirm={() => returnMutation.mutate(returnRental._id || returnRental.id)}
          onCancel={() => setReturnRental(null)}
        />
      )}
    </div>
  )
}
