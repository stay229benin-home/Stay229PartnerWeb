'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: object) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onError?: () => void
}

export default function TurnstileWidget({ onVerify, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  // Refs stables pour éviter que le widget se recrée à chaque re-render du parent
  const onVerifyRef = useRef(onVerify)
  const onErrorRef = useRef(onError)

  // Mettre à jour les refs sans provoquer de re-montage du widget
  useEffect(() => { onVerifyRef.current = onVerify })
  useEffect(() => { onErrorRef.current = onError })

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!

    const renderWidget = () => {
      if (containerRef.current && window.turnstile) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onVerifyRef.current(token),
          'error-callback': () => onErrorRef.current?.(),
          theme: 'dark',
          size: 'normal', // 'invisible' ne déclenche pas le callback automatiquement
        })
      }
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.onload = renderWidget
      document.head.appendChild(script)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
  }, []) // Deps vides : le widget monte une seule fois, les callbacks passent par les refs

  return <div ref={containerRef} />
}
