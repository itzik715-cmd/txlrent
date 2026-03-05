import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrCode, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import Modal from './shared/Modal'

export default function QRScanner({ onClose }) {
  const navigate = useNavigate()
  const [serial, setSerial] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!serial.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/computers/scan/${encodeURIComponent(serial.trim())}`)
      const computer = res.data
      toast.success(`נמצא: ${computer.internalId || computer.serial}`)
      onClose()
      navigate('/computers')
    } catch (err) {
      if (err.response?.status === 404) {
        setError('מחשב לא נמצא עם סריאלי זה')
      } else {
        setError(err.response?.data?.message || 'שגיאה בחיפוש')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="סריקת QR / חיפוש סריאלי" onClose={onClose}>
      <div className="space-y-4">
        {/* QR placeholder */}
        <div className="flex flex-col items-center justify-center py-8 bg-bg rounded-md border border-dashed border-border-strong">
          <QrCode className="w-12 h-12 text-text-tertiary mb-3" />
          <p className="text-sm text-text-tertiary">סריקת QR תתווסף בקרוב</p>
          <p className="text-xs text-text-tertiary mt-1">בינתיים, הזן מספר סריאלי ידנית</p>
        </div>

        {/* Manual serial entry */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">מספר סריאלי</label>
            <input
              type="text"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="הזן מספר סריאלי..."
              autoFocus
              className="w-full px-3 py-2.5 bg-bg border border-border rounded-sm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
            />
          </div>

          {error && (
            <div className="text-red-status text-sm bg-red-soft px-3 py-2 rounded-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !serial.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-white rounded-sm font-semibold hover:opacity-90 transition-all duration-150 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            {loading ? 'מחפש...' : 'חפש מחשב'}
          </button>
        </form>
      </div>
    </Modal>
  )
}
