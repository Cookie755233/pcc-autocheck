'use client'

import { Button } from "@/components/ui/button"

export function NavLinks() {
  //@ Smooth scroll to section utility
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    element?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <nav className="flex items-center space-x-6 text-sm font-medium">
      <button 
        onClick={() => scrollToSection("hero")}
        className="transition-colors hover:text-foreground/80"
      >
        Home
      </button>
      <button 
        onClick={() => scrollToSection("features")}
        className="transition-colors hover:text-foreground/80"
      >
        Features
      </button>
      <button 
        onClick={() => scrollToSection("acknowledgements")}
        className="transition-colors hover:text-foreground/80"
      >
        About
      </button>
    </nav>
  )
} 