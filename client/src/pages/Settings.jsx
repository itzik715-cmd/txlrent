import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, TestTube, Send, MessageCircle, Clock, FileText, Info, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

const tabs = [
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'templates', label: 'תבניות הודעה', icon: FileText },
  { key: 'alerts', label: 'התראות אוטומטיות', icon: Clock },
  { key: 'logs', label: 'יומן שליחות', icon: Send },
  { key: 'responses', label: 'תגובות לקוחות', icon: CheckCircle2 },
  { key: 'guide', label: 'מדריך חיבור', icon: Info },
]

const formatDate = (d) => d ? new Date(d).toLocaleString('he-IL') : '-'

export default function Settings() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('whatsapp')

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  })

  if (isLoading) {
    return <p className="text-text-tertiary text-sm p-6">טוען הגדרות...</p>
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-text-primary">הגדרות</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-3">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-150 ${
              activeTab === tab.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-accent hover:bg-accent-soft'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'whatsapp' && <WhatsAppConfig settings={settings} />}
      {activeTab === 'templates' && <TemplatesConfig settings={settings} />}
      {activeTab === 'alerts' && <AlertsConfig settings={settings} />}
      {activeTab === 'logs' && <LogsView />}
      {activeTab === 'responses' && <ResponsesView />}
      {activeTab === 'guide' && <SetupGuide />}
    </div>
  )
}

