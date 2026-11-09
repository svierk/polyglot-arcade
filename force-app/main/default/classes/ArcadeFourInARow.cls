/**
 * Four in a Row in the chat, as an invocable action. The Polyglot Arcade MCP
 * server offers it as a tool, and the arcadeFourInARowWidget HXL widget renders
 * the board: a button per column posts the next move as the player, and the
 * client answers with this tool again.
 *
 * The game lives on the server, in one Arcade_Match__c per player. The model
 * only names a column: Apex checks the move, plays the CPU and works out the
 * score, which it records in Arcade_Score__c like every other surface.
 */
global with sharing class ArcadeFourInARow {
  private static final String GAME_KEY = 'four-in-a-row';
  private static final String SOURCE = 'Headless';
  private static final String IN_PROGRESS = 'In Progress';
  private static final String WON = 'Won';
  private static final String LOST = 'Lost';
  private static final String DRAW = 'Draw';
  private static final String ABANDONED = 'Abandoned';
  private static final Map<Integer, String> DISCS = new Map<Integer, String>{
    ArcadeFourInARowEngine.EMPTY => '⚪',
    ArcadeFourInARowEngine.HUMAN => '🔴',
    ArcadeFourInARowEngine.CPU => '🟡'
  };
  private static final Map<String, String> STATUS_LABELS = new Map<String, String>{
    IN_PROGRESS => 'Your move',
    WON => 'You won',
    LOST => 'CPU won',
    DRAW => 'Draw'
  };

  global class Request {
    @InvocableVariable(
      label='Column'
      description='Column for the player\'s disc, 1 to 7 from the left. Leave empty to show the current game, or to start one when there is none.'
    )
    global Integer column;

    @InvocableVariable(
      label='Move Number'
      description='The move number from the player\'s message, such as 5 in "column 3 (move 5)". It keeps an old button or a repeated call from playing twice. Leave empty when the player names no move number.'
    )
    global Integer moveNumber;

    @InvocableVariable(
      label='New Game'
      description='True to give up any game in progress and start a new one.'
    )
    global Boolean newGame;

    @InvocableVariable(
      label='Difficulty'
      description='easy or normal, for a new game only. Defaults to normal.'
    )
    global String difficulty;
  }

  global class Response {
    @InvocableVariable(label='Title' description='The name of the game')
    global String title;

    @InvocableVariable(
      label='Status'
      description='Your move, You won, CPU won or Draw'
    )
    global String status;

    @InvocableVariable(label='Difficulty' description='easy or normal')
    global String difficulty;

    @InvocableVariable(
      label='Message'
      description='What just happened, in one sentence'
    )
    global String message;

    @InvocableVariable(
      label='Has Board'
      description='True when there is a board to show'
    )
    global Boolean hasBoard;

    @InvocableVariable(
      label='Is Playing'
      description='True while the game is in progress'
    )
    global Boolean isPlaying;

    @InvocableVariable(
      label='Is Finished'
      description='True when this call ended the game and recorded the score'
    )
    global Boolean isFinished;

    @InvocableVariable(
      label='Move Number'
      description='The number of the player\'s next move'
    )
    global Integer moveNumber;

    @InvocableVariable(
      label='Score'
      description='Points of the finished game, recorded in the arcade'
    )
    global Integer score;

    @InvocableVariable(
      label='Columns'
      description='The seven columns of the board from the left'
    )
    global List<BoardColumn> columns;
  }

  @JsonAccess(serializable='always' deserializable='always')
  global class BoardColumn {
    @AuraEnabled
    global String label;
    @AuraEnabled
    global Boolean isOpen;
    @AuraEnabled
    global String prompt;
    @AuraEnabled
    global List<BoardCell> cells;
  }

  @JsonAccess(serializable='always' deserializable='always')
  global class BoardCell {
    @AuraEnabled
    global String disc;
  }

  @InvocableMethod(
    label='Play Arcade Four in a Row'
    description='Plays Four in a Row against the CPU in the conversation and shows the board. Starts or shows a game when no column is given, and drops the player\'s disc when one is. A finished game is recorded as an arcade score. Use it for requests like "Let\'s play Four in a Row" or "Four in a Row: drop my disc in column 3 (move 5)".'
    category='Polyglot Arcade'
  )
  global static List<Response> play(List<Request> requests) {
    List<Response> responses = new List<Response>();
    for (Request request : requests) {
      responses.add(run(request));
    }
    return responses;
  }

  private static Response run(Request request) {
    Arcade_Game__c game = ArcadeScoreStats.findGame(
      ArcadeScoreStats.activeGames(),
      GAME_KEY
    );
    if (game == null) {
      return noBoard('Four in a Row is not in the arcade right now.');
    }

    Arcade_Match__c match = openMatch();
    if (request.newGame == true) {
      abandon(match);
      return view(start(request.difficulty), startMessage(), 0, false);
    }
    if (match == null) {
      return request.column == null
        ? view(start(request.difficulty), startMessage(), 0, false)
        : noBoard('There is no game in progress. Start a new one!');
    }
    if (request.column == null) {
      return view(match, 'Your move: pick a column.', 0, false);
    }
    if (
      request.moveNumber != null &&
      request.moveNumber != match.Human_Moves__c + 1
    ) {
      return view(
        match,
        'That button belongs to an earlier board, so nothing changed. This is the current one.',
        0,
        false
      );
    }
    return move(game, match, request.column - 1);
  }

  /** The player's disc, the CPU's answer and the score of a finished game. */
  private static Response move(
    Arcade_Game__c game,
    Arcade_Match__c match,
    Integer col
  ) {
    List<Integer> board = ArcadeFourInARowEngine.parse(match.Board__c);
    if (!ArcadeFourInARowEngine.isValidColumn(board, col)) {
      return view(
        match,
        'You can\'t drop a disc there. Pick an open column from 1 to 7.',
        0,
        false
      );
    }

    ArcadeFourInARowEngine.drop(board, col, ArcadeFourInARowEngine.HUMAN);
    match.Human_Moves__c += 1;
    String message;
    if (ArcadeFourInARowEngine.winner(board) == ArcadeFourInARowEngine.HUMAN) {
      match.Status__c = WON;
      message =
        'Four in a row in ' +
        match.Human_Moves__c.intValue() +
        ' moves!';
    } else if (ArcadeFourInARowEngine.isFull(board)) {
      match.Status__c = DRAW;
      message = 'The board is full: a draw.';
    } else {
      Integer cpuCol = ArcadeFourInARowEngine.cpuMove(
        board,
        match.Difficulty__c
      );
      ArcadeFourInARowEngine.drop(board, cpuCol, ArcadeFourInARowEngine.CPU);
      if (ArcadeFourInARowEngine.winner(board) == ArcadeFourInARowEngine.CPU) {
        match.Status__c = LOST;
        message = 'The CPU connected four with column ' + (cpuCol + 1) + '.';
      } else if (ArcadeFourInARowEngine.isFull(board)) {
        match.Status__c = DRAW;
        message = 'The board is full: a draw.';
      } else {
        message = 'The CPU dropped in column ' + (cpuCol + 1) + '. Your move.';
      }
    }

    match.Board__c = ArcadeFourInARowEngine.serialize(board);
    update as user match;
    if (match.Status__c == IN_PROGRESS) {
      return view(match, message, 0, false);
    }
    Integer score = record(game, match);
    return view(match, message, score, true);
  }

  private static Integer record(Arcade_Game__c game, Arcade_Match__c match) {
    Integer humanMoves = match.Human_Moves__c.intValue();
    Integer score = ArcadeFourInARowEngine.scoreFor(
      match.Status__c == WON
        ? ArcadeFourInARowEngine.HUMAN
        : match.Status__c == DRAW
            ? ArcadeFourInARowEngine.EMPTY
            : ArcadeFourInARowEngine.CPU,
      humanMoves,
      match.Difficulty__c
    );
    Long seconds =
      (Datetime.now().getTime() - match.CreatedDate.getTime()) / 1000;
    insert as user new Arcade_Score__c(
      Game__c = game.Id,
      Score__c = score,
      Level__c = ArcadeFourInARowEngine.levelOf(match.Difficulty__c),
      Duration_Seconds__c = seconds,
      Source__c = SOURCE
    );
    return score;
  }

  private static Arcade_Match__c openMatch() {
    // FOR UPDATE makes a second call for the same move wait, so it sees the
    // new move number. Locking queries can't be ordered: one match is open.
    List<Arcade_Match__c> matches = [
      SELECT Id, Board__c, Status__c, Difficulty__c, Human_Moves__c, CreatedDate
      FROM Arcade_Match__c
      WHERE OwnerId = :UserInfo.getUserId() AND Status__c = :IN_PROGRESS
      WITH USER_MODE
      LIMIT 1
      FOR UPDATE
    ];
    return matches.isEmpty() ? null : matches[0];
  }

  private static Arcade_Match__c start(String difficulty) {
    Arcade_Match__c match = new Arcade_Match__c(
      Board__c = ArcadeFourInARowEngine.serialize(
        ArcadeFourInARowEngine.emptyBoard()
      ),
      Status__c = IN_PROGRESS,
      Difficulty__c = normalizeDifficulty(difficulty),
      Human_Moves__c = 0
    );
    insert as user match;
    return match;
  }

  private static void abandon(Arcade_Match__c match) {
    if (match != null) {
      match.Status__c = ABANDONED;
      update as user match;
    }
  }

  private static String normalizeDifficulty(String difficulty) {
    return difficulty?.trim()?.toLowerCase() == ArcadeFourInARowEngine.EASY
      ? ArcadeFourInARowEngine.EASY
      : ArcadeFourInARowEngine.NORMAL;
  }

  private static String startMessage() {
    return 'You move first. Pick a column.';
  }

  private static Response noBoard(String message) {
    Response response = new Response();
    response.title = 'Four in a Row';
    response.message = message;
    response.hasBoard = false;
    response.isPlaying = false;
    response.isFinished = false;
    response.moveNumber = 0;
    response.score = 0;
    response.columns = new List<BoardColumn>();
    return response;
  }

  private static Response view(
    Arcade_Match__c match,
    String message,
    Integer score,
    Boolean isFinished
  ) {
    Response response = noBoard(message);
    response.status = STATUS_LABELS.get(match.Status__c);
    response.difficulty = match.Difficulty__c;
    response.hasBoard = true;
    response.isPlaying = match.Status__c == IN_PROGRESS;
    response.isFinished = isFinished;
    response.moveNumber = match.Human_Moves__c.intValue() + 1;
    response.score = score;

    List<Integer> board = ArcadeFourInARowEngine.parse(match.Board__c);
    for (Integer col = 0; col < ArcadeFourInARowEngine.COLS; col++) {
      BoardColumn column = new BoardColumn();
      column.label = String.valueOf(col + 1);
      column.isOpen =
        response.isPlaying && ArcadeFourInARowEngine.isValidColumn(board, col);
      column.prompt =
        'Four in a Row: drop my disc in column ' +
        column.label +
        ' (move ' +
        response.moveNumber +
        ').';
      column.cells = new List<BoardCell>();
      for (Integer row = 0; row < ArcadeFourInARowEngine.ROWS; row++) {
        BoardCell cell = new BoardCell();
        cell.disc = DISCS.get(board[row * ArcadeFourInARowEngine.COLS + col]);
        column.cells.add(cell);
      }
      response.columns.add(column);
    }
    return response;
  }
}
