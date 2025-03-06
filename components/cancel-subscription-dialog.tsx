"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Frown } from "lucide-react";

interface CancelSubscriptionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export function CancelSubscriptionDialog({
  isOpen,
  setIsOpen,
  onConfirm,
  isLoading
}: CancelSubscriptionDialogProps) {
  //@ Handle confirmation of subscription cancellation
  const handleConfirm = async () => {
    await onConfirm();
    setIsOpen(false);
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold flex items-center gap-4">
            <Frown className="h-6 w-6 text-red-500" />
            Cancel Subscription?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-muted-foreground mt-2">
            Are you sure you want to cancel your Pro subscription? You'll lose access to:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Unlimited keyword subscriptions</li>
              <li>Advanced filtering options</li>
              <li>Email notifications for new tenders</li>
              <li>Priority support</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">
            Keep My Subscription
          </AlertDialogCancel>
          <Button 
            variant="destructive" 
            className="w-full sm:w-auto"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Cancelling..." : "Yes, Cancel Subscription"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 