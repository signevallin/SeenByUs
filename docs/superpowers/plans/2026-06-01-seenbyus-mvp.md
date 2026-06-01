# SeenByUs MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cinematic social camera PWA for weddings — guests upload photos via QR code, the couple receives a styled album the next morning.

**Architecture:** Next.js 14 App Router monolith on Vercel. Prisma + Neon Postgres for data. Cloudinary for image storage and on-the-fly style transforms via URL parameters. NextAuth v5 credentials provider for couple auth; guests identified by a session cookie (no account needed).

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, next-auth v5, Prisma 5, Neon Postgres, Cloudinary Node SDK, nanoid, qrcode, bcryptjs, Jest

---

## File Map

```
app/
  page.tsx                          # Landing page (/)
  layout.tsx                        # Root layout
  (auth)/
    signup/page.tsx                 # Couple signup
    login/page.tsx                  # Couple login
  (couple)/
    layout.tsx                      # Auth guard — redirects to /login if no session
    dashboard/page.tsx              # List events
    events/
      new/page.tsx                  # Create event form
      [slug]/
        page.tsx                    # Event page: QR code + stats + countdown
        album/page.tsx              # Album reveal page
  e/
    [slug]/
      page.tsx                      # Guest welcome + name entry
      camera/page.tsx               # Guest camera / upload UI
      done/page.tsx                 # Done screen
  api/
    auth/[...nextauth]/route.ts     # NextAuth handler
    guests/route.ts                 # POST: create guest, set cookie
    sign-upload/route.ts            # POST: generate Cloudinary upload signature
    photos/route.ts                 # POST: save photo public_id after upload

lib/
  auth.ts                           # NextAuth config (providers, callbacks)
  db.ts                             # Prisma client singleton
  transforms.ts                     # Style → Cloudinary transform params + URL builder

components/
  QRCode.tsx                        # Renders QR code as <img> from data URL
  CameraUpload.tsx                  # File input + upload flow + counter display
  AlbumGrid.tsx                     # Photo grid with Cloudinary-styled URLs
  CountdownTimer.tsx                # Client component: time until album reveal

prisma/
  schema.prisma

__tests__/
  lib/transforms.test.ts
  api/sign-upload.test.ts
  api/photos.test.ts
  api/guests.test.ts
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `.env.local`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /Users/signevallin/Desktop/SeenByUs
npx create-next-app@14 . --typescript --tailwind --eslint --app --no-src-dir --import-alias="@/*"
```

When prompted, accept all defaults. This creates the base project in the current directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client \
  cloudinary nanoid qrcode bcryptjs

npm install --save-dev @types/bcryptjs @types/qrcode jest jest-environment-node \
  ts-jest @types/jest
```

- [ ] **Step 3: Create `.env.local`**

```bash
cat > .env.local << 'EOF'
# Database (get from Neon dashboard)
DATABASE_URL="postgresql://user:pass@host/seenbyus?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Cloudinary (get from Cloudinary dashboard)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"

# App
NEXT_PUBLIC_URL="http://localhost:3000"
EOF
```

Fill in real values from Neon and Cloudinary dashboards before continuing.

- [ ] **Step 4: Configure Jest**

Create `jest.config.ts`:

```typescript
import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterFramework: ["<rootDir>/jest.setup.ts"],
  testPathPattern: "__tests__",
}

export default createJestConfig(config)
```

Create `jest.setup.ts`:

```typescript
// Global test setup — add mocks here if needed across all tests
```

- [ ] **Step 5: Add test script to `package.json`**

In `package.json`, confirm `scripts` includes:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000 with the default Next.js page. `Ctrl+C` to stop.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: bootstrap Next.js project with deps and jest config"
```

---

## Task 2: Prisma Schema & Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`

- [ ] **Step 1: Initialise Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

- [ ] **Step 2: Write schema**

Replace the contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  events       Event[]
}

model Event {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  name       String
  date       DateTime
  slug       String   @unique
  style      Style
  revealedAt DateTime
  createdAt  DateTime @default(now())
  guests     Guest[]
  photos     Photo[]
}

enum Style {
  disposable
  vintage
  flash
}

