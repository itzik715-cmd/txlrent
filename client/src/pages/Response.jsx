import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, RefreshCw, Truck, MapPin } from 'lucide-react'
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

  useEffect(() => {
    api.get(`/responses/${token}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'קישור לא תקין'))
      .finally(() => setLoading(false))
  }, [token])

  const handleChoice = async (choice) => {
    setSubmitting(true)
    try {
      await api.post(`/responses/${token}`, { choice })
      setSubmitted(true)
      setData(d => ({ ...d, answered: true, choice }))
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
          <p className="text-sm text-gray-400">ניצור איתך קשר בהקדם</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">שלום {data.client}!</h1>
          <p className="text-gray-600">
            תקופת ההשכרה של מחשב <strong>{data.computerId}</strong> ({data.computer})
            {data.expectedReturn && (
              <> מסתיימת ב-<strong>{new Date(data.expectedReturn).toLocaleDateString('he-IL')}</strong></>
            )}
          </p>
          <p className="text-gray-500 text-sm">נא בחרו אפשרות:</p>
        </div>

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
        </div>

        {submitting && (
          <p className="text-center text-gray-400 text-sm">שולח...</p>
        )}
      </div>
    </div>
  )
}
