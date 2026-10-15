"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsInstalled(standalone);
    const ua = window.navigator.userAgent;
    setIsIosSafari(/iphone|ipad|ipod/i.test(ua)) && !/crios|fxios|edgios/i.test(ua);
    setIsIosSafari(/iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua));

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isInstalled || (!installPrompt && !isIosSafari)) return null;

  async function install() {
    if (!installPrompt) {
      setShowHelp((visible) => !visible);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
      setShowHelp(false);
    }
  }

  return (
    <div style={{ position: "fixed", right: 14, bottom: 14, zIndex: 1000, maxWidth: 290 }}>
      {showHelp && (
        <div role="status" style={{ marginBottom: 8, padding: 12, border: "1px solid #45efff", borderRadius: 8, background: "#10132c", color: "#f4f5ff", boxShadow: "0 8px 28px #0008", fontSize: 13 }}>
          Dans Safari, touche <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>. PRYSM utilisera ensuite une fenêtre dédiée.
        </div>
      )}
      <button
        type="button"
        onClick={() => void install()}
        aria-expanded={showHelp}
        style={{ border: "1px solid #45efff", borderRadius: 999, padding: "10px 15px", background: "#45efff", color: "#08101b", fontWeight: 800, boxShadow: "0 4px 22px #45efff35", cursor: "pointer" }}
      >
        Installer PRYSM
      </button>
    </div>
  );
}