model Guest {
  id           String   @id @default(cuid())
  eventId      String
  event        Event    @relation(fields: [eventId], references: [id])
  name         String
  sessionToken String   @unique
  photoCount   Int      @default(0)
  createdAt    DateTime @default(now())
  photos       Photo[]
}

model Photo {
  id                 String   @id @default(cuid())
  eventId            String
  event              Event    @relation(fields: [eventId], references: [id])
  guestId            String
  guest              Guest    @relation(fields: [guestId], references: [id])
  cloudinaryPublicId String
  takenAt            DateTime @default(now())
  createdAt          DateTime @default(now())
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: migration created and applied, `PrismaClient` generated.

- [ ] **Step 4: Create Prisma singleton**

Create `lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Verify connection**

```bash
npx prisma studio
```

Expected: Prisma Studio opens in browser showing empty User, Event, Guest, Photo tables. Close it.

- [ ] **Step 6: Commit**

```bash
git add prisma/ lib/db.ts
git commit -m "feat: add Prisma schema and db singleton"
```

---

## Task 3: Cloudinary Transforms Library

**Files:**
- Create: `lib/transforms.ts`
- Create: `__tests__/lib/transforms.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/transforms.test.ts`:

```typescript
import { getTransformParams, buildCloudinaryUrl, buildZipUrl } from "@/lib/transforms"

const ORIGINAL_ENV = process.env

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "testcloud" }
})

afterEach(() => {
  process.env = ORIGINAL_ENV
})

describe("getTransformParams", () => {
  it("returns params for disposable", () => {
    expect(getTransformParams("disposable")).toBe(
      "e_sepia:20,e_brightness:10,e_contrast:10,e_noise:15"
    )
  })
  it("returns params for vintage", () => {
    expect(getTransformParams("vintage")).toBe(
      "e_sepia:55,e_contrast:-10,e_saturation:-25,e_brightness:5"
    )
  })
  it("returns params for flash", () => {
    expect(getTransformParams("flash")).toBe(
      "e_brightness:22,e_contrast:8,e_saturation:-15"
    )
  })
})

describe("buildCloudinaryUrl", () => {
  it("builds correct URL for disposable style", () => {
    const url = buildCloudinaryUrl("seenbyus/evt1/img1", "disposable")
    expect(url).toBe(
      "https://res.cloudinary.com/testcloud/image/upload/e_sepia:20,e_brightness:10,e_contrast:10,e_noise:15/seenbyus/evt1/img1"
    )
  })

  it("builds correct URL for flash style", () => {
    const url = buildCloudinaryUrl("seenbyus/evt1/img2", "flash")
    expect(url).toBe(
      "https://res.cloudinary.com/testcloud/image/upload/e_brightness:22,e_contrast:8,e_saturation:-15/seenbyus/evt1/img2"
    )
  })
})

