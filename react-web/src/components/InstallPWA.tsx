import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isStandalone || dismissed || !deferredPrompt) return null

  const handleInstall = async () => {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-netflix-dark border border-white/10 rounded-lg p-4 shadow-xl">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-netflix-gray hover:text-white"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
      <p className="font-semibold text-white pr-6">Installer E-BOOK</p>
      <p className="text-sm text-netflix-gray mt-1 mb-3">
        Ajoutez l&apos;app sur votre écran d&apos;accueil pour un accès rapide.
      </p>
      <button
        type="button"
        onClick={handleInstall}
        className="flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold rounded transition-colors"
      >
        <Download className="w-4 h-4" /> Installer l&apos;app
      </button>
    </div>
  )
}
