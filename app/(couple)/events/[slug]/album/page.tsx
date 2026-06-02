import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { AlbumGrid } from "@/components/AlbumGrid"
import { buildZipUrl } from "@/lib/transforms"
import Link from "next/link"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AlbumPage({ params }: Props) {
  const { slug } = await params
  const session = await auth()

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      photos: {
        include: { guest: { select: { name: true } } },
        orderBy: { takenAt: "asc" },
      },
    },
  })

  if (!event || event.userId !== session!.user.id) notFound()

  const notYetRevealed = new Date() < new Date(event.revealedAt)

  if (notYetRevealed) {
    const revealDate = new Date(event.revealedAt).toLocaleDateString("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    const revealTime = new Date(event.revealedAt).toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm",
    })

    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <p className="text-5xl mb-6">⏳</p>
          <h1 className="text-2xl font-bold mb-2">Albumet framkallas</h1>
          <p className="text-stone-500 text-sm">
            Öppnas {revealDate} kl {revealTime}
          </p>
          <Link
            href={`/events/${slug}`}
            className="mt-8 inline-block text-stone-400 text-sm hover:text-stone-700"
          >
            ← Tillbaka till event
          </Link>
        </div>
      </div>
    )
  }

  const publicIds = event.photos.map((p) => p.cloudinaryPublicId)
  const zipUrl = publicIds.length > 0 ? buildZipUrl(publicIds, event.style) : null

  const styleLabels: Record<string, string> = {
    disposable: "Disposable Camera",
    vintage: "Vintage Film",
    flash: "90s Flash",
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/events/${slug}`} className="text-stone-400 text-sm hover:text-stone-700">
              ← Tillbaka
            </Link>
            <h1 className="text-2xl font-bold mt-2">{event.name}</h1>
            <p className="text-stone-400 text-sm">
              {event.photos.length} bilder · {styleLabels[event.style]}
            </p>
          </div>
          {zipUrl && (
            <a
              href={zipUrl}
              className="bg-stone-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-stone-800 transition-colors"
            >
              ↓ Ladda ner alla
            </a>
          )}
        </div>

        <AlbumGrid photos={event.photos} style={event.style} />
      </div>
    </div>
  )
}
