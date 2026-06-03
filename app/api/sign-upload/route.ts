import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("sessionToken")?.value
  if (!sessionToken) {
    return NextResponse.json({ error: "Inte autentiserad" }, { status: 401 })
  }

  let eventId: string | undefined
  try {
    const body = await request.json()
    eventId = body.eventId
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 })
  }

  if (!eventId) {
    return NextResponse.json({ error: "eventId saknas" }, { status: 400 })
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

  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!apiSecret) {
    return NextResponse.json({ error: "Server ej konfigurerad" }, { status: 500 })
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folder = `seenbyus/${eventId}`

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    apiSecret
  )

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  })
}
