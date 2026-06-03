"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import QRCodeLib from "qrcode"

interface QRCodeProps {
  url: string
  size?: number
}

export function QRCode({ url, size = 240 }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("")
  const [error, setError] = useState(false)

  useEffect(() => {
    QRCodeLib.toDataURL(url, {
      width: size,
      margin: 2,
      color: { dark: "#1c1917", light: "#fafaf9" },
    })
      .then(setDataUrl)
      .catch(() => setError(true))
  }, [url, size])

  if (error) return (
    <div
      style={{ width: size, height: size }}
      className="bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-xs"
    >
      Kunde inte generera QR-kod
    </div>
  )

  if (!dataUrl) return (
    <div
      style={{ width: size, height: size }}
      className="bg-stone-100 rounded-lg animate-pulse"
    />
  )

  return (
    <Image
      src={dataUrl}
      alt="QR-kod till event"
      width={size}
      height={size}
      className="rounded-lg"
      unoptimized
    />
  )
}
