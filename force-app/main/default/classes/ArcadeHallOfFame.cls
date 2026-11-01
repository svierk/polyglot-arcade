/**
 * Arcade Hall of Fame as an invocable action. The Polyglot Arcade MCP server
 * offers it as a tool, and the arcadeHallOfFameWidget HXL widget renders its
 * result natively in Claude, ChatGPT and Slackbot.
 *
 * With a game it ranks the players of that game by their best round; without
 * one it names the champion of every game. Same Arcade_Score__c data as every
 * other surface, read in user mode.
 */
global with sharing class ArcadeHallOfFame {
  private static final Integer MAX_ENTRIES = 10;

  global class Request {
    @InvocableVariable(
      label='Game'
      description='Game key or name, such as brick-breaker or Snake. Leave empty for the champion of every game.'
    )
    global String game;

    @InvocableVariable(
      label='Period'
      description='today, week, month or all. Defaults to all.'
    )
    global String period;
  }

  global class Response {
    @InvocableVariable(
      label='Title'
      description='Hall of Fame, or Hall of Fame · <game>'
    )
    global String title;

    @InvocableVariable(
      label='Period'
      description='Today, This week, This month or All time'
    )
    global String periodLabel;

    @InvocableVariable(
      label='Rounds'
      description='Rounds played in the period, lost rounds included'
    )
    global Integer rounds;

    @InvocableVariable(
      label='Players'
      description='Players who played in the period'
    )
    global Integer players;

    @InvocableVariable(
      label='All Games'
      description='True when the entries are the champions of every game'
    )
    global Boolean allGames;

    @InvocableVariable(
      label='Has Entries'
      description='True when at least one player scored'
    )
    global Boolean hasEntries;

    @InvocableVariable(
      label='Message'
      description='Shown instead of the ranking, for example when no one scored yet'
    )
    global String message;

    @InvocableVariable(
      label='Entries'
      description='With a game, its top 10 players by best round; without one, the champion of every game'
    )
    global List<Entry> entries;

    @InvocableVariable(
      label='Arcade URL'
      description='Opens the Polyglot Arcade hub'
    )
    global String arcadeUrl;
  }

  @JsonAccess(serializable='always' deserializable='always')
  global class Entry {
    @AuraEnabled
    global Integer rank;
    @AuraEnabled
    global String place;
    @AuraEnabled
    global String player;
    @AuraEnabled
    global String initials;
    @AuraEnabled
    global String game;
    @AuraEnabled
    global Integer score;
    @AuraEnabled
    global Integer rounds;
  }

  @InvocableMethod(
    label='Get Arcade Hall of Fame'
    description='Ranks the players of a Polyglot Arcade game by their best round, or names the champion of every game. Use it for questions like "Who is this week\'s champion?" or "Show the Brick Breaker high scores".'
    category='Polyglot Arcade'
  )
  global static List<Response> getHallOfFame(List<Request> requests) {
    List<Response> responses = new List<Response>();
    for (Request request : requests) {
      responses.add(build(request));
    }
    return responses;
  }

  private static Response build(Request request) {
    List<Arcade_Game__c> games = ArcadeScoreStats.activeGames();
    Response response = new Response();
    response.periodLabel = ArcadeScoreStats.periodLabel(request.period);
    response.arcadeUrl = ArcadeScoreStats.arcadeUrl(games);
    response.entries = new List<Entry>();
    response.rounds = 0;
    response.players = 0;
    response.title = 'Hall of Fame';
    response.allGames = String.isBlank(request.game);

    Arcade_Game__c game = null;
    if (!response.allGames) {
      game = ArcadeScoreStats.findGame(games, request.game);
      if (game == null) {
        response.hasEntries = false;
        response.message =
          'There is no game called "' +
          request.game.trim() +
          '". Try ' +
          gameNames(games) +
          '.';
        return response;
      }
      response.title += ' · ' + game.Name;
    }

    List<Arcade_Game__c> scope = game == null
      ? games
      : new List<Arcade_Game__c>{ game };
    Map<Id, Arcade_Game__c> gamesById = new Map<Id, Arcade_Game__c>(scope);
    List<ArcadeScoreStats.PlayerBest> bests = ArcadeScoreStats.bestPerPlayer(
      gamesById.keySet(),
      request.period
    );

    Set<Id> playerIds = new Set<Id>();
    for (ArcadeScoreStats.PlayerBest best : bests) {
      response.rounds += best.rounds;
      playerIds.add(best.playerId);
    }
    response.players = playerIds.size();

    List<ArcadeScoreStats.PlayerBest> ranked = game == null
      ? championPerGame(scope, bests)
      : topPlayers(bests);
    Map<Id, String> names = ArcadeScoreStats.playerNames(playerIds);
    for (ArcadeScoreStats.PlayerBest best : ranked) {
      Entry entry = new Entry();
      entry.rank = game == null
        ? 1
        : ArcadeScoreStats.rankOf(best.best, ranked);
      entry.place = ArcadeScoreStats.place(entry.rank);
      entry.player = names.containsKey(best.playerId)
        ? names.get(best.playerId)
        : 'Unknown player';
      entry.initials = ArcadeScoreStats.initials(entry.player);
      entry.game = gamesById.get(best.gameId).Name;
      entry.score = best.best;
      entry.rounds = best.rounds;
      response.entries.add(entry);
    }

    response.hasEntries = !response.entries.isEmpty();
    if (!response.hasEntries) {
      response.message = response.periodLabel == 'All time'
        ? 'No one has scored yet. Be the first!'
        : 'No one has scored ' +
          response.periodLabel.toLowerCase() +
          ' yet. Be the first!';
    }
    return response;
  }

  /** The player with the highest best round of each game, in lobby order. */
  private static List<ArcadeScoreStats.PlayerBest> championPerGame(
    List<Arcade_Game__c> games,
    List<ArcadeScoreStats.PlayerBest> bests
  ) {
    Map<Id, ArcadeScoreStats.PlayerBest> champions = new Map<Id, ArcadeScoreStats.PlayerBest>();
    for (ArcadeScoreStats.PlayerBest best : bests) {
      ArcadeScoreStats.PlayerBest current = champions.get(best.gameId);
      if (best.best > 0 && (current == null || best.best > current.best)) {
        champions.put(best.gameId, best);
      }
    }
    List<ArcadeScoreStats.PlayerBest> result = new List<ArcadeScoreStats.PlayerBest>();
    for (Arcade_Game__c game : games) {
      if (champions.containsKey(game.Id)) {
        result.add(champions.get(game.Id));
      }
    }
    return result;
  }

  /** The best players of one game, highest best round first. */
  private static List<ArcadeScoreStats.PlayerBest> topPlayers(
    List<ArcadeScoreStats.PlayerBest> bests
  ) {
    List<ArcadeScoreStats.PlayerBest> scored = new List<ArcadeScoreStats.PlayerBest>();
    for (ArcadeScoreStats.PlayerBest best : bests) {
      if (best.best > 0) {
        Integer i = 0;
        while (i < scored.size() && scored[i].best >= best.best) {
          i++;
        }
        if (i < scored.size()) {
          scored.add(i, best);
        } else {
          scored.add(best);
        }
      }
    }
    while (scored.size() > MAX_ENTRIES) {
      scored.remove(scored.size() - 1);
    }
    return scored;
  }

  private static String gameNames(List<Arcade_Game__c> games) {
    List<String> names = new List<String>();
    for (Arcade_Game__c game : games) {
      names.add(game.Name);
    }
    return String.join(names, ', ');
  }
}
