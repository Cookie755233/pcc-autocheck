"use server";

import { currentUser } from "@clerk/nextjs/server";
import { 
  getUserKeywords as getKeywords,
  addKeyword as addKeywordService,
  deleteKeyword as deleteKeywordService
} from "@/lib/services/keyword-service";
import { Keyword } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Server action to get keywords
export async function getKeywordsAction(): Promise<{ success: boolean; data?: Keyword[]; error?: string }> {
  try {
    const user = await currentUser();
    
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    
    const keywords = await getKeywords(user.id);
    return { success: true, data: keywords };
  } catch (error) {
    console.error("Error fetching keywords:", error);
    return { success: false, error: "Failed to fetch keywords" };
  }
}

// Server action to add a keyword
export async function addKeywordAction(text: string): Promise<{ success: boolean; data?: Keyword; error?: string }> {
  try {
    const user = await currentUser();
    
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    
    // Check keyword count for free tier
    const keywords = await getKeywords(user.id);
    if (keywords.length >= 5) {
      return { success: false, error: "Free tier limited to 5 keywords" };
    }
    
    const newKeyword = await addKeywordService(user.id, text);
    revalidatePath('/dashboard/settings');
    return { success: true, data: newKeyword };
  } catch (error: any) {
    console.error("Error adding keyword:", error);
    // Check for unique constraint violation
    if (error.code === 'P2002') {
      return { success: false, error: "This keyword already exists" };
    }
    return { success: false, error: "Failed to add keyword" };
  }
}

// Server action to delete a keyword
export async function deleteKeywordAction(keywordId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await currentUser();
    
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    
    await deleteKeywordService(user.id, keywordId);
    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error) {
    console.error("Error deleting keyword:", error);
    return { success: false, error: "Failed to delete keyword" };
  }
}

// Server action to toggle email notifications (simulated)
export async function toggleEmailNotificationsAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await currentUser();
    
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    
    // In a real app, this would update the user's email notification preference in the database
    
    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error) {
    console.error("Error toggling email notifications:", error);
    return { success: false, error: "Failed to update notification settings" };
  }
} 