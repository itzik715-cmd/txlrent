const statusMap = {
  AVAILABLE: { label: 'פנוי', bg: 'bg-green-soft', text: 'text-green-status' },
  available: { label: 'פנוי', bg: 'bg-green-soft', text: 'text-green-status' },
  RENTED: { label: 'מושכר', bg: 'bg-accent-soft', text: 'text-accent' },
  rented: { label: 'מושכר', bg: 'bg-accent-soft', text: 'text-accent' },
  MAINTENANCE: { label: 'תיקון', bg: 'bg-orange-soft', text: 'text-orange-status' },
  maintenance: { label: 'תיקון', bg: 'bg-orange-soft', text: 'text-orange-status' },
  LOST: { label: 'אבוד', bg: 'bg-red-soft', text: 'text-red-status' },
  lost: { label: 'אבוד', bg: 'bg-red-soft', text: 'text-red-status' },
  OVERDUE: { label: 'באיחור', bg: 'bg-red-soft', text: 'text-red-status' },
  overdue: { label: 'באיחור', bg: 'bg-red-soft', text: 'text-red-status' },
  PAID: { label: 'שולם', bg: 'bg-green-soft', text: 'text-green-status' },
  paid: { label: 'שולם', bg: 'bg-green-soft', text: 'text-green-status' },
  PENDING: { label: 'ממתין', bg: 'bg-orange-soft', text: 'text-orange-status' },
  pending: { label: 'ממתין', bg: 'bg-orange-soft', text: 'text-orange-status' },
  ACTIVE: { label: 'פעיל', bg: 'bg-accent-soft', text: 'text-accent' },
  active: { label: 'פעיל', bg: 'bg-accent-soft', text: 'text-accent' },
  RETURNED: { label: 'הוחזר', bg: 'bg-green-soft', text: 'text-green-status' },
  returned: { label: 'הוחזר', bg: 'bg-green-soft', text: 'text-green-status' },
}

export default function StatusBadge({ status, label: customLabel }) {
  const config = statusMap[status] || {
    label: status,
    bg: 'bg-bg',
    text: 'text-text-secondary',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
    >
      {customLabel || config.label}
    </span>
  )
}
