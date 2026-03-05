import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, Users, Check } from 'lucide-react'
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
  const [showBulkRental, setShowBulkRental] = useState(false)
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
      toast.error(err.response?.data?.error || 'שגיאה ביצירת השכרה')
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
      toast.error(err.response?.data?.error || 'שגיאה ברישום החזרה')
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkRental(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-sm hover:opacity-90 transition-all duration-150"
          >
            <Users className="w-4 h-4" />
            השכרה מרובה
          </button>
          <button
            onClick={() => setShowNewRental(true)}
            className="flex items-center gap-2 px-4 py-2 bg-text-primary text-white text-sm font-semibold rounded-sm hover:opacity-90 transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            השכרה חדשה
          </button>
        </div>
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

      {/* Bulk Rental Modal */}
      {showBulkRental && (
        <BulkRentalModal
          clients={clients}
          availableComputers={availableComputers}
          onClose={() => setShowBulkRental(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['rentals'] })
            queryClient.invalidateQueries({ queryKey: ['computers'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
            setShowBulkRental(false)
          }}
        />
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

function BulkRentalModal({ clients, availableComputers, onClose, onSuccess }) {
  const [clientId, setClientId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [days, setDays] = useState(30)
  const [priceMonthly, setPriceMonthly] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [compSearch, setCompSearch] = useState('')

  const expectedReturn = useMemo(() => {
    if (!startDate || !days) return ''
    const d = new Date(startDate)
    d.setDate(d.getDate() + parseInt(days))
    return d.toISOString().split('T')[0]
  }, [startDate, days])

  const filteredComputers = useMemo(() => {
    if (!compSearch) return availableComputers
    const q = compSearch.toLowerCase()
    return availableComputers.filter(
      (c) =>
        (c.internalId || '').toLowerCase().includes(q) ||
        (c.brand || '').toLowerCase().includes(q) ||
        (c.model || '').toLowerCase().includes(q) ||
        (c.serial || '').toLowerCase().includes(q)
    )
  }, [availableComputers, compSearch])

  const toggleComputer = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === filteredComputers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredComputers.map((c) => c._id || c.id)))
    }
  }

  const bulkMutation = useMutation({
    mutationFn: (data) => api.post('/rentals/bulk', data).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(`${data.count} השכרות נוצרו בהצלחה`)
      onSuccess()
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'שגיאה ביצירת השכרות')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedIds.size === 0) {
      toast.error('יש לבחור לפחות מחשב אחד')
      return
    }
    bulkMutation.mutate({
      computerIds: Array.from(selectedIds),
      clientId,
      startDate,
      expectedReturn,
      priceMonthly: Number(priceMonthly),
    })
  }

  const inputClass = "w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"

  return (
    <Modal title="השכרה מרובה" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Client */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">1. בחר לקוח</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className={inputClass}>
            <option value="">בחר לקוח</option>
            {clients.map((c) => (
              <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Step 2: Dates & Price */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">2. תנאי השכרה</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-0.5">תאריך התחלה</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-0.5">מספר ימים</label>
              <input type="number" value={days} onChange={(e) => setDays(e.target.value)} min="1" required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-0.5">מחיר חודשי למחשב</label>
              <input type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} min="1" required placeholder="250" className={inputClass} />
            </div>
          </div>
          {expectedReturn && (
            <p className="text-xs text-text-tertiary mt-1">
              תאריך החזרה צפוי: <span className="font-semibold text-text-primary">{new Date(expectedReturn).toLocaleDateString('he-IL')}</span>
            </p>
          )}
        </div>

        {/* Step 3: Select Computers */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-text-secondary">
              3. בחר מחשבים ({selectedIds.size} נבחרו מתוך {availableComputers.length} פנויים)
            </label>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-medium text-accent hover:underline"
            >
              {selectedIds.size === filteredComputers.length && filteredComputers.length > 0 ? 'הסר הכל' : 'בחר הכל'}
            </button>
          </div>

          {/* Computer search */}
          <input
            type="text"
            value={compSearch}
            onChange={(e) => setCompSearch(e.target.value)}
            placeholder="חיפוש מחשב..."
            className="w-full px-3 py-1.5 mb-2 bg-bg border border-border rounded-sm text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-all duration-150"
          />

          {/* Computer list */}
          <div className="max-h-[280px] overflow-y-auto border border-border rounded-sm divide-y divide-border/50">
            {filteredComputers.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-4">אין מחשבים פנויים</p>
            ) : (
              filteredComputers.map((comp) => {
                const id = comp._id || comp.id
                const isSelected = selectedIds.has(id)
                return (
                  <label
                    key={id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-100 ${
                      isSelected ? 'bg-accent-soft' : 'hover:bg-bg'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                        isSelected ? 'bg-accent border-accent' : 'border-border'
                      }`}
                      onClick={() => toggleComputer(id)}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => toggleComputer(id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-accent">{comp.internalId}</span>
                        <span className="text-xs text-text-secondary">{comp.brand} {comp.model}</span>
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {comp.specs?.ram} | {comp.specs?.cpu} | {comp.specs?.storage}
                        {comp.priceMonthly && <span className="mr-2">| {comp.priceMonthly} ₪/חודש</span>}
                      </div>
                    </div>
                  </label>
                )
              })
            )}
          </div>
        </div>

        {/* Summary & Submit */}
        {selectedIds.size > 0 && priceMonthly && (
          <div className="bg-accent-soft border border-accent/20 rounded-md p-3">
            <div className="text-sm font-semibold text-text-primary mb-1">סיכום</div>
            <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
              <span>{selectedIds.size} מחשבים</span>
              <span>{days} ימים</span>
              <span>{Number(priceMonthly).toLocaleString('he-IL')} ₪ למחשב/חודש</span>
              <span className="font-bold text-accent">
                סה"כ חודשי: {(selectedIds.size * Number(priceMonthly)).toLocaleString('he-IL')} ₪
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={bulkMutation.isPending || selectedIds.size === 0}
            className="px-5 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
          >
            {bulkMutation.isPending ? 'יוצר...' : `צור ${selectedIds.size} השכרות`}
          </button>
        </div>
      </form>
    </Modal>
  )
}
