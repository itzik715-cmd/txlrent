import { useState } from 'react'
import { Laptop } from 'lucide-react'
import useAuthStore from '../store/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.response?.data?.message || 'שם משתמש או סיסמה שגויים')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-text-primary rounded-lg mb-4">
            <Laptop className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">LapTrack</h1>
          <p className="text-text-secondary mt-1 text-sm">ניהול השכרת מחשבים ניידים</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4"
        >
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

          {error && (
            <div className="text-red-status text-sm bg-red-soft px-3 py-2 rounded-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-text-primary text-white rounded-sm font-semibold hover:opacity-90 transition-all duration-150 disabled:opacity-50"
          >
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  )
}
