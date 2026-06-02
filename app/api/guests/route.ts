import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"

export async function POST(request: NextRequest) {
  const { slug, name } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: "Namn saknas" }, { status: 400 })
  }

  const event = await prisma.event.findUnique({ where: { slug } })
  if (!event) {
    return NextResponse.json({ error: "Event hittades inte" }, { status: 404 })
  }

  const sessionToken = randomUUID()
  const guest = await prisma.guest.create({
    data: {
      eventId: event.id,
      name: name.trim(),
      sessionToken,
    },
  })

  const response = NextResponse.json({ guestId: guest.id })
  response.cookies.set("sessionToken", guest.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
  return response
}
