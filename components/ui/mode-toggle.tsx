"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  
  //@ When component mounts, set mounted to true
  useEffect(() => {
    setMounted(true)
  }, [])

  //@ Toggle between dark and light mode
  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  //? Determine if we're in dark mode for conditionally rendering elements
  const isDarkMode = mounted && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches))

  if (!mounted) {
    return null
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative h-9 w-9 group overflow-hidden hover:bg-transparent focus:bg-transparent"
      onClick={toggleTheme}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      data-theme-toggle="true"
    >
      {/* Icon container with relative positioning */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Base icons - current theme */}
        <div 
          className={`
            absolute inset-0 flex items-center justify-center 
            transition-all duration-300 z-10
            ${isHovering ? 'opacity-0' : 'opacity-100'}
          `}
        >
          {/* Sun icon */}
          {!isDarkMode && (
            <svg
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}

          {/* Moon icon */}
          {isDarkMode && (
            <svg
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </div>
        
        {/* Preview icons - shown on hover with higher z-index */}
        <div 
          className={`
            absolute inset-0 flex items-center justify-center 
            transition-all duration-300 z-20
            ${isHovering ? 'opacity-100' : 'opacity-0'}
          `}
        >
          {/* Preview moon (when in light mode) */}
          {!isDarkMode && (
            <svg
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="h-5 w-5 transform transition-transform"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          
          {/* Preview sun (when in dark mode) */}
          {isDarkMode && (
            <svg
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="h-5 w-5 transform transition-transform"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </div>
      </div>
      
      {/* Sun rays that appear on hover when in light mode */}
      {!isDarkMode && isHovering && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse-subtle"
              style={{
                width: '2px',
                height: '12px',
                transformOrigin: 'center 35px',
                transform: `rotate(${i * 45}deg) translateY(-25px)`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      )}
      
      {/* Moon stars that appear on hover when in dark mode */}
      {isDarkMode && isHovering && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse-subtle"
              style={{
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                top: `${10 + Math.random() * 30}%`,
                left: `${60 + Math.random() * 30}%`,
              }}
            />
          ))}
        </div>
      )}
      
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 