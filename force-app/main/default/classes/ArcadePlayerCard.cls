/**
 * Arcade player card as an invocable action. The Polyglot Arcade MCP server
 * offers it as a tool, and the arcadePlayerCardWidget HXL widget renders its
 * result natively in Claude, ChatGPT and Slackbot.
 *
 * Shows the personal best and rank of a player in every game they played,
 * and their last rounds - by default for the person who asks, since the MCP
 * client acts as that user.
 */
global with sharing class ArcadePlayerCard {
  private static final Integer RECENT_ROUNDS = 5;

  global class Request {
    @InvocableVariable(
      label='Player'
      description='Name of the player. Leave empty for the person who asks.'
    )
    global String player;
  }

  global class Response {
    @InvocableVariable(label='Player' description='Name of the player')
    global String player;

    @InvocableVariable(label='Initials' description='Initials for the avatar')
    global String initials;

    @InvocableVariable(
      label='Rounds'
      description='Rounds played, lost rounds included'
    )
    global Integer rounds;

    @InvocableVariable(
      label='Games Played'
      description='Games the player has played at least once'
    )
    global Integer gamesPlayed;

    @InvocableVariable(
      label='Games Total'
      description='Active games in the arcade'
    )
    global Integer gamesTotal;

    @InvocableVariable(
      label='Has Rounds'
      description='True when the player has played at least one round'
    )
    global Boolean hasRounds;

    @InvocableVariable(
      label='Message'
      description='Shown instead of the card, for example when the player has not played yet'
    )
    global String message;

    @InvocableVariable(
      label='Personal Bests'
      description='Best round and rank in every game the player played'
    )
    global List<GameBest> bests;

    @InvocableVariable(
      label='Recent Rounds'
      description='The last five rounds, newest first'
    )
    global List<RecentRound> recent;
  }

  @JsonAccess(serializable='always' deserializable='always')
  global class GameBest {
    @AuraEnabled
    global String game;
    @AuraEnabled
    global Integer best;
    @AuraEnabled
    global Integer rank;
    @AuraEnabled
    global Integer players;
    @AuraEnabled
    global Integer rounds;
    @AuraEnabled
    global Boolean isChampion;
  }

  @JsonAccess(serializable='always' deserializable='always')
  global class RecentRound {
    @AuraEnabled
    global String game;
    @AuraEnabled
    global Integer score;
    @AuraEnabled
    global String playedAt;
    @AuraEnabled
    global String source;
  }

  @InvocableMethod(
    label='Get Arcade Player Card'
    description='Shows a Polyglot Arcade player\'s personal best and rank in every game and their last rounds. Use it for questions like "How am I doing in the arcade?" or "Show Ada\'s player card".'
    category='Polyglot Arcade'
  )
  global static List<Response> getPlayerCard(List<Request> requests) {
    List<Response> responses = new List<Response>();
    for (Request request : requests) {
      responses.add(build(request));
    }
    return responses;
  }

  private static Response build(Request request) {
    List<Arcade_Game__c> games = ArcadeScoreStats.activeGames();
    Response response = new Response();
    response.bests = new List<GameBest>();
    response.recent = new List<RecentRound>();
    response.rounds = 0;
    response.gamesPlayed = 0;
    response.gamesTotal = games.size();

    User player = findPlayer(request.player);
    if (player == null) {
      response.player = request.player.trim();
      response.initials = ArcadeScoreStats.initials(response.player);
      response.hasRounds = false;
      response.message = 'There is no player called "' + response.player + '".';
      return response;
    }
    response.player = player.Name;
    response.initials = ArcadeScoreStats.initials(player.Name);

    Map<Id, List<ArcadeScoreStats.PlayerBest>> bestsByGame = new Map<Id, List<ArcadeScoreStats.PlayerBest>>();
    for (Arcade_Game__c game : games) {
      bestsByGame.put(game.Id, new List<ArcadeScoreStats.PlayerBest>());
    }
    for (
      ArcadeScoreStats.PlayerBest best : ArcadeScoreStats.bestPerPlayer(
        bestsByGame.keySet(),
        'all'
      )
    ) {
      bestsByGame.get(best.gameId).add(best);
    }

    for (Arcade_Game__c game : games) {
      ArcadeScoreStats.PlayerBest mine = null;
      Integer scorers = 0;
      for (ArcadeScoreStats.PlayerBest best : bestsByGame.get(game.Id)) {
        if (best.playerId == player.Id) {
          mine = best;
        }
        if (best.best > 0) {
          scorers++;
        }
      }
      if (mine == null) {
        continue;
      }
      GameBest entry = new GameBest();
      entry.game = game.Name;
      entry.best = mine.best;
      entry.rank = ArcadeScoreStats.rankOf(mine.best, bestsByGame.get(game.Id));
      entry.players = scorers;
      entry.rounds = mine.rounds;
      entry.isChampion = entry.rank == 1;
      response.bests.add(entry);
      response.rounds += mine.rounds;
      response.gamesPlayed++;
    }

    for (Arcade_Score__c score : [
      SELECT Score__c, Source__c, CreatedDate, Game__r.Name
      FROM Arcade_Score__c
      WHERE CreatedById = :player.Id AND Game__c IN :bestsByGame.keySet()
      WITH USER_MODE
      ORDER BY CreatedDate DESC
      LIMIT :RECENT_ROUNDS
    ]) {
      RecentRound round = new RecentRound();
      round.game = score.Game__r.Name;
      round.score = score.Score__c == null ? 0 : score.Score__c.intValue();
      // Formatted in the locale and time zone of the person who asks.
      round.playedAt = score.CreatedDate.format();
      round.source = score.Source__c;
      response.recent.add(round);
    }

    response.hasRounds = response.rounds > 0;
    if (!response.hasRounds) {
      response.message = player.Name + ' has not played yet. Insert coin!';
    }
    return response;
  }

  /** The person who asks, or the best match for a name: exact before partial. */
  private static User findPlayer(String name) {
    if (String.isBlank(name)) {
      return [
        SELECT Id, Name
        FROM User
        WHERE Id = :UserInfo.getUserId()
        WITH USER_MODE
      ];
    }
    String wanted = name.trim();
    String pattern = '%' + wanted.replace('%', '\\%').replace('_', '\\_') + '%';
    List<User> matches = [
      SELECT Id, Name
      FROM User
      WHERE Name LIKE :pattern AND IsActive = TRUE
      WITH USER_MODE
      ORDER BY Name
      LIMIT 20
    ];
    for (User match : matches) {
      if (match.Name.equalsIgnoreCase(wanted)) {
        return match;
      }
    }
    return matches.isEmpty() ? null : matches[0];
  }
}
