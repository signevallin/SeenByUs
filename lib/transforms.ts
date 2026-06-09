import { v2 as cloudinary } from "cloudinary"
import { Style } from "@prisma/client"

const TRANSFORM_PARAMS: Record<Style, string> = {
  // Nostalgia — 90s Fujifilm/Kodak: subtle warmth, punchy but not extreme
  nostalgia: "e_sepia:18,e_contrast:15,e_saturation:8,e_sharpen:60",
  // Romance — Polaroid: soft, faded, warm, low contrast
  romance: "e_sepia:20,e_contrast:-20,e_saturation:-10,e_brightness:10",
  // Classic B&W — Tidlös film: full desaturation, deep blacks, sharp
  bw: "e_saturation:-100,e_contrast:40,e_brightness:-5,e_sharpen:60",
  // Afterparty — Den rökiga klubben: dark, contrasty, desaturated
  afterparty: "e_brightness:-15,e_contrast:20,e_saturation:-35",
}

export function getTransformParams(style: Style): string {
  return TRANSFORM_PARAMS[style]
}

export function buildCloudinaryUrl(publicId: string, style: Style, eventDate?: Date): string {
  // NEXT_PUBLIC_ variant is needed if called client-side; fall back to server-side var
  const cloud =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    process.env.CLOUDINARY_CLOUD_NAME
  const params = getTransformParams(style)

  let transformations = params

  // Orange date stamp in corner for Nostalgia — classic Fujifilm/Kodak look
  if (style === "nostalgia" && eventDate) {
    const dd = String(eventDate.getDate()).padStart(2, "0")
    const mm = String(eventDate.getMonth() + 1).padStart(2, "0")
    const yy = String(eventDate.getFullYear()).slice(-2)
    const dateStr = `${dd}.${mm}.${yy}`
    transformations += `/l_text:Courier_18_bold:${dateStr},co_rgb:FF6600,g_south_east,x_15,y_15`
  }

  return `https://res.cloudinary.com/${cloud}/image/upload/${transformations}/${publicId}`
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
