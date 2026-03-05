import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Pencil, ExternalLink, CreditCard, Archive, RotateCcw, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import DataTable from '../components/shared/DataTable'
import SearchInput from '../components/shared/SearchInput'
import Modal from '../components/shared/Modal'
import StatusBadge from '../components/shared/StatusBadge'

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('he-IL') : '-')
const formatCurrency = (v) => (v ? `${Number(v).toLocaleString('he-IL')} \u20AA` : '-')

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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showProfile, setShowProfile] = useState(null)
  const [profileTab, setProfileTab] = useState('details')
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', showArchived],
    queryFn: () => api.get(showArchived ? '/clients?archived=true' : '/clients').then((r) => r.data),
  })

  // Open profile from URL param (e.g. /clients?profile=xxx)
  useEffect(() => {
    const profileId = searchParams.get('profile')
    if (profileId && clients.length > 0) {
      const client = clients.find(c => (c._id || c.id) === profileId)
      if (client) {
        setShowProfile(client)
        setProfileTab('details')
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, clients])

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editId
        ? api.put(`/clients/${editId}`, data).then((r) => r.data)
        : api.post('/clients', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client-detail'] })
      toast.success(editId ? 'הלקוח עודכן בהצלחה' : 'הלקוח נוסף בהצלחה')
      closeModal()
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'שגיאה בשמירה')
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
    ...(showArchived ? [] : [{
      key: 'balance',
      label: 'יתרת חוב',
      render: (val) => {
        const amount = val || 0
        return (
          <span className={amount > 0 ? 'text-red-status font-semibold' : 'text-text-primary'}>
            {amount > 0 ? formatCurrency(amount) : '-'}
          </span>
        )
      },
    }]),
    {
      key: 'actions',
      label: 'פעולות',
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); openEdit(row) }}
          className="text-xs font-medium text-accent hover:underline"
        >
          {showArchived ? 'צפייה' : 'עריכה'}
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">
          {showArchived ? 'ארכיון לקוחות' : 'לקוחות'}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm transition-all duration-150 ${
              showArchived
                ? 'bg-gray-600 text-white'
                : 'bg-transparent border-[1.5px] border-border text-text-secondary hover:border-accent hover:text-accent'
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'חזור לפעילים' : 'ארכיון'}
          </button>
          {!showArchived && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-text-primary text-white text-sm font-semibold rounded-sm hover:opacity-90 transition-all duration-150">
              <Plus className="w-4 h-4" />
              הוסף לקוח
            </button>
          )}
        </div>
      </div>

      <div className="w-full sm:w-72">
        <SearchInput value={search} onChange={setSearch} placeholder="חיפוש לפי שם, טלפון, אימייל..." />
      </div>

      {isLoading ? (
        <p className="text-text-tertiary text-sm">טוען...</p>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => { setShowProfile(row); setProfileTab('details') }}
          emptyMessage={showArchived ? 'אין לקוחות בארכיון' : 'לא נמצאו לקוחות'}
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
              <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={2}
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150 resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150">ביטול</button>
              <button type="submit" disabled={saveMutation.isPending} className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50">
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
          onNavigateToComputer={(computerId) => {
            setShowProfile(null)
            navigate(`/computers?detail=${computerId}`)
          }}
          onNavigateToRental={(rentalId) => {
            setShowProfile(null)
            navigate(`/rentals?detail=${rentalId}`)
          }}
        />
      )}
    </div>
  )
}

