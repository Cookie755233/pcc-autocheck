"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  
  useEffect(() => {
    // Start progress when navigation begins
    setIsNavigating(true);
    
    // End progress after navigation completes
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);
  
  if (!isNavigating) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-primary/20">
      <div 
        className="h-full bg-primary animate-[progress_500ms_ease-in-out]"
        style={{ width: "100%" }}
      />
    </div>
  );
}