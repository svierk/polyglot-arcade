@IsTest
private class ArcadeFourInARowTest {
  @TestSetup
  static void setup() {
    Id access = [
      SELECT Id
      FROM PermissionSet
      WHERE Name = 'polyglotArcade_Access'
    ]
    .Id;
    User ada = new User(
      FirstName = 'Quinn',
      LastName = 'Boardwright',
      Alias = 'qboard',
      Email = 'quinn.boardwright@example.com',
      Username = 'quinn.boardwright.' +
        UserInfo.getOrganizationId() +
        '@example.com',
      ProfileId = UserInfo.getProfileId(),
      TimeZoneSidKey = 'Europe/Berlin',
      LocaleSidKey = 'en_US',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'en_US'
    );
    System.runAs(new User(Id = UserInfo.getUserId())) {
      insert ada;
      List<PermissionSetAssignment> assignments = new List<PermissionSetAssignment>{
        new PermissionSetAssignment(
          AssigneeId = ada.Id,
          PermissionSetId = access
        )
      };
      if (
        [
          SELECT COUNT()
          FROM PermissionSetAssignment
          WHERE AssigneeId = :UserInfo.getUserId() AND PermissionSetId = :access
        ] == 0
      ) {
        assignments.add(
          new PermissionSetAssignment(
            AssigneeId = UserInfo.getUserId(),
            PermissionSetId = access
          )
        );
      }
      insert assignments;
    }
    insert new List<Arcade_Game__c>{
      new Arcade_Game__c(
        Name = 'Four in a Row',
        Game_Key__c = 'four-in-a-row',
        Framework__c = 'Angular',
        App_Url__c = 'https://arcade.example.com/app/c__polyglotArcade/',
        Tagline__c = 'Outsmart the CPU.',
        Is_Active__c = true,
        Sort_Order__c = 1
      ),
      new Arcade_Game__c(
        Name = 'Snake',
        Game_Key__c = 'snake',
        Framework__c = 'LWC OSS',
        App_Url__c = 'https://snake.example.com',
        Tagline__c = 'Eat and grow.',
        Host_Saves_Score__c = true,
        Is_Active__c = true,
        Sort_Order__c = 2
      )
    };
  }

  private static User ada() {
    return [SELECT Id FROM User WHERE LastName = 'Boardwright' LIMIT 1];
  }

  private static ArcadeFourInARow.Response play(
    Integer column,
    Integer moveNumber
  ) {
    ArcadeFourInARow.Request request = new ArcadeFourInARow.Request();
    request.column = column;
    request.moveNumber = moveNumber;
    return ArcadeFourInARow.play(
      new List<ArcadeFourInARow.Request>{ request }
    )[0];
  }

  private static ArcadeFourInARow.Response newGame(String difficulty) {
    ArcadeFourInARow.Request request = new ArcadeFourInARow.Request();
    request.newGame = true;
    request.difficulty = difficulty;
    return ArcadeFourInARow.play(
      new List<ArcadeFourInARow.Request>{ request }
    )[0];
  }

  /** An open game of the running user with a given board. */
  private static void seedMatch(String board, Integer humanMoves) {
    insert as user new Arcade_Match__c(
      Board__c = board,
      Status__c = 'In Progress',
      Difficulty__c = 'normal',
      Human_Moves__c = humanMoves
    );
  }

  private static String boardOf(Map<Integer, Integer> discs) {
    List<Integer> board = ArcadeFourInARowEngine.emptyBoard();
    for (Integer cell : discs.keySet()) {
      board[cell] = discs.get(cell);
    }
    return ArcadeFourInARowEngine.serialize(board);
  }

  @IsTest
  static void showsAnEmptyBoardForTheFirstCall() {
    System.runAs(ada()) {
      Test.startTest();
      ArcadeFourInARow.Response response = play(null, null);
      Test.stopTest();

      Assert.isTrue(response.hasBoard);
      Assert.isTrue(response.isPlaying);
      Assert.areEqual('Your move', response.status);
      Assert.areEqual('normal', response.difficulty);
      Assert.areEqual(1, response.moveNumber);
      Assert.areEqual(7, response.columns.size());
      Assert.areEqual(6, response.columns[0].cells.size());
      Assert.areEqual('⚪', response.columns[0].cells[5].disc);
      Assert.areEqual(
        'Four in a Row: drop my disc in column 4 (move 1).',
        response.columns[3].prompt
      );
    }
  }

