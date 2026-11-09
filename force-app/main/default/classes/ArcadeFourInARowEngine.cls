/**
 * Four in a Row rules and CPU opponent for the game in the chat. The same
 * rules, search and scoring as the Angular hub's engine.ts, so a round counts
 * the same on every surface. A board is a flat list of 42 cells, row by row
 * from the top. Moves change the list in place: the search has to stay well
 * inside the Apex CPU limit.
 */
public with sharing class ArcadeFourInARowEngine {
  public static final Integer ROWS = 6;
  public static final Integer COLS = 7;
  public static final Integer EMPTY = 0;
  public static final Integer HUMAN = 1;
  public static final Integer CPU = 2;
  public static final String EASY = 'easy';
  public static final String NORMAL = 'normal';

  private static final Integer WIN_VALUE = 1000000;
  private static final Integer INFINITY = 2000000000;
  private static final List<Integer> SEARCH_ORDER = new List<Integer>{
    3,
    2,
    4,
    1,
    5,
    0,
    6
  };
  private static final List<List<Integer>> DIRECTIONS = new List<List<Integer>>{
    new List<Integer>{ 0, 1 },
    new List<Integer>{ 1, 0 },
    new List<Integer>{ 1, 1 },
    new List<Integer>{ 1, -1 }
  };
  private static final Map<String, Integer> DEPTH = new Map<String, Integer>{
    EASY => 2,
    NORMAL => 4
  };
  private static final Map<String, Decimal> BLUNDER_RATE = new Map<String, Decimal>{
    EASY => 0.35,
    NORMAL => 0.05
  };
  private static final Map<String, Integer> SCORE_MULTIPLIER = new Map<String, Integer>{
    EASY => 1,
    NORMAL => 2
  };
  private static final Map<String, Integer> LEVEL = new Map<String, Integer>{
    EASY => 1,
    NORMAL => 2
  };
  private static final List<List<Integer>> WINDOWS = buildWindows();

  /** Replaces Math.random() in tests. */
  @TestVisible
  private static Decimal fixedRandom;

  public static List<Integer> emptyBoard() {
    List<Integer> board = new List<Integer>();
    for (Integer i = 0; i < ROWS * COLS; i++) {
      board.add(EMPTY);
    }
    return board;
  }

  public static List<Integer> parse(String stored) {
    List<Integer> board = new List<Integer>();
    for (Integer i = 0; i < stored.length(); i++) {
      board.add(stored.charAt(i) - 48);
    }
    return board;
  }

  public static String serialize(List<Integer> board) {
    return String.join(board, '');
  }

  public static Boolean isValidColumn(List<Integer> board, Integer col) {
    return col != null && col >= 0 && col < COLS && board[col] == EMPTY;
  }

  /** Drops a disc and returns its cell, or -1 when the column is full. */
  public static Integer drop(List<Integer> board, Integer col, Integer player) {
    for (Integer row = ROWS - 1; row >= 0; row--) {
      Integer cell = row * COLS + col;
      if (board[cell] == EMPTY) {
        board[cell] = player;
        return cell;
      }
    }
    return -1;
  }

  /** The player with four in a row, or EMPTY when there is none. */
  public static Integer winner(List<Integer> board) {
    for (List<Integer> window : WINDOWS) {
      Integer player = board[window[0]];
      if (
        player != EMPTY &&
        player == board[window[1]] &&
        player == board[window[2]] &&
        player == board[window[3]]
      ) {
        return player;
      }
    }
    return EMPTY;
  }

  public static Boolean isFull(List<Integer> board) {
    for (Integer col = 0; col < COLS; col++) {
      if (board[col] == EMPTY) {
        return false;
      }
    }
    return true;
  }

  /** The CPU's column: a search of the difficulty's depth, or sometimes a blunder. */
  public static Integer cpuMove(List<Integer> board, String difficulty) {
    List<Integer> columns = new List<Integer>();
    for (Integer col : SEARCH_ORDER) {
      if (board[col] == EMPTY) {
        columns.add(col);
      }
    }
    if (random() < BLUNDER_RATE.get(difficulty)) {
      return columns[(Integer) Math.floor(Math.random() * columns.size())];
    }

    Integer bestCol = columns[0];
    Integer bestValue = -INFINITY;
    for (Integer col : columns) {
      Integer cell = drop(board, col, CPU);
      // Carrying alpha cannot change the chosen column: a column cut off here
      // is at best as good as the current one, and the first of equals wins.
      Integer value = minimax(
        board,
        DEPTH.get(difficulty) - 1,
        bestValue,
        INFINITY,
        false
      );
      board[cell] = EMPTY;
      if (value > bestValue) {
        bestValue = value;
        bestCol = col;
      }
    }
    return bestCol;
  }

  public static Integer scoreFor(
    Integer winningPlayer,
    Integer humanMoves,
    String difficulty
  ) {
    Integer multiplier = SCORE_MULTIPLIER.get(difficulty);
    if (winningPlayer == HUMAN) {
      return (1000 + Math.max(0, 21 - humanMoves) * 50) * multiplier;
    }
    return winningPlayer == EMPTY ? 250 * multiplier : 0;
  }

  public static Integer levelOf(String difficulty) {
    return LEVEL.get(difficulty);
  }

  private static Integer minimax(
    List<Integer> board,
    Integer depth,
    Integer alphaStart,
    Integer betaStart,
    Boolean maximizing
  ) {
    Integer won = winner(board);
    if (won != EMPTY) {
      return won == CPU ? WIN_VALUE + depth : -WIN_VALUE - depth;
    }
    if (isFull(board)) {
      return 0;
    }
    if (depth == 0) {
      return evaluate(board);
    }

    Integer alpha = alphaStart;
    Integer beta = betaStart;
    Integer best = maximizing ? -INFINITY : INFINITY;
    for (Integer col : SEARCH_ORDER) {
      if (board[col] != EMPTY) {
        continue;
      }
      Integer cell = drop(board, col, maximizing ? CPU : HUMAN);
      Integer value = minimax(board, depth - 1, alpha, beta, !maximizing);
      board[cell] = EMPTY;
      if (maximizing) {
        best = Math.max(best, value);
        alpha = Math.max(alpha, value);
      } else {
        best = Math.min(best, value);
        beta = Math.min(beta, value);
      }
      if (alpha >= beta) {
        break;
      }
    }
    return best;
  }

  /** Heuristic from the CPU's point of view: the centre and open windows. */
  private static Integer evaluate(List<Integer> board) {
    Integer score = 0;
    for (Integer row = 0; row < ROWS; row++) {
      Integer centre = board[row * COLS + 3];
      score += centre == CPU ? 6 : centre == HUMAN ? -6 : 0;
    }
    for (List<Integer> window : WINDOWS) {
      Integer cpuDiscs = 0;
      Integer humanDiscs = 0;
      for (Integer cell : window) {
        Integer disc = board[cell];
        if (disc == CPU) {
          cpuDiscs++;
        } else if (disc == HUMAN) {
          humanDiscs++;
        }
      }
      score += scoreWindow(cpuDiscs, humanDiscs);
    }
    return score;
  }

  private static Integer scoreWindow(Integer cpuDiscs, Integer humanDiscs) {
    if (cpuDiscs > 0 && humanDiscs > 0) {
      return 0;
    }
    if (cpuDiscs == 3) {
      return 50;
    }
    if (cpuDiscs == 2) {
      return 10;
    }
    if (humanDiscs == 3) {
      return -80;
    }
    return humanDiscs == 2 ? -10 : 0;
  }

  /** Every line of four cells on the board. */
  private static List<List<Integer>> buildWindows() {
    List<List<Integer>> windows = new List<List<Integer>>();
    for (Integer row = 0; row < ROWS; row++) {
      for (Integer col = 0; col < COLS; col++) {
        for (List<Integer> direction : DIRECTIONS) {
          Integer endRow = row + direction[0] * 3;
          Integer endCol = col + direction[1] * 3;
          if (endRow < ROWS && endCol >= 0 && endCol < COLS) {
            List<Integer> window = new List<Integer>();
            for (Integer i = 0; i < 4; i++) {
              window.add(
                (row + direction[0] * i) * COLS + col + direction[1] * i
              );
            }
            windows.add(window);
          }
        }
      }
    }
    return windows;
  }

  private static Decimal random() {
    return fixedRandom != null ? fixedRandom : (Decimal) Math.random();
  }
}