/* ─── WhatsApp Connection Config ─── */
function WhatsAppConfig({ settings }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    wa_enabled: settings.wa_enabled || 'false',
    wa_provider: settings.wa_provider || 'greenapi',
    wa_instance_id: settings.wa_instance_id || '',
    wa_api_token: settings.wa_api_token || '',
    wa_sender_name: settings.wa_sender_name || '',
    wa_base_url: settings.wa_base_url || 'https://api.greenapi.com',
  })
  const [testPhone, setTestPhone] = useState('')
  const [connectionStatus, setConnectionStatus] = useState(null)

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('ההגדרות נשמרו')
    },
    onError: () => toast.error('שגיאה בשמירה'),
  })

  const testConnectionMutation = useMutation({
    mutationFn: () => api.post('/whatsapp/test'),
    onSuccess: (res) => {
      setConnectionStatus(res.data)
      if (res.data.success) toast.success('החיבור תקין!')
      else toast.error(res.data.error || 'החיבור נכשל')
    },
    onError: () => toast.error('שגיאה בבדיקת חיבור'),
  })

  const sendTestMutation = useMutation({
    mutationFn: (data) => api.post('/whatsapp/send-test', data),
    onSuccess: (res) => {
      if (res.data.sent) toast.success('הודעת בדיקה נשלחה!')
      else toast.error(res.data.reason || 'שליחה נכשלה')
    },
    onError: () => toast.error('שגיאה'),
  })

  const inputClass = "w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"

  return (
    <div className="space-y-5">
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-bold text-text-primary">חיבור WhatsApp - Green API</h2>

        {/* Enable toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.wa_enabled === 'true'}
            onChange={(e) => setForm(f => ({ ...f, wa_enabled: e.target.checked ? 'true' : 'false' }))}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-text-primary">הפעל שליחת WhatsApp</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Instance ID</label>
            <input value={form.wa_instance_id} onChange={e => setForm(f => ({ ...f, wa_instance_id: e.target.value }))} className={inputClass} placeholder="1234567890" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">API Token</label>
            <input value={form.wa_api_token} onChange={e => setForm(f => ({ ...f, wa_api_token: e.target.value }))} className={inputClass} placeholder="abcdef1234567890..." />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">שם שולח (בהודעות)</label>
            <input value={form.wa_sender_name} onChange={e => setForm(f => ({ ...f, wa_sender_name: e.target.value }))} className={inputClass} placeholder="קרינה מקומפיוטר-רנט" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Base URL (אופציונלי)</label>
            <input value={form.wa_base_url} onChange={e => setForm(f => ({ ...f, wa_base_url: e.target.value }))} className={inputClass} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? 'שומר...' : 'שמור הגדרות'}
          </button>
          <button
            onClick={() => testConnectionMutation.mutate()}
            disabled={testConnectionMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent transition-all duration-150"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testConnectionMutation.isPending ? 'animate-spin' : ''}`} />
            בדוק חיבור
          </button>
        </div>

        {connectionStatus && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-sm text-sm ${connectionStatus.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {connectionStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {connectionStatus.success ? `מחובר! סטטוס: ${connectionStatus.state}` : `לא מחובר: ${connectionStatus.error || connectionStatus.state}`}
          </div>
        )}
      </div>

      {/* Test Message */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-bold text-text-primary">שלח הודעת בדיקה</h2>
        <div className="flex gap-3">
          <input
            value={testPhone}
            onChange={e => setTestPhone(e.target.value)}
            placeholder="050-1234567"
            className={inputClass + " max-w-[200px]"}
          />
          <button
            onClick={() => sendTestMutation.mutate({ phone: testPhone })}
            disabled={!testPhone || sendTestMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {sendTestMutation.isPending ? 'שולח...' : 'שלח בדיקה'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Message Templates ─── */
function TemplatesConfig({ settings }) {
  const queryClient = useQueryClient()

  const defaultTemplate = `היי {clientName}, כאן {senderName} ממחלקת התפעול
שמנו לב שבעוד {daysLeft} ימים ({expectedReturn}) מסתיימת לך תקופת השכרת המחשב {computerId}, אבל היי אל דאגה!

לבחירתך 3 אפשרויות:
1. נא חדשו עבורי לתקופה נוספת
2. ברצוני להחזיר לאחת מנקודות האיסוף
3. ברצוני להזמין שליח לאיסוף המחשב בעלות 50 ש"ח

לבחירה לחצו כאן: {responseUrl}`

  const [template, setTemplate] = useState(settings.wa_template_expiring || defaultTemplate)

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('התבנית נשמרה')
    },
  })

  const inputClass = "w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"

  return (
    <div className="space-y-5">
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-bold text-text-primary">תבנית הודעה — תזכורת החזרה</h2>
        <p className="text-xs text-text-tertiary">
          משתנים זמינים: <code className="bg-bg px-1 rounded">{'{clientName}'}</code> <code className="bg-bg px-1 rounded">{'{computerId}'}</code> <code className="bg-bg px-1 rounded">{'{computerName}'}</code> <code className="bg-bg px-1 rounded">{'{daysLeft}'}</code> <code className="bg-bg px-1 rounded">{'{expectedReturn}'}</code> <code className="bg-bg px-1 rounded">{'{senderName}'}</code> <code className="bg-bg px-1 rounded">{'{responseUrl}'}</code>
        </p>
        <textarea
          value={template}
          onChange={e => setTemplate(e.target.value)}
          rows={12}
          className={inputClass + " resize-y font-mono text-xs leading-relaxed"}
          dir="rtl"
        />

        {/* Preview */}
        <div>
          <h3 className="text-xs font-semibold text-text-secondary mb-2">תצוגה מקדימה:</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed" dir="rtl">
            {template
              .replace(/\{clientName\}/g, 'ישראל ישראלי')
              .replace(/\{computerName\}/g, 'LENOVO L13')
              .replace(/\{computerId\}/g, 'TXL3881')
              .replace(/\{daysLeft\}/g, '3')
              .replace(/\{expectedReturn\}/g, '08/03/2026')
              .replace(/\{senderName\}/g, settings.wa_sender_name || 'LapTrack')
              .replace(/\{responseUrl\}/g, 'https://5.100.255.162/r/abc123')}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => saveMutation.mutate({ wa_template_expiring: template })}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? 'שומר...' : 'שמור תבנית'}
          </button>
          <button
            onClick={() => setTemplate(defaultTemplate)}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-accent transition-all duration-150"
          >
            שחזר ברירת מחדל
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Auto Alerts Config ─── */
function AlertsConfig({ settings }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    wa_auto_alerts: settings.wa_auto_alerts || 'false',
    wa_alert_days_before: settings.wa_alert_days_before || '3',
  })

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('הגדרות התראות נשמרו')
    },
  })

  const inputClass = "w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"

  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-bold text-text-primary">התראות אוטומטיות</h2>
      <p className="text-xs text-text-tertiary">
        המערכת תשלח הודעת WhatsApp אוטומטית ללקוחות לפני סיום תקופת ההשכרה, כל יום בשעה 08:00
      </p>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.wa_auto_alerts === 'true'}
          onChange={(e) => setForm(f => ({ ...f, wa_auto_alerts: e.target.checked ? 'true' : 'false' }))}
          className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
        />
        <span className="text-sm font-medium text-text-primary">הפעל התראות אוטומטיות</span>
      </label>

      <div className="max-w-[200px]">
        <label className="block text-xs font-medium text-text-secondary mb-1">שלח התראה X ימים לפני סיום</label>
        <input
          type="number"
          value={form.wa_alert_days_before}
          onChange={e => setForm(f => ({ ...f, wa_alert_days_before: e.target.value }))}
          min="1"
          max="30"
          className={inputClass}
        />
      </div>

      <button
        onClick={() => saveMutation.mutate(form)}
        disabled={saveMutation.isPending}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
      >
        <Save className="w-3.5 h-3.5" />
        {saveMutation.isPending ? 'שומר...' : 'שמור'}
      </button>
    </div>
  )
}

