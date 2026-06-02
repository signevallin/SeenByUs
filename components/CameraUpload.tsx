"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface CameraUploadProps {
  slug: string
  eventId: string
  initialCount: number
}

const MAX_PHOTOS = 20

export function CameraUpload({ slug, eventId, initialCount }: CameraUploadProps) {
  const [count, setCount] = useState(initialCount)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingFileRef = useRef<File | null>(null)
  const router = useRouter()

  const remaining = MAX_PHOTOS - count
  const done = remaining <= 0

  async function handleFile(file: File) {
    if (done || uploading) return
    if (!file.type.startsWith("image/")) {
      setError("Endast bilder är tillåtna")
      return
    }
    if (file.size > 20_000_000) {
      setError("Bilden är för stor (max 20 MB)")
      return
    }
    pendingFileRef.current = file
    setUploading(true)
    setError("")

    try {
      // 1. Get Cloudinary signature
      const sigRes = await fetch("/api/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      })
      if (!sigRes.ok) throw new Error("Kunde inte signera uppladdning")
      const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json()

      // 2. Upload directly to Cloudinary
      const formData = new FormData()
      formData.append("file", file)
      formData.append("signature", signature)
      formData.append("timestamp", String(timestamp))
      formData.append("api_key", apiKey)
      formData.append("folder", folder)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      )
      if (!uploadRes.ok) throw new Error("Uppladdning misslyckades")
      const { public_id } = await uploadRes.json()

      // 3. Save publicId to database
      const saveRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: public_id, eventId }),
      })
      if (!saveRes.ok) throw new Error("Kunde inte spara bilden")
      const { photoCount } = await saveRes.json()

      pendingFileRef.current = null
      setCount(photoCount)
      if (photoCount >= MAX_PHOTOS) {
        router.push(`/e/${slug}/done`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel — försök igen")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs text-center">
        {/* Counter */}
        <div className="mb-10">
          <p className="text-stone-500 text-sm mb-1">Bilder kvar</p>
          <p className="text-white text-7xl font-bold tabular-nums">{remaining}</p>
          <p className="text-stone-600 text-sm mt-1">av {MAX_PHOTOS}</p>
        </div>

        {/* Shutter button */}
        {!done && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-24 h-24 rounded-full bg-white flex items-center justify-center mx-auto text-4xl disabled:opacity-50 active:scale-95 transition-transform"
              aria-label="Ta bild"
            >
              {uploading ? "⏳" : "📷"}
            </button>
            <p className="text-stone-600 text-xs mt-4">
              {uploading ? "Laddar upp..." : "Tryck för att ta en bild"}
            </p>
          </>
        )}

        {done && (
          <div className="text-center">
            <p className="text-white font-semibold">Alla bilder tagna!</p>
            <button
              onClick={() => router.push(`/e/${slug}/done`)}
              className="mt-4 bg-white text-stone-950 rounded-xl px-6 py-3 text-sm font-bold"
            >
              Fortsätt →
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => {
                if (pendingFileRef.current) {
                  handleFile(pendingFileRef.current)
                } else {
                  inputRef.current?.click()
                }
              }}
              className="mt-2 text-white text-sm underline"
            >
              Försök igen
            </button>
          </div>
        )}

        {/* Hidden file input — opens camera on mobile */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>
    </div>
  )
}
