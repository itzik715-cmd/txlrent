import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, RotateCcw, Check, Pencil, ExternalLink, Calendar, CreditCard, User, MessageCircle, Monitor, Mail } from 'lucide-react'
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
const formatCurrency = (v) => (v ? `${Number(v).toLocaleString('he-IL')} \u20AA` : '-')
const toInputDate = (d) => d ? new Date(d).toISOString().split('T')[0] : ''

export default function Rentals() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNewRental, setShowNewRental] = useState(false)
  const [detailRentalId, setDetailRentalId] = useState(null)
  const [returnRental, setReturnRental] = useState(null)

  // Open detail from URL param (e.g. /rentals?detail=xxx)
  useEffect(() => {
    const d = searchParams.get('detail')
    if (d) {
      setDetailRentalId(d)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

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

  const returnMutation = useMutation({
    mutationFn: (id) => api.put(`/rentals/${id}/return`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success('ההחזרה נרשמה בהצלחה')
      setReturnRental(null)
      setDetailRentalId(null)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'שגיאה ברישום החזרה')
    },
  })

  const [detailClientGroup, setDetailClientGroup] = useState(null)

  const filtered = rentals.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (r.computerInternalId || '').toLowerCase().includes(q) ||
      (r.clientName || '').toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  // Group filtered rentals by clientId
  const groupedRows = useMemo(() => {
    const groups = {}
    for (const r of filtered) {
      const key = r.clientId || r.clientName || 'unknown'
      if (!groups[key]) {
        groups[key] = {
          id: key,
          clientId: r.clientId,
          clientName: r.clientName || r.client?.name || '-',
          rentals: [],
        }
      }
      groups[key].rentals.push(r)
    }
    return Object.values(groups).map(g => {
      const computers = g.rentals.map(r => r.computerInternalId || r.computer?.internalId || '-')
      const totalPrice = g.rentals.reduce((s, r) => s + (Number(r.priceMonthly) || 0), 0)
      const statuses = [...new Set(g.rentals.map(r => r.status))]
      const worstStatus = statuses.includes('OVERDUE') ? 'OVERDUE' : statuses.includes('ACTIVE') ? 'ACTIVE' : statuses[0]
      const earliest = g.rentals.reduce((min, r) => !min || new Date(r.startDate) < new Date(min) ? r.startDate : min, null)
      return {
        ...g,
        computers,
        computerCount: g.rentals.length,
        totalPrice,
        worstStatus,
        startDate: earliest,
      }
    })
  }, [filtered])

  const columns = [
    { key: 'clientName', label: 'לקוח',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="font-medium">{val}</span>
        </div>
      ),
    },
    {
      key: 'computers',
      label: 'מחשבים',
      render: (val, row) => (
        <div className="flex flex-wrap gap-1">
          {val.slice(0, 3).map((c, i) => (
            <span key={i} className="text-xs font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded">{c}</span>
          ))}
          {val.length > 3 && <span className="text-xs text-text-tertiary">+{val.length - 3}</span>}
        </div>
      ),
    },
    {
      key: 'computerCount',
      label: 'כמות',
      render: (val) => (
        <div className="flex items-center gap-1">
          <Monitor className="w-3 h-3 text-text-tertiary" />
          <span className="text-xs font-semibold">{val}</span>
        </div>
      ),
    },
    {
      key: 'startDate',
      label: 'תאריך התחלה',
      render: (val) => formatDate(val),
    },
    {
      key: 'totalPrice',
      label: 'סה"כ חודשי',
      render: (val) => (val ? `${Number(val).toLocaleString('he-IL')} \u20AA` : '-'),
    },
    {
      key: 'worstStatus',
      label: 'סטטוס',
      render: (val) => <StatusBadge status={val} />,
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
        <DataTable
          columns={columns}
          data={groupedRows}
          onRowClick={(row) => row.computerCount === 1 ? setDetailRentalId(row.rentals[0].id) : setDetailClientGroup(row)}
          emptyMessage="לא נמצאו השכרות"
        />
      )}

      {/* New Rental Modal */}
      {showNewRental && (
        <NewRentalModal
          clients={clients}
          availableComputers={availableComputers}
          onClose={() => setShowNewRental(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['rentals'] })
            queryClient.invalidateQueries({ queryKey: ['computers'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
            setShowNewRental(false)
          }}
        />
      )}

      {/* Rental Detail Modal */}
      {detailRentalId && (
        <RentalDetail
          rentalId={detailRentalId}
          clients={clients}
          availableComputers={availableComputers}
          onClose={() => setDetailRentalId(null)}
          onReturn={(rental) => { setDetailRentalId(null); setReturnRental(rental) }}
          onNavigateToComputer={(id) => { setDetailRentalId(null); navigate(`/computers?detail=${id}`) }}
          onNavigateToClient={(id) => { setDetailRentalId(null); navigate(`/clients?profile=${id}`) }}
        />
      )}

      {/* Client Group Detail */}
      {detailClientGroup && (
        <ClientGroupDetail
          group={detailClientGroup}
          clients={clients}
          availableComputers={availableComputers}
          onClose={() => setDetailClientGroup(null)}
          onOpenRental={(id) => { setDetailClientGroup(null); setDetailRentalId(id) }}
          onReturn={(rental) => { setDetailClientGroup(null); setReturnRental(rental) }}
          onNavigateToComputer={(id) => { setDetailClientGroup(null); navigate(`/computers?detail=${id}`) }}
          onNavigateToClient={(id) => { setDetailClientGroup(null); navigate(`/clients?profile=${id}`) }}
        />
      )}

      {/* Return Confirm */}
      {returnRental && (
        <ConfirmDialog
          title="אישור החזרה"
          message={`האם לרשום החזרה של מחשב ${returnRental.computerInternalId || returnRental.computer?.internalId || ''} מ${returnRental.clientName || returnRental.client?.name || 'הלקוח'}?`}
          confirmLabel="רשום החזרה"
          onConfirm={() => returnMutation.mutate(returnRental._id || returnRental.id)}
          onCancel={() => setReturnRental(null)}
        />
      )}
    </div>
  )
}

