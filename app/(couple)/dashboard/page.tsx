import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  const events = await prisma.event.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Dina events</h1>
          <Link
            href="/events/new"
            className="bg-stone-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            + Nytt event
          </Link>
        </div>

        {events.length === 0 && (
          <div className="text-center py-20 text-stone-400">
            <p className="text-4xl mb-4">📷</p>
            <p className="font-medium">Inga events ännu</p>
            <p className="text-sm mt-1">Skapa ditt första bröllopsalbum</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {events.map((event) => {
            const revealed = new Date() >= new Date(event.revealedAt)
            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="bg-white rounded-xl p-5 flex items-center justify-between shadow-sm hover:shadow transition-shadow"
              >
                <div>
                  <p className="font-semibold">{event.name}</p>
                  <p className="text-stone-400 text-sm">
                    {new Date(event.date).toLocaleDateString("sv-SE")}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    revealed
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {revealed ? "Album klart" : "Pågår"}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