  @IsTest
  static void aMoveDropsBothDiscsAndKeepsTheGame() {
    System.runAs(ada()) {
      newGame('easy');
      Test.startTest();
      ArcadeFourInARowEngine.fixedRandom = 0.99;
      ArcadeFourInARow.Response response = play(4, 1);
      Test.stopTest();

      Assert.areEqual('🔴', response.columns[3].cells[5].disc);
      Assert.areEqual(2, response.moveNumber);
      Assert.isTrue(response.message.contains('The CPU dropped in column'));
      Integer discs = 0;
      for (ArcadeFourInARow.BoardColumn column : response.columns) {
        for (ArcadeFourInARow.BoardCell cell : column.cells) {
          discs += cell.disc == '⚪' ? 0 : 1;
        }
      }
      Assert.areEqual(2, discs);
      Arcade_Match__c match = [
        SELECT Human_Moves__c, Status__c
        FROM Arcade_Match__c
        WITH USER_MODE
      ];
      Assert.areEqual(1, match.Human_Moves__c);
      Assert.areEqual('In Progress', match.Status__c);
      Assert.areEqual(0, [SELECT COUNT() FROM Arcade_Score__c]);
    }
  }

  @IsTest
  static void aRepeatedMoveNumberChangesNothing() {
    System.runAs(ada()) {
      seedMatch(
        ArcadeFourInARowEngine.serialize(ArcadeFourInARowEngine.emptyBoard()),
        3
      );
      Test.startTest();
      ArcadeFourInARow.Response response = play(4, 3);
      Test.stopTest();

      Assert.isTrue(response.message.contains('earlier board'));
      Assert.areEqual(4, response.moveNumber);
      Assert.areEqual('⚪', response.columns[3].cells[5].disc);
    }
  }

  @IsTest
  static void aFullOrUnknownColumnIsRefused() {
    System.runAs(ada()) {
      seedMatch(boardOf(new Map<Integer, Integer>{ 3 => 1 }), 1);
      Test.startTest();
      ArcadeFourInARow.Response full = play(4, 2);
      ArcadeFourInARow.Response unknown = play(9, null);
      Test.stopTest();

      Assert.isTrue(full.message.contains('Pick an open column'));
      Assert.isFalse(full.columns[3].isOpen);
      Assert.isTrue(unknown.message.contains('Pick an open column'));
      Assert.areEqual(2, unknown.moveNumber);
    }
  }

  @IsTest
  static void aWinIsRecordedWithTheHubsPoints() {
    System.runAs(ada()) {
      // Three discs on the bottom row, CPU above: column 4 wins on move 4.
      seedMatch(
        boardOf(
          new Map<Integer, Integer>{
            35 => 1,
            36 => 1,
            37 => 1,
            28 => 2,
            29 => 2,
            30 => 2
          }
        ),
        3
      );
      Test.startTest();
      ArcadeFourInARow.Response response = play(4, 4);
      Test.stopTest();

      Assert.isTrue(response.isFinished);
      Assert.isFalse(response.isPlaying);
      Assert.areEqual('You won', response.status);
      // (1000 + (21 - 4) * 50) * 2 on normal
      Assert.areEqual(3700, response.score);
      Assert.isFalse(response.columns[6].isOpen);
      Arcade_Score__c score = [
        SELECT Score__c, Level__c, Source__c, Game__r.Game_Key__c, CreatedById
        FROM Arcade_Score__c
      ];
      Assert.areEqual(3700, score.Score__c);
      Assert.areEqual(2, score.Level__c);
      Assert.areEqual('Headless', score.Source__c);
      Assert.areEqual('four-in-a-row', score.Game__r.Game_Key__c);
      Assert.areEqual(UserInfo.getUserId(), score.CreatedById);
      Assert.areEqual(
        'Won',
        [SELECT Status__c FROM Arcade_Match__c WITH USER_MODE].Status__c
      );
    }
  }

  @IsTest
  static void aLossIsRecordedWithZeroPoints() {
    System.runAs(ada()) {
      // The CPU has three on the bottom row and the block is impossible.
      seedMatch(
        boardOf(
          new Map<Integer, Integer>{
            35 => 2,
            36 => 2,
            37 => 2,
            28 => 1,
            29 => 1
          }
        ),
        2
      );
      Test.startTest();
      ArcadeFourInARowEngine.fixedRandom = 0.99;
      ArcadeFourInARow.Response response = play(7, 3);
      Test.stopTest();

      Assert.areEqual('CPU won', response.status);
      Assert.areEqual(0, response.score);
      Assert.isTrue(response.isFinished);
      Assert.areEqual(1, [SELECT COUNT() FROM Arcade_Score__c]);
    }
  }

  @IsTest
  static void aNewGameAbandonsTheOpenOneWithoutAScore() {
    System.runAs(ada()) {
      seedMatch(boardOf(new Map<Integer, Integer>{ 38 => 1 }), 1);
      Test.startTest();
      ArcadeFourInARow.Response response = newGame('EASY ');
      Test.stopTest();

      Assert.areEqual('easy', response.difficulty);
      Assert.areEqual(1, response.moveNumber);
      Assert.areEqual(
        1,
        [SELECT COUNT() FROM Arcade_Match__c WHERE Status__c = 'Abandoned']
      );
      Assert.areEqual(0, [SELECT COUNT() FROM Arcade_Score__c]);
    }
  }

