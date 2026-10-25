import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  description?: string
  confirmLabel: string
  // Destructive confirmations are red; everything else uses the primary action colour.
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal role="alertdialog" labelledBy="confirm-dialog-title" onClose={onCancel}>
      <h3 id="confirm-dialog-title" className="font-display text-2xl font-semibold">
        {title}
      </h3>
      {description && <p className="mt-2 text-muted">{description}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