describe("buildZipUrl", () => {
  it("returns a string starting with https", () => {
    // buildZipUrl calls cloudinary SDK internally — we just verify it returns a URL string
    // Full integration test done manually
    const result = buildZipUrl(["img1", "img2"], "disposable")
    expect(typeof result).toBe("string")
    expect(result.startsWith("https")).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- __tests__/lib/transforms.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/transforms'`

- [ ] **Step 3: Implement `lib/transforms.ts`**

```typescript
import { v2 as cloudinary } from "cloudinary"
import { Style } from "@prisma/client"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const TRANSFORM_PARAMS: Record<Style, string> = {
  disposable: "e_sepia:20,e_brightness:10,e_contrast:10,e_noise:15",
  vintage: "e_sepia:55,e_contrast:-10,e_saturation:-25,e_brightness:5",
  flash: "e_brightness:22,e_contrast:8,e_saturation:-15",
}

export function getTransformParams(style: Style): string {
  return TRANSFORM_PARAMS[style]
}

export function buildCloudinaryUrl(publicId: string, style: Style): string {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const params = getTransformParams(style)
  return `https://res.cloudinary.com/${cloud}/image/upload/${params}/${publicId}`
}

export function buildZipUrl(publicIds: string[], style: Style): string {
  const params = getTransformParams(style)
  return cloudinary.utils.download_zip_url({
    public_ids: publicIds,
    transformations: params,
    resource_type: "image",
  })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- __tests__/lib/transforms.test.ts
```

Expected: PASS (3 test suites, all green).

- [ ] **Step 5: Commit**

```bash
git add lib/transforms.ts __tests__/lib/transforms.test.ts
git commit -m "feat: add Cloudinary transforms library with tests"
```

---

## Task 4: NextAuth Configuration

**Files:**
- Create: `auth.ts` (root)
- Create: `app/api/auth/[...nextauth]/route.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `auth.ts` at the project root**

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
})
```

- [ ] **Step 2: Create route handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 3: Extend session type**

Create `types/next-auth.d.ts`:

```typescript
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}
```

- [ ] **Step 4: Verify NextAuth works**

```bash
npm run dev
```

Visit http://localhost:3000/api/auth/providers — expected: JSON showing `credentials` provider. `Ctrl+C`.

- [ ] **Step 5: Commit**

```bash
git add auth.ts app/api/auth/ types/
git commit -m "feat: configure NextAuth credentials provider"
```

---

## Task 5: Auth Pages (Signup & Login)

**Files:**
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/actions/auth.ts`

- [ ] **Step 1: Create server actions for auth**

Create `app/actions/auth.ts`:

```typescript
"use server"

import { signIn } from "@/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { AuthError } from "next-auth"

export async function signup(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string

  if (!email || !password || password.length < 8) {
    throw new Error("Ogiltiga uppgifter")
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error("E-postadressen används redan")

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({ data: { email, passwordHash, name } })

  await signIn("credentials", { email, password, redirectTo: "/dashboard" })
}

export async function login(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      throw new Error("Fel e-post eller lösenord")
    }
    throw error
  }
}
```

- [ ] **Step 2: Create signup page**

Create `app/(auth)/signup/page.tsx`:

```typescript
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
```

- [ ] **Step 3: Create login page**

Create `app/(auth)/login/page.tsx`:

```typescript
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
```

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

Visit http://localhost:3000/signup — form should render. Visit http://localhost:3000/login — form should render. Try signing up with a test email. Expected: redirect to `/dashboard` (will 404 for now). `Ctrl+C`.

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/ app/actions/auth.ts
git commit -m "feat: add signup and login pages with server actions"
```

---

## Task 6: Couple Auth Guard & Dashboard

**Files:**
- Create: `app/(couple)/layout.tsx`
- Create: `app/(couple)/dashboard/page.tsx`

- [ ] **Step 1: Create auth guard layout**

Create `app/(couple)/layout.tsx`:

```typescript
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function CoupleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return <>{children}</>
}
```

- [ ] **Step 2: Create dashboard page**

Create `app/(couple)/dashboard/page.tsx`:

```typescript
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
```

- [ ] **Step 3: Verify auth guard**

```bash
npm run dev
```

Visit http://localhost:3000/dashboard without being logged in — expected: redirect to `/login`. Log in with the test account — expected: dashboard with empty events list. `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add app/\(couple\)/
git commit -m "feat: add couple auth guard layout and dashboard"
```

---

## Task 7: Event Creation

**Files:**
- Create: `app/(couple)/events/new/page.tsx`
- Create: `app/actions/events.ts`

- [ ] **Step 1: Create event server action**

Create `app/actions/events.ts`:

```typescript
"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Style } from "@prisma/client"
import { customAlphabet } from "nanoid"
import { redirect } from "next/navigation"

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8)

function computeRevealedAt(eventDate: Date): Date {
  // Set to 08:00 UTC the day after the event date
  const reveal = new Date(eventDate)
  reveal.setUTCDate(reveal.getUTCDate() + 1)
  reveal.setUTCHours(8, 0, 0, 0)
  return reveal
}

