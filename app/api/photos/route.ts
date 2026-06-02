import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("sessionToken")?.value
  if (!sessionToken) {
    return NextResponse.json({ error: "Inte autentiserad" }, { status: 401 })
  }

  let publicId: string | undefined, eventId: string | undefined
  try {
    const body = await request.json()
    publicId = body.publicId
    eventId = body.eventId
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 })
  }

  if (!publicId || !eventId) {
    return NextResponse.json({ error: "publicId och eventId krävs" }, { status: 400 })
  }

  if (!publicId.startsWith(`seenbyus/${eventId}/`)) {
    return NextResponse.json({ error: "Ogiltig bild-ID" }, { status: 400 })
  }

  const guest = await prisma.guest.findUnique({
    where: { sessionToken },
  })

  if (!guest || guest.eventId !== eventId) {
    return NextResponse.json({ error: "Otillåten" }, { status: 401 })
  }

  if (guest.photoCount >= 20) {
    return NextResponse.json({ error: "Bildkvoten är slut" }, { status: 403 })
  }

  let updated: { photoCount: number }
  try {
    updated = await prisma.$transaction(async (tx) => {
      const fresh = await tx.guest.findUnique({
        where: { id: guest.id },
        select: { photoCount: true },
      })
      if (!fresh || fresh.photoCount >= 20) {
        throw new Error("LIMIT_REACHED")
      }
      await tx.photo.create({
        data: {
          cloudinaryPublicId: publicId,
          guestId: guest.id,
          eventId,
        },
      })
      return tx.guest.update({
        where: { id: guest.id },
        data: { photoCount: { increment: 1 } },
      })
    })
  } catch (err) {
    if (err instanceof Error && err.message === "LIMIT_REACHED") {
      return NextResponse.json({ error: "Bildkvoten är slut" }, { status: 403 })
    }
    throw err
  }
  return NextResponse.json({ photoCount: updated.photoCount })
}
