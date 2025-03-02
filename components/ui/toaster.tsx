"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastIcon,
  type ToastActionElement
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="mb-3">
            <div className="grid gap-1">
              {title && (
                <div className="flex items-center gap-2">
                  <ToastIcon variant={props.variant} />
                  <ToastTitle className={
                    props.variant === "destructive" ? "text-red-900 dark:text-red-50" : 
                    props.variant === "success" ? "text-green-900 dark:text-green-50" :
                    props.variant === "warning" ? "text-yellow-900 dark:text-yellow-50" :
                    props.variant === "info" ? "text-blue-900 dark:text-blue-50" : ""
                  }>{title}</ToastTitle>
                </div>
              )}
              {description && (
                <ToastDescription className={
                  props.variant === "destructive" ? "text-red-700 dark:text-red-100 pl-7" : 
                  props.variant === "success" ? "text-green-700 dark:text-green-100 pl-7" :
                  props.variant === "warning" ? "text-yellow-700 dark:text-yellow-100 pl-7" :
                  props.variant === "info" ? "text-blue-700 dark:text-blue-100 pl-7" : ""
                }>{description}</ToastDescription>
              )}
            </div>
            {action && <div>{action}</div>}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className="gap-y-3" />
    </ToastProvider>
  )
} 