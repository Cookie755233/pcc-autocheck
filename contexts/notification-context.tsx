"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { TenderGroup } from '@/types/tender'

interface NotificationContextType {
  notifications: TenderGroup[]
  setNotifications: React.Dispatch<React.SetStateAction<TenderGroup[]>>
  markAsRead: (tenderId: string) => void
  markAllAsRead: () => void
  isNew: (tenderId: string) => boolean
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<TenderGroup[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [newTenderIds, setNewTenderIds] = useState<Set<string>>(new Set())

  const isNew = useCallback((tenderId: string) => {
    return newTenderIds.has(tenderId) && !readIds.has(tenderId)
  }, [newTenderIds, readIds])

  const markAsRead = useCallback((tenderId: string) => {
    setReadIds(prev => new Set([...prev, tenderId]))
    setNewTenderIds(prev => {
      const next = new Set(prev)
      next.delete(tenderId)
      return next
    })
    setNotifications(prev => prev.filter(n => n.tender.id !== tenderId))
    
    const event = new CustomEvent('tenderReadStatusChanged', {
      detail: { tenderId, isRead: true }
    })
    window.dispatchEvent(event)
  }, [])

  const markAllAsRead = useCallback(() => {
    const ids = notifications.map(n => n.tender.id)
    setReadIds(prev => new Set([...prev, ...ids]))
    setNewTenderIds(new Set())
    setNotifications([])
    
    ids.forEach(id => {
      const event = new CustomEvent('tenderReadStatusChanged', {
        detail: { tenderId: id, isRead: true }
      })
      window.dispatchEvent(event)
    })
  }, [notifications])

  useEffect(() => {
    function handleTenderFound(event: CustomEvent) {
      console.log("🔔 NotificationProvider received tender:", event.detail);
      
      // Only notify for new tenders or tenders with new versions
      const tender = event.detail;
      if (!tender.isNew && !tender.hasNewVersions) {
        console.log("🔕 Skipping notification for existing tender with no changes:", tender.tender.id);
        return;
      }
      
      setNotifications(prev => {
        const newTender = event.detail;
        // Check if notification already exists
        if (prev.some(n => n.tender.id === newTender.tender.id)) {
          return prev;
        }
        // Add to new tenders set
        setNewTenderIds(prev => new Set([...prev, newTender.tender.id]))
        return [...prev, newTender];
      });
    }

    window.addEventListener('tenderFound', handleTenderFound as EventListener);
    return () => window.removeEventListener('tenderFound', handleTenderFound as EventListener);
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      setNotifications,
      markAsRead,
      markAllAsRead,
      isNew
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
} 