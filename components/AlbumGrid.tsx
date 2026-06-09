import Image from "next/image"
import { buildCloudinaryUrl } from "@/lib/transforms"
import { Style } from "@prisma/client"

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
            {/* unoptimized so the Cloudinary transformation URL is fetched as-is */}
            <Image
              src={url}
              alt={`Bild av ${photo.guest.name}`}
              className="w-full rounded-lg"
              width={800}
              height={600}
              style={{ width: "100%", height: "auto" }}
              unoptimized
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
