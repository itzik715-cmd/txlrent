import Modal from './Modal'

export default function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'אישור', danger = false }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">{message}</p>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium bg-transparent border-[1.5px] border-border rounded-sm hover:border-accent hover:text-accent hover:bg-accent-soft transition-all duration-150"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-sm transition-all duration-150 ${
              danger
                ? 'bg-red-status hover:opacity-90'
                : 'bg-accent hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
