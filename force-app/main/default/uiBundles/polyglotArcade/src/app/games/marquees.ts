/**
 * Teaser marquees of the lobby cards: pixel art per Game_Key__c, bundled with
 * the hub. Each one is drawn in the look of its game's machine. Games without
 * art keep the plain card.
 */
export interface PixelArt {
  /** Backlight behind the pixels. */
  background: string;
  /** Colors of the pixel characters; '.' shows the background. */
  palette: Readonly<Record<string, string>>;
  /** One string per row, one character per pixel. */
  rows: readonly string[];
}

const PELLET_CHASE: PixelArt = {
  background: '#000000',
  palette: {
    b: '#4f46e5',
    y: '#facc15',
    d: '#fde68a',
    r: '#f87171',
    c: '#22d3ee',
    w: '#f8fafc',
    k: '#1e3a8a',
  },
  rows: [
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    '................................................',
    '.....yyy.........................rrr......ccc...',
    '....yyyyy.......................rrrrr....ccccc..',
    '...yyyy...................d....rwkrwkr..cwkcwkc.',
    '...yyy.......d...d...d...ddd...rrrrrrr..ccccccc.',
    '...yyyy...................d....rrrrrrr..ccccccc.',
    '....yyyyy......................rrrrrrr..ccccccc.',
    '.....yyy.......................r.r.r.r..c.c.c.c.',
    '................................................',
    '................................................',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  ],
};

/** The handheld's LCD: lit and unlit segments. */
const BLOCK_DROP: PixelArt = {
  background: '#c2c7a1',
  palette: { i: '#1f2417', f: 'rgba(31, 36, 23, 0.12)' },
  rows: [
    'fffff.fffff.fffff.fffff.fffff.iiiii.iiiii.iiiii.fffff.fffff.fffff.fffff.fffff.fffff.fffff.fffff.',
    'f...f.f...f.f...f.f...f.f...f.i...i.i...i.i...i.f...f.f...f.f...f.f...f.f...f.f...f.f...f.f...f.',
    'f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.i.i.i.i.i.i.i.i.i.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.',
    'f...f.f...f.f...f.f...f.f...f.i...i.i...i.i...i.f...f.f...f.f...f.f...f.f...f.f...f.f...f.f...f.',
    'fffff.fffff.fffff.fffff.fffff.iiiii.iiiii.iiiii.fffff.fffff.fffff.fffff.fffff.fffff.fffff.fffff.',
    '................................................................................................',
    'fffff.fffff.fffff.fffff.fffff.fffff.iiiii.fffff.fffff.fffff.fffff.fffff.fffff.fffff.iiiii.fffff.',
    'f...f.f...f.f...f.f...f.f...f.f...f.i...i.f...f.f...f.f...f.f...f.f...f.f...f.f...f.i...i.f...f.',
    'f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.i.i.i.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.i.i.i.f.f.f.',
    'f...f.f...f.f...f.f...f.f...f.f...f.i...i.f...f.f...f.f...f.f...f.f...f.f...f.f...f.i...i.f...f.',
    'fffff.fffff.fffff.fffff.fffff.fffff.iiiii.fffff.fffff.fffff.fffff.fffff.fffff.fffff.iiiii.fffff.',
    '................................................................................................',
    'iiiii.iiiii.fffff.fffff.iiiii.fffff.fffff.fffff.fffff.fffff.iiiii.iiiii.fffff.iiiii.iiiii.iiiii.',
    'i...i.i...i.f...f.f...f.i...i.f...f.f...f.f...f.f...f.f...f.i...i.i...i.f...f.i...i.i...i.i...i.',
    'i.i.i.i.i.i.f.f.f.f.f.f.i.i.i.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.i.i.i.i.i.i.f.f.f.i.i.i.i.i.i.i.i.i.',
    'i...i.i...i.f...f.f...f.i...i.f...f.f...f.f...f.f...f.f...f.i...i.i...i.f...f.i...i.i...i.i...i.',
    'iiiii.iiiii.fffff.fffff.iiiii.fffff.fffff.fffff.fffff.fffff.iiiii.iiiii.fffff.iiiii.iiiii.iiiii.',
    '................................................................................................',
    'iiiii.iiiii.iiiii.iiiii.fffff.iiiii.iiiii.fffff.iiiii.iiiii.iiiii.iiiii.iiiii.iiiii.iiiii.fffff.',
    'i...i.i...i.i...i.i...i.f...f.i...i.i...i.f...f.i...i.i...i.i...i.i...i.i...i.i...i.i...i.f...f.',
    'i.i.i.i.i.i.i.i.i.i.i.i.f.f.f.i.i.i.i.i.i.f.f.f.i.i.i.i.i.i.i.i.i.i.i.i.i.i.i.i.i.i.i.i.i.f.f.f.',
    'i...i.i...i.i...i.i...i.f...f.i...i.i...i.f...f.i...i.i...i.i...i.i...i.i...i.i...i.i...i.f...f.',
    'iiiii.iiiii.iiiii.iiiii.fffff.iiiii.iiiii.fffff.iiiii.iiiii.iiiii.iiiii.iiiii.iiiii.iiiii.fffff.',
    '................................................................................................',
  ],
};

