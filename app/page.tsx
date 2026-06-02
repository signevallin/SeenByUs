import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-white">
      <div className="max-w-lg mx-auto px-6 pt-24 pb-16 text-center">
        <p className="text-5xl mb-6">📷</p>
        <h1 className="text-4xl font-bold leading-tight mb-4">
          En cinematic camera
          <br />
          för er bröllopsdag
        </h1>
        <p className="text-stone-400 text-lg leading-relaxed mb-10">
          Gästerna tar bilderna. Ni väljer estetiken. Albumet öppnas nästa morgon —
          som att hämta ut film från framkallning.
        </p>

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link
            href="/signup"
            className="bg-white text-stone-950 rounded-xl py-4 text-sm font-bold hover:bg-stone-100 transition-colors"
          >
            Skapa ert event →
          </Link>
          <Link
            href="/login"
            className="text-stone-400 text-sm hover:text-white transition-colors"
          >
            Logga in
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-3 gap-6 text-center">
          {[
            { icon: "🎞️", label: "Välj en estetik", desc: "Disposable, Vintage eller 90s Flash" },
            { icon: "📲", label: "Gäster skannar QR", desc: "20 bilder var, ingen app att ladda ner" },
            { icon: "🌅", label: "Album nästa dag", desc: "Alla bilder stylat — klart att ladda ner" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-3xl mb-2">{item.icon}</p>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-stone-500 text-xs mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
