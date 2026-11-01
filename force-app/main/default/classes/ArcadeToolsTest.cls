@IsTest
private class ArcadeToolsTest {
  @TestSetup
  static void setup() {
    User ada = newPlayer('Ada', 'Pixelquest');
    User grace = newPlayer('Grace', 'Bytebrook');
    System.runAs(new User(Id = UserInfo.getUserId())) {
      insert new List<User>{ ada, grace };
      // The arcade fields are only granted by the permission set, so every
      // player needs it - the running user too, as in a fresh org.
      Id access = [
        SELECT Id
        FROM PermissionSet
        WHERE Name = 'polyglotArcade_Access'
      ]
      .Id;
      List<PermissionSetAssignment> assignments = new List<PermissionSetAssignment>{
        new PermissionSetAssignment(
          AssigneeId = ada.Id,
          PermissionSetId = access
        ),
        new PermissionSetAssignment(
          AssigneeId = grace.Id,
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

    Arcade_Game__c brick = new Arcade_Game__c(
      Name = 'Brick Breaker',
      Game_Key__c = 'brick-breaker',
      Framework__c = 'Angular',
      App_Url__c = 'https://arcade.example.com/app/c__polyglotArcade',
      Is_Active__c = true,
      Sort_Order__c = 1
    );
    Arcade_Game__c snake = new Arcade_Game__c(
      Name = 'Snake',
      Game_Key__c = 'snake',
      Framework__c = 'LWC OSS',
      Is_Active__c = true,
      Sort_Order__c = 2
    );
    Arcade_Game__c blocks = new Arcade_Game__c(
      Name = 'Block Drop',
      Game_Key__c = 'block-drop',
      Framework__c = 'React',
      Is_Active__c = true,
      Sort_Order__c = 3
    );
    insert new List<Arcade_Game__c>{ brick, snake, blocks };

    // The running user: 100 and a lost round in Brick Breaker.
    insert new List<Arcade_Score__c>{ score(brick, 100), score(brick, 0) };
    // Ada: champion of Brick Breaker and Snake.
    System.runAs(ada) {
      insert new List<Arcade_Score__c>{ score(brick, 300), score(snake, 50) };
    }
  }

  @IsTest
  static void hallOfFameWithoutGameNamesTheChampionOfEveryGame() {
    ArcadeHallOfFame.Response response = hallOfFame(null, null);

    Assert.areEqual('Hall of Fame', response.title);
    Assert.areEqual('All time', response.periodLabel);
    Assert.isTrue(response.allGames);
    Assert.isTrue(response.hasEntries);
    Assert.areEqual(4, response.rounds);
    Assert.areEqual(2, response.players);
    Assert.areEqual(
      'https://arcade.example.com/app/c__polyglotArcade',
      response.arcadeUrl
    );
    // Block Drop has no rounds, so it has no champion.
    Assert.areEqual(2, response.entries.size());
    assertEntry(
      response.entries[0],
      1,
      '🥇',
      'Ada Pixelquest',
      'Brick Breaker',
      300,
      1
    );
    assertEntry(response.entries[1], 1, '🥇', 'Ada Pixelquest', 'Snake', 50, 1);
    Assert.areEqual('AP', response.entries[0].initials);
  }

  @IsTest
  static void hallOfFameWithGameRanksItsPlayersByBestRound() {
    ArcadeHallOfFame.Response response = hallOfFame(
      'brick breaker',
      'This week'
    );

    Assert.areEqual('Hall of Fame · Brick Breaker', response.title);
    Assert.areEqual('This week', response.periodLabel);
    Assert.isFalse(response.allGames);
    Assert.areEqual(3, response.rounds);
    Assert.areEqual(2, response.players);
    Assert.isNull(response.message);
    Assert.areEqual(2, response.entries.size());
    assertEntry(
      response.entries[0],
      1,
      '🥇',
      'Ada Pixelquest',
      'Brick Breaker',
      300,
      1
    );
    assertEntry(
      response.entries[1],
      2,
      '🥈',
      UserInfo.getName(),
      'Brick Breaker',
      100,
      2
    );
  }

  @IsTest
  static void hallOfFameExplainsAnEmptyRanking() {
    Assert.areEqual(
      'No one has scored yet. Be the first!',
      hallOfFame('block-drop', 'all').message
    );
    ArcadeHallOfFame.Response today = hallOfFame('Block Drop', 'today');
    Assert.isFalse(today.hasEntries);
    Assert.areEqual(
      'No one has scored today yet. Be the first!',
      today.message
    );
  }

  @IsTest
  static void hallOfFameNamesTheGamesForAnUnknownGame() {
    ArcadeHallOfFame.Response response = hallOfFame('Pong', null);

    Assert.isFalse(response.hasEntries);
    Assert.isTrue(response.entries.isEmpty());
    Assert.areEqual(
      'There is no game called "Pong". Try Brick Breaker, Snake, Block Drop.',
      response.message
    );
  }

  @IsTest
  static void playerCardDefaultsToThePersonWhoAsks() {
    ArcadePlayerCard.Response card = playerCard(null);

    Assert.areEqual(UserInfo.getName(), card.player);
    Assert.isTrue(card.hasRounds);
    Assert.isNull(card.message);
    Assert.areEqual(2, card.rounds);
    Assert.areEqual(1, card.gamesPlayed);
    Assert.areEqual(3, card.gamesTotal);
    Assert.areEqual(1, card.bests.size());
    ArcadePlayerCard.GameBest best = card.bests[0];
    Assert.areEqual('Brick Breaker', best.game);
    Assert.areEqual(100, best.best);
    Assert.areEqual(2, best.rank);
    Assert.areEqual(2, best.players);
    Assert.areEqual(2, best.rounds);
    Assert.isFalse(best.isChampion);
    Assert.areEqual(2, card.recent.size());
    Assert.areEqual('Brick Breaker', card.recent[0].game);
    Assert.areEqual('Polyglot Arcade', card.recent[0].source);
    Assert.isNotNull(card.recent[0].playedAt);
  }

  @IsTest
  static void playerCardFindsAPlayerByName() {
    ArcadePlayerCard.Response card = playerCard('ada pixel');

    Assert.areEqual('Ada Pixelquest', card.player);
    Assert.areEqual('AP', card.initials);
    Assert.areEqual(2, card.gamesPlayed);
    Assert.areEqual(2, card.bests.size());
    for (ArcadePlayerCard.GameBest best : card.bests) {
      Assert.areEqual(1, best.rank);
      Assert.isTrue(best.isChampion);
    }
  }

  @IsTest
  static void playerCardExplainsAMissingOrNewPlayer() {
    ArcadePlayerCard.Response unknown = playerCard('Nobody Here');
    Assert.isFalse(unknown.hasRounds);
    Assert.areEqual(
      'There is no player called "Nobody Here".',
      unknown.message
    );

    ArcadePlayerCard.Response newcomer = playerCard('Grace Bytebrook');
    Assert.areEqual('Grace Bytebrook', newcomer.player);
    Assert.isFalse(newcomer.hasRounds);
    Assert.areEqual(
      'Grace Bytebrook has not played yet. Insert coin!',
      newcomer.message
    );
    Assert.isTrue(newcomer.bests.isEmpty());
  }

  @IsTest
  static void statsHelpersNormalizeAndFormat() {
    Assert.areEqual('week', ArcadeScoreStats.normalizePeriod('This Week'));
    Assert.areEqual('all', ArcadeScoreStats.normalizePeriod('forever'));
    Assert.areEqual('all', ArcadeScoreStats.normalizePeriod(null));
    Assert.areEqual('Today', ArcadeScoreStats.periodLabel(' today '));
    Assert.areEqual('C', ArcadeScoreStats.initials('Cher'));
    Assert.areEqual(
      'GH',
      ArcadeScoreStats.initials(' grace  brewster hopper ')
    );
    Assert.areEqual('?', ArcadeScoreStats.initials(''));
    Assert.areEqual('4.', ArcadeScoreStats.place(4));
    Assert.areEqual('', ArcadeScoreStats.place(null));
    Assert.isNull(
      ArcadeScoreStats.rankOf(0, new List<ArcadeScoreStats.PlayerBest>())
    );
  }

  @IsTest
  static void playersWithTheSameBestShareTheirRank() {
    ArcadeScoreStats.PlayerBest first = best(500);
    ArcadeScoreStats.PlayerBest tied = best(500);
    ArcadeScoreStats.PlayerBest third = best(200);
    List<ArcadeScoreStats.PlayerBest> all = new List<ArcadeScoreStats.PlayerBest>{
      first,
      tied,
      third
    };

    Assert.areEqual(1, ArcadeScoreStats.rankOf(first.best, all));
    Assert.areEqual(1, ArcadeScoreStats.rankOf(tied.best, all));
    Assert.areEqual(3, ArcadeScoreStats.rankOf(third.best, all));
  }

  private static ArcadeHallOfFame.Response hallOfFame(
    String game,
    String period
  ) {
    ArcadeHallOfFame.Request request = new ArcadeHallOfFame.Request();
    request.game = game;
    request.period = period;
    return ArcadeHallOfFame.getHallOfFame(
      new List<ArcadeHallOfFame.Request>{ request }
    )[0];
  }

  private static ArcadePlayerCard.Response playerCard(String player) {
    ArcadePlayerCard.Request request = new ArcadePlayerCard.Request();
    request.player = player;
    return ArcadePlayerCard.getPlayerCard(
      new List<ArcadePlayerCard.Request>{ request }
    )[0];
  }

  private static void assertEntry(
    ArcadeHallOfFame.Entry entry,
    Integer rank,
    String place,
    String player,
    String game,
    Integer score,
    Integer rounds
  ) {
    Assert.areEqual(rank, entry.rank);
    Assert.areEqual(place, entry.place);
    Assert.areEqual(player, entry.player);
    Assert.areEqual(game, entry.game);
    Assert.areEqual(score, entry.score);
    Assert.areEqual(rounds, entry.rounds);
  }

  private static ArcadeScoreStats.PlayerBest best(Integer score) {
    ArcadeScoreStats.PlayerBest best = new ArcadeScoreStats.PlayerBest();
    best.best = score;
    return best;
  }

  private static Arcade_Score__c score(Arcade_Game__c game, Integer points) {
    return new Arcade_Score__c(
      Game__c = game.Id,
      Score__c = points,
      Source__c = 'Polyglot Arcade'
    );
  }

  private static User newPlayer(String firstName, String lastName) {
    Profile admin = [
      SELECT Id
      FROM Profile
      WHERE PermissionsModifyAllData = TRUE AND UserType = 'Standard'
      LIMIT 1
    ];
    String username =
      firstName.toLowerCase() +
      '.' +
      UserInfo.getOrganizationId() +
      '@example.com';
    return new User(
      FirstName = firstName,
      LastName = lastName,
      Alias = firstName.left(8).toLowerCase(),
      Email = username,
      Username = username,
      ProfileId = admin.Id,
      TimeZoneSidKey = 'Europe/Berlin',
      LocaleSidKey = 'en_US',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'en_US'
    );
  }
}
