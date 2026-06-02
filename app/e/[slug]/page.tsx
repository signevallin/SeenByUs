"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  params: { slug: string }
}

export default function GuestWelcomePage({ params }: Props) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: params.slug, name }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Något gick fel")
      }

      router.push(`/e/${params.slug}/camera`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="w-full max-w-xs text-center">
        <p className="text-5xl mb-6">📷</p>
        <h1 className="text-white text-2xl font-bold mb-2">SeenByUs</h1>
        <p className="text-stone-400 text-sm mb-10">
          Ta bilder under festen. Albumet öppnas imorgon.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ditt förnamn"
            className="w-full bg-stone-800 text-white placeholder-stone-500 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-white/20"
            autoFocus
            required
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="bg-white text-stone-950 rounded-xl py-3.5 text-sm font-bold disabled:opacity-40 hover:bg-stone-100 transition-colors"
          >
            {loading ? "Vänta..." : "Börja ta bilder →"}
          </button>
        </form>
      </div>
    </div>
  )
}
