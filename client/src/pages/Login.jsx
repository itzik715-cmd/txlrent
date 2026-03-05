import { useState } from 'react'
import { Shield } from 'lucide-react'
import useAuthStore from '../store/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [mfaStep, setMfaStep] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password, mfaStep ? totpCode : undefined)
      if (result?.mfaRequired) {
        setMfaStep(true)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'שם משתמש או סיסמה שגויים')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <svg width="56" height="62" viewBox="0 0 34 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 0L33.5 9.5V28.5L17 38L0.5 28.5V9.5L17 0Z" fill="#0693E3"/>
              <rect x="9" y="13" width="16" height="10" rx="1.5" fill="white" stroke="white" strokeWidth="0.5"/>
              <rect x="12" y="14.5" width="10" height="7" rx="1" fill="#0693E3"/>
              <rect x="11" y="24" width="12" height="1.5" rx="0.75" fill="white"/>
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">ComputeRent</h1>
          <p className="text-accent font-semibold text-sm mt-0.5">T.X.L Group</p>
          <p className="text-text-secondary mt-2 text-sm">מערכת ניהול השכרת מחשבים</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4"
        >
          {!mfaStep ? (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  אימייל
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
                  placeholder="admin@laptrack.co.il"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  סיסמה
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
                  placeholder="הזן סיסמה"
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-accent">
                <Shield className="w-5 h-5" />
                <span className="text-sm font-bold">אימות דו-שלבי</span>
              </div>
              <p className="text-xs text-text-tertiary text-center">הזן את הקוד מאפליקציית Google Authenticator</p>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoFocus
                className="w-full px-3 py-3 bg-bg border border-border rounded-sm text-text-primary text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"
                placeholder="000000"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => { setMfaStep(false); setTotpCode(''); setError('') }}
                className="w-full text-xs text-text-tertiary hover:text-accent transition-all"
              >
                חזרה לכניסה
              </button>
            </div>
          )}

          {error && (
            <div className="text-red-status text-sm bg-red-soft px-3 py-2 rounded-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mfaStep && totpCode.length !== 6)}
            className="w-full py-2.5 bg-accent text-white rounded-sm font-semibold hover:opacity-90 transition-all duration-150 disabled:opacity-50"
          >
            {loading ? 'מתחבר...' : mfaStep ? 'אמת' : 'כניסה'}
          </button>
        </form>

        <p className="text-center text-text-tertiary text-xs mt-6">
          073-3767888 &middot; txlcomp.co.il
        </p>
      </div>
    </div>
  )
}
