import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { CameraUpload } from "@/components/CameraUpload"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CameraPage({ params }: Props) {
  const { slug } = await params

  const event = await prisma.event.findUnique({
    where: { slug },
  })
  if (!event) notFound()

  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("sessionToken")?.value
  if (!sessionToken) redirect(`/e/${slug}`)

  const guest = await prisma.guest.findUnique({
    where: { sessionToken },
  })
  if (!guest || guest.eventId !== event.id) redirect(`/e/${slug}`)

  if (guest.photoCount >= 20) redirect(`/e/${slug}/done`)

  return (
    <CameraUpload
      slug={slug}
      eventId={event.id}
      initialCount={guest.photoCount}
    />
  )
}
