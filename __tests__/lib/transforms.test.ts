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
    expect(getTransformParams("nostalgia")).toBe(
      "e_contrast:40,e_saturation:35,e_brightness:8,e_sharpen:150,e_sepia:15"
    )
  })
  it("returns params for romance", () => {
    expect(getTransformParams("romance")).toBe(
      "e_contrast:-25,e_saturation:-15,e_brightness:18,e_sepia:25,e_vignette:30"
    )
  })
  it("returns params for bw", () => {
    expect(getTransformParams("bw")).toBe(
      "e_grayscale,e_contrast:45,e_sharpen:80,e_vignette:40"
    )
  })
  it("returns params for afterparty", () => {
    expect(getTransformParams("afterparty")).toBe(
      "e_brightness:-25,e_contrast:40,e_saturation:-50,e_sharpen:60,e_vignette:80"
    )
  })
})

describe("buildCloudinaryUrl", () => {
  it("builds correct URL for nostalgia without date", () => {
    const url = buildCloudinaryUrl("seenbyus/evt1/img1", "nostalgia")
    expect(url).toBe(
      "https://res.cloudinary.com/testcloud/image/upload/e_contrast:40,e_saturation:35,e_brightness:8,e_sharpen:150,e_sepia:15/seenbyus/evt1/img1"
    )
  })

  it("adds orange date stamp overlay for nostalgia with date", () => {
    const date = new Date("2026-06-14")
    const url = buildCloudinaryUrl("seenbyus/evt1/img1", "nostalgia", date)
    expect(url).toContain("l_text:Courier_18_bold:14.06.26")
    expect(url).toContain("co_rgb:FF6600")
    expect(url).toContain("g_south_east")
  })

  it("does not add overlay for romance style", () => {
    const date = new Date("2026-06-14")
    const url = buildCloudinaryUrl("seenbyus/evt1/img2", "romance", date)
    expect(url).not.toContain("l_text")
  })

  it("builds correct URL for bw style", () => {
    const url = buildCloudinaryUrl("seenbyus/evt1/img3", "bw")
    expect(url).toBe(
      "https://res.cloudinary.com/testcloud/image/upload/e_grayscale,e_contrast:45,e_sharpen:80,e_vignette:40/seenbyus/evt1/img3"
    )
  })
})

describe("buildZipUrl", () => {
  it("returns a URL containing the cloud name and transform params", () => {
    const result = buildZipUrl(["img1", "img2"], "nostalgia")
    expect(typeof result).toBe("string")
    expect(result.startsWith("https")).toBe(true)
    expect(result).toContain("testcloud")
    expect(result).toContain("e_contrast")
  })
})
