import { Cookie, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'wouter'

import { Button } from '@/components/ui/button'

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setShowBanner(false)
  }

  const handleRefuse = () => {
    localStorage.setItem('cookie-consent', 'refused')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-sm border-t border-border shadow-soft-lg md:bottom-4 md:left-4 md:right-auto md:max-w-md md:rounded-2xl md:border">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Cookie className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-2">Cookies et Confidentialité</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nous utilisons des cookies pour améliorer votre expérience. En continuant, vous
              acceptez notre utilisation des cookies.
            </p>
          </div>
          <button
            onClick={handleRefuse}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="sm"
            onClick={handleAccept}
            className="rounded-xl bg-primary hover:bg-primary/90"
          >
            Accepter
          </Button>
          <Button size="sm" variant="outline" onClick={handleRefuse} className="rounded-xl">
            Refuser
          </Button>
          <Link href="/politique-cookies">
            <a className="text-sm text-primary hover:underline flex items-center justify-center py-2">
              En savoir plus
            </a>
          </Link>
        </div>
      </div>
    </div>
  )
}
