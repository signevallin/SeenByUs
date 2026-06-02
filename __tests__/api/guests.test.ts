import { POST } from "@/app/api/guests/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: jest.fn() },
    guest: { create: jest.fn() },
  },
}))

import { prisma } from "@/lib/db"

describe("POST /api/guests", () => {
  it("returns 404 if event not found", async () => {
    ;(prisma.event.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/guests", {
      method: "POST",
      body: JSON.stringify({ slug: "notfound", name: "Anna" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it("returns 400 if name is missing", async () => {
    const req = new NextRequest("http://localhost/api/guests", {
      method: "POST",
      body: JSON.stringify({ slug: "abc12345", name: "" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 200 with guestId and sets cookie on success", async () => {
    ;(prisma.event.findUnique as jest.Mock).mockResolvedValue({ id: "evt1" })
    ;(prisma.guest.create as jest.Mock).mockResolvedValue({
      id: "g1",
      sessionToken: "tok123",
    })

    const req = new NextRequest("http://localhost/api/guests", {
      method: "POST",
      body: JSON.stringify({ slug: "abc12345", name: "Anna" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.guestId).toBe("g1")
    expect(res.headers.get("set-cookie")).toContain("sessionToken=tok123")
  })
})