function ClientProfile({ client, activeTab, onTabChange, onClose, onEdit, onNavigateToComputer, onNavigateToRental }) {
  const queryClient = useQueryClient()
  const clientId = client._id || client.id

  const { data: clientDetail } = useQuery({
    queryKey: ['client-detail', clientId],
    queryFn: () => api.get(`/clients/${clientId}`).then((r) => r.data),
  })

  const archiveMutation = useMutation({
    mutationFn: () => api.put(`/clients/${clientId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('הלקוח הועבר לארכיון')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה'),
  })

  const restoreMutation = useMutation({
    mutationFn: () => api.put(`/clients/${clientId}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('הלקוח שוחזר')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה'),
  })

  const rentals = clientDetail?.rentals || []
  const payments = clientDetail?.payments || []
  const isArchived = client.archived || clientDetail?.archived

  const activeCount = rentals.filter((r) => r.status === 'ACTIVE' || r.status === 'OVERDUE').length
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  const tabs = [
    { key: 'details', label: 'פרטים' },
    { key: 'rentals', label: `השכרות (${rentals.length})` },
    { key: 'payments', label: `תשלומים (${payments.length})` },
  ]

  return (
    <Modal title={client.name} onClose={onClose} wide>
      {/* Quick Stats */}
      <div className="flex flex-wrap gap-3 mb-4">
        {isArchived && (
          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">ארכיון</span>
        )}
        {activeCount > 0 && (
          <span className="text-xs font-semibold text-accent bg-accent-soft px-2.5 py-1 rounded-full">
            {activeCount} השכרות פעילות
          </span>
        )}
        {(client.balance || client.outstandingBalance || 0) > 0 && (
          <span className="text-xs font-semibold text-red-status bg-red-soft px-2.5 py-1 rounded-full">
            חוב: {formatCurrency(client.balance || client.outstandingBalance)}
          </span>
        )}
        {totalPaid > 0 && (
          <span className="text-xs font-semibold text-green-status bg-green-soft px-2.5 py-1 rounded-full">
            שולם: {formatCurrency(totalPaid)}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-150 ${
              activeTab === tab.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-accent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <DetailRow label="שם" value={client.name} />
            <DetailRow label="איש קשר" value={client.contactPerson || client.contactName} />
            <DetailRow label="טלפון" value={client.phone} />
            <DetailRow label="אימייל" value={client.email} />
            <DetailRow label="ת.ז. / ח.פ." value={client.idNumber} />
            <DetailRow label="כתובת" value={client.address} />
          </div>
          <DetailRow
            label="יתרת חוב"
            value={(client.balance || client.outstandingBalance) > 0 ? formatCurrency(client.balance || client.outstandingBalance) : 'ללא חוב'}
            highlight={(client.balance || client.outstandingBalance) > 0}
          />
          {client.notes && <DetailRow label="הערות" value={client.notes} />}
          <div className="flex flex-wrap gap-3 justify-end pt-3 border-t border-border">
            {isArchived ? (
              <button
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                שחזר לקוח
              </button>
            ) : (
              <>
                <button onClick={onEdit} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150">
                  <Pencil className="w-3.5 h-3.5" />
                  עריכה
                </button>
                {activeCount === 0 && (
                  <button
                    onClick={() => {
                      if (confirm('להעביר את הלקוח לארכיון?')) archiveMutation.mutate()
                    }}
                    disabled={archiveMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-gray-400 text-gray-600 rounded-sm hover:bg-gray-100 transition-all duration-150 disabled:opacity-50"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    ארכיון
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Rentals Tab */}
      {activeTab === 'rentals' && (
        <div className="space-y-3">
          {rentals.length > 0 ? (
            rentals.map((rental) => {
              const comp = rental.computer
              const cycles = rental.billingCycles || []
              const paidAmount = cycles.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amount, 0)
              const pendingAmount = cycles.filter((c) => c.status !== 'PAID').reduce((s, c) => s + c.amount, 0)
              const duration = rental.actualReturn
                ? Math.ceil((new Date(rental.actualReturn) - new Date(rental.startDate)) / (1000 * 60 * 60 * 24))
                : Math.ceil((new Date() - new Date(rental.startDate)) / (1000 * 60 * 60 * 24))

              return (
                <div key={rental.id} className="bg-bg rounded-md p-4 border border-border/50">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Clickable computer link */}
                      <button
                        onClick={() => onNavigateToComputer(rental.computerId)}
                        className="flex items-center gap-1.5 text-sm font-bold text-accent hover:underline"
                      >
                        {comp?.internalId || rental.computerId}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      {comp && (
                        <span className="text-xs text-text-tertiary">{comp.brand} {comp.model}</span>
                      )}
                      <StatusBadge status={rental.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-tertiary">{duration} ימים</span>
                      {/* Navigate to rental detail */}
                      <button
                        onClick={() => onNavigateToRental(rental.id)}
                        className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                        title="צפה בהשכרה"
                      >
                        <FileText className="w-3 h-3" />
                        פרטים
                      </button>
                    </div>
                  </div>

                  {/* Date/price grid */}
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
                </div>
              )
            })
          ) : (
            <p className="text-text-tertiary text-sm text-center py-6">אין השכרות</p>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-2">
          {payments.length > 0 ? (
            payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-bg rounded-sm">
                <div className="flex items-center gap-4">
                  <CreditCard className="w-4 h-4 text-green-status" />
                  <span className="text-sm font-semibold text-green-status">{formatCurrency(p.amount)}</span>
                  <span className="text-xs text-text-tertiary">{formatDate(p.date)}</span>
                  {p.method && <span className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded border border-border">{p.method}</span>}
                </div>
                {p.notes && <span className="text-xs text-text-tertiary">{p.notes}</span>}
              </div>
            ))
          ) : (
            <p className="text-text-tertiary text-sm text-center py-6">אין תשלומים</p>
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
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
      />
    </div>
  )
}

function DetailRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-text-tertiary w-24">{label}</span>
      <span className={`text-sm ${highlight ? 'text-red-status font-semibold' : 'text-text-primary'}`}>{value || '-'}</span>
    </div>
  )
}
