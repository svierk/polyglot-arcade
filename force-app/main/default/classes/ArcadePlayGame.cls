/**
 * "I want to play a round of Snake" as an invocable action. The Polyglot Arcade
 * MCP server offers it as a tool, and the arcadePlayGameWidget HXL widget shows
 * the game with the player's best, the champion and a way to start it.
 *
 * Widgets have no game loop, so a real-time game opens on the surface where it
 * lives and saves its round there. Four in a Row is played in the chat.
 */
global with sharing class ArcadePlayGame {
  private static final String CHAT_GAME = 'four-in-a-row';
  /** Lightning tab of each game whose host page saves the round. */
  private static final Map<String, String> ARCADE_FLOOR_TABS = new Map<String, String>{
    'snake' => 'Arcade_Snake'
  };

  global class Request {
    @InvocableVariable(
      label='Game'
      description='Game key or name, such as snake or Block Drop. Leave empty to list every game.'
    )
    global String game;
  }

  global class Response {
    @InvocableVariable(
      label='Has Game'
      description='True when one game was found and is shown'
    )
    global Boolean hasGame;

    @InvocableVariable(label='Title' description='The name of the game')
    global String title;

    @InvocableVariable(label='Tagline' description='One line about the game')
    global String tagline;

    @InvocableVariable(
      label='Has Best'
      description='True when the player has scored in this game'
    )
    global Boolean hasBest;

    @InvocableVariable(
      label='Best Score'
      description='The best round of the person who asks'
    )
    global Integer bestScore;

    @InvocableVariable(
      label='Has Champion'
      description='True when anyone has scored in this game'
    )
    global Boolean hasChampion;

    @InvocableVariable(label='Champion' description='The best player so far')
    global String champion;

    @InvocableVariable(
      label='Champion Score'
      description='The best round of the champion'
    )
    global Integer championScore;

    @InvocableVariable(
      label='Playable in Chat'
      description='True when the game can be played in the conversation'
    )
    global Boolean playableInChat;

    @InvocableVariable(
      label='Has Play URL'
      description='True when the game can be opened in the arcade'
    )
    global Boolean hasPlayUrl;

    @InvocableVariable(
      label='Play URL'
      description='Opens the game on the surface that saves its rounds'
    )
    global String playUrl;

    @InvocableVariable(
      label='Message'
      description='Shown when the game was not found'
    )
    global String message;

    @InvocableVariable(
      label='Has Options'
      description='True when a list of games is shown to choose from'
    )
    global Boolean hasOptions;

    @InvocableVariable(
      label='Options'
      description='Every game to choose from, when no single game was found'
    )
    global List<Option> options;
  }

  @JsonAccess(serializable='always' deserializable='always')
  global class Option {
    @AuraEnabled
    global String name;
    @AuraEnabled
    global String tagline;
    @AuraEnabled
    global String prompt;
  }

  @InvocableMethod(
    label='Play Arcade Game'
    description='Starts a round of a Polyglot Arcade game: shows the player\'s best, the champion and how to play it. Use it for requests like "I want to play a round of Snake" or "What can I play?".'
    category='Polyglot Arcade'
  )
  global static List<Response> playGame(List<Request> requests) {
    List<Response> responses = new List<Response>();
    for (Request request : requests) {
      responses.add(build(request));
    }
    return responses;
  }

  private static Response build(Request request) {
    List<Arcade_Game__c> games = ArcadeScoreStats.activeGames();
    Response response = new Response();
    response.options = new List<Option>();
    response.hasGame = false;
    response.hasOptions = false;
    response.hasBest = false;
    response.hasChampion = false;
    response.playableInChat = false;
    response.hasPlayUrl = false;
    response.title = 'Polyglot Arcade';

    Arcade_Game__c game = String.isBlank(request.game)
      ? null
      : ArcadeScoreStats.findGame(games, request.game);
    if (game == null) {
      addOptions(response, games);
      if (String.isNotBlank(request.game)) {
        response.message =
          'There is no game called "' +
          request.game.trim() +
          '". Pick one of these.';
      }
      return response;
    }

    response.hasGame = true;
    response.title = game.Name;
    response.tagline = game.Tagline__c;
    response.playableInChat = game.Game_Key__c == CHAT_GAME;
    response.playUrl = playUrl(game);
    response.hasPlayUrl = response.playUrl != null;
    addStandings(response, game);
    return response;
  }

  private static void addOptions(
    Response response,
    List<Arcade_Game__c> games
  ) {
    for (Arcade_Game__c game : games) {
      Option option = new Option();
      option.name = game.Name;
      option.tagline = game.Tagline__c;
      option.prompt =
        'I want to play ' +
        game.Name +
        ' in the Polyglot Arcade.';
      response.options.add(option);
    }
    response.hasOptions = !response.options.isEmpty();
  }

  /**
   * A game whose host saves the round opens on its Lightning page, not at
   * App_Url__c: outside the host it would not record anything. The link names
   * the app, or Lightning opens the tab in the app the player used last.
   */
  private static String playUrl(Arcade_Game__c game) {
    if (game.Host_Saves_Score__c) {
      String tab = ARCADE_FLOOR_TABS.get(game.Game_Key__c);
      return tab == null
        ? null
        : Url.getOrgDomainUrl().toExternalForm() +
          '/lightning/app/c__arcadeFloor/n/' +
          tab;
    }
    return String.isBlank(game.App_Url__c)
      ? null
      : game.App_Url__c.removeEnd('/') + '/play/' + game.Game_Key__c;
  }

  private static void addStandings(Response response, Arcade_Game__c game) {
    Id me = UserInfo.getUserId();
    Integer top = 0;
    Id championId = null;
    for (
      ArcadeScoreStats.PlayerBest best : ArcadeScoreStats.bestPerPlayer(
        new Set<Id>{ game.Id },
        'all'
      )
    ) {
      if (best.playerId == me && best.best > 0) {
        response.hasBest = true;
        response.bestScore = best.best;
      }
      if (best.best > top) {
        top = best.best;
        championId = best.playerId;
      }
    }
    if (championId != null) {
      response.hasChampion = true;
      response.championScore = top;
      response.champion = ArcadeScoreStats.playerNames(
          new Set<Id>{ championId }
        )
        .get(championId);
    }
  }
}
