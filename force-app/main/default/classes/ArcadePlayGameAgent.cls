/**
 * Starting a game for the Arcade Host agent in Lightning. Agentforce renders an
 * action output with a Lightning type only when the whole result is one output,
 * so this action wraps the ArcadePlayGame response. The arcadePlayGameCard type
 * maps it onto the same arcadePlayGameWidget.
 */
global with sharing class ArcadePlayGameAgent {
  global class Result {
    @InvocableVariable(
      label='Game'
      description='The game or the list of games, as the arcadePlayGameWidget shows them'
    )
    global ArcadePlayGame.Response game;
  }

  @InvocableMethod(
    label='Play Arcade Game Card'
    description='Starts a round of a Polyglot Arcade game as a card: the player\'s best, the champion and how to play it. Use it for requests like "I want to play a round of Snake" or "What can I play?".'
    category='Polyglot Arcade'
  )
  global static List<Result> playGame(List<ArcadePlayGame.Request> requests) {
    List<Result> results = new List<Result>();
    for (ArcadePlayGame.Response response : ArcadePlayGame.playGame(requests)) {
      Result result = new Result();
      // Agentforce replaces a URL that is not a Trusted URL of the org with
      // URL_Redacted, also inside an action's output. A path has no domain to
      // check, and the panel runs in the org anyway.
      response.playUrl = response.playUrl
        ?.removeStart(Url.getOrgDomainUrl().toExternalForm());
      result.game = response;
      results.add(result);
    }
    return results;
  }
}
