import { useState } from 'react'
import { LogOut, QrCode } from 'lucide-react'
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
        <div className="flex items-center gap-2.5">
          {/* TXL Hexagon logo */}
          <svg width="34" height="38" viewBox="0 0 34 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 0L33.5 9.5V28.5L17 38L0.5 28.5V9.5L17 0Z" fill="#0693E3"/>
            <rect x="9" y="13" width="16" height="10" rx="1.5" fill="white" stroke="white" strokeWidth="0.5"/>
            <rect x="12" y="14.5" width="10" height="7" rx="1" fill="#0693E3"/>
            <rect x="11" y="24" width="12" height="1.5" rx="0.75" fill="white"/>
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-extrabold text-text-primary tracking-tight">ComputeRent</span>
            <span className="text-[10px] font-semibold text-accent tracking-wide">T.X.L Group</span>
          </div>
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
