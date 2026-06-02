import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { QRCode } from "@/components/QRCode"
import Link from "next/link"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params
  const session = await auth()

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      _count: { select: { photos: true, guests: true } },
    },
  })

  if (!event || event.userId !== session!.user.id) notFound()

  const guestUrl = `${process.env.NEXT_PUBLIC_URL}/e/${event.slug}`
  const revealed = new Date() >= new Date(event.revealedAt)

  const styleLabels: Record<string, string> = {
    disposable: "Disposable Camera",
    vintage: "Vintage Film",
    flash: "90s Flash",
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-xl mx-auto px-4 py-12">
        <Link href="/dashboard" className="text-stone-400 text-sm mb-6 inline-block hover:text-stone-700">
          ← Alla events
        </Link>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-1">{event.name}</h1>
          <p className="text-stone-400 text-sm mb-8">
            {new Date(event.date).toLocaleDateString("sv-SE")} · {styleLabels[event.style]}
          </p>

          <div className="flex flex-col items-center gap-4 mb-8">
            <QRCode url={guestUrl} size={220} />
            <p className="text-xs text-stone-400 text-center">
              Visa eller skriv ut — gäster skannar för att ta bilder
            </p>
            <a
              href={guestUrl}
              target="_blank"
              className="text-xs text-stone-500 underline break-all"
            >
              {guestUrl}
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-stone-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{event._count.photos}</p>
              <p className="text-stone-400 text-sm mt-0.5">bilder</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{event._count.guests}</p>
              <p className="text-stone-400 text-sm mt-0.5">gäster</p>
            </div>
          </div>

          {revealed ? (
            <Link
              href={`/events/${event.slug}/album`}
              className="block w-full text-center bg-stone-900 text-white rounded-lg py-3 text-sm font-semibold hover:bg-stone-800 transition-colors"
            >
              🎉 Öppna albumet →
            </Link>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-amber-800">Albumet öppnas</p>
              <p className="text-sm text-amber-700 mt-0.5">
                {new Date(event.revealedAt).toLocaleDateString("sv-SE")} kl{" "}
                {new Date(event.revealedAt).toLocaleTimeString("sv-SE", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Stockholm",
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