  @IsTest
  static void aMoveWithoutAGameAsksForANewOne() {
    System.runAs(ada()) {
      Test.startTest();
      ArcadeFourInARow.Response response = play(3, 1);
      Test.stopTest();

      Assert.isFalse(response.hasBoard);
      Assert.isTrue(response.message.contains('no game in progress'));
      Assert.areEqual(0, [SELECT COUNT() FROM Arcade_Match__c]);
    }
  }

  @IsTest
  static void aPlayerOnlyMovesInTheirOwnGame() {
    Test.startTest();
    seedMatch(boardOf(new Map<Integer, Integer>{ 38 => 1 }), 1);
    System.runAs(ada()) {
      ArcadeFourInARow.Response response = play(4, 2);
      Assert.isFalse(response.hasBoard);
    }
    Test.stopTest();
  }

  @IsTest
  static void theWrapperReturnsTheWholeBoardAsOneOutput() {
    System.runAs(ada()) {
      Test.startTest();
      ArcadeFourInARowAgent.Result result = sendToAgent('Let\'s play!');
      Test.stopTest();
      Assert.areEqual(7, result.board.columns.size());
    }
  }

  private static ArcadeFourInARowAgent.Result sendToAgent(String message) {
    ArcadeFourInARowAgent.Request request = new ArcadeFourInARowAgent.Request();
    request.message = message;
    return ArcadeFourInARowAgent.play(
      new List<ArcadeFourInARowAgent.Request>{ request }
    )[0];
  }

  @IsTest
  static void theAgentReadsTheMoveFromTheButtonsSentence() {
    System.runAs(ada()) {
      newGame('easy');
      ArcadeFourInARowEngine.fixedRandom = 0.99;
      Test.startTest();
      ArcadeFourInARowAgent.Result played = sendToAgent(
        'Four in a Row: drop my disc in column 4 (move 1).'
      );
      ArcadeFourInARowAgent.Result replayed = sendToAgent(
        'Four in a Row: drop my disc in column 2 (move 1).'
      );
      Test.stopTest();

      Assert.areEqual('🔴', played.board.columns[3].cells[5].disc);
      Assert.areEqual(2, played.board.moveNumber);
      Assert.isTrue(replayed.board.message.contains('earlier board'));
    }
  }

  @IsTest
  static void theAgentUnderstandsShortMovesAndNewGames() {
    System.runAs(ada()) {
      ArcadeFourInARowEngine.fixedRandom = 0.99;
      Test.startTest();
      ArcadeFourInARowAgent.Result started = sendToAgent(
        'Start a new game on easy, please'
      );
      ArcadeFourInARowAgent.Result digit = sendToAgent(' 4 ');
      ArcadeFourInARowAgent.Result german = sendToAgent('Spalte 2 bitte');
      ArcadeFourInARowAgent.Result noMove = sendToAgent('Where was I?');
      Test.stopTest();

      Assert.areEqual('easy', started.board.difficulty);
      Assert.areEqual(1, started.board.moveNumber);
      Assert.areEqual(2, digit.board.moveNumber);
      Assert.areEqual(3, german.board.moveNumber);
      Assert.areEqual(3, noMove.board.moveNumber);
      Assert.areEqual('Your move: pick a column.', noMove.board.message);
    }
  }

  @IsTest
  static void thePanelGetsAPathBecauseItRedactsOrgUrls() {
    System.runAs(ada()) {
      ArcadePlayGame.Request request = new ArcadePlayGame.Request();
      request.game = 'snake';
      Test.startTest();
      ArcadePlayGame.Response response = ArcadePlayGameAgent.playGame(
          new List<ArcadePlayGame.Request>{ request }
        )[0]
        .game;
      Test.stopTest();
      Assert.areEqual(
        '/lightning/app/c__arcadeFloor/n/Arcade_Snake',
        response.playUrl
      );
    }
  }

  @IsTest
  static void theCpuTakesAWinAndBlocksOne() {
    ArcadeFourInARowEngine.fixedRandom = 0.99;
    List<Integer> win = ArcadeFourInARowEngine.parse(
      boardOf(new Map<Integer, Integer>{ 35 => 2, 36 => 2, 37 => 2, 28 => 1 })
    );
    List<Integer> block = ArcadeFourInARowEngine.parse(
      boardOf(new Map<Integer, Integer>{ 35 => 1, 36 => 1, 37 => 1, 28 => 2 })
    );
    Assert.areEqual(3, ArcadeFourInARowEngine.cpuMove(win, 'normal'));
    Assert.areEqual(3, ArcadeFourInARowEngine.cpuMove(block, 'normal'));
  }

