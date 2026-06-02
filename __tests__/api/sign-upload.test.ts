import { POST } from "@/app/api/sign-upload/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/db", () => ({
  prisma: {
    guest: { findUnique: jest.fn() },
  },
}))

jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    utils: {
      api_sign_request: jest.fn(() => "mock-sig"),
    },
  },
}))

import { prisma } from "@/lib/db"

function makeRequest(cookie: string, body: object) {
  return new NextRequest("http://localhost/api/sign-upload", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify(body),
  })
}

describe("POST /api/sign-upload", () => {
  it("returns 401 when no sessionToken cookie", async () => {
    const res = await POST(makeRequest("", { eventId: "e1" }))
    expect(res.status).toBe(401)
  })

  it("returns 401 when guest not found", async () => {
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest("sessionToken=bad", { eventId: "e1" }))
    expect(res.status).toBe(401)
  })

  it("returns 403 when guest has reached photo limit", async () => {
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue({
      id: "g1",
      photoCount: 20,
      eventId: "e1",
    })
    const res = await POST(makeRequest("sessionToken=valid", { eventId: "e1" }))
    expect(res.status).toBe(403)
  })

  it("returns signature payload when guest is valid and under limit", async () => {
    process.env.CLOUDINARY_API_KEY = "test-key"
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud"
    process.env.CLOUDINARY_API_SECRET = "test-secret"
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue({
      id: "g1",
      photoCount: 5,
      eventId: "e1",
    })
    const res = await POST(makeRequest("sessionToken=valid", { eventId: "e1" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      signature: "mock-sig",
      apiKey: "test-key",
      cloudName: "test-cloud",
    })
    expect(typeof body.timestamp).toBe("number")
    expect(body.folder).toContain("e1")
  })
})
