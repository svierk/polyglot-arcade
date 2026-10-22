import { createElement } from "lwc";
import ArcadeLeaderboard from "c/arcadeLeaderboard";
import { graphql } from "lightning/graphql";
import { subscribe, unsubscribe } from "lightning/messageService";

function score(
  id,
  value,
  player = "Ada",
  game = "Block Drop",
  source = "Embedded"
) {
  return {
    node: {
      Id: id,
      Score__c: { value, displayValue: String(value) },
      Source__c: { value: source },
      CreatedDate: { value: "2026-10-21T10:00:00.000Z" },
      CreatedBy: { Name: { value: player } },
      Game__r: { Name: { value: game } }
    }
  };
}

const response = (edges) => ({
  uiapi: { query: { Arcade_Score__c: { edges } } }
});

function mount(props = {}) {
  const element = createElement("c-arcade-leaderboard", {
    is: ArcadeLeaderboard
  });
  Object.assign(element, props);
  document.body.appendChild(element);
  return element;
}

describe("c-arcade-leaderboard", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("ranks scores with medals for the top three", async () => {
    const element = mount();
    graphql.emit(
      response([
        score("1", 900),
        score("2", 700, "Grace"),
        score("3", 500),
        score("4", 100)
      ])
    );
    await Promise.resolve();

    const ranks = [...element.shadowRoot.querySelectorAll(".rank")].map(
      (n) => n.textContent
    );
    expect(ranks).toEqual(["🥇", "🥈", "🥉", "4."]);
    expect(element.shadowRoot.querySelectorAll(".player")[1].textContent).toBe(
      "Grace"
    );
  });

  it("invites the first player when there are no scores", async () => {
    const element = mount();
    graphql.emit(response([]));
    await Promise.resolve();
    expect(element.shadowRoot.textContent).toContain("Be the first");
  });

  it("shows query errors", async () => {
    const element = mount();
    graphql.emitErrors([{ message: "Insufficient access" }]);
    await Promise.resolve();
    expect(
      element.shadowRoot.querySelector(".slds-text-color_error").textContent
    ).toBe("Insufficient access");
  });

  it("filters by game and by the Account of the record page", async () => {
    mount({
      gameKey: "block-drop",
      recordId: "001000000000001AAA",
      objectApiName: "Account",
      maxEntries: 5
    });
    await Promise.resolve();
    expect(graphql.getLastConfig().variables).toEqual({
      where: {
        Score__c: { gt: 0 },
        Game__r: { Game_Key__c: { eq: "block-drop" } },
        Account__c: { eq: "001000000000001AAA" }
      },
      first: 5
    });
  });

  it("does not filter by record on non-Account pages", async () => {
    mount({ recordId: "003000000000001AAA", objectApiName: "Contact" });
    await Promise.resolve();
    expect(graphql.getLastConfig().variables).toEqual({
      where: { Score__c: { gt: 0 } },
      first: 10
    });
  });

  it("refreshes when a round is published and unsubscribes on removal", async () => {
    const refresh = jest.fn();
    const element = mount();
    graphql.emit(response([score("1", 900)]), undefined, refresh);
    await Promise.resolve();

    const onMessage = subscribe.mock.calls[0][2];
    onMessage({ gameKey: "block-drop", score: 1000 });
    expect(refresh).toHaveBeenCalledTimes(1);

    document.body.removeChild(element);
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("is accessible", async () => {
    const element = mount();
    graphql.emit(response([score("1", 900)]));
    await Promise.resolve();
    await expect(element).toBeAccessible();
  });
});
