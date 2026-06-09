"use client"

// TEMP: Filter preview page — delete when filters are finalized
// Usage: /filter-preview?photo=seenbyus/eventId/photoId

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

const FILTERS = [
  {
    name: "Nostalgia",
    desc: "90s Retro — Fujifilm/Kodak",
    params: "e_contrast:40/e_saturation:30/e_noise:10",
  },
  {
    name: "Romance",
    desc: "Polaroid — mjuk och varm",
    params: "e_vibe/e_contrast:-10/e_improve:outdoor:20/e_blur:30",
  },
  {
    name: "Classic B&W",
    desc: "Tidlös film",
    params: "e_grayscale/e_contrast:60/e_noise:25",
  },
  {
    name: "Afterparty",
    desc: "Den rökiga klubben",
    params: "e_vignette:80/e_contrast:30/e_improve:indoor/co_rgb:ff3300,e_gradient_fade,g_west,w_0.2",
  },
]

function FilterGrid() {
  const params = useSearchParams()
  const photo = params.get("photo") ?? "sample"

  function url(transformations: string) {
    return `https://res.cloudinary.com/${CLOUD}/image/upload/${transformations}/${photo}`
  }

  return (
    <div className="min-h-screen bg-stone-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-white text-xl font-bold">Filter preview</h1>
          <p className="text-stone-400 text-sm mt-1">
            Photo:{" "}
            <code className="text-stone-300 text-xs bg-stone-800 px-2 py-0.5 rounded">
              {photo}
            </code>
          </p>
          <p className="text-stone-500 text-xs mt-1">
            Byt foto: lägg till <code className="text-stone-400">?photo=seenbyus/eventId/photoId</code> i URL:en
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {FILTERS.map((f) => (
            <div key={f.name} className="bg-stone-900 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url(f.params)}
                alt={f.name}
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="p-3">
                <p className="text-white text-sm font-semibold">{f.name}</p>
                <p className="text-stone-400 text-xs">{f.desc}</p>
                <p className="text-stone-600 text-xs mt-1 font-mono break-all leading-relaxed">
                  {f.params}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FilterPreviewPage() {
  return (
    <Suspense>
      <FilterGrid />
    </Suspense>
  )
}
