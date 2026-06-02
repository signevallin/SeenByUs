import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DonePage({ params }: Props) {
  const { slug } = await params

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { name: true, revealedAt: true },
  })
  if (!event) notFound()

  const revealDate = new Date(event.revealedAt).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="text-center max-w-xs">
        <p className="text-6xl mb-6">🎞️</p>
        <h1 className="text-white text-2xl font-bold mb-3">Bilderna framkallas</h1>
        <p className="text-stone-400 text-sm leading-relaxed">
          Dina bilder från <span className="text-white">{event.name}</span> framkallas nu.
          Brudparet öppnar albumet {revealDate}.
        </p>
        <p className="text-stone-600 text-xs mt-8">Tack för att du var med 💛</p>
      </div>
    </div>
  )
}
