/**
 * Arcade player card for the Arcade Host agent in Lightning. Like
 * ArcadeHallOfFameAgent it returns the ArcadePlayerCard response as one output,
 * which the arcadePlayerCardView type maps onto the arcadePlayerCardWidget.
 */
global with sharing class ArcadePlayerCardAgent {
  global class Result {
    @InvocableVariable(
      label='Player Card'
      description='The player card, as the arcadePlayerCardWidget shows it'
    )
    global ArcadePlayerCard.Response playerCard;
  }

  @InvocableMethod(
    label='Get Arcade Player Card View'
    description='Shows a Polyglot Arcade player\'s personal best and rank in every game and their last rounds, as a card. Use it for questions like "How am I doing in the arcade?" or "Show Ada\'s player card".'
    category='Polyglot Arcade'
  )
  global static List<Result> getPlayerCard(
    List<ArcadePlayerCard.Request> requests
  ) {
    List<Result> results = new List<Result>();
    for (
      ArcadePlayerCard.Response response : ArcadePlayerCard.getPlayerCard(
        requests
      )
    ) {
      Result result = new Result();
      result.playerCard = response;
      results.add(result);
    }
    return results;
  }
}
