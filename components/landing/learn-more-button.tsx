'use client'

import { Button } from "@/components/ui/button"

export function LearnMoreButton() {
  const scrollToFeatures = () => {
    const element = document.getElementById("features")
    element?.scrollIntoView({ 
      behavior: "smooth",
      block: "start" 
    })
  }

  return (
    <Button 
      variant="outline" 
      size="lg" 
      onClick={scrollToFeatures}
      className="hover:bg-accent"
    >
      Learn more
    </Button>
  )
} 