import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus, QrCode, Pencil, Calendar, User, CreditCard, Archive, ShoppingCart, RotateCcw, Copy, AlertTriangle, CheckCircle2, ChevronDown, Filter, X, UserPlus, Search, Warehouse } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import SearchInput from '../components/shared/SearchInput'
import StatusBadge from '../components/shared/StatusBadge'
import Modal from '../components/shared/Modal'

const statusTabs = [
  { key: 'all', label: 'הכל' },
  { key: 'AVAILABLE', label: 'פנוי' },
  { key: 'RENTED', label: 'מושכר' },
  { key: 'PENDING_RETURN', label: 'ממתין להחזרה' },
  { key: 'PENDING_CLEANING', label: 'ממתין לניקוי' },
  { key: 'MAINTENANCE', label: 'תיקון' },
  { key: 'archive', label: 'ארכיון' },
]

const defaultTiers = ['1', '2', '3', '4']

const emptyForm = {
  internalId: '',
  model: '',
  brand: '',
  serial: '',
  ram: '',
  cpu: '',
  storage: '',
  tier: '',
  status: 'AVAILABLE',
  warehouseId: '',
  notes: '',
}

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '-')
const formatCurrency = (v) => (v ? `${Number(v).toLocaleString('he-IL')} \u20AA` : '-')

