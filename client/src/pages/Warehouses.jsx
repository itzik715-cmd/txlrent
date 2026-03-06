import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Warehouse, ChevronDown, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function Warehouses() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', address: '', notes: '' })
  const [expandedId, setExpandedId] = useState(null)

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/settings/warehouses').then(r => r.data),
  })

  const { data: expandedComputers = [], isFetching: loadingComputers } = useQuery({
    queryKey: ['warehouse-computers', expandedId],
    queryFn: () => api.get('/computers', { params: { warehouseId: expandedId } }).then(r => r.data),
    enabled: !!expandedId,
  })

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data) => editId
      ? api.put(`/settings/warehouses/${editId}`, data).then(r => r.data)
      : api.post('/settings/warehouses', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success(editId ? 'מחסן עודכן' : 'מחסן נוצר')
      closeForm()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/settings/warehouses/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('מחסן נמחק')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה'),
  })

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm({ name: '', address: '', notes: '' })
  }

  const openEdit = (wh) => {
    setEditId(wh.id)
    setForm({ name: wh.name, address: wh.address || '', notes: wh.notes || '' })
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('נדרש שם מחסן')
    saveMutation.mutate(form)
  }

  const total = summary ? (summary.available || 0) + (summary.rented || 0) + (summary.maintenance || 0) : 0
  const rented = summary?.rented || 0
  const utilization = total > 0 ? Math.round((rented / total) * 100) : 0
  const totalInWarehouses = warehouses.reduce((sum, wh) => sum + (wh._count?.computers || 0), 0)

  if (isLoading) return <p className="text-text-tertiary text-sm p-6">טוען...</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">מחסנים וניצולת צי</h1>
        <button onClick={() => { closeForm(); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150">
          <Plus className="w-3.5 h-3.5" /> הוסף מחסן
        </button>
      </div>

      {/* Fleet Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-sm p-4">
          <div className="text-xs text-text-tertiary mb-1">סה"כ מחשבים</div>
          <div className="text-2xl font-bold text-text-primary">{total}</div>
        </div>
        <div className="bg-surface border border-border rounded-sm p-4">
          <div className="text-xs text-text-tertiary mb-1">מושכרים</div>
          <div className="text-2xl font-bold text-accent">{rented}</div>
        </div>
        <div className="bg-surface border border-border rounded-sm p-4">
          <div className="text-xs text-text-tertiary mb-1">ניצולת צי</div>
          <div className="text-2xl font-bold text-text-primary">{utilization}%</div>
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mt-2">
            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${utilization}%` }} />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-sm p-4">
          <div className="text-xs text-text-tertiary mb-1">במחסנים</div>
          <div className="text-2xl font-bold text-text-primary">{totalInWarehouses}</div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-sm p-4 space-y-3">
          <h3 className="text-sm font-bold text-text-primary">{editId ? 'עריכת מחסן' : 'הוספת מחסן'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">שם מחסן *</label>
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">כתובת</label>
              <input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">הערות</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={closeForm}
              className="px-3 py-1.5 text-xs font-medium bg-transparent border border-border rounded-sm hover:border-accent hover:text-accent transition-all duration-150">ביטול</button>
            <button type="submit" disabled={saveMutation.isPending}
              className="px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50">
              {saveMutation.isPending ? 'שומר...' : editId ? 'עדכן' : 'צור'}
            </button>
          </div>
        </form>
      )}

      {/* Warehouse List */}
      <div className="space-y-3">
        {warehouses.map(wh => (
          <div key={wh.id} className="bg-surface border border-border rounded-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg transition-colors"
              onClick={() => setExpandedId(expandedId === wh.id ? null : wh.id)}>
              <div className="flex items-center gap-3">
                {expandedId === wh.id ? <ChevronDown className="w-4 h-4 text-text-tertiary" /> : <ChevronLeft className="w-4 h-4 text-text-tertiary" />}
                <Warehouse className="w-5 h-5 text-accent" />
                <div>
                  <span className="text-sm font-semibold text-text-primary">{wh.name}</span>
                  {wh.address && <span className="text-xs text-text-tertiary mr-2">({wh.address})</span>}
                </div>
                <span className="text-xs bg-accent-soft text-accent px-2 py-0.5 rounded-full font-medium">
                  {wh._count?.computers || 0} מחשבים
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); openEdit(wh) }}
                  className="p-1.5 text-text-tertiary hover:text-accent transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm('למחוק מחסן זה?')) deleteMutation.mutate(wh.id) }}
                  className="p-1.5 text-text-tertiary hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {expandedId === wh.id && (
              <div className="border-t border-border px-4 py-3">
                {loadingComputers ? (
                  <p className="text-xs text-text-tertiary">טוען מחשבים...</p>
                ) : expandedComputers.length === 0 ? (
                  <p className="text-xs text-text-tertiary">אין מחשבים במחסן זה</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-text-secondary font-medium mb-2">מחשבים במחסן ({expandedComputers.length}):</p>
                    <div className="grid gap-1 max-h-80 overflow-y-auto">
                      {expandedComputers.map(comp => (
                        <div key={comp.id} className="flex items-center justify-between bg-bg rounded-sm px-3 py-2 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-semibold text-accent">{comp.internalId}</span>
                            <span className="text-text-primary">{comp.brand} {comp.model}</span>
                            <span className="text-text-tertiary">{comp.serial}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            comp.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                            comp.status === 'RENTED' ? 'bg-blue-100 text-blue-700' :
                            comp.status === 'MAINTENANCE' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {comp.status === 'AVAILABLE' ? 'פנוי' :
                             comp.status === 'RENTED' ? 'מושכר' :
                             comp.status === 'MAINTENANCE' ? 'תחזוקה' :
                             comp.status === 'PENDING_RETURN' ? 'ממתין להחזרה' :
                             comp.status === 'PENDING_CLEANING' ? 'ממתין לניקוי' :
                             comp.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {warehouses.length === 0 && (
          <p className="text-sm text-text-tertiary text-center py-8">אין מחסנים. לחצו "הוסף מחסן" ליצירת הראשון.</p>
        )}
      </div>
    </div>
  )
}
