// Node.js 25+ ships its own Web Storage. Without --localstorage-file its global
// localStorage is undefined and hides the jsdom one, so put the jsdom one back.
// Vitest exposes the jsdom instance as the global `jsdom`.
const dom = (globalThis as { jsdom?: { window: Window } }).jsdom;
for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (!globalThis[name] && dom?.window[name]) {
    Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
  }
}
