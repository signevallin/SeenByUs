import { v2 as cloudinary } from "cloudinary"
import { Style } from "@prisma/client"

const TRANSFORM_PARAMS: Record<Style, string> = {
  disposable: "e_sepia:20,e_brightness:10,e_contrast:10,e_noise:15",
  vintage: "e_sepia:55,e_contrast:-10,e_saturation:-25,e_brightness:5",
  flash: "e_brightness:22,e_contrast:8,e_saturation:-15",
}

export function getTransformParams(style: Style): string {
  return TRANSFORM_PARAMS[style]
}

export function buildCloudinaryUrl(publicId: string, style: Style): string {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
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
