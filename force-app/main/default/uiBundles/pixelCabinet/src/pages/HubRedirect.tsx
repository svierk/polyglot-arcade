import { useEffect } from 'react';
import { hubLobbyUrl } from '@/cabinet/hub';

/**
 * The cabinet has no lobby of its own: players pick a game in the hub, which
 * launches /play/:gameKey. Opening the cabinet itself, e.g. from the App
 * Launcher, sends the player on to the hub lobby.
 */
export default function HubRedirect() {
  const hubUrl = hubLobbyUrl();

  useEffect(() => {
    if (hubUrl) window.location.replace(hubUrl);
  }, [hubUrl]);

  return (
    <section className="py-12 text-center">
      <h1 className="arcade-title mb-4 text-2xl">Insert coin in the lobby</h1>
      <p className="arcade-hint">
        {hubUrl
          ? 'Taking you to the Polyglot Arcade lobby…'
          : 'Pixel Cabinet is a machine on the Polyglot Arcade floor. Pick a game in the Polyglot Arcade lobby.'}
      </p>
    </section>
  );
}
