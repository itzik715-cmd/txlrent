import { useState } from 'react'
import { Laptop, LogOut, QrCode } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import QRScanner from '../QRScanner'

export default function Header() {
  const { user, logout } = useAuthStore()
  const [showQR, setShowQR] = useState(false)

  return (
    <>
      <header className="h-14 sticky top-0 z-50 flex items-center justify-between px-5 border-b border-border"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        {/* Right side — Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-text-primary rounded-md flex items-center justify-center">
            <Laptop className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-text-primary">LapTrack</span>
        </div>

        {/* Left side — Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-text-primary text-white text-sm font-medium rounded-sm hover:opacity-90 transition-all duration-150"
          >
            <QrCode className="w-4 h-4" />
            <span>סרוק QR</span>
          </button>

          <div className="text-sm text-text-secondary font-medium">
            {user?.name || user?.email || 'משתמש'}
          </div>

          <button
            onClick={logout}
            className="p-2 text-text-tertiary hover:text-red-status transition-all duration-150"
            title="התנתק"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {showQR && <QRScanner onClose={() => setShowQR(false)} />}
    </>
  )
}
