interface ConfirmDialogProps {
  title: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded bg-white p-6"
      >
        <h3 id="confirm-dialog-title" className="mb-4 text-lg font-semibold">
          {title}
        </h3>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-red-700 px-4 py-2 text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
