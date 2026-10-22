/** A game that runs inside the hub. Keys match Arcade_Game__c.Game_Key__c. */
export interface HubGame {
  key: string;
  name: string;
  /** False while the game is still being built. */
  available: boolean;
}

export const HUB_GAMES: readonly HubGame[] = [
  { key: 'four-in-a-row', name: 'Four in a Row', available: true },
  { key: 'brick-breaker', name: 'Brick Breaker', available: false },
];

export function findHubGame(key: string | null | undefined): HubGame | undefined {
  return HUB_GAMES.find((game) => game.key === key);
}