/* ─── Logs ─── */
function LogsView() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['whatsapp-logs'],
    queryFn: () => api.get('/whatsapp/logs').then(r => r.data),
  })

  if (isLoading) return <p className="text-text-tertiary text-sm">טוען...</p>

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-sm font-bold text-text-primary">יומן שליחות ({logs.length})</h2>
      </div>
      {logs.length === 0 ? (
        <p className="text-text-tertiary text-sm text-center py-8">אין הודעות שנשלחו עדיין</p>
      ) : (
        <div className="max-h-[500px] overflow-y-auto divide-y divide-border/50">
          {logs.map(log => (
            <div key={log.id} className="px-5 py-3 flex items-start gap-4">
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'SENT' ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span className="font-semibold text-text-primary">{log.rental?.client?.name || log.phone}</span>
                  <span>{log.rental?.computer?.internalId || '-'}</span>
                  <span>{formatDate(log.createdAt)}</span>
                  <span className={log.status === 'SENT' ? 'text-green-600' : 'text-red-600'}>{log.status}</span>
                </div>
                <p className="text-xs text-text-tertiary mt-1 truncate max-w-[600px]">{log.message}</p>
                {log.response && <p className="text-xs text-red-500 mt-0.5">{log.response}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Client Responses ─── */
function ResponsesView() {
  const { data: responses = [], isLoading } = useQuery({
    queryKey: ['whatsapp-responses'],
    queryFn: () => api.get('/whatsapp/responses').then(r => r.data),
  })

  const choiceLabels = {
    renew: 'חידוש לתקופה נוספת',
    return_pickup: 'החזרה לנקודת איסוף',
    return_courier: 'שליח לאיסוף (50 ש"ח)',
  }

  if (isLoading) return <p className="text-text-tertiary text-sm">טוען...</p>

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-sm font-bold text-text-primary">תגובות לקוחות ({responses.filter(r => r.answered).length} ענו)</h2>
      </div>
      {responses.length === 0 ? (
        <p className="text-text-tertiary text-sm text-center py-8">אין תגובות עדיין</p>
      ) : (
        <div className="max-h-[500px] overflow-y-auto divide-y divide-border/50">
          {responses.map(r => (
            <div key={r.id} className="px-5 py-3 flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.answered ? 'bg-green-500' : 'bg-orange-400'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span className="font-semibold text-text-primary">{r.rental?.client?.name}</span>
                  <span>{r.rental?.computer?.internalId}</span>
                  <span>{formatDate(r.createdAt)}</span>
                </div>
                {r.answered ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                      {choiceLabels[r.choice] || r.choice}
                    </span>
                    <span className="text-xs text-text-tertiary">{formatDate(r.answeredAt)}</span>
                  </div>
                ) : (
                  <span className="text-xs text-orange-500 font-medium">ממתין לתגובה</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Setup Guide ─── */
function SetupGuide() {
  return (
    <div className="bg-surface border border-border rounded-lg p-6 space-y-6 max-w-2xl">
      <h2 className="text-lg font-bold text-text-primary">מדריך חיבור WhatsApp - Green API</h2>

      <div className="space-y-4">
        <div className="border border-border rounded-sm p-4 space-y-2">
          <h3 className="text-sm font-bold text-accent">שלב 1: הרשמה ל-Green API</h3>
          <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
            <li>היכנסו לאתר <a href="https://green-api.com" target="_blank" rel="noopener noreferrer" className="text-accent underline font-medium">green-api.com</a></li>
            <li>לחצו על "Sign Up" והירשמו עם אימייל</li>
            <li>קבלו חשבון חינמי (הכולל אינסטנס אחד לבדיקות)</li>
          </ol>
        </div>

        <div className="border border-border rounded-sm p-4 space-y-2">
          <h3 className="text-sm font-bold text-accent">שלב 2: יצירת Instance</h3>
          <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
            <li>בדשבורד של Green API, לחצו "Create Instance"</li>
            <li>תקבלו <strong>Instance ID</strong> (מספר) ו-<strong>API Token</strong> (מחרוזת ארוכה)</li>
            <li>העתיקו את שניהם — אלה הפרטים שצריך להזין כאן</li>
          </ol>
        </div>

        <div className="border border-border rounded-sm p-4 space-y-2">
          <h3 className="text-sm font-bold text-accent">שלב 3: חיבור WhatsApp</h3>
          <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
            <li>בדשבורד של Green API, לחצו על ה-Instance שיצרתם</li>
            <li>יופיע <strong>QR Code</strong></li>
            <li>פתחו WhatsApp בטלפון → הגדרות → מכשירים מקושרים → קשר מכשיר</li>
            <li>סרקו את ה-QR Code עם הטלפון</li>
            <li>חכו שהסטטוס ישתנה ל-"authorized"</li>
          </ol>
        </div>

        <div className="border border-border rounded-sm p-4 space-y-2">
          <h3 className="text-sm font-bold text-accent">שלב 4: הגדרה במערכת</h3>
          <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
            <li>עברו ללשונית "WhatsApp" למעלה</li>
            <li>הדביקו את ה-Instance ID ואת ה-API Token</li>
            <li>הזינו שם שולח (למשל: "קרינה ממחלקת התפעול בקומפיוטר-רנט")</li>
            <li>סמנו "הפעל שליחת WhatsApp"</li>
            <li>לחצו "שמור הגדרות"</li>
            <li>לחצו "בדוק חיבור" — אמור להופיע "מחובר!"</li>
            <li>שלחו הודעת בדיקה לטלפון שלכם לוודא שהכל עובד</li>
          </ol>
        </div>

        <div className="border border-accent/30 bg-accent-soft/30 rounded-sm p-4 space-y-2">
          <h3 className="text-sm font-bold text-accent">שלב 5: הגדרת תבניות והתראות</h3>
          <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
            <li>עברו ללשונית "תבניות הודעה" — ערכו את ההודעה שתישלח ללקוחות</li>
            <li>עברו ללשונית "התראות אוטומטיות" — הגדירו כמה ימים לפני סיום ההשכרה לשלוח</li>
            <li>המערכת תשלח אוטומטית כל יום בשעה 08:00</li>
            <li>אפשר גם לשלוח ידנית מתוך פרטי ההשכרה (כפתור "שלח התראה")</li>
          </ol>
        </div>

        <div className="border border-orange-300 bg-orange-50 rounded-sm p-4 space-y-2">
          <h3 className="text-sm font-bold text-orange-700">שימו לב</h3>
          <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
            <li>ה-Instance צריך להיות מחובר (authorized) כל הזמן — אם הטלפון מתנתק, הסטטוס ישתנה</li>
            <li>חשבון חינמי של Green API מוגבל — לשימוש מסחרי רציני מומלץ חבילה בתשלום</li>
            <li>ודאו שמספרי הטלפון של הלקוחות כוללים קידומת (0501234567 או 972501234567)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
