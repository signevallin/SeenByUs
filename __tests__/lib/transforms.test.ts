import { getTransformParams, buildCloudinaryUrl, buildZipUrl } from "@/lib/transforms"

const ORIGINAL_ENV = process.env

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "testcloud",
    CLOUDINARY_CLOUD_NAME: "testcloud",
    CLOUDINARY_API_KEY: "testkey",
    CLOUDINARY_API_SECRET: "testsecret",
  }
})

afterEach(() => {
  process.env = ORIGINAL_ENV
})

describe("getTransformParams", () => {
  it("returns params for nostalgia", () => {
    expect(getTransformParams("nostalgia")).toBe("e_contrast:40/e_saturation:30/e_noise:10")
  })
  it("returns params for romance", () => {
    expect(getTransformParams("romance")).toBe("e_vibe/e_contrast:-10/e_improve:outdoor:20/e_blur:30")
  })
  it("returns params for bw", () => {
    expect(getTransformParams("bw")).toBe("e_grayscale/e_contrast:60/e_noise:25")
  })
  it("returns params for afterparty", () => {
    expect(getTransformParams("afterparty")).toBe(
      "e_vignette:80/e_contrast:30/e_improve:indoor/co_rgb:ff3300,e_gradient_fade,g_west,w_0.2"
    )
  })
})

describe("buildCloudinaryUrl", () => {
  it("nostalgia without date uses today's date in stamp", () => {
    const url = buildCloudinaryUrl("seenbyus/evt1/img1", "nostalgia")
    expect(url).toContain("l_text:Courier_24_bold:")
    expect(url).toContain("co_rgb:ff6600")
    expect(url).toContain("g_south_east")
  })

  it("nostalgia with date uses event date in stamp", () => {
    const date = new Date("2026-06-14")
    const url = buildCloudinaryUrl("seenbyus/evt1/img1", "nostalgia", date)
    expect(url).toContain("l_text:Courier_24_bold:2026-06-14")
  })

  it("does not add overlay for romance style", () => {
    const url = buildCloudinaryUrl("seenbyus/evt1/img2", "romance", new Date("2026-06-14"))
    expect(url).not.toContain("l_text")
  })

  it("builds correct URL for bw style", () => {
    const url = buildCloudinaryUrl("seenbyus/evt1/img3", "bw")
    expect(url).toBe(
      "https://res.cloudinary.com/testcloud/image/upload/e_grayscale/e_contrast:60/e_noise:25/seenbyus/evt1/img3"
    )
  })
})

describe("buildZipUrl", () => {
  it("returns a URL containing the cloud name and transform params", () => {
    const result = buildZipUrl(["img1", "img2"], "nostalgia")
    expect(typeof result).toBe("string")
    expect(result.startsWith("https")).toBe(true)
    expect(result).toContain("testcloud")
  })
})
