import { createEvent } from "@/app/actions/events"

export default function NewEventPage() {
  const styles = [
    { value: "disposable", label: "Disposable Camera", desc: "Varm, grynig, retro" },
    { value: "vintage", label: "Vintage Film", desc: "Kodak-ton, faded" },
    { value: "flash", label: "90s Flash", desc: "Ljust, paparazzi-känsla" },
  ]

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-lg mx-auto px-4 py-12">
        <a href="/dashboard" className="text-stone-400 text-sm mb-6 inline-block hover:text-stone-700">
          ← Tillbaka
        </a>
        <h1 className="text-2xl font-bold mb-8">Skapa nytt event</h1>

        <form action={createEvent} className="flex flex-col gap-6">
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1.5">
              Eventnamn
            </label>
            <input
              name="name"
              type="text"
              placeholder="Emma & Olivers bröllop"
              className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-stone-900"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1.5">
              Datum
            </label>
            <input
              name="date"
              type="date"
              className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-stone-900"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1.5">
              Välj stil
            </label>
            <div className="flex flex-col gap-2">
              {styles.map((s, i) => (
                <label
                  key={s.value}
                  className="flex items-center gap-3 border border-stone-200 rounded-lg px-4 py-3 cursor-pointer hover:border-stone-400 has-[:checked]:border-stone-900 has-[:checked]:bg-stone-50"
                >
                  <input
                    type="radio"
                    name="style"
                    value={s.value}
                    defaultChecked={i === 0}
                    className="accent-stone-900"
                  />
                  <div>
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="text-xs text-stone-400">{s.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="bg-stone-900 text-white rounded-lg py-3 text-sm font-semibold hover:bg-stone-800 transition-colors mt-2"
          >
            Skapa event & hämta QR-kod →
          </button>
        </form>
      </div>
    </div>
  )
}
