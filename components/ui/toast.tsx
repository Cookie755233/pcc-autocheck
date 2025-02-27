"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ToastVariant } from "./use-toast"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      `fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 
      sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]`,
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full",
  {
    variants: {
      variant: {
        default: "border bg-background",
        success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
        destructive: "destructive border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
        warning: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
        info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>,
    VariantProps<typeof toastVariants> {
  variant?: ToastVariant;
}

export interface ToastActionElement {
  altText?: string
  action: React.ReactNode
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  const IconComponent = {
    default: Info,
    success: CheckCircle2,
    destructive: X,
    warning: AlertTriangle,
    info: Info,
  }[variant || 'default']

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <div className="flex items-start gap-4">
        <IconComponent className={cn(
          "h-5 w-5",
          variant === 'success' && "text-green-600",
          variant === 'destructive' && "text-red-600",
          variant === 'warning' && "text-yellow-600",
          variant === 'info' && "text-blue-600",
        )} />
        {props.children}
      </div>
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      `absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity 
      hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 
      group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 
      group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600`,
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-5 w-5 text-white" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title> & {
    variant?: ToastVariant;
  }
>(({ className, variant, ...props }, ref) => {
  // Define icons based on variant
  const IconComponent = React.useMemo(() => {
    switch (variant) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 mr-2 flex-shrink-0" />;
      case 'destructive':
        return <X className="h-5 w-5 mr-2 flex-shrink-0" />;
      case 'info':
        return <Info className="h-5 w-5 mr-2 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />;
      default:
        return null;
    }
  }, [variant]);

  return (
    <div className="flex items-center">
      {IconComponent}
      <ToastPrimitives.Title
        ref={ref}
        className={cn("text-lg font-semibold", className)}
        {...props}
      />
    </div>
  )
})
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-base", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} 