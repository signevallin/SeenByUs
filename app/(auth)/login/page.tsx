import { login } from "@/app/actions/auth"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold mb-1">Logga in</h1>
        <p className="text-stone-500 text-sm mb-8">SeenByUs</p>
        <form action={login} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="E-postadress"
            className="border border-stone-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-stone-900"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Lösenord"
            className="border border-stone-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-stone-900"
            required
          />
          <button
            type="submit"
            className="bg-stone-900 text-white rounded-lg py-3 text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            Logga in
          </button>
        </form>
        <p className="text-center text-stone-400 text-sm mt-6">
          Inget konto?{" "}
          <a href="/signup" className="text-stone-900 underline">
            Registrera dig
          </a>
        </p>
      </div>
    </div>
  )
}
