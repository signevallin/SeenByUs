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
