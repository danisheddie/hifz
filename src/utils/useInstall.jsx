import { useEffect, useState } from 'react'
import { isInstallDismissed, dismissInstall } from './storage'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function useInstall() {
  const [deferred, setDeferred] = useState(null) // beforeinstallprompt event
  const [dismissed, setDismissed] = useState(() => isInstallDismissed())
  const [installed, setInstalled] = useState(() => isStandalone())
  const ua = navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  // On iOS, "Add to Home Screen" lives in the Share menu of a full browser —
  // Safari and Chrome (CriOS) both support it; in-app webviews don't.
  const isIosChrome = isIos && /CriOS/.test(ua)
  const isIosSafari =
    isIos &&
    /Safari/.test(ua) &&
    /Version\//.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram|Line|MicroMessenger|Twitter/.test(ua)
  const iosNeedsBrowser = isIos && !isIosSafari && !isIosChrome

  useEffect(() => {
    function onPrompt(e) { e.preventDefault(); setDeferred(e) }
    function onInstalled() { setInstalled(true); dismissInstall(); setDismissed(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const eligible = !installed && !dismissed && (isIos || deferred != null)

  async function install() {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch { /* ignore */ }
    setDeferred(null)
  }

  function dontShowAgain() { dismissInstall(); setDismissed(true) }

  return { eligible, deferred, isIos, iosNeedsBrowser, install, dontShowAgain }
}
