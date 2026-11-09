/**
 * Four in a Row for the Arcade Host agent in Lightning. The agent passes the
 * player's sentence unchanged and this action reads the move from it, so the
 * model has nothing to fill in and only has to make the call.
 *
 * Agentforce renders an action output with a Lightning type only when the whole
 * result is one output, so the ArcadeFourInARow response is wrapped. The
 * arcadeFourInARowBoard type maps it onto the same arcadeFourInARowWidget.
 */
global with sharing class ArcadeFourInARowAgent {
  private static final Pattern COLUMN_PATTERN = Pattern.compile(
    '(?i)\\b(?:column|spalte)\\s*([1-7])\\b|^\\s*([1-7])\\s*$'
  );
  private static final Pattern MOVE_PATTERN = Pattern.compile(
    '(?i)\\bmove\\s+(\\d{1,2})\\b'
  );
  private static final Pattern NEW_GAME_PATTERN = Pattern.compile(
    '(?i)\\b(?:new|neues)\\s+(?:game|spiel)\\b'
  );
  private static final Pattern EASY_PATTERN = Pattern.compile(
    '(?i)\\b(?:easy|leicht)\\b'
  );

  global class Request {
    @InvocableVariable(
      label='Message'
      description='The player\'s message, such as "Four in a Row: drop my disc in column 3 (move 5)."'
      required=true
    )
    global String message;
  }

  global class Result {
    @InvocableVariable(
      label='Board'
      description='The game after this call, as the arcadeFourInARowWidget shows it'
    )
    global ArcadeFourInARow.Response board;
  }

  @InvocableMethod(
    label='Play Arcade Four in a Row Board'
    description='Plays Four in a Row against the CPU and shows the board as a card. Reads the move from the player\'s message, such as "Four in a Row: drop my disc in column 3 (move 5)", and starts or shows a game when the message names no column.'
    category='Polyglot Arcade'
  )
  global static List<Result> play(List<Request> requests) {
    List<ArcadeFourInARow.Request> moves = new List<ArcadeFourInARow.Request>();
    for (Request request : requests) {
      moves.add(toMove(request.message));
    }
    List<Result> results = new List<Result>();
    for (ArcadeFourInARow.Response response : ArcadeFourInARow.play(moves)) {
      Result result = new Result();
      result.board = response;
      results.add(result);
    }
    return results;
  }

  private static ArcadeFourInARow.Request toMove(String message) {
    String text = message == null ? '' : message;
    ArcadeFourInARow.Request move = new ArcadeFourInARow.Request();
    Matcher column = COLUMN_PATTERN.matcher(text);
    if (column.find()) {
      move.column = Integer.valueOf(
        column.group(1) != null ? column.group(1) : column.group(2)
      );
    }
    Matcher moveNumber = MOVE_PATTERN.matcher(text);
    if (moveNumber.find()) {
      move.moveNumber = Integer.valueOf(moveNumber.group(1));
    }
    move.newGame = NEW_GAME_PATTERN.matcher(text).find();
    move.difficulty = EASY_PATTERN.matcher(text).find() ? 'easy' : null;
    return move;
  }
}
