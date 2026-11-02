/**
 * Arcade Hall of Fame for the Arcade Host agent in Lightning. Agentforce
 * renders an action output with a Lightning type only when the whole result is
 * one output, so this action wraps the ArcadeHallOfFame response, which the
 * MCP server returns field by field. The arcadeHallOfFameCard type maps it onto
 * the same arcadeHallOfFameWidget.
 */
global with sharing class ArcadeHallOfFameAgent {
  global class Result {
    @InvocableVariable(
      label='Hall of Fame'
      description='The ranking or the champions, as the arcadeHallOfFameWidget shows them'
    )
    global ArcadeHallOfFame.Response hallOfFame;
  }

  @InvocableMethod(
    label='Get Arcade Hall of Fame Card'
    description='Ranks the players of a Polyglot Arcade game by their best round, or names the champion of every game, as a card. Use it for questions like "Who is this week\'s champion?" or "Show the Brick Breaker high scores".'
    category='Polyglot Arcade'
  )
  global static List<Result> getHallOfFame(
    List<ArcadeHallOfFame.Request> requests
  ) {
    List<Result> results = new List<Result>();
    for (
      ArcadeHallOfFame.Response response : ArcadeHallOfFame.getHallOfFame(
        requests
      )
    ) {
      Result result = new Result();
      result.hallOfFame = response;
      results.add(result);
    }
    return results;
  }
}
