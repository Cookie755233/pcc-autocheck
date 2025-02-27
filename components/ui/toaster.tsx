"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={3000}>
      <div className="fixed bottom-0 right-0 z-[100] flex flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col-reverse md:max-w-[420px]">
        {toasts.map(({ id, title, description, action, variant, ...props }) => (
          <Toast key={id} {...props} variant={variant}>
            <div className="grid gap-1">
              {title && (
                <ToastTitle className={cn(
                  "text-sm font-semibold",
                  variant === 'success' && "text-green-800",
                  variant === 'destructive' && "text-red-800",
                  variant === 'warning' && "text-yellow-800",
                  variant === 'info' && "text-blue-800",
                )}>
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className="text-sm text-gray-600">
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="absolute right-2 top-2 rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-900 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100" />
          </Toast>
        ))}
      </div>
      <ToastViewport />
    </ToastProvider>
  )
} 