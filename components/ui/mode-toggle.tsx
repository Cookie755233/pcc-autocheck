"use client"

import { useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()
  const [isHovering, setIsHovering] = useState(false)
  
  // For the direct toggle to dark theme
  const toggleToDark = () => {
    // The actual theme change will be handled by ThemeEffect component
    // We just trigger the animation by clicking the element with the data attribute
  }
  
  return (
    <Button
      data-theme-toggle="true"
      variant="ghost"
      size="icon"
      onClick={toggleToDark}
      className="relative focus-visible:ring-0 focus-visible:ring-offset-0"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Sun 
        className={`h-[1.5rem] w-[1.5rem] transition-all ${theme === 'dark' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      />
      <Moon 
        className={`absolute h-[1.5rem] w-[1.5rem] transition-all ${theme === 'dark' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
      />
      <span className="sr-only">Toggle theme</span>
      
      {/* Sun rays that appear on hover when in light mode */}
      {theme !== 'dark' && isHovering && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-yellow-400 rounded-full animate-pulse-subtle"
              style={{
                width: '2px',
                height: '8px',
                top: '50%',
                left: '50%',
                transformOrigin: '0 0',
                transform: `rotate(${i * 45}deg) translate(14px, 0)`,
                boxShadow: '0 0 5px rgba(250, 204, 21, 0.7)',
              }}
            />
          ))}
        </div>
      )}
      
      {/* Moon stars that appear on hover when in dark mode */}
      {theme === 'dark' && isHovering && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-slate-100 rounded-full animate-pulse-subtle"
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
    </Button>
  )
} 