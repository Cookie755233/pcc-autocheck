"use server"

import { db } from "@/lib/db"
import { auth } from "@clerk/nextjs"
import { revalidatePath } from "next/cache"

//@ Add a new keyword subscription
export async function addKeywordSubscription(keyword: string) {
  try {
    const { userId } = auth()
    if (!userId) throw new Error("Unauthorized")

    const result = await db.keyword.create({
      data: {
        userId,
        text: keyword.toLowerCase().trim(),
      },
    })

    revalidatePath("/dashboard")
    return result
  } catch (error) {
    console.error("Failed to add keyword:", error)
    throw error
  }
}

//@ Remove a keyword subscription
export async function removeKeywordSubscription(keywordId: string) {
  try {
    const { userId } = auth()
    if (!userId) throw new Error("Unauthorized")

    const result = await db.keyword.delete({
      where: {
        id: keywordId,
        userId,
      },
    })

    revalidatePath("/dashboard")
    return result
  } catch (error) {
    console.error("Failed to remove keyword:", error)
    throw error
  }
} 