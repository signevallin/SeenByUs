"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Style } from "@prisma/client"
import { customAlphabet } from "nanoid"
import { redirect } from "next/navigation"

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8)

function computeRevealedAt(eventDate: Date): Date {
  // Set to 08:00 UTC the day after the event date
  const reveal = new Date(eventDate)
  reveal.setUTCDate(reveal.getUTCDate() + 1)
  reveal.setUTCHours(8, 0, 0, 0)

  // If computed reveal is already in the past, use tomorrow 08:00 UTC instead
  if (reveal <= new Date()) {
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(8, 0, 0, 0)
    return tomorrow
  }

  return reveal
}

export async function createEvent(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Inte inloggad")

  const name = formData.get("name") as string
  const dateStr = formData.get("date") as string
  const style = formData.get("style") as Style

  if (!name || !dateStr || !["nostalgia", "romance", "bw", "afterparty"].includes(style)) {
    throw new Error("Ogiltiga uppgifter")
  }

  const date = new Date(dateStr)
  const revealedAt = computeRevealedAt(date)

  let slug = ""
  let attempts = 0
  do {
    slug = nanoid()
    attempts++
    if (attempts > 10) throw new Error("Kunde inte generera unikt slug")
  } while (await prisma.event.findUnique({ where: { slug } }))

  await prisma.event.create({
    data: {
      userId: session.user.id,
      name,
      date,
      slug,
      style,
      revealedAt,
    },
  })

  redirect(`/events/${slug}`)
}
