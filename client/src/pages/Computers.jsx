import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus, QrCode, Pencil, Calendar, User, CreditCard, Archive, ShoppingCart, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import DataTable from '../components/shared/DataTable'
import SearchInput from '../components/shared/SearchInput'
import StatusBadge from '../components/shared/StatusBadge'
import Modal from '../components/shared/Modal'

const statusTabs = [
  { key: 'all', label: 'הכל' },
  { key: 'AVAILABLE', label: 'פנוי' },
  { key: 'RENTED', label: 'מושכר' },
  { key: 'MAINTENANCE', label: 'תיקון' },
  { key: 'archive', label: 'ארכיון' },
]

const emptyForm = {
  internalId: '',
  model: '',
  brand: '',
  serial: '',
  ram: '',
  cpu: '',
  storage: '',
  priceMonthly: '',
  status: 'AVAILABLE',
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

  // Open detail from URL param (e.g. /computers?detail=xxx)
  useEffect(() => {
    const d = searchParams.get('detail')
    if (d) {
      setDetailId(d)
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

  const filtered = computers.filter((c) => {
    const matchesStatus = isArchiveView || statusFilter === 'all' || c.status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (c.internalId || '').toLowerCase().includes(q) ||
      (c.model || '').toLowerCase().includes(q) ||
      (c.brand || '').toLowerCase().includes(q) ||
      (c.serial || '').toLowerCase().includes(q)
    return matchesStatus && matchesSearch
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
      priceMonthly: computer.priceMonthly || '',
      status: computer.status || 'AVAILABLE',
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
    saveMutation.mutate({
      ...form,
      priceMonthly: Number(form.priceMonthly),
      specs: { ram: form.ram, cpu: form.cpu, storage: form.storage },
    })
  }

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const columns = [
    { key: 'internalId', label: 'מזהה' },
    { key: 'model', label: 'דגם' },
    { key: 'brand', label: 'מותג' },
    { key: 'serial', label: 'סריאלי' },
    {
      key: 'status',
      label: 'סטטוס',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'priceMonthly',
      label: 'מחיר חודשי',
      render: (val) => formatCurrency(val),
    },
    ...(isArchiveView ? [] : [{
      key: 'actions',
      label: 'פעולות',
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

      {/* Table */}
      {isLoading ? (
        <p className="text-text-tertiary text-sm">טוען...</p>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => setDetailId(row.id)}
          emptyMessage={isArchiveView ? 'אין מחשבים בארכיון' : 'לא נמצאו מחשבים'}
        />
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
            <FormField label="מחיר חודשי" value={form.priceMonthly} onChange={(v) => updateField('priceMonthly', v)} type="number" />
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

  const tabs = [
    { key: 'info', label: 'פרטים' },
    { key: 'history', label: `היסטוריה (${totalRentals})` },
  ]

  return (
    <Modal title={`${computer.internalId} — ${computer.brand} ${computer.model}`} onClose={onClose} wide>
      {/* Status + Quick Stats */}
      <div className="flex flex-wrap gap-3 mb-5">
        <StatusBadge status={computer.status} />
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <CreditCard className="w-3.5 h-3.5" />
          <span>{formatCurrency(computer.priceMonthly)}/חודש</span>
        </div>
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
            <DetailRow label="מחיר חודשי" value={formatCurrency(computer.priceMonthly)} />
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
