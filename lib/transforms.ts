import { v2 as cloudinary } from "cloudinary"
import { Style } from "@prisma/client"

const TRANSFORM_PARAMS: Record<Style, string> = {
  // Nostalgia — 90s Fujifilm/Kodak (date stamp added dynamically in buildCloudinaryUrl)
  nostalgia: "e_contrast:40/e_saturation:30/e_noise:10",
  // Romance — Polaroid: soft, dreamy, warm glow
  romance: "e_vibe/e_contrast:-10/e_improve:outdoor:20/e_blur:30",
  // Classic B&W — Tidlös film: deep blacks, high contrast, grain
  bw: "e_grayscale/e_contrast:60/e_noise:25",
  // Afterparty — Den rökiga klubben: vignette, indoor, warm light leak
  afterparty: "e_vignette:80/e_contrast:30/e_improve:indoor/co_rgb:ff3300,e_gradient_fade,g_west,w_0.2",
}

export function getTransformParams(style: Style): string {
  return TRANSFORM_PARAMS[style]
}

export function buildCloudinaryUrl(publicId: string, style: Style, eventDate?: Date): string {
  // NEXT_PUBLIC_ variant is needed if called client-side; fall back to server-side var
  const cloud =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    process.env.CLOUDINARY_CLOUD_NAME
  let transformations = TRANSFORM_PARAMS[style]

  // Nostalgia: append orange date stamp — format YYYY-MM-DD like a Fujifilm timestamp
  if (style === "nostalgia") {
    const date = eventDate ?? new Date()
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")
    transformations += `/l_text:Courier_24_bold:${yyyy}-${mm}-${dd},co_rgb:ff6600,g_south_east,x_20,y_20`
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
