import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"

export async function POST(request: NextRequest) {
  let slug: string | undefined
  let name: string | undefined
  try {
    const body = await request.json()
    slug = body.slug
    name = body.name
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 })
  }

  if (!slug) {
    return NextResponse.json({ error: "Slug saknas" }, { status: 400 })
  }

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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
  return response
}
