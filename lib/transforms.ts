import { v2 as cloudinary } from "cloudinary"
import { Style } from "@prisma/client"

const TRANSFORM_PARAMS: Record<Style, string> = {
  // Nostalgia — 90s Fujifilm/Kodak: warm, punchy, sharp
  nostalgia: "e_contrast:40,e_saturation:35,e_brightness:8,e_sharpen:150,e_sepia:15",
  // Romance — Polaroid: soft, warm, matte, low contrast with vignette
  romance: "e_contrast:-25,e_saturation:-15,e_brightness:18,e_sepia:25,e_vignette:30",
  // Classic B&W — Tidlös film: deep blacks, high contrast, sharp
  bw: "e_grayscale,e_contrast:45,e_sharpen:80,e_vignette:40",
  // Afterparty — Den rökiga klubben: dark, high contrast, desaturated
  afterparty: "e_brightness:-25,e_contrast:40,e_saturation:-50,e_sharpen:60,e_vignette:80",
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