export default function Computers() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [newTier, setNewTier] = useState('')

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  })

  const tiers = settings.computer_tiers ? JSON.parse(settings.computer_tiers) : defaultTiers

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/settings/warehouses').then(r => r.data),
  })

  const addTierMutation = useMutation({
    mutationFn: (newTiers) => api.put('/settings', { computer_tiers: JSON.stringify(newTiers) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('רמה נוספה')
      setNewTier('')
    },
  })

  // Open detail or status filter from URL params
  useEffect(() => {
    const d = searchParams.get('detail')
    const s = searchParams.get('status')
    if (d) {
      setDetailId(d)
    }
    if (s && statusTabs.some(t => t.key === s)) {
      setStatusFilter(s)
    }
    if (d || s) {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const isArchiveView = statusFilter === 'archive'

  const { data: computers = [], isLoading } = useQuery({
    queryKey: ['computers', isArchiveView],
    queryFn: () => api.get(isArchiveView ? '/computers?archive=true' : '/computers').then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editId
        ? api.put(`/computers/${editId}`, data).then((r) => r.data)
        : api.post('/computers', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['computer-detail'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success(editId ? 'המחשב עודכן בהצלחה' : 'המחשב נוסף בהצלחה')
      closeModal()
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'שגיאה בשמירה')
    },
  })

  const [columnFilters, setColumnFilters] = useState({})

  const setColFilter = (key, value) => {
    setColumnFilters(prev => {
      const next = { ...prev }
      if (!value) delete next[key]
      else next[key] = value
      return next
    })
  }

  const clearAllFilters = () => setColumnFilters({})

  // Helper to get value for a column key from a row
  const getColValue = (row, key) => {
    if (key === 'cpu') return row.specs?.cpu || ''
    if (key === 'ram') return row.specs?.ram || ''
    if (key === 'storage') return row.specs?.storage || ''
    if (key === 'tier') return row.tier ? `רמה ${row.tier}` : ''
    if (key === 'warehouse') return row.warehouse?.name || ''
    return row[key] || ''
  }

  const filtered = computers.filter((c) => {
    const matchesStatus = isArchiveView || statusFilter === 'all' || c.status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (c.internalId || '').toLowerCase().includes(q) ||
      (c.model || '').toLowerCase().includes(q) ||
      (c.brand || '').toLowerCase().includes(q) ||
      (c.serial || '').toLowerCase().includes(q)
    // Column filters
    const matchesColFilters = Object.entries(columnFilters).every(([key, filterVal]) => {
      const val = String(getColValue(c, key)).toLowerCase()
      return val.includes(filterVal.toLowerCase())
    })
    return matchesStatus && matchesSearch && matchesColFilters
  })

  const openAdd = () => {
    setEditId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (computer) => {
    setEditId(computer._id || computer.id)
    setForm({
      internalId: computer.internalId || '',
      model: computer.model || '',
      brand: computer.brand || '',
      serial: computer.serial || '',
      ram: computer.specs?.ram || '',
      cpu: computer.specs?.cpu || '',
      storage: computer.specs?.storage || '',
      tier: computer.tier || '',
      status: computer.status || 'AVAILABLE',
      warehouseId: computer.warehouseId || '',
      notes: computer.notes || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditId(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const { ram, cpu, storage, ...rest } = form
    saveMutation.mutate({
      ...rest,
      tier: form.tier || null,
      warehouseId: form.warehouseId || null,
      specs: { ram, cpu, storage },
    })
  }

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const columns = [
    { key: 'internalId', label: 'מזהה', filterable: true },
    { key: 'brand', label: 'מותג', filterable: true },
    { key: 'model', label: 'דגם', filterable: true },
    { key: 'cpu', label: 'מעבד', filterable: true, render: (_, row) => row.specs?.cpu || '-' },
    { key: 'ram', label: 'זכרון', filterable: true, render: (_, row) => row.specs?.ram || '-' },
    { key: 'storage', label: 'דיסק', filterable: true, render: (_, row) => row.specs?.storage || '-' },
    {
      key: 'tier',
      label: 'רמה',
      filterable: true,
      render: (val) => val ? <span className="text-xs font-semibold text-accent bg-accent-soft px-1.5 py-0.5 rounded">רמה {val}</span> : '-',
    },
    {
      key: 'warehouse',
      label: 'מחסן',
      filterable: true,
      render: (_, row) => row.warehouse?.name || '-',
    },
    {
      key: 'status',
      label: 'סטטוס',
      filterable: true,
      render: (val) => <StatusBadge status={val} />,
    },
    ...(isArchiveView ? [] : [{
      key: 'actions',
      label: '',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            openEdit(row)
          }}
          className="text-xs font-medium text-accent hover:underline"
        >
          עריכה
        </button>
      ),
    }]),
  ]

  // Get unique values for filterable columns (for dropdown)
  const columnOptions = useMemo(() => {
    const opts = {}
    for (const col of columns) {
      if (!col.filterable) continue
      const values = new Set()
      for (const c of computers) {
        const v = getColValue(c, col.key)
        if (v) values.add(String(v))
      }
      opts[col.key] = [...values].sort()
    }
    return opts
  }, [computers])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">
          {isArchiveView ? 'ארכיון מחשבים' : 'מחשבים'}
        </h1>
        {!isArchiveView && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-text-primary text-white text-sm font-semibold rounded-sm hover:opacity-90 transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            הוסף מחשב
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="חיפוש לפי מזהה, דגם, מותג..." />
        </div>
        <div className="flex gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-150 ${
                statusFilter === tab.key
                  ? tab.key === 'archive' ? 'bg-gray-600 text-white' : 'bg-accent text-white'
                  : 'bg-surface border border-border text-text-secondary hover:text-accent hover:border-accent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active column filters indicator */}
      {Object.keys(columnFilters).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs text-text-secondary">מסננים פעילים:</span>
          {Object.entries(columnFilters).map(([key, val]) => (
            <span key={key} className="inline-flex items-center gap-1 text-xs bg-accent-soft text-accent px-2 py-0.5 rounded">
              {columns.find(c => c.key === key)?.label}: {val}
              <button onClick={() => setColFilter(key, '')} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button onClick={clearAllFilters} className="text-xs text-red-500 hover:underline">נקה הכל</button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p className="text-text-tertiary text-sm">טוען...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-lg border border-border shadow-sm p-8 text-center">
          <p className="text-text-tertiary text-sm">{isArchiveView ? 'אין מחשבים בארכיון' : 'לא נמצאו מחשבים'}</p>
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg">
                  {columns.map(col => (
                    <th key={col.key} className="px-3 py-2 text-right">
                      <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{col.label}</div>
                      {col.filterable && (
                        <ColumnFilter
                          value={columnFilters[col.key] || ''}
                          options={columnOptions[col.key] || []}
                          onChange={(v) => setColFilter(col.key, v)}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setDetailId(row.id)}
                    className="border-b border-border hover:bg-bg transition-all duration-150 cursor-pointer"
                  >
                    {columns.map(col => (
                      <td key={col.key} className="px-3 py-2.5 text-sm text-text-primary">
                        {col.render ? col.render(row[col.key], row) : (row[col.key] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 text-xs text-text-tertiary border-t border-border bg-bg">
            {filtered.length} מחשבים{filtered.length !== computers.length ? ` (מתוך ${computers.length})` : ''}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editId ? 'עריכת מחשב' : 'הוספת מחשב'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField label="מזהה פנימי" value={form.internalId} onChange={(v) => updateField('internalId', v)} required />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="דגם" value={form.model} onChange={(v) => updateField('model', v)} />
              <FormField label="מותג" value={form.brand} onChange={(v) => updateField('brand', v)} />
            </div>
            <FormField label="סריאלי" value={form.serial} onChange={(v) => updateField('serial', v)} />
            <div className="grid grid-cols-3 gap-3">
              <FormField label="RAM" value={form.ram} onChange={(v) => updateField('ram', v)} placeholder="16GB" />
              <FormField label="CPU" value={form.cpu} onChange={(v) => updateField('cpu', v)} placeholder="i7-1260P" />
              <FormField label="אחסון" value={form.storage} onChange={(v) => updateField('storage', v)} placeholder="512GB SSD" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">רמת מחשב</label>
              <div className="flex gap-2">
                <select
                  value={form.tier}
                  onChange={(e) => updateField('tier', e.target.value)}
                  className="flex-1 px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
                >
                  <option value="">ללא</option>
                  {tiers.map(t => (
                    <option key={t} value={t}>רמה {t}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value)}
                    placeholder="חדש"
                    className="w-16 px-2 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTier.trim() && !tiers.includes(newTier.trim())) {
                        const updated = [...tiers, newTier.trim()].sort((a, b) => Number(a) - Number(b))
                        addTierMutation.mutate(updated)
                        updateField('tier', newTier.trim())
                      }
                    }}
                    disabled={!newTier.trim() || tiers.includes(newTier.trim())}
                    className="px-2 py-2 bg-accent text-white text-sm font-bold rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">סטטוס</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
              >
                <option value="AVAILABLE">פנוי</option>
                <option value="RENTED">מושכר</option>
                <option value="MAINTENANCE">תיקון</option>
                <option value="LOST">אבוד</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">מחסן</label>
              <select
                value={form.warehouseId}
                onChange={(e) => updateField('warehouseId', e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
              >
                <option value="">ללא מחסן</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">הערות</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150 resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150">
                ביטול
              </button>
              <button type="submit" disabled={saveMutation.isPending} className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50">
                {saveMutation.isPending ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Computer Detail Drill-Down */}
      {detailId && (
        <ComputerDetail
          computerId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(comp) => { setDetailId(null); openEdit(comp) }}
        />
      )}
    </div>
  )
}

function ComputerDetail({ computerId, onClose, onEdit }) {
  const queryClient = useQueryClient()
  const { data: computer, isLoading } = useQuery({
    queryKey: ['computer-detail', computerId],
    queryFn: () => api.get(`/computers/${computerId}`).then((r) => r.data),
  })

  const [activeTab, setActiveTab] = useState('info')
  const [showClone, setShowClone] = useState(false)
  const [cloneCount, setCloneCount] = useState(1)
  const [showNewIssue, setShowNewIssue] = useState(false)
  const [issueDesc, setIssueDesc] = useState('')
  const [resolveText, setResolveText] = useState({})
  const [showAssign, setShowAssign] = useState(false)
  const [assignClientId, setAssignClientId] = useState('')
  const [assignClientSearch, setAssignClientSearch] = useState('')
  const [assignClientOpen, setAssignClientOpen] = useState(false)
  const [assignPrice, setAssignPrice] = useState('')
  const [assignStart, setAssignStart] = useState(new Date().toISOString().split('T')[0])
  const [assignEnd, setAssignEnd] = useState('')
  const [assignRecurring, setAssignRecurring] = useState(false)
  const assignClientRef = useRef(null)

  const cloneMutation = useMutation({
    mutationFn: (data) => api.post(`/computers/${computerId}/clone`, data).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success(`${data.count} מחשבים נוצרו בהצלחה`)
      setShowClone(false)
      setCloneCount(1)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה בשכפול'),
  })

  const addIssueMutation = useMutation({
    mutationFn: (data) => api.post('/issues', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computer-detail', computerId] })
      toast.success('תקלה נוספה')
      setShowNewIssue(false)
      setIssueDesc('')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה'),
  })

  const resolveIssueMutation = useMutation({
    mutationFn: ({ id, resolution }) => api.put(`/issues/${id}`, { status: 'RESOLVED', resolution }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computer-detail', computerId] })
      toast.success('התקלה נסגרה')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה'),
  })

  const reopenIssueMutation = useMutation({
    mutationFn: (id) => api.put(`/issues/${id}`, { status: 'OPEN' }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computer-detail', computerId] })
      toast.success('התקלה נפתחה מחדש')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: () => api.put(`/computers/${computerId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['computer-detail'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success('המחשב הועבר לארכיון')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה'),
  })

  const sellMutation = useMutation({
    mutationFn: () => api.put(`/computers/${computerId}/sell`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['computer-detail'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success('המחשב סומן כנמכר')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה'),
  })

  const restoreMutation = useMutation({
    mutationFn: () => api.put(`/computers/${computerId}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['computer-detail'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success('המחשב שוחזר למלאי')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה'),
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/clients').then(r => r.data),
    enabled: showAssign,
  })

  const assignMutation = useMutation({
    mutationFn: (data) => api.post('/rentals', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['computer-detail', computerId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      toast.success('המחשב שויך ללקוח בהצלחה')
      setShowAssign(false)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה ביצירת השכרה'),
  })

  // Close client dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (assignClientRef.current && !assignClientRef.current.contains(e.target)) setAssignClientOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (isLoading) {
    return (
      <Modal title="טוען..." onClose={onClose} wide>
        <p className="text-text-tertiary text-sm text-center py-8">טוען פרטי מחשב...</p>
      </Modal>
    )
  }

  if (!computer) {
    return (
      <Modal title="שגיאה" onClose={onClose}>
        <p className="text-red-status text-sm">מחשב לא נמצא</p>
      </Modal>
    )
  }

  const isArchivedOrSold = computer.status === 'ARCHIVED' || computer.status === 'SOLD'
  const isRented = computer.status === 'RENTED'
  const rentals = computer.rentals || []
  const activeRental = rentals.find((r) => r.status === 'ACTIVE' || r.status === 'OVERDUE')
  const totalRevenue = rentals.reduce((sum, r) => {
    const cycles = r.billingCycles || []
    return sum + cycles.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amount, 0)
  }, 0)
  const totalRentals = rentals.length

  const issues = computer.issues || []
  const openIssues = issues.filter(i => i.status === 'OPEN').length

  const tabs = [
    { key: 'info', label: 'פרטים' },
    { key: 'history', label: `היסטוריה (${totalRentals})` },
    { key: 'issues', label: `תקלות (${issues.length})${openIssues > 0 ? ' !' : ''}` },
  ]

  return (
    <Modal title={`${computer.internalId} — ${computer.brand} ${computer.model}`} onClose={onClose} wide>
      {/* Status + Quick Stats */}
      <div className="flex flex-wrap gap-3 mb-5">
        <StatusBadge status={computer.status} />
        {computer.tier && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <CreditCard className="w-3.5 h-3.5" />
            <span>רמה {computer.tier}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Calendar className="w-3.5 h-3.5" />
          <span>{totalRentals} השכרות</span>
        </div>
        {totalRevenue > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-green-status font-semibold">
            <span>הכנסה: {formatCurrency(totalRevenue)}</span>
          </div>
        )}
      </div>

      {/* Current Rental Banner */}
      {activeRental && (
        <div className="bg-accent-soft border border-accent/20 rounded-md p-3 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-accent" />
              <div>
                <span className="text-sm font-semibold text-text-primary">{activeRental.client?.name || 'לקוח'}</span>
                <span className="text-xs text-text-secondary mr-3">
                  מ-{formatDate(activeRental.startDate)} עד {formatDate(activeRental.expectedReturn)}
                </span>
              </div>
            </div>
            <StatusBadge status={activeRental.status} />
          </div>
        </div>
      )}

      {/* Assign to Client (when AVAILABLE) */}
      {computer.status === 'AVAILABLE' && !showAssign && (
        <div className="mb-5">
          <button
            onClick={() => { setShowAssign(true); setAssignPrice(computer.priceMonthly || '') }}
            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            שייך ללקוח
          </button>
        </div>
      )}

      {computer.status === 'AVAILABLE' && showAssign && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-green-700 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" /> שיוך מחשב ללקוח
            </h4>
            <button onClick={() => setShowAssign(false)} className="text-green-700 hover:text-green-900">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Client searchable select */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">לקוח *</label>
            <div ref={assignClientRef} className="relative">
              <div
                className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm cursor-pointer flex items-center justify-between focus-within:border-accent"
                onClick={() => { setAssignClientOpen(!assignClientOpen) }}
              >
                <span className={assignClientId ? 'text-text-primary' : 'text-text-tertiary'}>
                  {assignClientId ? (clients.find(c => (c._id || c.id) === assignClientId)?.name || 'בחר לקוח') : 'בחר לקוח'}
                </span>
                <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${assignClientOpen ? 'rotate-180' : ''}`} />
              </div>
              {assignClientOpen && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-border rounded-sm shadow-lg max-h-[200px] flex flex-col">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                      <input
                        type="text"
                        value={assignClientSearch}
                        onChange={e => setAssignClientSearch(e.target.value)}
                        placeholder="חיפוש לקוח..."
                        className="w-full pr-8 pl-2 py-1.5 text-sm bg-bg border border-border rounded-sm focus:outline-none focus:border-accent"
                        onClick={e => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {clients.filter(c => !c.archived && c.name.toLowerCase().includes(assignClientSearch.toLowerCase())).length === 0 ? (
                      <div className="px-3 py-2 text-xs text-text-tertiary text-center">לא נמצאו לקוחות</div>
                    ) : (
                      clients.filter(c => !c.archived && c.name.toLowerCase().includes(assignClientSearch.toLowerCase())).map(c => (
                        <div
                          key={c._id || c.id}
                          onClick={() => { setAssignClientId(c._id || c.id); setAssignClientOpen(false); setAssignClientSearch('') }}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent-soft hover:text-accent transition-colors ${assignClientId === (c._id || c.id) ? 'bg-accent-soft text-accent font-semibold' : 'text-text-primary'}`}
                        >
                          {c.name}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">מחיר חודשי *</label>
              <input type="number" value={assignPrice} onChange={e => setAssignPrice(e.target.value)} className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">תאריך התחלה *</label>
              <input type="date" value={assignStart} onChange={e => setAssignStart(e.target.value)} className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={assignRecurring} onChange={e => { setAssignRecurring(e.target.checked); if (e.target.checked) setAssignEnd('') }} className="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
              <span className="text-xs font-medium text-text-secondary">חודשי מתחדש</span>
            </label>
            {!assignRecurring && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-secondary mb-1">תאריך סיום</label>
                <input type="date" value={assignEnd} onChange={e => setAssignEnd(e.target.value)} min={assignStart} className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent" />
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setShowAssign(false)} className="px-3 py-2 text-xs font-medium border border-border rounded-sm hover:border-accent hover:text-accent transition-all">
              ביטול
            </button>
            <button
              onClick={() => {
                if (!assignClientId || !assignPrice || !assignStart) {
                  toast.error('נא למלא לקוח, מחיר ותאריך התחלה')
                  return
                }
                assignMutation.mutate({
                  computerId,
                  clientId: assignClientId,
                  priceMonthly: Number(assignPrice),
                  startDate: assignStart,
                  expectedReturn: assignRecurring ? null : (assignEnd || null),
                  recurring: assignRecurring,
                })
              }}
              disabled={assignMutation.isPending || !assignClientId || !assignPrice}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {assignMutation.isPending ? 'משייך...' : 'שייך ללקוח'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-150 ${
              activeTab === tab.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-accent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <DetailRow label="מזהה" value={computer.internalId} />
            <DetailRow label="סריאלי" value={computer.serial} />
            <DetailRow label="מותג" value={computer.brand} />
            <DetailRow label="דגם" value={computer.model} />
            <DetailRow label="RAM" value={computer.specs?.ram} />
            <DetailRow label="CPU" value={computer.specs?.cpu} />
            <DetailRow label="אחסון" value={computer.specs?.storage} />
            <DetailRow label="רמת מחשב" value={computer.tier ? `רמה ${computer.tier}` : '-'} />
            <DetailRow label="מחסן" value={computer.warehouse?.name || 'לא משויך'} />
          </div>
          {computer.notes && (
            <div className="pt-2 border-t border-border">
              <DetailRow label="הערות" value={computer.notes} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-end pt-3 border-t border-border">
            {isArchivedOrSold ? (
              <button
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                שחזר למלאי
              </button>
            ) : (
              <>
                <button
                  onClick={() => onEdit(computer)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  עריכה
                </button>
                <button
                  onClick={() => setShowClone(!showClone)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all duration-150"
                >
                  <Copy className="w-3.5 h-3.5" />
                  שכפל
                </button>
                <button
                  onClick={() => {
                    api.post(`/computers/${computer.id}/generate-qr`).then(() => {
                      toast.success('QR Code נוצר בהצלחה')
                    }).catch(() => toast.error('שגיאה ביצירת QR'))
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  צור QR
                </button>
                {!isRented && (
                  <>
                    <button
                      onClick={() => {
                        if (confirm('להעביר את המחשב לארכיון?')) archiveMutation.mutate()
                      }}
                      disabled={archiveMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-gray-400 text-gray-600 rounded-sm hover:bg-gray-100 transition-all duration-150 disabled:opacity-50"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      ארכיון
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('לסמן את המחשב כנמכר? המחשב יצא מהמלאי הפעיל')) sellMutation.mutate()
                      }}
                      disabled={sellMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-purple-400 text-purple-600 rounded-sm hover:bg-purple-50 transition-all duration-150 disabled:opacity-50"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      נמכר
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {rentals.length > 0 ? (
            rentals.map((rental) => {
              const cycles = rental.billingCycles || []
              const paidAmount = cycles.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amount, 0)
              const pendingAmount = cycles.filter((c) => c.status !== 'PAID').reduce((s, c) => s + c.amount, 0)
              const duration = rental.actualReturn
                ? Math.ceil((new Date(rental.actualReturn) - new Date(rental.startDate)) / (1000 * 60 * 60 * 24))
                : Math.ceil((new Date() - new Date(rental.startDate)) / (1000 * 60 * 60 * 24))

              return (
                <div key={rental.id} className="bg-bg rounded-md p-4 border border-border/50">
                  {/* Rental header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-text-tertiary" />
                      <span className="text-sm font-semibold text-text-primary">{rental.client?.name || 'לקוח'}</span>
                      <StatusBadge status={rental.status} />
                    </div>
                    <span className="text-xs text-text-tertiary">{duration} ימים</span>
                  </div>

                  {/* Rental details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-text-tertiary">התחלה</span>
                      <div className="font-medium text-text-primary mt-0.5">{formatDate(rental.startDate)}</div>
                    </div>
                    <div>
                      <span className="text-text-tertiary">החזרה צפויה</span>
                      <div className="font-medium text-text-primary mt-0.5">{formatDate(rental.expectedReturn)}</div>
                    </div>
                    <div>
                      <span className="text-text-tertiary">הוחזר בפועל</span>
                      <div className="font-medium text-text-primary mt-0.5">{rental.actualReturn ? formatDate(rental.actualReturn) : 'טרם הוחזר'}</div>
                    </div>
                    <div>
                      <span className="text-text-tertiary">מחיר חודשי</span>
                      <div className="font-medium text-text-primary mt-0.5">{formatCurrency(rental.priceMonthly)}</div>
                    </div>
                  </div>

                  {/* Billing summary */}
                  {cycles.length > 0 && (
                    <div className="flex gap-4 mt-3 pt-3 border-t border-border/50 text-xs">
                      <span className="text-green-status font-semibold">שולם: {formatCurrency(paidAmount)}</span>
                      {pendingAmount > 0 && (
                        <span className="text-orange-status font-semibold">ממתין: {formatCurrency(pendingAmount)}</span>
                      )}
                      <span className="text-text-tertiary">{cycles.length} חיובים</span>
                    </div>
                  )}

                  {rental.notes && (
                    <div className="text-xs text-text-secondary mt-2 pt-2 border-t border-border/50">
                      {rental.notes}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <p className="text-text-tertiary text-sm text-center py-6">אין היסטוריית השכרות למחשב זה</p>
          )}
        </div>
      )}

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-text-secondary">
              {openIssues > 0 ? `${openIssues} תקלות פתוחות` : 'אין תקלות פתוחות'}
            </span>
            <button
              onClick={() => setShowNewIssue(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150"
            >
              <Plus className="w-3 h-3" />
              דווח תקלה
            </button>
          </div>

          {showNewIssue && (
            <div className="bg-bg border border-border rounded-sm p-3 space-y-2">
              <textarea
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
                placeholder="תיאור התקלה..."
                rows={2}
                className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-all duration-150 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowNewIssue(false); setIssueDesc('') }} className="px-3 py-1.5 text-xs font-medium bg-transparent border border-border rounded-sm hover:border-accent hover:text-accent transition-all duration-150">ביטול</button>
                <button
                  onClick={() => { if (issueDesc.trim()) addIssueMutation.mutate({ computerId, description: issueDesc.trim() }) }}
                  disabled={!issueDesc.trim() || addIssueMutation.isPending}
                  className="px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
                >
                  {addIssueMutation.isPending ? 'שומר...' : 'שמור'}
                </button>
              </div>
            </div>
          )}

          {issues.length > 0 ? (
            <div className="space-y-2">
              {issues.map((issue) => (
                <div key={issue.id} className={`rounded-sm border p-3 ${issue.status === 'OPEN' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {issue.status === 'OPEN' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-text-primary">{issue.description}</p>
                        {issue.resolution && (
                          <p className="text-xs text-green-700 mt-1">פתרון: {issue.resolution}</p>
                        )}
                        <p className="text-xs text-text-tertiary mt-1">
                          {new Date(issue.createdAt).toLocaleDateString('he-IL')}
                          {issue.resolvedAt && ` — נסגר ${new Date(issue.resolvedAt).toLocaleDateString('he-IL')}`}
                        </p>
                      </div>
                    </div>
                    {issue.status === 'OPEN' ? (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <input
                          type="text"
                          placeholder="פתרון..."
                          value={resolveText[issue.id] || ''}
                          onChange={(e) => setResolveText(p => ({ ...p, [issue.id]: e.target.value }))}
                          className="px-2 py-1 text-xs border border-border rounded-sm bg-white w-32 focus:outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => resolveIssueMutation.mutate({ id: issue.id, resolution: resolveText[issue.id] || '' })}
                          className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-sm hover:opacity-90"
                        >
                          סגור תקלה
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => reopenIssueMutation.mutate(issue.id)}
                        className="px-2 py-1 text-xs font-medium text-orange-600 border border-orange-300 rounded-sm hover:bg-orange-50"
                      >
                        פתח מחדש
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-tertiary text-sm text-center py-6">אין היסטוריית תקלות למחשב זה</p>
          )}
        </div>
      )}

      {/* Clone Panel */}
      {showClone && (
        <div className="border border-green-300 rounded-sm p-3 mt-4 bg-green-50 space-y-3">
          <p className="text-xs font-semibold text-text-secondary">
            שכפל את {computer.internalId} ({computer.brand} {computer.model})
          </p>
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-secondary">כמות:</label>
            <input
              type="number"
              value={cloneCount}
              onChange={(e) => setCloneCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              min="1"
              max="100"
              className="w-20 px-2 py-1.5 text-sm border border-border rounded-sm bg-white text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowClone(false)} className="px-3 py-1.5 text-xs font-medium bg-transparent border border-border rounded-sm hover:border-accent hover:text-accent transition-all duration-150">ביטול</button>
            <button
              onClick={() => cloneMutation.mutate({ count: cloneCount })}
              disabled={cloneMutation.isPending}
              className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
            >
              {cloneMutation.isPending ? 'משכפל...' : `שכפל ${cloneCount} מחשבים`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function FormField({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
      />
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-text-tertiary w-20">{label}</span>
      <span className="text-sm text-text-primary">{value || '-'}</span>
    </div>
  )
}

function ColumnFilter({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative mt-1" ref={ref}>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="סנן..."
          className="w-full px-1.5 py-1 text-xs bg-surface border border-border rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-all duration-150"
        />
        {options.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
            className="flex-shrink-0 p-0.5 text-text-tertiary hover:text-accent"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded shadow-lg max-h-48 overflow-y-auto">
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className="w-full text-right px-2 py-1.5 text-xs text-text-tertiary hover:bg-bg"
          >
            הכל
          </button>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false) }}
              className={`w-full text-right px-2 py-1.5 text-xs hover:bg-bg transition-colors ${value === opt ? 'bg-accent-soft text-accent font-semibold' : 'text-text-primary'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
