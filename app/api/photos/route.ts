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

  const guest = await prisma.guest.findUnique({
    where: { sessionToken },
  })

  if (!guest || guest.eventId !== eventId) {
    return NextResponse.json({ error: "Otillåten" }, { status: 401 })
  }

  if (guest.photoCount >= 20) {
    return NextResponse.json({ error: "Bildkvoten är slut" }, { status: 403 })
  }

  await prisma.photo.create({
    data: {
      cloudinaryPublicId: publicId,
      guestId: guest.id,
      eventId,
    },
  })

  const updated = await prisma.guest.update({
    where: { id: guest.id },
    data: { photoCount: { increment: 1 } },
  })

  return NextResponse.json({ photoCount: updated.photoCount })
}
