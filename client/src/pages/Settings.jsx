import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Send, MessageCircle, Clock, FileText, Info, CheckCircle2, XCircle, RefreshCw, Plus, Trash2, Users, Pencil, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

const tabs = [
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'email', label: 'אימייל', icon: Mail },
  { key: 'templates', label: 'תבניות הודעה', icon: FileText },
  { key: 'alerts', label: 'התראות אוטומטיות', icon: Clock },
  { key: 'logs', label: 'יומן שליחות', icon: Send },
  { key: 'responses', label: 'תגובות לקוחות', icon: CheckCircle2 },
  { key: 'guide', label: 'מדריך חיבור', icon: Info },
  { key: 'users', label: 'משתמשים', icon: Users },
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
      {activeTab === 'email' && <EmailConfig settings={settings} />}
      {activeTab === 'templates' && <TemplatesConfig settings={settings} />}
      {activeTab === 'alerts' && <AlertsConfig settings={settings} />}
      {activeTab === 'logs' && <LogsView />}
      {activeTab === 'responses' && <ResponsesView />}
      {activeTab === 'guide' && <SetupGuide />}
      {activeTab === 'users' && <UsersManagement />}
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

/* ─── Email Config ─── */
function EmailConfig({ settings }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    email_enabled: settings.email_enabled || 'false',
    email_smtp_host: settings.email_smtp_host || '',
    email_smtp_port: settings.email_smtp_port || '587',
    email_smtp_user: settings.email_smtp_user || '',
    email_smtp_pass: settings.email_smtp_pass || '',
    email_from: settings.email_from || '',
    email_from_name: settings.email_from_name || 'LapTrack',
    email_smtp_secure: settings.email_smtp_secure || 'false',
  })
  const [testEmail, setTestEmail] = useState('')

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('הגדרות האימייל נשמרו')
    },
    onError: () => toast.error('שגיאה בשמירה'),
  })

  const sendTestMutation = useMutation({
    mutationFn: (data) => api.post('/whatsapp/send-email', data),
    onSuccess: (res) => {
      if (res.data.sent) toast.success('אימייל בדיקה נשלח בהצלחה!')
      else toast.error(`שליחה נכשלה: ${res.data.reason}`)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה בשליחה'),
  })

  const inputClass = "w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Mail className="w-4 h-4 text-accent" />
          הגדרות SMTP לשליחת אימייל
        </h2>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.email_enabled === 'true'}
            onChange={(e) => setForm(f => ({ ...f, email_enabled: e.target.checked ? 'true' : 'false' }))}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-text-secondary">הפעל שליחת אימייל</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">SMTP Host</label>
            <input value={form.email_smtp_host} onChange={e => setForm(f => ({ ...f, email_smtp_host: e.target.value }))} placeholder="smtp.gmail.com" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">SMTP Port</label>
            <input value={form.email_smtp_port} onChange={e => setForm(f => ({ ...f, email_smtp_port: e.target.value }))} placeholder="587" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">שם משתמש SMTP</label>
            <input value={form.email_smtp_user} onChange={e => setForm(f => ({ ...f, email_smtp_user: e.target.value }))} placeholder="user@gmail.com" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">סיסמת SMTP</label>
            <input type="password" value={form.email_smtp_pass} onChange={e => setForm(f => ({ ...f, email_smtp_pass: e.target.value }))} placeholder="••••••" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">אימייל שולח (From)</label>
            <input value={form.email_from} onChange={e => setForm(f => ({ ...f, email_from: e.target.value }))} placeholder="noreply@company.com" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">שם שולח</label>
            <input value={form.email_from_name} onChange={e => setForm(f => ({ ...f, email_from_name: e.target.value }))} placeholder="LapTrack" className={inputClass} />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.email_smtp_secure === 'true'}
            onChange={(e) => setForm(f => ({ ...f, email_smtp_secure: e.target.checked ? 'true' : 'false' }))}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-xs font-medium text-text-secondary">SSL/TLS (port 465)</span>
        </label>

        <button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saveMutation.isPending ? 'שומר...' : 'שמור הגדרות'}
        </button>
      </div>

      {/* Test Email */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-bold text-text-primary">שלח אימייל בדיקה</h2>
        <div className="flex gap-3">
          <input
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className={inputClass + " max-w-[250px]"}
          />
          <button
            onClick={() => sendTestMutation.mutate({ email: testEmail, subject: 'בדיקת חיבור - LapTrack', message: 'הודעת בדיקה מ-LapTrack. אם קיבלת הודעה זו, החיבור תקין!' })}
            disabled={!testEmail || sendTestMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
          >
            <Mail className="w-3.5 h-3.5" />
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

  const defaultResponseTemplates = {
    renew: `שלום {clientName},
תודה על בחירתך לחדש את השכרת המחשב {computerId} ({computerName}).
ההשכרה חודשה בהצלחה{renewInfo}.

בברכה, {senderName}`,
    return_pickup: `שלום {clientName},
תודה על פנייתך. קיבלנו את בקשתך להחזיר את מחשב {computerId} ({computerName}) לאחת מנקודות האיסוף.

נקודות האיסוף שלנו:
📍 [כתובת נקודת איסוף]

ניתן להחזיר בשעות 09:00-17:00.
בברכה, {senderName}`,
    return_courier: `שלום {clientName},
תודה על פנייתך. קיבלנו את בקשתך להזמנת שליח לאיסוף מחשב {computerId} ({computerName}).

עלות האיסוף: 50 ₪
ניצור איתך קשר בהקדם לתיאום מועד האיסוף.

בברכה, {senderName}`,
  }

  const [template, setTemplate] = useState(settings.wa_template_expiring || defaultTemplate)
  const [renewTemplate, setRenewTemplate] = useState(settings.response_template_renew || defaultResponseTemplates.renew)
  const [pickupTemplate, setPickupTemplate] = useState(settings.response_template_return_pickup || defaultResponseTemplates.return_pickup)
  const [courierTemplate, setCourierTemplate] = useState(settings.response_template_return_courier || defaultResponseTemplates.return_courier)

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('התבנית נשמרה')
    },
  })

  const inputClass = "w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"

  const previewVars = (text) => text
    .replace(/\{clientName\}/g, 'ישראל ישראלי')
    .replace(/\{computerName\}/g, 'LENOVO L13')
    .replace(/\{computerId\}/g, 'TXL3881')
    .replace(/\{daysLeft\}/g, '3')
    .replace(/\{expectedReturn\}/g, '08/03/2026')
    .replace(/\{senderName\}/g, settings.wa_sender_name || 'LapTrack')
    .replace(/\{responseUrl\}/g, 'https://rent.txlcomp.co.il/r/abc123')
    .replace(/\{renewInfo\}/g, ' עד תאריך 08/04/2026')
    .replace(/\{newDate\}/g, '08/04/2026')

  const responseVarsNote = (isRenew) => (
    <p className="text-xs text-text-tertiary">
      משתנים זמינים: <code className="bg-bg px-1 rounded">{'{clientName}'}</code> <code className="bg-bg px-1 rounded">{'{computerId}'}</code> <code className="bg-bg px-1 rounded">{'{computerName}'}</code> <code className="bg-bg px-1 rounded">{'{senderName}'}</code>
      {isRenew && <> <code className="bg-bg px-1 rounded">{'{renewInfo}'}</code> <code className="bg-bg px-1 rounded">{'{newDate}'}</code></>}
    </p>
  )

  return (
    <div className="space-y-5">
      {/* Expiring alert template */}
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
        <div>
          <h3 className="text-xs font-semibold text-text-secondary mb-2">תצוגה מקדימה:</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed" dir="rtl">
            {previewVars(template)}
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

      {/* Response templates */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-bold text-text-primary">תבניות טיפול בתגובת לקוח</h2>
        <p className="text-xs text-text-tertiary">הודעות אלו נשלחות ללקוח כשלוחצים על "טופל" בדשבורד</p>

        {/* Renew */}
        <div className="space-y-2 border-b border-border pb-4">
          <h3 className="text-xs font-bold text-green-600 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> חידוש לתקופה נוספת</h3>
          {responseVarsNote(true)}
          <textarea value={renewTemplate} onChange={e => setRenewTemplate(e.target.value)} rows={6} className={inputClass + " resize-y font-mono text-xs leading-relaxed"} dir="rtl" />
          <div>
            <h4 className="text-xs font-semibold text-text-secondary mb-1">תצוגה מקדימה:</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs whitespace-pre-wrap leading-relaxed" dir="rtl">{previewVars(renewTemplate)}</div>
          </div>
        </div>

        {/* Return pickup */}
        <div className="space-y-2 border-b border-border pb-4">
          <h3 className="text-xs font-bold text-blue-600 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> החזרה לנקודת איסוף</h3>
          {responseVarsNote(false)}
          <textarea value={pickupTemplate} onChange={e => setPickupTemplate(e.target.value)} rows={6} className={inputClass + " resize-y font-mono text-xs leading-relaxed"} dir="rtl" />
          <div>
            <h4 className="text-xs font-semibold text-text-secondary mb-1">תצוגה מקדימה:</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs whitespace-pre-wrap leading-relaxed" dir="rtl">{previewVars(pickupTemplate)}</div>
          </div>
        </div>

        {/* Return courier */}
        <div className="space-y-2 pb-2">
          <h3 className="text-xs font-bold text-orange-600 flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> שליח לאיסוף</h3>
          {responseVarsNote(false)}
          <textarea value={courierTemplate} onChange={e => setCourierTemplate(e.target.value)} rows={6} className={inputClass + " resize-y font-mono text-xs leading-relaxed"} dir="rtl" />
          <div>
            <h4 className="text-xs font-semibold text-text-secondary mb-1">תצוגה מקדימה:</h4>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs whitespace-pre-wrap leading-relaxed" dir="rtl">{previewVars(courierTemplate)}</div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => saveMutation.mutate({
              response_template_renew: renewTemplate,
              response_template_return_pickup: pickupTemplate,
              response_template_return_courier: courierTemplate,
            })}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? 'שומר...' : 'שמור תבניות'}
          </button>
          <button
            onClick={() => { setRenewTemplate(defaultResponseTemplates.renew); setPickupTemplate(defaultResponseTemplates.return_pickup); setCourierTemplate(defaultResponseTemplates.return_courier) }}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-accent transition-all duration-150"
          >
            שחזר ברירת מחדל
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Alert Rules Management ─── */
function AlertsConfig({ settings }) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingRule, setEditingRule] = useState(null)

  // Global auto-alerts toggle
  const [autoEnabled, setAutoEnabled] = useState(settings.wa_auto_alerts || 'false')

  const toggleMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('נשמר')
    },
  })

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => api.get('/alert-rules').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/alert-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
      toast.success('הכלל נמחק')
    },
  })

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, enabled }) => api.put(`/alert-rules/${id}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
    },
  })

  const triggerLabels = {
    before_return: 'לפני סיום השכרה',
    on_return_day: 'ביום סיום ההשכרה',
    after_overdue: 'אחרי איחור בהחזרה',
  }

  return (
    <div className="space-y-5">
      {/* Global Toggle */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-bold text-text-primary">התראות אוטומטיות</h2>
        <p className="text-xs text-text-tertiary">
          המערכת תריץ את כללי ההתראה כל יום בשעה 08:00 ותשלח WhatsApp ללקוחות שמתאימים לכלל
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoEnabled === 'true'}
            onChange={(e) => {
              const val = e.target.checked ? 'true' : 'false'
              setAutoEnabled(val)
              toggleMutation.mutate({ wa_auto_alerts: val })
            }}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-text-primary">הפעל התראות אוטומטיות</span>
        </label>
      </div>

      {/* Rules List */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">כללי התראה ({rules.length})</h2>
          <button
            onClick={() => { setEditingRule(null); setShowAdd(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150"
          >
            + הוסף כלל
          </button>
        </div>

        {isLoading ? (
          <p className="text-text-tertiary text-sm text-center py-6">טוען...</p>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-text-tertiary text-sm">אין כללי התראה. הוסיפו כלל ראשון.</p>
            <p className="text-xs text-text-tertiary">לדוגמה: שלח הודעה 3 ימים לפני סיום ההשכרה</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {rules.map(rule => (
              <div key={rule.id} className={`px-5 py-4 flex items-start gap-4 ${!rule.enabled ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-text-primary">{rule.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${rule.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {rule.enabled ? 'פעיל' : 'מושבת'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary mb-2">
                    <span className="font-medium">{triggerLabels[rule.trigger] || rule.trigger}</span>
                    {rule.trigger !== 'on_return_day' && (
                      <span>{rule.dayOffset} ימים</span>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary bg-bg rounded-sm p-2 border border-border/50 whitespace-pre-wrap max-h-[60px] overflow-hidden">
                    {rule.template.substring(0, 150)}{rule.template.length > 150 ? '...' : ''}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleRuleMutation.mutate({ id: rule.id, enabled: !rule.enabled })}
                    className={`px-2 py-1 text-xs font-medium rounded-sm ${rule.enabled ? 'text-orange-600 border border-orange-300 hover:bg-orange-50' : 'text-green-600 border border-green-300 hover:bg-green-50'}`}
                  >
                    {rule.enabled ? 'השבת' : 'הפעל'}
                  </button>
                  <button
                    onClick={() => { setEditingRule(rule); setShowAdd(true) }}
                    className="px-2 py-1 text-xs font-medium text-accent border border-accent/30 rounded-sm hover:bg-accent-soft"
                  >
                    ערוך
                  </button>
                  <button
                    onClick={() => { if (confirm('למחוק את הכלל?')) deleteMutation.mutate(rule.id) }}
                    className="px-2 py-1 text-xs font-medium text-red-600 border border-red-300 rounded-sm hover:bg-red-50"
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Rule Modal */}
      {showAdd && (
        <RuleEditor
          rule={editingRule}
          onClose={() => { setShowAdd(false); setEditingRule(null) }}
          senderName={settings.wa_sender_name || 'LapTrack'}
        />
      )}
    </div>
  )
}