const BRICK_BREAKER: PixelArt = {
  background: '#05050a',
  palette: {
    r: '#f43f5e',
    o: '#fb923c',
    y: '#facc15',
    g: '#a3e635',
    w: '#f8fafc',
    p: '#f97316',
  },
  rows: [
    'rrrrr.rrrrr.rrrrr.rrrrr.rrrrr.rrrrr.rrrrr.rrrrr.',
    'oo.ooooo.ooooo.ooooo.ooooo.ooo.....ooo.ooooo.ooo',
    'yyyyy.yyyyy.yyyyy.yyyyy.yyyyy.yyyyy.yyyyy.yyyyy.',
    'gg.ggg.....ggg.ggggg.ggggg.ggggg.ggggg.ggggg.ggg',
    '................................................',
    '................................................',
    '................................................',
    '.............................w..................',
    '................................................',
    '................................................',
    '................................................',
    '......................pppppppp..................',
  ],
};

const FOUR_IN_A_ROW: PixelArt = {
  background: '#120a24',
  palette: { g: '#2563eb', h: '#05030c', r: '#f43f5e', y: '#facc15' },
  rows: [
    '.......................rr.......................',
    '.......................rr.......................',
    '.............gggggggggggggggggggggg.............',
    '.............ghhghhghhghhghhghhghhg.............',
    '.............ghhghhghhghhghhghhghhg.............',
    '.............gggggggggggggggggggggg.............',
    '.............ghhghhgyyghhgrrghhghhg.............',
    '.............ghhghhgyyghhgrrghhghhg.............',
    '.............gggggggggggggggggggggg.............',
    '.............ghhgyygrrgrrgrrgrrgyyg.............',
    '.............ghhgyygrrgrrgrrgrrgyyg.............',
    '..........gggggggggggggggggggggggggggg..........',
  ],
};

/** The Snake phone's mint LCD. */
const SNAKE: PixelArt = {
  background: '#c8ecd4',
  palette: { i: '#2c3a2e' },
  rows: [
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '..............iiiiiiiiiiii......................',
    '..............iiiiiiiiiiii......................',
    '..............ii........ii......................',
    '..............ii........ii.................i....',
    '....iiiiiiiiiiii........iiiiiiiiiii.......i.i...',
    '....iiiiiiiiiiii........iiiiiiiiiii........i....',
    '................................................',
    '................................................',
  ],
};

const TEASER_MARQUEES: Readonly<Record<string, PixelArt>> = {
  'pellet-chase': PELLET_CHASE,
  'block-drop': BLOCK_DROP,
  'brick-breaker': BRICK_BREAKER,
  'four-in-a-row': FOUR_IN_A_ROW,
  snake: SNAKE,
};

export function teaserMarquee(gameKey: string): PixelArt | undefined {
  return TEASER_MARQUEES[gameKey];
}
