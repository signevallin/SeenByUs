import { signup } from "@/app/actions/auth"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold mb-1">Skapa konto</h1>
        <p className="text-stone-500 text-sm mb-8">För brudpar och arrangörer</p>
        <form action={signup} className="flex flex-col gap-4">
          <input
            name="name"
            type="text"
            placeholder="Ert namn"
            className="border border-stone-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-stone-900"
            required
          />
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
            placeholder="Lösenord (minst 8 tecken)"
            minLength={8}
            className="border border-stone-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-stone-900"
            required
          />
          <button
            type="submit"
            className="bg-stone-900 text-white rounded-lg py-3 text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            Skapa konto
          </button>
        </form>
        <p className="text-center text-stone-400 text-sm mt-6">
          Redan registrerad?{" "}
          <a href="/login" className="text-stone-900 underline">
            Logga in
          </a>
        </p>
      </div>
    </div>
  )
}
