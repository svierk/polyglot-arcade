import { xrayOf } from './xray';

describe('xrayOf', () => {
  it('reads pattern 1 from an Angular game of the hub', () => {
    const xray = xrayOf({ framework: 'Angular', embedPath: null, hostSavesScore: false });
    expect(xray.patterns.map((p) => p.no)).toEqual([1]);
    expect(xray.dataPath).toBe('Data SDK GraphQL');
  });

  it('reads patterns 2 and 3 from a cabinet game Lightning can frame', () => {
    const xray = xrayOf({ framework: 'React', embedPath: '/embed', hostSavesScore: false });
    expect(xray.patterns.map((p) => p.no)).toEqual([2, 3]);
    expect(xray.dataPath).toContain('View SDK');
  });

  it('reads only pattern 2 from a cabinet game without an embed path', () => {
    const xray = xrayOf({ framework: 'React', embedPath: null, hostSavesScore: false });
    expect(xray.patterns.map((p) => p.no)).toEqual([2]);
  });

  it('reads pattern 4 from a guest whose host saves the score', () => {
    const xray = xrayOf({ framework: 'LWC OSS', embedPath: null, hostSavesScore: true });
    expect(xray.patterns.map((p) => p.no)).toEqual([4]);
    expect(xray.framework).toBe('LWC OSS');
    expect(xray.dataPath).toContain('Package-free bridge');
  });

  it('uses the names of the patterns in the docs', () => {
    expect(
      xrayOf({ framework: 'React', embedPath: '/embed', hostSavesScore: false }).patterns[1].name,
    ).toBe('Internally hosted microfrontend - the guest saves');
  });
});
