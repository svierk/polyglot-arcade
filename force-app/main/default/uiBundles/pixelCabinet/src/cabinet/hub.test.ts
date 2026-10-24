import { describe, expect, it } from 'vitest';
import { arcadeFloorUrl, hubLobbyUrl } from './hub';

describe('hubLobbyUrl', () => {
  it('swaps the cabinet for the hub in the base path', () => {
    expect(
      hubLobbyUrl({ basePath: '/app/c__pixelCabinet', appName: 'pixelCabinet' })
    ).toBe('/app/c__polyglotArcade');
    expect(
      hubLobbyUrl({
        basePath: '/app/ns__pixelCabinet/',
        appName: 'pixelCabinet',
      })
    ).toBe('/app/ns__polyglotArcade');
  });

  it('knows no hub outside an org', () => {
    expect(hubLobbyUrl(undefined)).toBeNull();
    // The dev server serves the cabinet from the root.
    expect(hubLobbyUrl({ basePath: '/', appName: 'pixelCabinet' })).toBeNull();
    expect(hubLobbyUrl({ basePath: '/app/c__pixelCabinet' })).toBeNull();
  });
});

describe('arcadeFloorUrl', () => {
  it('leads to the Arcade Floor app of the org', () => {
    expect(arcadeFloorUrl({ orgUrl: 'https://org.lightning.force.com/' })).toBe(
      'https://org.lightning.force.com/lightning/app/c__arcadeFloor'
    );
  });

  it('knows no way out outside an org', () => {
    expect(arcadeFloorUrl(undefined)).toBeNull();
    expect(arcadeFloorUrl({ basePath: '/' })).toBeNull();
  });
});
