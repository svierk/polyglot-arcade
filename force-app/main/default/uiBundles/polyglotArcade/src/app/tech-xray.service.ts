import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'polyglot-arcade.tech-xray';

/**
 * Whether the lobby shows the Tech X-ray. Remembered per browser, so the
 * switch survives the way to a machine and back; without storage (private
 * windows, blocked site data) it simply starts switched off.
 */
@Injectable({ providedIn: 'root' })
export class TechXray {
  readonly on = signal(read());

  toggle(): void {
    this.on.update((on) => !on);
    try {
      localStorage.setItem(STORAGE_KEY, this.on() ? 'on' : 'off');
    } catch {
      // Not remembered, still switched for this page.
    }
  }
}

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}
