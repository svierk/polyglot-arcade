/**
 * Shared reads for the headless arcade tools (ArcadeHallOfFame and
 * ArcadePlayerCard). Every query runs in user mode, so sharing and
 * field-level security apply to the player who asks - exactly as in the
 * Angular hub, the React cabinet and the Lightning pages.
 */
public with sharing class ArcadeScoreStats {
  private static final Map<String, String> PERIOD_FILTERS = new Map<String, String>{
    'today' => 'TODAY',
    'week' => 'THIS_WEEK',
    'month' => 'THIS_MONTH'
  };
  private static final Map<String, String> PERIOD_LABELS = new Map<String, String>{
    'today' => 'Today',
    'week' => 'This week',
    'month' => 'This month',
    'all' => 'All time'
  };
  private static final List<String> MEDALS = new List<String>{
    '🥇',
    '🥈',
    '🥉'
  };

  /** Best round and number of rounds of one player in one game. */
  public class PlayerBest {
    public Id gameId;
    public Id playerId;
    public Integer best;
    public Integer rounds;
  }

  /** Normalizes a period such as "This week" to today, week, month or all. */
  public static String normalizePeriod(String period) {
    String key = String.isBlank(period)
      ? 'all'
      : period.trim().toLowerCase().removeStart('this ');
    return PERIOD_LABELS.containsKey(key) ? key : 'all';
  }

  public static String periodLabel(String period) {
    return PERIOD_LABELS.get(normalizePeriod(period));
  }

  /** Active games in lobby order. */
  public static List<Arcade_Game__c> activeGames() {
    return [
      SELECT Id, Name, Game_Key__c, Framework__c, App_Url__c
      FROM Arcade_Game__c
      WHERE Is_Active__c = TRUE
      WITH USER_MODE
      ORDER BY Sort_Order__c ASC NULLS LAST, Name ASC
    ];
  }

  /**
   * Finds a game by key or name, forgiving case, spaces and hyphens, so
   * "brick-breaker", "Brick Breaker" and "brickbreaker" all match.
   */
  public static Arcade_Game__c findGame(
    List<Arcade_Game__c> games,
    String game
  ) {
    String wanted = simplify(game);
    for (Arcade_Game__c candidate : games) {
      if (
        simplify(candidate.Game_Key__c) == wanted ||
        simplify(candidate.Name) == wanted
      ) {
        return candidate;
      }
    }
    return null;
  }

  /** The hub's URL, stored on the Angular games by the setup. */
  public static String arcadeUrl(List<Arcade_Game__c> games) {
    for (Arcade_Game__c game : games) {
      if (
        game.Framework__c == 'Angular' && String.isNotBlank(game.App_Url__c)
      ) {
        return game.App_Url__c;
      }
    }
    return null;
  }

  /**
   * Best round and round count per game and player. Lost rounds score 0:
   * they count as rounds, but a player needs a score above 0 to rank.
   */
  public static List<PlayerBest> bestPerPlayer(Set<Id> gameIds, String period) {
    String filter = PERIOD_FILTERS.get(normalizePeriod(period));
    String soql =
      'SELECT Game__c gameId, CreatedById playerId, MAX(Score__c) best, COUNT(Id) rounds' +
      ' FROM Arcade_Score__c WHERE Game__c IN :gameIds' +
      (filter == null ? '' : ' AND CreatedDate = ' + filter) +
      ' GROUP BY Game__c, CreatedById LIMIT 2000';
    List<PlayerBest> result = new List<PlayerBest>();
    for (
      AggregateResult row : (List<AggregateResult>) Database.queryWithBinds(
        soql,
        new Map<String, Object>{ 'gameIds' => gameIds },
        AccessLevel.USER_MODE
      )
    ) {
      PlayerBest entry = new PlayerBest();
      entry.gameId = (Id) row.get('gameId');
      entry.playerId = (Id) row.get('playerId');
      entry.best = toInteger(row.get('best'));
      entry.rounds = toInteger(row.get('rounds'));
      result.add(entry);
    }
    return result;
  }

  /** Competition ranking: 1 + the number of players with a higher best. */
  public static Integer rankOf(Integer best, List<PlayerBest> rivals) {
    if (best == null || best <= 0) {
      return null;
    }
    Integer rank = 1;
    for (PlayerBest rival : rivals) {
      if (rival.best > best) {
        rank++;
      }
    }
    return rank;
  }

  /** 🥇, 🥈 and 🥉 for the podium, "4." and so on below it. */
  public static String place(Integer rank) {
    if (rank == null) {
      return '';
    }
    return rank <= MEDALS.size() ? MEDALS[rank - 1] : rank + '.';
  }

  public static Map<Id, String> playerNames(Set<Id> playerIds) {
    Map<Id, String> names = new Map<Id, String>();
    for (User player : [
      SELECT Id, Name
      FROM User
      WHERE Id IN :playerIds
      WITH USER_MODE
    ]) {
      names.put(player.Id, player.Name);
    }
    return names;
  }

  /** "Ada Lovelace" becomes "AL", "Cher" becomes "C". */
  public static String initials(String name) {
    if (String.isBlank(name)) {
      return '?';
    }
    List<String> parts = name.trim().split('\\s+');
    String result = parts[0].left(1);
    if (parts.size() > 1) {
      result += parts[parts.size() - 1].left(1);
    }
    return result.toUpperCase();
  }

  private static String simplify(String value) {
    return value == null
      ? null
      : value.toLowerCase().replaceAll('[^a-z0-9]', '');
  }

  private static Integer toInteger(Object value) {
    return value == null ? 0 : ((Decimal) value).intValue();
  }
}
