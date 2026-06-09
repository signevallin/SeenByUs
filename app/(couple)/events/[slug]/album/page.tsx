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

  if (!session?.user || !event || event.userId !== session.user.id) notFound()

  // TODO: re-enable reveal gate after filter testing
  // const notYetRevealed = new Date() < new Date(event.revealedAt)
  // if (notYetRevealed) { ... }

  const publicIds = event.photos.map((p) => p.cloudinaryPublicId)
  const zipUrl = publicIds.length > 0 ? buildZipUrl(publicIds, event.style) : null

  const styleLabels: Record<string, string> = {
    nostalgia: "Nostalgia — 90s Retro",
    romance: "Romance — Polaroid",
    bw: "Classic B&W",
    afterparty: "Afterparty",
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

        <AlbumGrid photos={event.photos} style={event.style} eventDate={event.date} />
      </div>
    </div>
  )
}
