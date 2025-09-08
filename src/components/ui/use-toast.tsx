import { useContext } from 'react'
import { ToastContext, Toast } from './toast'

export function useToast() {
  const { toasts, dismiss } = useContext(ToastContext)
  const toast = (t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    console.warn('useToast: basic stub, please mount Toaster to show messages', t)
    return { id, dismiss: () => dismiss(id) }
  }
  return { toasts, toast, dismiss }
}

export default useToast
