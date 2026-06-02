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
  it("returns params for disposable", () => {
    expect(getTransformParams("disposable")).toBe(
      "e_sepia:20,e_brightness:10,e_contrast:10,e_noise:15"
    )
  })
  it("returns params for vintage", () => {
    expect(getTransformParams("vintage")).toBe(
      "e_sepia:55,e_contrast:-10,e_saturation:-25,e_brightness:5"
    )
  })
  it("returns params for flash", () => {
    expect(getTransformParams("flash")).toBe(
      "e_brightness:22,e_contrast:8,e_saturation:-15"
    )
  })
})

describe("buildCloudinaryUrl", () => {
  it("builds correct URL for disposable style", () => {
    const url = buildCloudinaryUrl("seenbyus/evt1/img1", "disposable")
    expect(url).toBe(
      "https://res.cloudinary.com/testcloud/image/upload/e_sepia:20,e_brightness:10,e_contrast:10,e_noise:15/seenbyus/evt1/img1"
    )
  })

  it("builds correct URL for flash style", () => {
    const url = buildCloudinaryUrl("seenbyus/evt1/img2", "flash")
    expect(url).toBe(
      "https://res.cloudinary.com/testcloud/image/upload/e_brightness:22,e_contrast:8,e_saturation:-15/seenbyus/evt1/img2"
    )
  })
})

describe("buildZipUrl", () => {
  it("returns a string starting with https", () => {
    // buildZipUrl calls cloudinary SDK internally — we just verify it returns a URL string
    // Full integration test done manually
    const result = buildZipUrl(["img1", "img2"], "disposable")
    expect(typeof result).toBe("string")
    expect(result.startsWith("https")).toBe(true)
  })
})
