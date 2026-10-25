import { useEffect } from 'react'

const DISMISS_AFTER_MS = 6000

export interface ToastMessage {
  text: string
  kind: 'success' | 'error'
}

interface ToastProps {
  message: ToastMessage
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, DISMISS_AFTER_MS)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div className="on-ink fixed inset-x-4 bottom-4 z-50 sm:left-auto sm:w-96">
      <div
        // Errors interrupt; confirmations are announced politely.
        role={message.kind === 'error' ? 'alert' : 'status'}
        className={`flex items-start gap-3 rounded-md border-l-4 ${
          message.kind === 'error' ? 'border-sold' : 'border-tag'
        } bg-ink px-4 py-3 text-white shadow-lg motion-safe:animate-[rise_160ms_ease-out]`}
      >
        <p className="flex-1">{message.text}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-my-1 -mr-2 rounded px-2 text-xl leading-none text-white/80 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  )
}
