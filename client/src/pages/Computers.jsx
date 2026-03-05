import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, QrCode } from 'lucide-react'
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

export default function Computers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)

  const { data: computers = [], isLoading } = useQuery({
    queryKey: ['computers'],
    queryFn: () => api.get('/computers').then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editId
        ? api.put(`/computers/${editId}`, data).then((r) => r.data)
        : api.post('/computers', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast.success(editId ? 'המחשב עודכן בהצלחה' : 'המחשב נוסף בהצלחה')
      closeModal()
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'שגיאה בשמירה')
    },
  })

  const filtered = computers.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
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
      ram: computer.specs?.ram || computer.ram || '',
      cpu: computer.specs?.cpu || computer.cpu || '',
      storage: computer.specs?.storage || computer.storage || '',
      priceMonthly: computer.priceMonthly || '',
      status: computer.status || 'AVAILABLE',
      notes: computer.notes || '',
    })
    setShowModal(true)
    setShowDetail(null)
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
      render: (val) => (val ? `${Number(val).toLocaleString('he-IL')} \u20AA` : '-'),
    },
    {
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
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">מחשבים</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-text-primary text-white text-sm font-semibold rounded-sm hover:opacity-90 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          הוסף מחשב
        </button>
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
          data={filtered}
          onRowClick={(row) => setShowDetail(row)}
          emptyMessage="לא נמצאו מחשבים"
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
            <FormField
              label="מחיר חודשי"
              value={form.priceMonthly}
              onChange={(v) => updateField('priceMonthly', v)}
              type="number"
            />
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
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <Modal title={`מחשב ${showDetail.internalId}`} onClose={() => setShowDetail(null)}>
          <div className="space-y-3">
            <DetailRow label="מזהה" value={showDetail.internalId} />
            <DetailRow label="דגם" value={showDetail.model} />
            <DetailRow label="מותג" value={showDetail.brand} />
            <DetailRow label="סריאלי" value={showDetail.serial} />
            <DetailRow label="RAM" value={showDetail.specs?.ram || showDetail.ram} />
            <DetailRow label="CPU" value={showDetail.specs?.cpu || showDetail.cpu} />
            <DetailRow label="אחסון" value={showDetail.specs?.storage || showDetail.storage} />
            <DetailRow
              label="מחיר חודשי"
              value={showDetail.priceMonthly ? `${Number(showDetail.priceMonthly).toLocaleString('he-IL')} \u20AA` : '-'}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-tertiary w-20">סטטוס</span>
              <StatusBadge status={showDetail.status} />
            </div>
            {showDetail.notes && <DetailRow label="הערות" value={showDetail.notes} />}
            <div className="flex gap-3 justify-end pt-3 border-t border-border">
              <button
                onClick={() => openEdit(showDetail)}
                className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150"
              >
                עריכה
              </button>
              <button
                onClick={() => {
                  toast.success('QR Code נוצר (בקרוב)')
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150"
              >
                <QrCode className="w-3.5 h-3.5" />
                צור QR
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
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