export async function createEvent(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Inte inloggad")

  const name = formData.get("name") as string
  const dateStr = formData.get("date") as string
  const style = formData.get("style") as Style

  if (!name || !dateStr || !["disposable", "vintage", "flash"].includes(style)) {
    throw new Error("Ogiltiga uppgifter")
  }

  const date = new Date(dateStr)
  const revealedAt = computeRevealedAt(date)

  let slug: string
  let attempts = 0
  do {
    slug = nanoid()
    attempts++
    if (attempts > 10) throw new Error("Kunde inte generera unikt slug")
  } while (await prisma.event.findUnique({ where: { slug } }))

  await prisma.event.create({
    data: {
      userId: session.user.id,
      name,
      date,
      slug,
      style,
      revealedAt,
    },
  })

  redirect(`/events/${slug}`)
}
```

- [ ] **Step 2: Create event form page**

Create `app/(couple)/events/new/page.tsx`:

```typescript
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
              className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-stone-900"
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
              className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-stone-900"
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
```

- [ ] **Step 3: Smoke test**

```bash
npm run dev
```

Log in → go to http://localhost:3000/events/new → fill in name/date/style → submit. Expected: redirect to `/events/[slug]` (will 404 for now). Verify event was created:

```bash
npx prisma studio
```

Check Event table — a record should exist. Close Prisma Studio. `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add app/\(couple\)/events/new/ app/actions/events.ts
git commit -m "feat: add event creation with slug generation and revealedAt calc"
```

---

## Task 8: Event Page with QR Code

**Files:**
- Create: `components/QRCode.tsx`
- Create: `app/(couple)/events/[slug]/page.tsx`

- [ ] **Step 1: Create QR code component**

Create `components/QRCode.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import QRCodeLib from "qrcode"

interface QRCodeProps {
  url: string
  size?: number
}

export function QRCode({ url, size = 240 }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("")

  useEffect(() => {
    QRCodeLib.toDataURL(url, {
      width: size,
      margin: 2,
      color: { dark: "#1c1917", light: "#fafaf9" },
    }).then(setDataUrl)
  }, [url, size])

  if (!dataUrl) return <div className="w-60 h-60 bg-stone-100 rounded-lg animate-pulse" />

  return (
    <img
      src={dataUrl}
      alt="QR-kod till event"
      width={size}
      height={size}
      className="rounded-lg"
    />
  )
}
```

- [ ] **Step 2: Create event management page**

Create `app/(couple)/events/[slug]/page.tsx`:

```typescript
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { QRCode } from "@/components/QRCode"
import Link from "next/link"

interface Props {
  params: { slug: string }
}

export default async function EventPage({ params }: Props) {
  const session = await auth()

  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
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
```

- [ ] **Step 3: Smoke test**

```bash
npm run dev
```

Log in → Dashboard → click the test event (or navigate to `/events/[slug]`). Expected: QR code renders, photo/guest counts show 0, amber "albumet öppnas" box shows. `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add components/QRCode.tsx app/\(couple\)/events/
git commit -m "feat: add event page with QR code and reveal status"
```

---

## Task 9: Guest Entry API

**Files:**
- Create: `app/api/guests/route.ts`
- Create: `__tests__/api/guests.test.ts`
- Create: `app/e/[slug]/page.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/guests.test.ts`:

```typescript
import { POST } from "@/app/api/guests/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: jest.fn() },
    guest: { create: jest.fn() },
  },
}))

import { prisma } from "@/lib/db"