/* ─── Rule Editor ─── */
function RuleEditor({ rule, onClose, senderName }) {
  const queryClient = useQueryClient()
  const isEdit = !!rule

  const defaultTemplate = `היי {clientName}, כאן {senderName} ממחלקת התפעול
שמנו לב שבעוד {daysLeft} ימים ({expectedReturn}) מסתיימת לך תקופת השכרת המחשב {computerId}, אבל היי אל דאגה!

לבחירתך 3 אפשרויות:
1. נא חדשו עבורי לתקופה נוספת
2. ברצוני להחזיר לאחת מנקודות האיסוף
3. ברצוני להזמין שליח לאיסוף המחשב בעלות 50 ש"ח

לבחירה לחצו כאן: {responseUrl}`

  const [form, setForm] = useState({
    name: rule?.name || '',
    trigger: rule?.trigger || 'before_return',
    dayOffset: rule?.dayOffset ?? 3,
    template: rule?.template || defaultTemplate,
  })

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/alert-rules/${rule.id}`, data) : api.post('/alert-rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
      toast.success(isEdit ? 'הכלל עודכן' : 'הכלל נוצר')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה'),
  })

  const inputClass = "w-full px-3 py-2 bg-bg border border-border rounded-sm text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-150"

  return (
    <div className="bg-surface border-2 border-accent/30 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-bold text-text-primary">{isEdit ? 'ערוך כלל התראה' : 'הוסף כלל התראה חדש'}</h2>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">שם הכלל</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="תזכורת 3 ימים" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">טריגר</label>
          <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))} className={inputClass}>
            <option value="before_return">לפני סיום השכרה</option>
            <option value="on_return_day">ביום סיום ההשכרה</option>
            <option value="after_overdue">אחרי איחור בהחזרה</option>
          </select>
        </div>
        {form.trigger !== 'on_return_day' && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              {form.trigger === 'before_return' ? 'ימים לפני' : 'ימים אחרי'}
            </label>
            <input type="number" value={form.dayOffset} onChange={e => setForm(f => ({ ...f, dayOffset: parseInt(e.target.value) || 0 }))} min="0" max="90" className={inputClass} />
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">תבנית הודעה</label>
        <p className="text-xs text-text-tertiary mb-1">
          משתנים: <code className="bg-bg px-1 rounded">{'{clientName}'}</code> <code className="bg-bg px-1 rounded">{'{computerId}'}</code> <code className="bg-bg px-1 rounded">{'{daysLeft}'}</code> <code className="bg-bg px-1 rounded">{'{expectedReturn}'}</code> <code className="bg-bg px-1 rounded">{'{senderName}'}</code> <code className="bg-bg px-1 rounded">{'{responseUrl}'}</code>
        </p>
        <textarea
          value={form.template}
          onChange={e => setForm(f => ({ ...f, template: e.target.value }))}
          rows={8}
          dir="rtl"
          className={inputClass + " resize-y font-mono text-xs leading-relaxed"}
        />
      </div>

      {/* Preview */}
      <div>
        <h3 className="text-xs font-semibold text-text-secondary mb-1">תצוגה מקדימה:</h3>
        <div className="bg-green-50 border border-green-200 rounded-sm p-3 text-xs whitespace-pre-wrap leading-relaxed" dir="rtl">
          {form.template
            .replace(/\{clientName\}/g, 'ישראל ישראלי')
            .replace(/\{computerName\}/g, 'LENOVO L13')
            .replace(/\{computerId\}/g, 'TXL3881')
            .replace(/\{daysLeft\}/g, String(form.dayOffset || 0))
            .replace(/\{expectedReturn\}/g, '08/03/2026')
            .replace(/\{senderName\}/g, senderName)
            .replace(/\{responseUrl\}/g, 'https://rent.txlcomp.co.il/r/abc123')}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent transition-all duration-150">ביטול</button>
        <button
          onClick={() => saveMutation.mutate(form)}
          disabled={!form.name || !form.template || saveMutation.isPending}
          className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'שומר...' : isEdit ? 'עדכן כלל' : 'צור כלל'}
        </button>
      </div>
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

/* ─── Users Management ─── */
function UsersManagement() {
  const queryClient = useQueryClient()
  const [editUser, setEditUser] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'user' })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['settings-users'],
    queryFn: () => api.get('/settings/users').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/settings/users', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] })
      toast.success('משתמש נוצר')
      setShowNew(false)
      setForm({ email: '', password: '', name: '', role: 'user' })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה ביצירת משתמש'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/settings/users/${id}`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] })
      toast.success('משתמש עודכן')
      setEditUser(null)
      setForm({ email: '', password: '', name: '', role: 'user' })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה בעדכון'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/settings/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] })
      toast.success('משתמש נמחק')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'שגיאה במחיקה'),
  })

  const startEdit = (user) => {
    setEditUser(user.id)
    setForm({ email: user.email, name: user.name, role: user.role, password: '' })
    setShowNew(false)
  }

  const startNew = () => {
    setShowNew(true)
    setEditUser(null)
    setForm({ email: '', password: '', name: '', role: 'user' })
  }

  const cancelEdit = () => {
    setEditUser(null)
    setShowNew(false)
    setForm({ email: '', password: '', name: '', role: 'user' })
  }

  if (isLoading) return <p className="text-text-tertiary text-sm py-4">טוען...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-text-primary">ניהול משתמשים</h2>
        <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all">
          <Plus className="w-3.5 h-3.5" />
          משתמש חדש
        </button>
      </div>

      {/* Users list */}
      <div className="border border-border rounded-sm divide-y divide-border">
        {users.map(user => (
          <div key={user.id} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm font-semibold text-text-primary">{user.name}</span>
                <span className="text-xs text-text-tertiary mr-2">{user.email}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-accent-soft text-accent' : 'bg-gray-100 text-gray-600'}`}>
                {user.role === 'admin' ? 'מנהל' : 'משתמש'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => startEdit(user)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-border rounded-sm hover:border-accent hover:text-accent transition-all">
                <Pencil className="w-3 h-3" />
                עריכה
              </button>
              <button
                onClick={() => { if (confirm('למחוק משתמש זה?')) deleteMutation.mutate(user.id) }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-border rounded-sm hover:border-red-500 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / New form */}
      {(editUser || showNew) && (
        <div className="border border-accent/30 rounded-sm p-4 bg-accent-soft/20 space-y-3">
          <h3 className="text-sm font-bold text-text-primary">{showNew ? 'משתמש חדש' : 'עריכת משתמש'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">שם</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">אימייל</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">{editUser ? 'סיסמה חדשה (השאר ריק לשמור)' : 'סיסמה'}</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">תפקיד</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-border rounded-sm text-sm focus:outline-none focus:border-accent">
                <option value="admin">מנהל</option>
                <option value="user">משתמש</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-medium border border-border rounded-sm hover:border-accent hover:text-accent transition-all">ביטול</button>
            <button
              onClick={() => {
                if (showNew) {
                  if (!form.email || !form.password || !form.name) return toast.error('נא למלא את כל השדות')
                  createMutation.mutate(form)
                } else {
                  const data = { id: editUser, email: form.email, name: form.name, role: form.role }
                  if (form.password) data.password = form.password
                  updateMutation.mutate(data)
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent text-white rounded-sm hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {showNew ? 'צור משתמש' : 'שמור שינויים'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
