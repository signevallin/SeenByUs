# SeenByUs MVP — Design Spec

**Datum:** 2026-06-01
**Status:** Godkänd

---

## Produktkoncept

SeenByUs är en cinematic social camera-app för events, med start i bröllop. Gäster bidrar med bilder via QR-kod — alla foton processas till samma kuraterade estetiska identitet via Cloudinary-transformationer. Albumet är dolt tills nästa dag, precis som en engångskamera som lämnas in för framkallning.

Positionering: **"En cinematic social camera för events"** — inte ett delningsalbum, utan ett gemensamt minne med en specifik estetik.

---

## Beslut

| Fråga | Val |
|---|---|
| Tech stack | Next.js App Router + NextAuth + Prisma + Neon Postgres + Cloudinary |
| Deploy | Vercel |
| Albumreveal | Nästa dag kl 08:00 (styrs av `revealedAt` timestamp) |
| Gästaccess | QR-kod → ange förnamn → session cookie, inget konto |
| Bildgräns | 20 bilder per gäst |
| Stilar i MVP | Disposable Camera, Vintage Film, 90s Flash |
| Brudpar-auth | E-post + lösenord via NextAuth credentials provider |

---

## Arkitektur

Enkel monolith. Next.js hanterar routing, server actions och API-routes. Cloudinary hanterar lagring och stilar via URL-parametrar — inga bakgrundsjobb. Stilfiltret byggs dynamiskt in i Cloudinary-URL:en vid servering.

```
Browser → Next.js (Vercel)
               ↓
          Prisma ORM
               ↓
         Neon Postgres

Browser → Cloudinary (signed upload, direkt från klient)
Next.js  → Cloudinary (hämtar publicId, bygger transformations-URL)
```

---

## Datamodell

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  events       Event[]
}

model Event {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id])
  name       String
  date       DateTime
  slug       String    @unique
  style      Style
  revealedAt DateTime
  createdAt  DateTime  @default(now())
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
  id                String   @id @default(cuid())
  eventId           String
  event             Event    @relation(fields: [eventId], references: [id])
  guestId           String
  guest             Guest    @relation(fields: [guestId], references: [id])
  cloudinaryPublicId String
  takenAt           DateTime @default(now())
  createdAt         DateTime @default(now())
}
```

`revealedAt` sätts till `event.date + 1 dag kl 08:00` vid skapande av event.

---

## Cloudinary-transformationer per stil

Transformationsparametrar byggs in i URL:en vid servering — ingen processing vid upload.

| Stil | Cloudinary-params |
|---|---|
| Disposable Camera | `e_sepia:20,e_brightness:10,e_contrast:10,e_noise:15` |
| Vintage Film | `e_sepia:55,e_contrast:-10,e_saturation:-25,e_brightness:5` |
| 90s Flash | `e_brightness:22,e_contrast:8,e_saturation:-15` |

URL-format: `https://res.cloudinary.com/[cloud]/image/upload/[params]/[publicId]`

---

## Routes

### Brudparet (autentiserat via NextAuth)

| Route | Beskrivning |
|---|---|
| `/` | Landningssida — pitch + CTA till signup |
| `/signup` | Registrering med e-post + lösenord |
| `/login` | Inloggning |
| `/dashboard` | Lista med events, status (pågår / album klart), knapp för nytt event |
| `/events/new` | Skapa event: namn, datum, välj stil → genererar slug + QR-kod |
| `/events/[slug]` | Event-vy: stor QR-kod, antal uppladdade bilder, countdown |
| `/events/[slug]/album` | Albumvy: alla bilder stylat. Synlig först efter `revealedAt`. Nedladdning som ZIP. |

### Gästen (ingen inloggning)

| Route | Beskrivning |
|---|---|
| `/e/[slug]` | Välkomstskärm — ange förnamn, session cookie sätts |
| `/e/[slug]/camera` | Kameravy — "📷 Ta bild", räknare "X av 20 kvar", upload till Cloudinary, ingen preview |
| `/e/[slug]/done` | Klart-skärm — "Dina bilder framkallas. Albumet öppnas imorgon." |

---

## Nyckelflöden

### Brudparet skapar event
1. Signup/login → `/dashboard`
2. "Skapa nytt event" → `/events/new`
3. Anger namn, datum, väljer stil
4. Server action: genererar unik `slug` med `nanoid(8)` (lowercase alphanumerisk, t.ex. `k3mx9pqr`), beräknar `revealedAt = date + 1 dag kl 08:00`, skapar `Event` i DB
5. Redirect till `/events/[slug]` — QR-kod visas direkt

### Gäst tar bilder
1. Skannar QR → `/e/[slug]`
2. Anger förnamn → API-route skapar `Guest` med `sessionToken`, sätter cookie
3. `/e/[slug]/camera` — kameravy laddas
4. Vid varje foto:
   - Next.js API-route signerar Cloudinary-upload
   - Klienten uplodar direkt till Cloudinary
   - API-route sparar `cloudinaryPublicId` i `Photo`, räknar upp `Guest.photoCount`
5. När `photoCount === 20`: kameraknappen disabled, redirect till `/e/[slug]/done`

### Album öppnas
1. Brudparet öppnar `/events/[slug]/album`
2. Server kontrollerar: `revealedAt > now` → visa countdown-vy
3. När `revealedAt <= now` → hämta alla `Photo` för eventet, bygg Cloudinary-URL med transformationsparametrar baserade på `event.style`, visa album
4. ZIP-nedladdning: server genererar en Cloudinary Archive URL (via `cloudinary.utils.download_zip_url`) med transformationsparametrarna inbakade — returnerar en direktlänk till en ZIP med alla transformerade bilder

---

## Bilduppladdning (säkerhet)

Gäster uplodar **direkt till Cloudinary** via signerad upload-URL för att undvika att large filer går genom Next.js-servern.

Flöde:
1. Klient anropar `/api/sign-upload` med `sessionToken`
2. Server validerar sessionToken, genererar Cloudinary-signatur med `timestamp` och `folder`
3. Klient uplodar direkt till Cloudinary med signaturen
4. Klient anropar `/api/photos` med `publicId` — server sparar i DB

Cloudinary API-hemligheten exponeras aldrig i klienten.

**Session-persistens:** Session är cookie-baserad (`sessionToken` i httpOnly cookie). Om en gäst stänger webbläsaren och återvänder utan cookie behandlas de som en ny gäst med en ny kvot på 20 bilder. Detta är acceptabelt för MVP — bröllop sker i ett sammanhang där folk sällan byter enhet.

---

## Felhantering

| Scenario | Beteende |
|---|---|
| Upload misslyckas | Retry-knapp visas, räknaren ändras inte |
| Gäst når 20 bilder | Kameraknappen disabled, redirect till done |
| Album ej redo | Countdown-vy med datum/tid för öppning |
| Ogiltig QR/slug | 404-sida med "Eventet hittades inte" |
| Oautentiserad brudpar-route | Redirect till `/login` |
| Gäst utan session | Redirect till `/e/[slug]` för att ange namn |

---

## Ut ur scope för MVP

- Betalning / pricing
- AI-curation (väljer bästa bilder automatiskt)
- Highlight-video
- Personaliserare per gäst
- Push-notiser
- Fler stilar
- Event-planerare som adminroll
