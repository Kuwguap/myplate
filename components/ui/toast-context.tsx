"use client"

import * as React from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

interface ToastContextType {
  toast: (props: { title?: string; description?: string; variant?: "default" | "destructive" }) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastContainer({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Array<{
    id: string
    title?: string
    description?: string
    variant?: "default" | "destructive"
  }>>([])

  const addToast = React.useCallback(
    ({ title, description, variant = "default" }: {
      title?: string
      description?: string
      variant?: "default" | "destructive"
    }) => {
      const id = Math.random().toString(36).substr(2, 9)
      setToasts((prev) => [...prev, { id, title, description, variant }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      }, 5000)
    },
    []
  )

  const contextValue = React.useMemo(() => ({ toast: addToast }), [addToast])

  return (
    <ToastContext.Provider value={contextValue}>
      <ToastProvider>
        {children}
        {toasts.map(({ id, title, description, variant }) => (
          <Toast key={id} variant={variant}>
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastContainer")
  }
  return context
}

// Create a toast function that doesn't use hooks
let toastFn: ToastContextType['toast'] | undefined

export const toast: ToastContextType['toast'] = (props) => {
  if (typeof window !== 'undefined' && toastFn) {
    toastFn(props)
  }
}

// Update the toast function when the context changes
export function ToastUpdater() {
  const { toast: newToastFn } = useToast()
  React.useEffect(() => {
    toastFn = newToastFn
  }, [newToastFn])
  return null
} 