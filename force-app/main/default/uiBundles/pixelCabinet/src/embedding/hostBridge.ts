/**
 * Bridge between the cabinet and a Lightning page that embeds it through the
 * Pixel Cabinet Host LWC (<lightning-ui-embedding>).
 *
 * Off an embedding surface getViewSDK() resolves to an empty SDK, so every call
 * is feature-detected and the cabinet works the same when launched standalone.
 */
import { useEffect, useState } from 'react';
import { getViewSDK } from '@salesforce/platform-sdk';
import type { GameKey } from '@/games/types';

/** Props the host LWC passes via `<lightning-ui-embedding props={...}>`. */
export interface HostProps {
  game?: GameKey | 'lobby';
  recordId?: string | null;
  objectApiName?: string | null;
}

/** Detail of the `gameover` event; mirrored by pixelCabinetHost.handleGameOver. */
export interface GameOverDetail {
  gameKey: GameKey;
  gameName: string;
  score: number;
  level: number;
  saved: boolean;
  isHighScore: boolean;
}

/** Latest host props; re-renders on every host push. */
export function useHostProps(): HostProps {
  const [props, setProps] = useState<HostProps>({});

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    getViewSDK().then(sdk => {
      if (cancelled) return;
      const ui = sdk.getUiState?.();
      if (!ui) return;
      setProps(ui.state.props as HostProps);
      unsubscribe = ui.subscribe(next => setProps(next.props as HostProps));
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return props;
}

export async function notifyHostGameOver(
  detail: GameOverDetail
): Promise<void> {
  const sdk = await getViewSDK();
  sdk.dispatchEvent?.(new CustomEvent('gameover', { detail, bubbles: true }));
}
