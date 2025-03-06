"use client"

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export function ThemeEffect() {
  const [mounted, setMounted] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  // Store the current and requested theme
  const { theme, setTheme, systemTheme } = useTheme()
  const [requestedTheme, setRequestedTheme] = useState<string | undefined>(undefined)
  
  // Handle the animation and theme change
  useEffect(() => {
    // First mounting - just set mounted flag
    setMounted(true)
    
    // If we have a requested theme change, start the animation
    if (mounted && requestedTheme && requestedTheme !== theme) {
      console.log("Starting animation to theme:", requestedTheme)
      setIsAnimating(true)
      
      // Add transition class to body for smoother overall transition
      document.body.classList.add('theme-changing')
      
      // Only change the theme after animation completes
      const timer = setTimeout(() => {
        console.log("Animation completed, applying theme:", requestedTheme)
        setTheme(requestedTheme)
        setIsAnimating(false)
        setRequestedTheme(undefined)
        
        // Remove the transition class after theme change completes
        const cleanupTimer = setTimeout(() => {
          document.body.classList.remove('theme-changing')
        }, 0)
        
        return () => clearTimeout(cleanupTimer)
      }, 1600)
      
      return () => clearTimeout(timer)
    }
  }, [mounted, requestedTheme, theme, setTheme])
  
  // Override the theme setter to request a theme instead of setting it immediately
  useEffect(() => {
    if (!mounted) return
    
    // Override the setTheme function in next-themes
    const originalSetTheme = window.document.querySelector('html')?.dataset.setTheme
    window.document.querySelector('html')?.setAttribute('data-set-theme', 'overridden')
    
    // When theme toggle is clicked, intercept and set requested theme instead
    const handleThemeChange = (event: Event) => {
      const target = event.target as HTMLElement
      if (target.closest('[data-theme-toggle="true"]')) {
        event.preventDefault()
        event.stopPropagation()
        
        // Set requested theme instead of immediate change
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        setRequestedTheme(newTheme)
        return false
      }
    }
    
    // Listen for clicks on theme toggle
    document.addEventListener('click', handleThemeChange, true)
    
    return () => {
      document.removeEventListener('click', handleThemeChange, true)
      if (originalSetTheme) {
        window.document.querySelector('html')?.setAttribute('data-set-theme', originalSetTheme)
      }
    }
  }, [mounted, theme, setTheme])
  
  // Don't render anything if not mounted or not animating
  if (!mounted || !isAnimating) return null
  
  // Determine which animation to show based on the requested theme change
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark')
  const goingToDark = requestedTheme === 'dark' || (requestedTheme === 'system' && systemTheme === 'dark')
  const goingToLight = requestedTheme === 'light' || (requestedTheme === 'system' && systemTheme === 'light')
  
  return (
    <div 
      className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Background Overlay - smoother transition */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ${
          goingToDark ? 'bg-black animate-darken' : 
          goingToLight ? 'bg-black animate-lighten' : ''
        }`} 
      />
      
      {/* Stars background - show when going to dark, hide when going to light */}
      <div className={`absolute inset-0 ${goingToDark ? 'animate-stars-appear' : goingToLight ? 'animate-stars-disappear' : ''}`}>
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full animate-twinkle"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: 0,
              animationDelay: `${Math.random() * 1500}ms`,
            }}
          />
        ))}
      </div>

      {/* Celestial Body - Simple Div Approach */}
      {goingToDark && (
        <div className="celestial-body sun-to-moon">
          <div className="sun-wrapper">
            <div className="sun-core"></div>
          </div>
          
          <div className="moon-wrapper">
            <div className="moon-body"></div>
            <div className="crater" style={{ top: '25%', left: '30%', width: '20%', height: '20%' }}></div>
            <div className="crater" style={{ top: '60%', right: '25%', width: '25%', height: '25%' }}></div>
            <div className="crater" style={{ bottom: '20%', left: '40%', width: '15%', height: '15%' }}></div>
          </div>
        </div>
      )}
      
      {goingToLight && (
        <div className="celestial-body moon-to-sun">
          <div className="moon-wrapper">
            <div className="moon-body"></div>
            <div className="crater" style={{ top: '25%', left: '30%', width: '20%', height: '20%' }}></div>
            <div className="crater" style={{ top: '60%', right: '25%', width: '25%', height: '25%' }}></div>
            <div className="crater" style={{ bottom: '20%', left: '40%', width: '15%', height: '15%' }}></div>
          </div>
          
          <div className="sun-wrapper">
            <div className="sun-core"></div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .celestial-body {
          position: absolute;
          width: 80px;
          height: 80px;
          offset-path: path("M 300,800 Q 900,0 1500,850");
          animation: follow-path 1.5s ease-in-out forwards;
          will-change: offset-distance;
        }
        
        @keyframes follow-path {
          0% {
            offset-distance: 0%;
          }
          100% {
            offset-distance: 100%;
          }
        }
        
        /* Sun styles */
        .sun-wrapper {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        
        .sun-core {
          position: absolute;
          width: 100%;
          height: 100%;
          background: #ffd700;
          border-radius: 50%;
          box-shadow: 0 0 25px 18px rgba(255, 215, 0, 0.6);
        }
        
        /* Moon styles */
        .moon-wrapper {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        
        .moon-body {
          position: absolute;
          width: 100%;
          height: 100%;
          background: #f5f5f5;
          border-radius: 50%;
          box-shadow: 0 0 25px 8px rgba(245, 245, 245, 0.4);
        }
        
        .crater {
          position: absolute;
          background: #e0e0e0;
          border-radius: 50%;
        }
        
        /* Sun to Moon transformation */
        .sun-to-moon .sun-wrapper {
          animation: sun-fade 1.5s ease-in-out forwards;
        }
        
        .sun-to-moon .moon-wrapper {
          opacity: 0;
          animation: moon-reveal 1.5s ease-in-out forwards;
        }
        
        /* Moon to Sun transformation */
        .moon-to-sun .moon-wrapper {
          animation: moon-fade 1.5s ease-in-out forwards;
        }
        
        .moon-to-sun .sun-wrapper {
          opacity: 0;
          animation: sun-reveal 1.5s ease-in-out forwards;
        }
        
        /* Transformation animations */
        @keyframes sun-fade {
          0% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.6) rotate(360deg);
          }
        }
        
        @keyframes sun-reveal {
          0% {
            opacity: 0;
            transform: scale(0.6) rotate(0deg);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8) rotate(180deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(360deg);
          }
        }
        
        @keyframes moon-reveal {
          0% {
            opacity: 0;
            transform: scale(0.6) rotate(0deg);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8) rotate(180deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(360deg);
          }
        }
        
        @keyframes moon-fade {
          0% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.6) rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
} 