  @IsTest
  static void aSearchFromTheOpeningFitsTheCpuLimit() {
    ArcadeFourInARowEngine.fixedRandom = 0.99;
    Test.startTest();
    Integer col = ArcadeFourInARowEngine.cpuMove(
      ArcadeFourInARowEngine.emptyBoard(),
      'normal'
    );
    Assert.areEqual(3, col);
    Assert.isTrue(Limits.getCpuTime() < 5000, 'CPU ' + Limits.getCpuTime());
    Test.stopTest();
  }

  @IsTest
  static void scoresMatchTheHub() {
    Assert.areEqual(1600, ArcadeFourInARowEngine.scoreFor(1, 9, 'easy'));
    Assert.areEqual(2000, ArcadeFourInARowEngine.scoreFor(1, 25, 'normal'));
    Assert.areEqual(250, ArcadeFourInARowEngine.scoreFor(0, 21, 'easy'));
    Assert.areEqual(500, ArcadeFourInARowEngine.scoreFor(0, 21, 'normal'));
    Assert.areEqual(0, ArcadeFourInARowEngine.scoreFor(2, 12, 'normal'));
  }

  @IsTest
  static void theLastDiscOnAFullBoardIsADraw() {
    // Pairs of rows in alternating colours leave no line of four.
    List<Integer> board = new List<Integer>();
    for (Integer row = 0; row < 6; row++) {
      for (Integer col = 0; col < 7; col++) {
        board.add(Math.mod(col + row / 2, 2) == 0 ? 1 : 2);
      }
    }
    Assert.areEqual(0, ArcadeFourInARowEngine.winner(board));
    board[0] = 0;
    System.runAs(ada()) {
      seedMatch(ArcadeFourInARowEngine.serialize(board), 20);
      Test.startTest();
      ArcadeFourInARow.Response response = play(1, 21);
      Test.stopTest();

      Assert.areEqual('Draw', response.status);
      Assert.areEqual(500, response.score);
      Assert.isTrue(response.isFinished);
    }
  }

  @IsTest
  static void playGameOpensSnakeOnItsLightningPage() {
    System.runAs(ada()) {
      ArcadePlayGame.Request request = new ArcadePlayGame.Request();
      request.game = 'SNAKE';
      Test.startTest();
      ArcadePlayGame.Response response = ArcadePlayGame.playGame(
        new List<ArcadePlayGame.Request>{ request }
      )[0];
      Test.stopTest();

      Assert.isTrue(response.hasGame);
      Assert.isFalse(response.playableInChat);
      Assert.isFalse(response.hasChampion);
      Assert.isTrue(
        response.playUrl.endsWith(
          '/lightning/app/c__arcadeFloor/n/Arcade_Snake'
        ),
        response.playUrl
      );
    }
  }

  @IsTest
  static void playGameOffersFourInARowInTheChatAndShowsStandings() {
    Arcade_Game__c game = [
      SELECT Id
      FROM Arcade_Game__c
      WHERE Game_Key__c = 'four-in-a-row'
    ];
    insert new Arcade_Score__c(Game__c = game.Id, Score__c = 900);
    System.runAs(ada()) {
      insert new Arcade_Score__c(Game__c = game.Id, Score__c = 400);
      ArcadePlayGame.Request request = new ArcadePlayGame.Request();
      request.game = 'four in a row';
      Test.startTest();
      ArcadePlayGame.Response response = ArcadePlayGameAgent.playGame(
          new List<ArcadePlayGame.Request>{ request }
        )[0]
        .game;
      Test.stopTest();

      Assert.isTrue(response.playableInChat);
      Assert.areEqual(400, response.bestScore);
      Assert.areEqual(900, response.championScore);
      Assert.areEqual(
        'https://arcade.example.com/app/c__polyglotArcade/play/four-in-a-row',
        response.playUrl
      );
    }
  }

  @IsTest
  static void playGameListsTheGamesWhenItDoesNotKnowTheName() {
    System.runAs(ada()) {
      ArcadePlayGame.Request request = new ArcadePlayGame.Request();
      request.game = 'Pong';
      Test.startTest();
      ArcadePlayGame.Response unknown = ArcadePlayGame.playGame(
        new List<ArcadePlayGame.Request>{ request }
      )[0];
      ArcadePlayGame.Response empty = ArcadePlayGame.playGame(
        new List<ArcadePlayGame.Request>{ new ArcadePlayGame.Request() }
      )[0];
      Test.stopTest();

      Assert.isFalse(unknown.hasGame);
      Assert.isTrue(unknown.message.contains('Pong'));
      Assert.areEqual(2, unknown.options.size());
      Assert.isNull(empty.message);
      Assert.areEqual(
        'I want to play Snake in the Polyglot Arcade.',
        empty.options[1].prompt
      );
    }
  }
}
