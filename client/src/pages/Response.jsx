import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, RefreshCw, Truck, MapPin, Monitor } from 'lucide-react'
import api from '../lib/api'

const choices = [
  {
    key: 'renew',
    label: 'נא חדשו עבורי לתקופה נוספת',
    icon: RefreshCw,
    color: 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100',
  },
  {
    key: 'return_pickup',
    label: 'ברצוני להחזיר לאחת מנקודות האיסוף',
    icon: MapPin,
    color: 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100',
  },
  {
    key: 'return_courier',
    label: 'ברצוני להזמין שליח לאיסוף המחשב בעלות 50 ש"ח',
    icon: Truck,
    color: 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100',
  },
]

const choiceLabels = {
  renew: 'חידוש לתקופה נוספת',
  return_pickup: 'החזרה לנקודת איסוף',
  return_courier: 'שליח לאיסוף',
}

export default function Response() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [mode, setMode] = useState(null) // null = choose mode, 'all' = apply to all, 'single' = this computer only

  useEffect(() => {
    api.get(`/responses/${token}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'קישור לא תקין'))
      .finally(() => setLoading(false))
  }, [token])

  const handleChoice = async (choice) => {
    setSubmitting(true)
    try {
      if (mode === 'all' && data.siblings?.length > 0) {
        // Bulk: current token + all sibling tokens
        const allTokens = [token, ...data.siblings.map(s => s.token)]
        await api.post('/responses/bulk', { tokens: allTokens, choice })
        setSubmitted(true)
        setData(d => ({ ...d, answered: true, choice, bulkCount: allTokens.length }))
      } else {
        await api.post(`/responses/${token}`, { choice })
        setSubmitted(true)
        setData(d => ({ ...d, answered: true, choice }))
      }
    } catch (err) {
      if (err.response?.data?.choice) {
        setData(d => ({ ...d, answered: true, choice: err.response.data.choice }))
      } else {
        setError(err.response?.data?.error || 'שגיאה')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <p className="text-gray-500 text-lg">טוען...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <p className="text-red-600 text-lg font-bold">{error}</p>
        </div>
      </div>
    )
  }

  if (data.answered) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-800">תודה!</h1>
          <p className="text-gray-600">
            הבחירה שלך נקלטה: <strong>{choiceLabels[data.choice] || data.choice}</strong>
          </p>
          {data.bulkCount > 1 && (
            <p className="text-sm text-gray-500">הבחירה הוחלה על כל {data.bulkCount} המחשבים</p>
          )}
          <p className="text-sm text-gray-400">ניצור איתך קשר בהקדם</p>
        </div>
      </div>
    )
  }

  const hasSiblings = data.siblings && data.siblings.length > 0
  const allComputers = hasSiblings
    ? [{ computerId: data.computerId, computer: data.computer, expectedReturn: data.expectedReturn }, ...data.siblings]
    : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">שלום {data.client}!</h1>

          {/* Show mode selection if there are siblings and no mode chosen yet */}
          {hasSiblings && !mode ? (
            <>
              <p className="text-gray-600">
                יש לך <strong>{allComputers.length} מחשבים</strong> מושכרים:
              </p>
              <div className="space-y-2 my-4 text-right">
                {allComputers.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <Monitor className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-800">{c.computerId}</span>
                      <span className="text-xs text-gray-500 mr-2">({c.computer})</span>
                    </div>
                    {c.expectedReturn && (
                      <span className="text-xs text-gray-400">עד {new Date(c.expectedReturn).toLocaleDateString('he-IL')}</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-sm">מה תרצו לעשות?</p>
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setMode('all')}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 transition-all duration-200"
                >
                  <Monitor className="w-5 h-5" />
                  <span className="text-sm font-bold">בחר עבור כל {allComputers.length} המחשבים</span>
                </button>
                <button
                  onClick={() => setMode('single')}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100 transition-all duration-200"
                >
                  <span className="text-sm font-medium">בחר רק עבור {data.computerId}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {mode === 'all' ? (
                <p className="text-gray-600">
                  בחירה עבור <strong>כל {allComputers.length} המחשבים</strong>
                </p>
              ) : (
                <p className="text-gray-600">
                  תקופת ההשכרה של מחשב <strong>{data.computerId}</strong> ({data.computer})
                  {data.expectedReturn && (
                    <> מסתיימת ב-<strong>{new Date(data.expectedReturn).toLocaleDateString('he-IL')}</strong></>
                  )}
                </p>
              )}
              <p className="text-gray-500 text-sm">נא בחרו אפשרות:</p>
            </>
          )}
        </div>

        {/* Show choices when mode is selected (or no siblings) */}
        {(mode || !hasSiblings) && (
          <div className="space-y-3">
            {choices.map(choice => (
              <button
                key={choice.key}
                onClick={() => handleChoice(choice.key)}
                disabled={submitting}
                className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 text-right transition-all duration-200 ${choice.color} disabled:opacity-50`}
              >
                <choice.icon className="w-6 h-6 flex-shrink-0" />
                <span className="text-sm font-semibold">{choice.label}</span>
              </button>
            ))}

            {hasSiblings && mode && (
              <button
                onClick={() => setMode(null)}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 pt-2"
              >
                ← חזרה
              </button>
            )}
          </div>
        )}

        {submitting && (
          <p className="text-center text-gray-400 text-sm">שולח...</p>
        )}
      </div>
    </div>
  )
}
