import { TenderBoard } from "@/components/dashboard/tender-board";
import { KeywordPanel } from "@/components/dashboard/keyword-panel";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useState } from "react";

export default function DashboardPage() {
  const { userId } = auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-white">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <KeywordPanel />
        </div>
        <div className="md:col-span-3 overflow-y-auto">
          <TenderBoard />
        </div>
      </div>
    </div>
  );
} 