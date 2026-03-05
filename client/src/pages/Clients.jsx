import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import DataTable from '../components/shared/DataTable'
import SearchInput from '../components/shared/SearchInput'
import Modal from '../components/shared/Modal'
import StatusBadge from '../components/shared/StatusBadge'

const emptyForm = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  idNumber: '',
  address: '',
  notes: '',
}

export default function Clients() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showProfile, setShowProfile] = useState(null)
  const [profileTab, setProfileTab] = useState('details')
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editId
        ? api.put(`/clients/${editId}`, data).then((r) => r.data)
        : api.post('/clients', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success(editId ? 'הלקוח עודכן בהצלחה' : 'הלקוח נוסף בהצלחה')
      closeModal()
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'שגיאה בשמירה')
    },
  })

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.contactPerson || c.contactName || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  })

  const openAdd = () => {
    setEditId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (client) => {
    setEditId(client._id || client.id)
    setForm({
      name: client.name || '',
      contactPerson: client.contactPerson || client.contactName || '',
      phone: client.phone || '',
      email: client.email || '',
      idNumber: client.idNumber || '',
      address: client.address || '',
      notes: client.notes || '',
    })
    setShowModal(true)
    setShowProfile(null)
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
      contactName: form.contactPerson || form.contactName,
    })
  }

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const columns = [
    { key: 'name', label: 'שם' },
    { key: 'contactPerson', label: 'איש קשר' },
    { key: 'phone', label: 'טלפון' },
    { key: 'email', label: 'אימייל' },
    {
      key: 'balance',
      label: 'יתרת חוב',
      render: (val) => {
        const amount = val || 0
        return (
          <span className={amount > 0 ? 'text-red-status font-semibold' : 'text-text-primary'}>
            {amount > 0 ? `${Number(amount).toLocaleString('he-IL')} \u20AA` : '-'}
          </span>
        )
      },
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
        <h1 className="text-xl font-bold text-text-primary">לקוחות</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-text-primary text-white text-sm font-semibold rounded-sm hover:opacity-90 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          הוסף לקוח
        </button>
      </div>

      {/* Search */}
      <div className="w-full sm:w-72">
        <SearchInput value={search} onChange={setSearch} placeholder="חיפוש לפי שם, טלפון, אימייל..." />
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-text-tertiary text-sm">טוען...</p>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => {
            setShowProfile(row)
            setProfileTab('details')
          }}
          emptyMessage="לא נמצאו לקוחות"
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editId ? 'עריכת לקוח' : 'הוספת לקוח'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField label="שם" value={form.name} onChange={(v) => updateField('name', v)} required />
            <FormField label="איש קשר" value={form.contactPerson} onChange={(v) => updateField('contactPerson', v)} />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="טלפון" value={form.phone} onChange={(v) => updateField('phone', v)} />
              <FormField label="אימייל" value={form.email} onChange={(v) => updateField('email', v)} type="email" />
            </div>
            <FormField label="ת.ז. / ח.פ." value={form.idNumber} onChange={(v) => updateField('idNumber', v)} />
            <FormField label="כתובת" value={form.address} onChange={(v) => updateField('address', v)} />
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

      {/* Client Profile Modal */}
      {showProfile && (
        <ClientProfile
          client={showProfile}
          activeTab={profileTab}
          onTabChange={setProfileTab}
          onClose={() => setShowProfile(null)}
          onEdit={() => openEdit(showProfile)}
        />
      )}
    </div>
  )
}

function ClientProfile({ client, activeTab, onTabChange, onClose, onEdit }) {
  const clientId = client._id || client.id

  const { data: rentals = [] } = useQuery({
    queryKey: ['client-rentals', clientId],
    queryFn: () => api.get(`/clients/${clientId}/rentals`).then((r) => r.data).catch(() => []),
    enabled: activeTab === 'rentals',
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['client-payments', clientId],
    queryFn: () => api.get(`/clients/${clientId}/payments`).then((r) => r.data).catch(() => []),
    enabled: activeTab === 'payments',
  })

  const tabs = [
    { key: 'details', label: 'פרטים' },
    { key: 'rentals', label: 'השכרות' },
    { key: 'payments', label: 'תשלומים' },
  ]

  return (
    <Modal title={client.name} onClose={onClose} wide>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-150 ${
              activeTab === tab.key
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-accent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div className="space-y-3">
          <DetailRow label="שם" value={client.name} />
          <DetailRow label="איש קשר" value={client.contactPerson} />
          <DetailRow label="טלפון" value={client.phone} />
          <DetailRow label="אימייל" value={client.email} />
          <DetailRow label="ת.ז. / ח.פ." value={client.idNumber} />
          <DetailRow label="כתובת" value={client.address} />
          <DetailRow
            label="יתרת חוב"
            value={
              client.balance > 0
                ? `${Number(client.balance).toLocaleString('he-IL')} \u20AA`
                : 'ללא חוב'
            }
            highlight={client.balance > 0}
          />
          {client.notes && <DetailRow label="הערות" value={client.notes} />}
          <div className="flex justify-end pt-3 border-t border-border">
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150"
            >
              עריכה
            </button>
          </div>
        </div>
      )}

      {activeTab === 'rentals' && (
        <div className="space-y-2">
          {rentals.length > 0 ? (
            rentals.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-bg rounded-sm">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{r.computerInternalId || r.computer?.internalId || r.computerId}</span>
                  <span className="text-xs text-text-tertiary">
                    {new Date(r.startDate).toLocaleDateString('he-IL')}
                  </span>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))
          ) : (
            <p className="text-text-tertiary text-sm text-center py-4">אין השכרות</p>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-2">
          {payments.length > 0 ? (
            payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-bg rounded-sm">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    {Number(p.amount).toLocaleString('he-IL')} {'\u20AA'}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {new Date(p.date).toLocaleDateString('he-IL')}
                  </span>
                  <span className="text-xs text-text-tertiary">{p.method}</span>
                </div>
                <StatusBadge status={p.status || 'PAID'} />
              </div>
            ))
          ) : (
            <p className="text-text-tertiary text-sm text-center py-4">אין תשלומים</p>
          )}
        </div>
      )}
    </Modal>
  )
}

function FormField({ label, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
      />
    </div>
  )
}

function DetailRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-text-tertiary w-24">{label}</span>
      <span className={`text-sm ${highlight ? 'text-red-status font-semibold' : 'text-text-primary'}`}>
        {value || '-'}
      </span>
    </div>
  )
}