/* ─── Rental Detail ─── */
function RentalDetail({ rentalId, clients = [], availableComputers = [], onClose, onReturn, onNavigateToComputer, onNavigateToClient }) {
  const queryClient = useQueryClient()
  const rental = useRentalFromList(rentalId)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [showAddComputers, setShowAddComputers] = useState(false)
  const [addCompIds, setAddCompIds] = useState(new Set())
  const [addCompSearch, setAddCompSearch] = useState('')
  const [showAlertPreview, setShowAlertPreview] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertEmail, setAlertEmail] = useState('')
  const [alertLoading, setAlertLoading] = useState(false)

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['rentals'] })
    queryClient.invalidateQueries({ queryKey: ['computers'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
  }

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/rentals/${rentalId}`, data).then((r) => r.data),
    onSuccess: () => {
      invalidateAll()
      toast.success('ההשכרה עודכנה')
      setEditing(false)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה בעדכון'),
  })

  const addComputersMutation = useMutation({
    mutationFn: (data) => api.post('/rentals/bulk', data).then((r) => r.data),
    onSuccess: (data) => {
      invalidateAll()
      toast.success(`${data.count} מחשבים נוספו להשכרה`)
      setShowAddComputers(false)
      setAddCompIds(new Set())
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה בהוספת מחשבים'),
  })

  const sendCustomMutation = useMutation({
    mutationFn: (data) => api.post('/whatsapp/send-custom', data).then(r => r.data),
    onSuccess: (data) => {
      if (data.sent) {
        toast.success('הודעת WhatsApp נשלחה ללקוח')
        setShowAlertPreview(false)
        setAlertMessage('')
      } else toast.error(data.reason || 'שליחה נכשלה')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה בשליחה'),
  })

  const sendEmailMutation = useMutation({
    mutationFn: (data) => api.post('/whatsapp/send-email', data).then(r => r.data),
    onSuccess: (data) => {
      if (data.sent) {
        toast.success('אימייל נשלח ללקוח')
        setShowAlertPreview(false)
        setAlertMessage('')
      } else toast.error(data.reason || 'שליחת אימייל נכשלה')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה בשליחת אימייל'),
  })

  const openAlertPreview = async () => {
    setAlertLoading(true)
    try {
      const { data } = await api.post(`/whatsapp/prepare-alert/${rental.id}`)
      setAlertMessage(data.message)
      setAlertEmail(data.email || '')
      setShowAlertPreview(true)
    } catch {
      toast.error('שגיאה בטעינת תבנית')
    } finally {
      setAlertLoading(false)
    }
  }

  if (!rental) {
    return (
      <Modal title="טוען..." onClose={onClose}>
        <p className="text-text-tertiary text-sm text-center py-8">טוען פרטי השכרה...</p>
      </Modal>
    )
  }

  const isActive = rental.status === 'ACTIVE' || rental.status === 'OVERDUE'
  const cycles = rental.billingCycles || []
  const paidAmount = cycles.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amount, 0)
  const pendingAmount = cycles.filter((c) => c.status !== 'PAID').reduce((s, c) => s + c.amount, 0)
  const duration = rental.actualReturn
    ? Math.ceil((new Date(rental.actualReturn) - new Date(rental.startDate)) / (1000 * 60 * 60 * 24))
    : Math.ceil((new Date() - new Date(rental.startDate)) / (1000 * 60 * 60 * 24))

  // Computers available for swap: available ones + current one
  const swapComputers = useMemo(() => {
    if (!rental) return []
    const current = rental.computer
    const list = availableComputers.filter(c => (c._id || c.id) !== rental.computerId)
    if (current) list.unshift(current)
    return list
  }, [availableComputers, rental])

  const addableComputers = useMemo(() => {
    if (!addCompSearch) return availableComputers
    const q = addCompSearch.toLowerCase()
    return availableComputers.filter(c =>
      (c.internalId || '').toLowerCase().includes(q) ||
      (c.brand || '').toLowerCase().includes(q) ||
      (c.model || '').toLowerCase().includes(q)
    )
  }, [availableComputers, addCompSearch])

  const startEdit = () => {
    setEditForm({
      startDate: toInputDate(rental.startDate),
      expectedReturn: toInputDate(rental.expectedReturn),
      priceMonthly: rental.priceMonthly || '',
      notes: rental.notes || '',
      computerId: rental.computerId,
      clientId: rental.clientId,
      recurring: rental.recurring || false,
    })
    setEditing(true)
  }

  const saveEdit = (e) => {
    e.preventDefault()
    updateMutation.mutate({
      startDate: editForm.startDate,
      expectedReturn: editForm.recurring ? null : editForm.expectedReturn,
      priceMonthly: Number(editForm.priceMonthly),
      notes: editForm.notes,
      computerId: editForm.computerId,
      clientId: editForm.clientId,
      recurring: editForm.recurring,
    })
  }

  const handleAddComputers = () => {
    if (addCompIds.size === 0) return
    addComputersMutation.mutate({
      computerIds: Array.from(addCompIds),
      clientId: rental.clientId,
      startDate: rental.startDate,
      expectedReturn: rental.expectedReturn,
      priceMonthly: rental.priceMonthly,
      notes: rental.notes,
    })
  }

  const inputClass = "w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"

  return (
    <Modal
      title={`השכרה — ${rental.computer?.internalId || rental.computerInternalId || ''}`}
      onClose={onClose}
      wide
    >
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <StatusBadge status={rental.status} />
        {rental.recurring && (
          <span className="text-xs font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded">חודשי מתחדש</span>
        )}
        <span className="text-xs text-text-secondary">{duration} ימים</span>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <CreditCard className="w-3.5 h-3.5" />
          {formatCurrency(rental.priceMonthly)}/חודש
        </div>
      </div>

      {/* Links to computer and client */}
      <div className="flex flex-wrap gap-4 mb-5">
        <button
          onClick={() => onNavigateToComputer(rental.computerId)}
          className="flex items-center gap-1.5 text-sm font-bold text-accent hover:underline"
        >
          <Calendar className="w-3.5 h-3.5" />
          {rental.computer?.internalId || rental.computerInternalId} — {rental.computer?.brand} {rental.computer?.model}
          <ExternalLink className="w-3 h-3" />
        </button>
        <button
          onClick={() => onNavigateToClient(rental.clientId)}
          className="flex items-center gap-1.5 text-sm font-bold text-accent hover:underline"
        >
          <User className="w-3.5 h-3.5" />
          {rental.client?.name || rental.clientName}
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {editing ? (
        /* ─── Edit Mode ─── */
        <form onSubmit={saveEdit} className="space-y-3">
          {/* Client selector */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">לקוח</label>
            <select value={editForm.clientId} onChange={(e) => setEditForm(f => ({ ...f, clientId: e.target.value }))} className={inputClass}>
              {clients.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Computer swap */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">מחשב</label>
            <select value={editForm.computerId} onChange={(e) => setEditForm(f => ({ ...f, computerId: e.target.value }))} className={inputClass}>
              {swapComputers.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.internalId} — {c.brand} {c.model} {(c._id || c.id) === rental.computerId ? '(נוכחי)' : '(פנוי)'}
                </option>
              ))}
            </select>
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.recurring || false}
                onChange={(e) => setEditForm(f => ({ ...f, recurring: e.target.checked }))}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-xs font-medium text-text-secondary">חודשי מתחדש (ללא תאריך סיום)</span>
            </label>
          </div>

          <div className={`grid gap-3 ${editForm.recurring ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">תאריך התחלה</label>
              <input type="date" value={editForm.startDate} onChange={(e) => setEditForm(f => ({ ...f, startDate: e.target.value }))} className={inputClass} />
            </div>
            {!editForm.recurring && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">תאריך החזרה צפוי</label>
                <input type="date" value={editForm.expectedReturn} onChange={(e) => setEditForm(f => ({ ...f, expectedReturn: e.target.value }))} className={inputClass} />
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">מחיר חודשי</label>
            <input type="number" value={editForm.priceMonthly} onChange={(e) => setEditForm(f => ({ ...f, priceMonthly: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">הערות</label>
            <textarea value={editForm.notes} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputClass + " resize-none"} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150">ביטול</button>
            <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50">
              {updateMutation.isPending ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </form>
      ) : (
        /* ─── View Mode ─── */
        <div className="space-y-4">
          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoCell label="התחלה" value={formatDate(rental.startDate)} />
            <InfoCell label="החזרה צפויה" value={rental.recurring ? 'חודשי מתחדש' : formatDate(rental.expectedReturn)} />
            <InfoCell label="הוחזר בפועל" value={rental.actualReturn ? formatDate(rental.actualReturn) : 'טרם הוחזר'} />
            <InfoCell label="מחיר חודשי" value={formatCurrency(rental.priceMonthly)} />
          </div>

          {rental.notes && (
            <div className="text-xs text-text-secondary bg-bg rounded-sm p-3 border border-border/50">
              <span className="font-medium text-text-tertiary">הערות: </span>{rental.notes}
            </div>
          )}

          {/* Billing cycles */}
          {cycles.length > 0 && (
            <div>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-xs font-semibold text-text-secondary">חיובים ({cycles.length})</span>
                <span className="text-xs text-green-status font-semibold">שולם: {formatCurrency(paidAmount)}</span>
                {pendingAmount > 0 && (
                  <span className="text-xs text-orange-status font-semibold">ממתין: {formatCurrency(pendingAmount)}</span>
                )}
              </div>
              <div className="max-h-[180px] overflow-y-auto border border-border rounded-sm divide-y divide-border/50">
                {cycles.map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={c.status} />
                      <span className="text-text-primary font-medium">{formatCurrency(c.amount)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-text-tertiary">
                      <span>יעד: {formatDate(c.dueDate)}</span>
                      {c.paidDate && <span>שולם: {formatDate(c.paidDate)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-end pt-3 border-t border-border">
            {isActive && (
              <>
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  עריכה
                </button>
                {availableComputers.length > 0 && (
                  <button
                    onClick={() => setShowAddComputers(!showAddComputers)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all duration-150"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    הוסף מחשבים
                  </button>
                )}
                <button
                  onClick={openAlertPreview}
                  disabled={alertLoading}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {alertLoading ? 'טוען...' : 'שלח התראה'}
                </button>
                <button
                  onClick={() => onReturn(rental)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  החזרה
                </button>
              </>
            )}
          </div>

          {/* Add more computers panel */}
          {showAddComputers && (
            <div className="border border-accent/30 rounded-sm p-3 space-y-3 bg-accent-soft/30">
              <p className="text-xs font-semibold text-text-secondary">
                הוסף מחשבים ללקוח {rental.client?.name || rental.clientName} באותם תנאים ({formatCurrency(rental.priceMonthly)}/חודש)
              </p>
              {availableComputers.length > 3 && (
                <input
                  type="text"
                  value={addCompSearch}
                  onChange={(e) => setAddCompSearch(e.target.value)}
                  placeholder="חיפוש מחשב..."
                  className="w-full px-3 py-1.5 bg-bg border border-border rounded-sm text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-all duration-150"
                />
              )}
              <div className="max-h-[200px] overflow-y-auto border border-border rounded-sm divide-y divide-border/50 bg-surface">
                {addableComputers.length === 0 ? (
                  <p className="text-xs text-text-tertiary text-center py-4">אין מחשבים פנויים</p>
                ) : (
                  addableComputers.map((comp) => {
                    const id = comp._id || comp.id
                    const isSelected = addCompIds.has(id)
                    return (
                      <div
                        key={id}
                        onClick={() => setAddCompIds(prev => {
                          const next = new Set(prev)
                          if (next.has(id)) next.delete(id)
                          else next.add(id)
                          return next
                        })}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-all duration-100 ${isSelected ? 'bg-accent-soft' : 'hover:bg-bg'}`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${isSelected ? 'bg-accent border-accent' : 'border-border'}`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-xs font-semibold text-accent">{comp.internalId}</span>
                        <span className="text-xs text-text-secondary">{comp.brand} {comp.model}</span>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowAddComputers(false); setAddCompIds(new Set()) }} className="px-3 py-1.5 text-xs font-medium bg-transparent border border-border rounded-sm hover:border-accent hover:text-accent transition-all duration-150">ביטול</button>
                <button
                  type="button"
                  onClick={handleAddComputers}
                  disabled={addCompIds.size === 0 || addComputersMutation.isPending}
                  className="px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
                >
                  {addComputersMutation.isPending ? 'מוסיף...' : `הוסף ${addCompIds.size || ''} מחשבים`}
                </button>
              </div>
            </div>
          )}

          {/* Alert Preview (WhatsApp + Email) */}
          {showAlertPreview && (
            <div className="border border-green-300 rounded-sm p-4 mt-3 bg-green-50 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-bold text-text-primary">תצוגה מקדימה — {rental.client?.name || rental.clientName}</span>
                <span className="text-xs text-text-tertiary">({rental.client?.phone})</span>
                {alertEmail && <span className="text-xs text-text-tertiary">| {alertEmail}</span>}
              </div>
              <textarea
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                rows={8}
                dir="rtl"
                className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent transition-all duration-150 resize-y leading-relaxed"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowAlertPreview(false); setAlertMessage('') }}
                  className="px-3 py-1.5 text-xs font-medium bg-transparent border border-border rounded-sm hover:border-accent hover:text-accent transition-all duration-150"
                >
                  ביטול
                </button>
                {alertEmail && (
                  <button
                    onClick={() => sendEmailMutation.mutate({
                      email: alertEmail,
                      subject: 'התראת השכרה - LapTrack',
                      message: alertMessage,
                      clientId: rental.clientId,
                    })}
                    disabled={!alertMessage.trim() || sendEmailMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
                  >
                    <Mail className="w-3 h-3" />
                    {sendEmailMutation.isPending ? 'שולח...' : 'שלח אימייל'}
                  </button>
                )}
                <button
                  onClick={() => sendCustomMutation.mutate({
                    phone: rental.client?.phone,
                    message: alertMessage,
                    clientId: rental.clientId,
                  })}
                  disabled={!alertMessage.trim() || sendCustomMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
                >
                  <MessageCircle className="w-3 h-3" />
                  {sendCustomMutation.isPending ? 'שולח...' : 'שלח WhatsApp'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

/* ─── Client Group Detail ─── */
function ClientGroupDetail({ group, clients, availableComputers, onClose, onOpenRental, onReturn, onNavigateToComputer, onNavigateToClient }) {
  const queryClient = useQueryClient()
  const [alertLoading, setAlertLoading] = useState(null)
  const [alertPreview, setAlertPreview] = useState(null) // { rentalId, message, phone }

  const sendCustomMutation = useMutation({
    mutationFn: (data) => api.post('/whatsapp/send-custom', data).then(r => r.data),
    onSuccess: (data) => {
      if (data.sent) {
        toast.success('הודעת WhatsApp נשלחה ללקוח')
        setAlertPreview(null)
      } else toast.error(data.reason || 'שליחה נכשלה')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה בשליחה'),
  })

  const sendEmailMutation = useMutation({
    mutationFn: (data) => api.post('/whatsapp/send-email', data).then(r => r.data),
    onSuccess: (data) => {
      if (data.sent) {
        toast.success('אימייל נשלח ללקוח')
        setAlertPreview(null)
      } else toast.error(data.reason || 'שליחת אימייל נכשלה')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה בשליחת אימייל'),
  })

  const openAlertPreview = async (rental) => {
    setAlertLoading(rental.id)
    try {
      const { data } = await api.post(`/whatsapp/prepare-alert/${rental.id}`)
      setAlertPreview({ rentalId: rental.id, message: data.message, phone: rental.client?.phone, email: data.email || rental.client?.email })
    } catch {
      toast.error('שגיאה בטעינת תבנית')
    } finally {
      setAlertLoading(null)
    }
  }

  const openCombinedAlert = async () => {
    setAlertLoading('combined')
    try {
      const { data } = await api.post('/whatsapp/prepare-combined-alert', { clientId: group.clientId })
      setAlertPreview({ rentalId: 'combined', message: data.message, phone: data.phone, email: data.email })
    } catch {
      toast.error('שגיאה בטעינת תבנית')
    } finally {
      setAlertLoading(null)
    }
  }

  const totalPrice = group.rentals.reduce((s, r) => s + (Number(r.priceMonthly) || 0), 0)
  const activeRentals = group.rentals.filter(r => r.status === 'ACTIVE' || r.status === 'OVERDUE')
  const returnedRentals = group.rentals.filter(r => r.status === 'RETURNED')

  return (
    <Modal
      title={`${group.clientName} — ${group.rentals.length} מחשבים`}
      onClose={onClose}
      wide
    >
      {/* Client header */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <button
          onClick={() => onNavigateToClient(group.clientId)}
          className="flex items-center gap-1.5 text-sm font-bold text-accent hover:underline"
        >
          <User className="w-3.5 h-3.5" />
          {group.clientName}
          <ExternalLink className="w-3 h-3" />
        </button>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Monitor className="w-3.5 h-3.5" />
          {group.rentals.length} מחשבים
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <CreditCard className="w-3.5 h-3.5" />
          סה"כ: {formatCurrency(totalPrice)}/חודש
        </div>
        {activeRentals.length > 0 && (
          <button
            onClick={openCombinedAlert}
            disabled={alertLoading === 'combined'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50 mr-auto"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {alertLoading === 'combined' ? 'טוען...' : 'שלח התראה כוללת'}
          </button>
        )}
      </div>

      {/* Active rentals */}
      {activeRentals.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-text-secondary mb-2">השכרות פעילות ({activeRentals.length})</h3>
          <div className="border border-border rounded-sm divide-y divide-border/50">
            {activeRentals.map(rental => (
              <div key={rental.id} className="p-3 hover:bg-bg transition-all duration-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded">
                      {rental.computerInternalId || rental.computer?.internalId || '-'}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {rental.computer?.brand} {rental.computer?.model}
                    </span>
                    <StatusBadge status={rental.status} />
                    {rental.recurring && (
                      <span className="text-xs font-medium text-accent">חודשי</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">{formatCurrency(rental.priceMonthly)}/חודש</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
                  <span>התחלה: {formatDate(rental.startDate)}</span>
                  {!rental.recurring && <span>החזרה צפויה: {formatDate(rental.expectedReturn)}</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-2 justify-end">
                  <button
                    onClick={() => onOpenRental(rental.id)}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-accent border border-accent/30 rounded-sm hover:bg-accent-soft transition-all duration-150"
                  >
                    <Pencil className="w-3 h-3" />
                    פרטים
                  </button>
                  <button
                    onClick={() => openAlertPreview(rental)}
                    disabled={alertLoading === rental.id}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
                  >
                    <MessageCircle className="w-3 h-3" />
                    {alertLoading === rental.id ? 'טוען...' : 'שלח התראה'}
                  </button>
                  <button
                    onClick={() => onNavigateToComputer(rental.computerId)}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-text-secondary border border-border rounded-sm hover:border-accent hover:text-accent transition-all duration-150"
                  >
                    <Monitor className="w-3 h-3" />
                    מחשב
                  </button>
                  <button
                    onClick={() => onReturn(rental)}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-text-secondary border border-border rounded-sm hover:border-accent hover:text-accent transition-all duration-150"
                  >
                    <RotateCcw className="w-3 h-3" />
                    החזרה
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Returned rentals */}
      {returnedRentals.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-text-secondary mb-2">הוחזרו ({returnedRentals.length})</h3>
          <div className="border border-border rounded-sm divide-y divide-border/50 opacity-70">
            {returnedRentals.map(rental => (
              <div key={rental.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-text-tertiary bg-bg px-2 py-0.5 rounded">
                    {rental.computerInternalId || rental.computer?.internalId || '-'}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {rental.computer?.brand} {rental.computer?.model}
                  </span>
                  <StatusBadge status={rental.status} />
                </div>
                <button
                  onClick={() => onOpenRental(rental.id)}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  פרטים
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Preview (WhatsApp + Email) */}
      {alertPreview && (
        <div className="border border-green-300 rounded-sm p-4 mt-3 bg-green-50 space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold text-text-primary">תצוגה מקדימה — {group.clientName}</span>
            <span className="text-xs text-text-tertiary">({alertPreview.phone})</span>
            {alertPreview.email && <span className="text-xs text-text-tertiary">| {alertPreview.email}</span>}
          </div>
          <textarea
            value={alertPreview.message}
            onChange={(e) => setAlertPreview(prev => ({ ...prev, message: e.target.value }))}
            rows={8}
            dir="rtl"
            className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent transition-all duration-150 resize-y leading-relaxed"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setAlertPreview(null)}
              className="px-3 py-1.5 text-xs font-medium bg-transparent border border-border rounded-sm hover:border-accent hover:text-accent transition-all duration-150"
            >
              ביטול
            </button>
            {alertPreview.email && (
              <button
                onClick={() => sendEmailMutation.mutate({
                  email: alertPreview.email,
                  subject: 'התראת השכרה - LapTrack',
                  message: alertPreview.message,
                  clientId: group.clientId,
                })}
                disabled={!alertPreview.message.trim() || sendEmailMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
              >
                <Mail className="w-3 h-3" />
                {sendEmailMutation.isPending ? 'שולח...' : 'שלח אימייל'}
              </button>
            )}
            <button
              onClick={() => sendCustomMutation.mutate({
                phone: alertPreview.phone,
                message: alertPreview.message,
                clientId: group.clientId,
              })}
              disabled={!alertPreview.message.trim() || sendCustomMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
            >
              <MessageCircle className="w-3 h-3" />
              {sendCustomMutation.isPending ? 'שולח...' : 'שלח WhatsApp'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function useRentalFromList(rentalId) {
  const { data: rentals = [] } = useQuery({
    queryKey: ['rentals'],
    queryFn: () => api.get('/rentals').then((r) => r.data),
  })
  return rentals.find((r) => r.id === rentalId)
}

function InfoCell({ label, value }) {
  return (
    <div>
      <span className="text-xs text-text-tertiary">{label}</span>
      <div className="text-sm font-medium text-text-primary mt-0.5">{value}</div>
    </div>
  )
}

/* ─── New Rental Modal ─── */
function SearchableSelect({ options, value, onChange, placeholder, inputClass }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (val) => {
    onChange(val)
    setSearch('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div
        className={`${inputClass} cursor-pointer flex items-center justify-between`}
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50) }}
      >
        <span className={selected ? 'text-text-primary' : 'text-text-tertiary'}>{selected ? selected.label : placeholder}</span>
        <svg className={`w-4 h-4 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-border rounded-sm shadow-lg max-h-[240px] flex flex-col">
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="הקלד לחיפוש..."
              className="w-full px-2 py-1.5 text-sm bg-bg border border-border rounded-sm focus:outline-none focus:border-accent"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-tertiary text-center">לא נמצאו תוצאות</div>
            ) : (
              filtered.map(o => (
                <div
                  key={o.value}
                  onClick={() => handleSelect(o.value)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent-soft hover:text-accent transition-colors ${value === o.value ? 'bg-accent-soft text-accent font-semibold' : 'text-text-primary'}`}
                >
                  {o.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* Hidden required input for form validation */}
      <input type="hidden" value={value} required />
    </div>
  )
}

function NewRentalModal({ clients, availableComputers, onClose, onSuccess }) {
  const [clientId, setClientId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [days, setDays] = useState(30)
  const [priceMonthly, setPriceMonthly] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [compSearch, setCompSearch] = useState('')
  const [recurring, setRecurring] = useState(false)

  const expectedReturn = useMemo(() => {
    if (recurring) return ''
    if (!startDate || !days) return ''
    const d = new Date(startDate)
    d.setDate(d.getDate() + parseInt(days))
    return d.toISOString().split('T')[0]
  }, [startDate, days, recurring])

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
    if (selectedIds.size === filteredComputers.length && filteredComputers.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredComputers.map((c) => c._id || c.id)))
    }
  }

  const bulkMutation = useMutation({
    mutationFn: (data) => api.post('/rentals/bulk', data).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.count === 1 ? 'ההשכרה נוצרה בהצלחה' : `${data.count} השכרות נוצרו בהצלחה`)
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
      expectedReturn: recurring ? null : expectedReturn,
      priceMonthly: Number(priceMonthly),
      recurring,
    })
  }

  const inputClass = "w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"

  return (
    <Modal title="השכרה חדשה" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">לקוח</label>
          <SearchableSelect
            options={clients.map(c => ({ value: c._id || c.id, label: c.name }))}
            value={clientId}
            onChange={setClientId}
            placeholder="בחר לקוח"
            inputClass={inputClass}
          />
        </div>

        {/* Recurring toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
            />
            <span className="text-xs font-medium text-text-secondary">השכרה חודשית מתחדשת (ללא תאריך סיום)</span>
          </label>
        </div>

        <div className={`grid gap-3 ${recurring ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">תאריך התחלה</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inputClass} />
          </div>
          {!recurring && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">מספר ימים</label>
              <input type="number" value={days} onChange={(e) => setDays(e.target.value)} min="1" required className={inputClass} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">מחיר חודשי</label>
            <input type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} min="1" required placeholder="250" className={inputClass} />
          </div>
        </div>
        {expectedReturn && !recurring && (
          <p className="text-xs text-text-tertiary -mt-2">
            החזרה צפויה: <span className="font-semibold text-text-primary">{new Date(expectedReturn).toLocaleDateString('he-IL')}</span>
          </p>
        )}
        {recurring && (
          <p className="text-xs text-accent font-medium -mt-2">
            השכרה חודשית מתחדשת — ללא תאריך החזרה קבוע
          </p>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-text-secondary">
              מחשבים ({selectedIds.size} נבחרו מתוך {availableComputers.length} פנויים)
            </label>
            {availableComputers.length > 1 && (
              <button type="button" onClick={selectAll} className="text-xs font-medium text-accent hover:underline">
                {selectedIds.size === filteredComputers.length && filteredComputers.length > 0 ? 'הסר הכל' : 'בחר הכל'}
              </button>
            )}
          </div>

          {availableComputers.length > 3 && (
            <input
              type="text"
              value={compSearch}
              onChange={(e) => setCompSearch(e.target.value)}
              placeholder="חיפוש מחשב..."
              className="w-full px-3 py-1.5 mb-2 bg-bg border border-border rounded-sm text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-all duration-150"
            />
          )}

          <div className="max-h-[280px] overflow-y-auto border border-border rounded-sm divide-y divide-border/50">
            {filteredComputers.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-4">אין מחשבים פנויים</p>
            ) : (
              filteredComputers.map((comp) => {
                const id = comp._id || comp.id
                const isSelected = selectedIds.has(id)
                return (
                  <div
                    key={id}
                    onClick={() => toggleComputer(id)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-100 ${
                      isSelected ? 'bg-accent-soft' : 'hover:bg-bg'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${isSelected ? 'bg-accent border-accent' : 'border-border'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-accent">{comp.internalId}</span>
                        <span className="text-xs text-text-secondary">{comp.brand} {comp.model}</span>
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {comp.specs?.ram} | {comp.specs?.cpu} | {comp.specs?.storage}
                        {comp.priceMonthly && <span className="mr-2">| {comp.priceMonthly} ₪/חודש</span>}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {selectedIds.size > 0 && priceMonthly && (
          <div className="bg-accent-soft border border-accent/20 rounded-md p-3">
            <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
              <span><strong>{selectedIds.size}</strong> מחשבים</span>
              {recurring ? <span className="font-medium text-accent">חודשי מתחדש</span> : <span><strong>{days}</strong> ימים</span>}
              <span>{Number(priceMonthly).toLocaleString('he-IL')} ₪ למחשב/חודש</span>
              {selectedIds.size > 1 && (
                <span className="font-bold text-accent">
                  סה"כ חודשי: {(selectedIds.size * Number(priceMonthly)).toLocaleString('he-IL')} ₪
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150">ביטול</button>
          <button type="submit" disabled={bulkMutation.isPending || selectedIds.size === 0} className="px-5 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50">
            {bulkMutation.isPending ? 'יוצר...' : selectedIds.size <= 1 ? 'צור השכרה' : `צור ${selectedIds.size} השכרות`}
          </button>
        </div>
      </form>
    </Modal>
  )
}
