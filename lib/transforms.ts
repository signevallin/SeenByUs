import { v2 as cloudinary } from "cloudinary"
import { Style } from "@prisma/client"

const TRANSFORM_PARAMS: Record<Style, string> = {
  // Disposable camera: warm sepia tint, punchy contrast, slight overexposure
  disposable: "e_sepia:25,e_brightness:12,e_contrast:18,e_saturation:15",
  // Vintage film: faded Kodak tones, low saturation, lifted shadows
  vintage: "e_sepia:50,e_brightness:8,e_contrast:-12,e_saturation:-35",
  // 90s flash: overexposed, desaturated, flat like a point-and-shoot
  flash: "e_brightness:28,e_contrast:10,e_saturation:-25",
}

export function getTransformParams(style: Style): string {
  return TRANSFORM_PARAMS[style]
}

export function buildCloudinaryUrl(publicId: string, style: Style): string {
  // NEXT_PUBLIC_ variant is needed if called client-side; fall back to server-side var
  const cloud =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    process.env.CLOUDINARY_CLOUD_NAME
  const params = getTransformParams(style)
  return `https://res.cloudinary.com/${cloud}/image/upload/${params}/${publicId}`
}

export function buildZipUrl(publicIds: string[], style: Style): string {
  // Configure lazily so env vars are read at call time (safe for both server and test contexts)
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  const params = getTransformParams(style)
  return cloudinary.utils.download_zip_url({
    public_ids: publicIds,
    transformations: params,
    resource_type: "image",
  })
}