describe("POST /api/guests", () => {
  it("returns 404 if event not found", async () => {
    ;(prisma.event.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/guests", {
      method: "POST",
      body: JSON.stringify({ slug: "notfound", name: "Anna" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it("returns 400 if name is missing", async () => {
    ;(prisma.event.findUnique as jest.Mock).mockResolvedValue({ id: "evt1" })

    const req = new NextRequest("http://localhost/api/guests", {
      method: "POST",
      body: JSON.stringify({ slug: "abc12345", name: "" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 200 with guestId and sets cookie on success", async () => {
    ;(prisma.event.findUnique as jest.Mock).mockResolvedValue({ id: "evt1" })
    ;(prisma.guest.create as jest.Mock).mockResolvedValue({
      id: "g1",
      sessionToken: "tok123",
    })

    const req = new NextRequest("http://localhost/api/guests", {
      method: "POST",
      body: JSON.stringify({ slug: "abc12345", name: "Anna" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.guestId).toBe("g1")
    expect(res.headers.get("set-cookie")).toContain("sessionToken=tok123")
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- __tests__/api/guests.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/guests/route'`

- [ ] **Step 3: Implement guests API route**

Create `app/api/guests/route.ts`:

```typescript
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"

export async function POST(request: NextRequest) {
  const { slug, name } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: "Namn saknas" }, { status: 400 })
  }

  const event = await prisma.event.findUnique({ where: { slug } })
  if (!event) {
    return NextResponse.json({ error: "Event hittades inte" }, { status: 404 })
  }

  const sessionToken = randomUUID()
  const guest = await prisma.guest.create({
    data: {
      eventId: event.id,
      name: name.trim(),
      sessionToken,
    },
  })

  const response = NextResponse.json({ guestId: guest.id })
  response.cookies.set("sessionToken", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
  return response
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- __tests__/api/guests.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Create guest welcome page**

Create `app/e/[slug]/page.tsx`:

```typescript
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
```

- [ ] **Step 6: Smoke test guest welcome**

```bash
npm run dev
```

Navigate to http://localhost:3000/e/[your-test-slug] (use the slug from Task 7). Enter a name → click button. Expected: redirects to `/e/[slug]/camera` (will 404 for now). Check Prisma Studio — Guest record created. `Ctrl+C`.

- [ ] **Step 7: Commit**

```bash
git add app/api/guests/ app/e/ __tests__/api/guests.test.ts
git commit -m "feat: add guest entry API and welcome page"
```

---

## Task 10: Signed Upload & Photo Save APIs

**Files:**
- Create: `app/api/sign-upload/route.ts`
- Create: `app/api/photos/route.ts`
- Create: `__tests__/api/sign-upload.test.ts`
- Create: `__tests__/api/photos.test.ts`

- [ ] **Step 1: Write failing tests for sign-upload**

Create `__tests__/api/sign-upload.test.ts`:

```typescript
import { POST } from "@/app/api/sign-upload/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/db", () => ({
  prisma: {
    guest: { findUnique: jest.fn() },
  },
}))

jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    utils: {
      api_sign_request: jest.fn(() => "mock-sig"),
    },
  },
}))

import { prisma } from "@/lib/db"

function makeRequest(cookie: string, body: object) {
  return new NextRequest("http://localhost/api/sign-upload", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify(body),
  })
}

describe("POST /api/sign-upload", () => {
  it("returns 401 when no sessionToken cookie", async () => {
    const res = await POST(makeRequest("", { eventId: "e1" }))
    expect(res.status).toBe(401)
  })

  it("returns 401 when guest not found", async () => {
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest("sessionToken=bad", { eventId: "e1" }))
    expect(res.status).toBe(401)
  })

  it("returns 403 when guest has reached photo limit", async () => {
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue({
      id: "g1",
      photoCount: 20,
      eventId: "e1",
    })
    const res = await POST(makeRequest("sessionToken=valid", { eventId: "e1" }))
    expect(res.status).toBe(403)
  })

  it("returns signature payload when guest is valid and under limit", async () => {
    process.env.CLOUDINARY_API_KEY = "test-key"
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud"
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue({
      id: "g1",
      photoCount: 5,
      eventId: "e1",
    })
    const res = await POST(makeRequest("sessionToken=valid", { eventId: "e1" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      signature: "mock-sig",
      apiKey: "test-key",
      cloudName: "test-cloud",
    })
    expect(typeof body.timestamp).toBe("number")
    expect(body.folder).toContain("e1")
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- __tests__/api/sign-upload.test.ts
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement sign-upload route**

Create `app/api/sign-upload/route.ts`:

```typescript
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("sessionToken")?.value
  if (!sessionToken) {
    return NextResponse.json({ error: "Inte autentiserad" }, { status: 401 })
  }

  const { eventId } = await request.json()

  const guest = await prisma.guest.findUnique({
    where: { sessionToken },
  })

  if (!guest || guest.eventId !== eventId) {
    return NextResponse.json({ error: "Otillåten" }, { status: 401 })
  }

  if (guest.photoCount >= 20) {
    return NextResponse.json({ error: "Bildkvoten är slut" }, { status: 403 })
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folder = `seenbyus/${eventId}`

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET!
  )

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  })
}
```

- [ ] **Step 4: Run sign-upload tests — verify pass**

```bash
npm test -- __tests__/api/sign-upload.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Write failing tests for photos route**

Create `__tests__/api/photos.test.ts`:

```typescript
import { POST } from "@/app/api/photos/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/db", () => ({
  prisma: {
    guest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    photo: { create: jest.fn() },
  },
}))

import { prisma } from "@/lib/db"

function makeRequest(cookie: string, body: object) {
  return new NextRequest("http://localhost/api/photos", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify(body),
  })
}

describe("POST /api/photos", () => {
  it("returns 401 when no sessionToken", async () => {
    const res = await POST(makeRequest("", { publicId: "img1", eventId: "e1" }))
    expect(res.status).toBe(401)
  })

  it("returns 401 when guest not found", async () => {
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest("sessionToken=bad", { publicId: "img1", eventId: "e1" }))
    expect(res.status).toBe(401)
  })

  it("returns 403 when guest already at 20 photos", async () => {
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue({
      id: "g1",
      photoCount: 20,
      eventId: "e1",
    })
    const res = await POST(makeRequest("sessionToken=v", { publicId: "img1", eventId: "e1" }))
    expect(res.status).toBe(403)
  })

  it("creates photo and increments count on success", async () => {
    ;(prisma.guest.findUnique as jest.Mock).mockResolvedValue({
      id: "g1",
      photoCount: 3,
      eventId: "e1",
    })
    ;(prisma.photo.create as jest.Mock).mockResolvedValue({ id: "p1" })
    ;(prisma.guest.update as jest.Mock).mockResolvedValue({ photoCount: 4 })

    const res = await POST(
      makeRequest("sessionToken=v", { publicId: "seenbyus/e1/img", eventId: "e1" })
    )
    expect(res.status).toBe(200)

    expect(prisma.photo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cloudinaryPublicId: "seenbyus/e1/img",
        guestId: "g1",
        eventId: "e1",
      }),
    })
    expect(prisma.guest.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { photoCount: { increment: 1 } },
    })

    const body = await res.json()
    expect(body.photoCount).toBe(4)
  })
})
```

- [ ] **Step 6: Run photos test — verify it fails**

```bash
npm test -- __tests__/api/photos.test.ts
```

Expected: FAIL — cannot find module.

- [ ] **Step 7: Implement photos route**

Create `app/api/photos/route.ts`:

```typescript
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("sessionToken")?.value
  if (!sessionToken) {
    return NextResponse.json({ error: "Inte autentiserad" }, { status: 401 })
  }

  const { publicId, eventId } = await request.json()

  const guest = await prisma.guest.findUnique({
    where: { sessionToken },
  })

  if (!guest || guest.eventId !== eventId) {
    return NextResponse.json({ error: "Otillåten" }, { status: 401 })
  }

  if (guest.photoCount >= 20) {
    return NextResponse.json({ error: "Bildkvoten är slut" }, { status: 403 })
  }

  await prisma.photo.create({
    data: {
      cloudinaryPublicId: publicId,
      guestId: guest.id,
      eventId,
    },
  })

  const updated = await prisma.guest.update({
    where: { id: guest.id },
    data: { photoCount: { increment: 1 } },
  })

  return NextResponse.json({ photoCount: updated.photoCount })
}
```

- [ ] **Step 8: Run all API tests — verify all pass**

```bash
npm test
```

Expected: PASS — all tests in `__tests__/` green.

- [ ] **Step 9: Commit**

```bash
git add app/api/sign-upload/ app/api/photos/ __tests__/api/
git commit -m "feat: add signed upload and photo save APIs with tests"
```

---

## Task 11: Camera Page

**Files:**
- Create: `components/CameraUpload.tsx`
- Create: `app/e/[slug]/camera/page.tsx`

- [ ] **Step 1: Create CameraUpload component**

Create `components/CameraUpload.tsx`:

```typescript
"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface CameraUploadProps {
  slug: string
  eventId: string
  initialCount: number
}

const MAX_PHOTOS = 20

export function CameraUpload({ slug, eventId, initialCount }: CameraUploadProps) {
  const [count, setCount] = useState(initialCount)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const remaining = MAX_PHOTOS - count
  const done = remaining <= 0

  async function handleFile(file: File) {
    if (done || uploading) return
    setUploading(true)
    setError("")

    try {
      // 1. Get Cloudinary signature
      const sigRes = await fetch("/api/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      })
      if (!sigRes.ok) throw new Error("Kunde inte signera uppladdning")
      const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json()

      // 2. Upload directly to Cloudinary
      const formData = new FormData()
      formData.append("file", file)
      formData.append("signature", signature)
      formData.append("timestamp", String(timestamp))
      formData.append("api_key", apiKey)
      formData.append("folder", folder)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      )
      if (!uploadRes.ok) throw new Error("Uppladdning misslyckades")
      const { public_id } = await uploadRes.json()

      // 3. Save publicId to database
      const saveRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: public_id, eventId }),
      })
      if (!saveRes.ok) throw new Error("Kunde inte spara bilden")
      const { photoCount } = await saveRes.json()

      setCount(photoCount)
      if (photoCount >= MAX_PHOTOS) {
        router.push(`/e/${slug}/done`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel — försök igen")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs text-center">
        {/* Counter */}
        <div className="mb-10">
          <p className="text-stone-500 text-sm mb-1">Bilder kvar</p>
          <p className="text-white text-7xl font-bold tabular-nums">{remaining}</p>
          <p className="text-stone-600 text-sm mt-1">av {MAX_PHOTOS}</p>
        </div>

        {/* Shutter button */}
        {!done && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-24 h-24 rounded-full bg-white flex items-center justify-center mx-auto text-4xl disabled:opacity-50 active:scale-95 transition-transform"
              aria-label="Ta bild"
            >
              {uploading ? "⏳" : "📷"}
            </button>
            <p className="text-stone-600 text-xs mt-4">
              {uploading ? "Laddar upp..." : "Tryck för att ta en bild"}
            </p>
          </>
        )}

        {done && (
          <div className="text-center">
            <p className="text-white font-semibold">Alla bilder tagna!</p>
            <button
              onClick={() => router.push(`/e/${slug}/done`)}
              className="mt-4 bg-white text-stone-950 rounded-xl px-6 py-3 text-sm font-bold"
            >
              Fortsätt →
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-2 text-white text-sm underline"
            >
              Försök igen
            </button>
          </div>
        )}

        {/* Hidden file input — opens camera on mobile */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create camera page**

Create `app/e/[slug]/camera/page.tsx`:

```typescript
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { CameraUpload } from "@/components/CameraUpload"

interface Props {
  params: { slug: string }
}

export default async function CameraPage({ params }: Props) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
  })
  if (!event) notFound()

  const sessionToken = cookies().get("sessionToken")?.value
  if (!sessionToken) redirect(`/e/${params.slug}`)

  const guest = await prisma.guest.findUnique({
    where: { sessionToken },
  })
  if (!guest || guest.eventId !== event.id) redirect(`/e/${params.slug}`)

  if (guest.photoCount >= 20) redirect(`/e/${params.slug}/done`)

  return (
    <CameraUpload
      slug={params.slug}
      eventId={event.id}
      initialCount={guest.photoCount}
    />
  )
}
```

- [ ] **Step 3: Smoke test camera flow**

```bash
npm run dev
```

On a mobile device (or browser DevTools mobile emulation): scan/visit the guest URL → enter name → land on camera page. Expected: counter shows "20", shutter button renders. Tap shutter — camera opens (on real mobile) or file picker appears. Upload a test photo. Expected: counter decrements, no error. `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add components/CameraUpload.tsx app/e/
git commit -m "feat: add camera upload component and guest camera page"
```

---

## Task 12: Done Page & Album Page

**Files:**
- Create: `app/e/[slug]/done/page.tsx`
- Create: `components/AlbumGrid.tsx`
- Create: `app/(couple)/events/[slug]/album/page.tsx`

- [ ] **Step 1: Create done page**

Create `app/e/[slug]/done/page.tsx`:

```typescript
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

interface Props {
  params: { slug: string }
}

export default async function DonePage({ params }: Props) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
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
```

- [ ] **Step 2: Create AlbumGrid component**

Create `components/AlbumGrid.tsx`:

```typescript
import { buildCloudinaryUrl } from "@/lib/transforms"
import { Style } from "@prisma/client"
import Image from "next/image"

interface Photo {
  id: string
  cloudinaryPublicId: string
  guest: { name: string }
}

interface AlbumGridProps {
  photos: Photo[]
  style: Style
}

export function AlbumGrid({ photos, style }: AlbumGridProps) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-20 text-stone-400">
        <p className="text-4xl mb-4">📷</p>
        <p>Inga bilder uppladdade ännu</p>
      </div>
    )
  }

  return (
    <div className="columns-2 md:columns-3 gap-2 space-y-2">
      {photos.map((photo) => {
        const url = buildCloudinaryUrl(photo.cloudinaryPublicId, style)
        return (
          <div key={photo.id} className="break-inside-avoid relative group">
            <img
              src={url}
              alt={`Bild av ${photo.guest.name}`}
              className="w-full rounded-lg"
              loading="lazy"
            />
            <span className="absolute bottom-2 left-2 bg-black/40 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              {photo.guest.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create album page**

Create `app/(couple)/events/[slug]/album/page.tsx`:

```typescript
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { AlbumGrid } from "@/components/AlbumGrid"
import { buildZipUrl } from "@/lib/transforms"
import Link from "next/link"

interface Props {
  params: { slug: string }
}

export default async function AlbumPage({ params }: Props) {
  const session = await auth()

  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
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
            href={`/events/${params.slug}`}
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
            <Link href={`/events/${params.slug}`} className="text-stone-400 text-sm hover:text-stone-700">
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
```

- [ ] **Step 4: Smoke test album**

To test the reveal without waiting, temporarily set a past `revealedAt` directly in Prisma Studio. Then:

```bash
npm run dev
```

Navigate to `/events/[slug]/album`. Expected: photo grid renders with Cloudinary-styled URLs. `Ctrl+C`. Reset `revealedAt` to correct value in Prisma Studio.

- [ ] **Step 5: Commit**

```bash
git add app/e/\[slug\]/done/ components/AlbumGrid.tsx app/\(couple\)/events/\[slug\]/album/
git commit -m "feat: add done page, album grid, and album reveal page"
```

---

## Task 13: Landing Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write landing page**

Replace `app/page.tsx`:

```typescript
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
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Run dev and walk through full flow**

```bash
npm run dev
```

End-to-end smoke test:
1. Visit http://localhost:3000 — landing page renders
2. Click "Skapa ert event" → signup form
3. Sign up → dashboard (empty)
4. Click "+ Nytt event" → fill form → submit → event page with QR code
5. Open the guest URL in a new tab → enter a name → camera page → upload a test photo → counter shows 19
6. Back to couple tab → refresh event page → photo count shows 1
7. Set `revealedAt` to past in Prisma Studio → visit `/events/[slug]/album` → photo grid shows with style applied

`Ctrl+C`.

- [ ] **Step 4: Final commit**

```bash
git add app/page.tsx
git commit -m "feat: add landing page — MVP complete"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Next.js + Cloudinary + Prisma/Postgres — Task 1, 2
- ✅ Couple auth (email/password) — Task 4, 5
- ✅ Event creation with style + slug + revealedAt — Task 7
- ✅ QR code generation — Task 8
- ✅ Guest entry (QR → name → cookie) — Task 9
- ✅ 20 photos per guest, no preview — Task 10, 11
- ✅ Camera upload (direct to Cloudinary, signed) — Task 11
- ✅ Done screen ("framkallas imorgon") — Task 12
- ✅ Album reveal (check revealedAt, styled URLs) — Task 12
- ✅ ZIP download — Task 12
- ✅ Disposable, Vintage, Flash transforms — Task 3
- ✅ Error handling (retry, 403 limit, 404, redirect) — Tasks 9–12
- ✅ Landing page — Task 13

**Out of scope confirmed not included:** payment, AI curation, highlight video, push notifications.
