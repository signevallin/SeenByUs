import { POST } from "@/app/api/photos/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/db", () => ({
  prisma: {
    guest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    photo: { create: jest.fn() },
  },
}))

import { prisma } from "@/lib/db"

function makeRequest(cookie: string, body: object) {
  return new NextRequest("http://localhost/api/photos", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify(body),
  })
}

describe("POST /api/photos", () => {
  it("returns 401 when no sessionToken", async () => {
    const res = await POST(makeRequest("", { publicId: "img1", eventId: "e1" }))
    expect(res.status).toBe(401)
  })

  it("returns 401 when guest not found", async () => {
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest("sessionToken=bad", { publicId: "img1", eventId: "e1" }))
    expect(res.status).toBe(401)
  })

  it("returns 403 when guest already at 20 photos", async () => {
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue({
      id: "g1",
      photoCount: 20,
      eventId: "e1",
    })
    const res = await POST(makeRequest("sessionToken=v", { publicId: "img1", eventId: "e1" }))
    expect(res.status).toBe(403)
  })

  it("creates photo and increments count on success", async () => {
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue({
      id: "g1",
      photoCount: 3,
      eventId: "e1",
    })
    ;(prisma.photo.create as jest.Mock).mockResolvedValue({ id: "p1" })
    ;(prisma.guest.update as jest.Mock).mockResolvedValue({ photoCount: 4 })

    const res = await POST(
      makeRequest("sessionToken=v", { publicId: "seenbyus/e1/img", eventId: "e1" })
    )
    expect(res.status).toBe(200)

    expect(prisma.photo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cloudinaryPublicId: "seenbyus/e1/img",
        guestId: "g1",
        eventId: "e1",
      }),
    })
    expect(prisma.guest.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { photoCount: { increment: 1 } },
    })

    const body = await res.json()
    expect(body.photoCount).toBe(4)
  })
})
