import { createElement } from "lwc";
import ArcadeGameHost, { buildEmbedSrc } from "c/arcadeGameHost";
import { graphql } from "lightning/graphql";
import { createRecord } from "lightning/uiRecordApi";
import { publish } from "lightning/messageService";

const CABINET_URL =
  "https://org--c.scratch.my.salesforce.app/app/c__pixelCabinet";
const SNAKE_URL = "https://lwc-oss-snake-game.vercel.app";
const HUB_URL =
  "https://org--c.scratch.my.salesforce.app/app/c__polyglotArcade";
const ACCOUNT_ID = "001000000000001AAA";

const BLOCK_DROP = {
  Id: "a00000000000001AAA",
  name: "Block Drop",
  appUrl: CABINET_URL,
  embedPath: "/embed",
  hostSavesScore: false
};
const SNAKE = {
  Id: "a00000000000005AAA",
  name: "Snake",
  appUrl: SNAKE_URL,
  embedPath: null,
  hostSavesScore: true
};

function gameResponse(game, hubUrl = null) {
  const edges = game
    ? [
        {
          node: {
            Id: game.Id,
            Name: { value: game.name },
            App_Url__c: { value: game.appUrl },
            Embed_Path__c: { value: game.embedPath },
            Host_Saves_Score__c: { value: game.hostSavesScore }
          }
        }
      ]
    : [];
  const hub = {
    edges: hubUrl ? [{ node: { App_Url__c: { value: hubUrl } } }] : []
  };
  return { uiapi: { query: { Arcade_Game__c: { edges }, hub } } };
}

function mount(props = {}) {
  const element = createElement("c-arcade-game-host", {
    is: ArcadeGameHost
  });
  Object.assign(element, props);
  document.body.appendChild(element);
  return element;
}

// The gameover handler awaits createRecord before it toasts and publishes.
async function flushPromises() {
  for (let i = 0; i < 5; i++) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

const embedding = (element) =>
  element.shadowRoot.querySelector("lightning-ui-embedding");
const cardTitle = (element) =>
  element.shadowRoot.querySelector("lightning-card").title;

async function mountWithGame(game, props = {}, hubUrl = null) {
  const element = mount(props);
  graphql.emit(gameResponse(game, hubUrl));
  await flushPromises();
  const toastHandler = jest.fn();
  element.addEventListener("lightning__showtoast", toastHandler);
  return { element, toastHandler };
}

async function endRound(element, detail) {
  embedding(element).dispatchEvent(new CustomEvent("gameover", { detail }));
  await flushPromises();
}

describe("c-arcade-game-host", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  describe("buildEmbedSrc", () => {
    it("appends the embed path", () => {
      expect(buildEmbedSrc(CABINET_URL, "/embed")).toBe(`${CABINET_URL}/embed`);
    });

    it("embeds the App URL as is without an embed path", () => {
      expect(buildEmbedSrc(SNAKE_URL, null)).toBe(`${SNAKE_URL}/`);
      expect(buildEmbedSrc(`${SNAKE_URL}/#top`, "")).toBe(`${SNAKE_URL}/`);
    });

    it("handles slashes, query strings and hashes", () => {
      expect(
        buildEmbedSrc("https://x.salesforce.app/app/c__a/?mode=1#top", "embed/")
      ).toBe("https://x.salesforce.app/app/c__a/embed?mode=1");
    });

    it("rejects empty and invalid URLs", () => {
      expect(buildEmbedSrc(undefined, "/embed")).toBeNull();
      expect(buildEmbedSrc("not a url", "/embed")).toBeNull();
    });
  });

  describe("embedding", () => {
    it("shows neither frame nor setup while the game record loads", async () => {
      const element = mount();
      await flushPromises();
      expect(embedding(element)).toBeNull();
      expect(element.shadowRoot.querySelector(".setup")).toBeNull();
    });

    it("embeds a cabinet game with its embed path and the host props", async () => {
      const { element } = await mountWithGame(BLOCK_DROP, {
        game: "block-drop",
        recordId: ACCOUNT_ID,
        objectApiName: "Account"
      });

      expect(graphql.getLastConfig().variables).toEqual({
        gameKey: "block-drop"
      });
      const frame = embedding(element);
      expect(frame.src).toBe(`${CABINET_URL}/embed`);
      expect(frame.props).toEqual({
        game: "block-drop",
        recordId: ACCOUNT_ID,
        objectApiName: "Account"
      });
      expect(cardTitle(element)).toBe("Block Drop");
    });

    it("embeds an external game at its App URL", async () => {
      const { element } = await mountWithGame(SNAKE, { game: "snake" });
      expect(embedding(element).src).toBe(`${SNAKE_URL}/`);
      expect(cardTitle(element)).toBe("Snake");
    });

    it("prefers the App URL property but keeps the record's embed path", async () => {
      const { element } = await mountWithGame(BLOCK_DROP, {
        appUrl: "http://localhost:5173",
        cardTitle: "Play break"
      });
      expect(embedding(element).src).toBe("http://localhost:5173/embed");
      expect(cardTitle(element)).toBe("Play break");
    });

    it("looks up the cabinet via a cabinet game when showing the lobby", async () => {
      const { element } = await mountWithGame(BLOCK_DROP, { game: "lobby" });
      expect(graphql.getLastConfig().variables).toEqual({
        gameKey: "block-drop"
      });
      expect(embedding(element).props.game).toBe("lobby");
      expect(cardTitle(element)).toBe("Pixel Cabinet");
    });

    it("shows setup instructions while the game has no App URL", async () => {
      const { element } = await mountWithGame({ ...BLOCK_DROP, appUrl: null });
      expect(embedding(element)).toBeNull();
      expect(element.shadowRoot.querySelector(".setup").textContent).toContain(
        "npm run connect"
      );
    });

    it("explains a missing game record", async () => {
      const { element } = await mountWithGame(null, { game: "snake" });
      expect(element.shadowRoot.querySelector(".setup").textContent).toContain(
        'key "snake"'
      );
    });

    it("shows a lookup error", async () => {
      const element = mount({ appUrl: CABINET_URL });
      graphql.emitErrors([{ message: "No access" }]);
      await flushPromises();
      expect(
        element.shadowRoot.querySelector('[role="alert"]').textContent
      ).toContain("No access");
      expect(embedding(element)).toBeNull();
    });

    it("shows embedding errors reported by the frame", async () => {
      const { element } = await mountWithGame(SNAKE, { game: "snake" });
      embedding(element).dispatchEvent(
        new CustomEvent("sf-embedding.component.error", {
          detail: { code: "HEARTBEAT_TIMEOUT", message: "No answer" }
        })
      );
      await flushPromises();
      expect(
        element.shadowRoot.querySelector('[role="alert"]').textContent
      ).toBe("HEARTBEAT_TIMEOUT: No answer");
    });
  });

  describe("way back to the hub", () => {
    const hubLink = (element) =>
      element.shadowRoot.querySelector('a[slot="actions"]');

    it("links to the hub lobby once npm run connect stored its URL", async () => {
      const { element } = await mountWithGame(
        SNAKE,
        { game: "snake" },
        HUB_URL
      );
      const link = hubLink(element);
      expect(link.textContent).toBe("← Polyglot Arcade");
      expect(link.href).toBe(HUB_URL);
    });

    it("shows no link while the hub URL is unknown", async () => {
      const { element } = await mountWithGame(SNAKE, { game: "snake" });
      expect(hubLink(element)).toBeNull();
    });
  });

  describe("rounds saved by the guest", () => {
    it("toasts and publishes a saved round", async () => {
      const { element, toastHandler } = await mountWithGame(BLOCK_DROP);

      await endRound(element, {
        gameKey: "block-drop",
        gameName: "Block Drop",
        score: 1200,
        saved: true
      });

      expect(createRecord).not.toHaveBeenCalled();
      expect(toastHandler).toHaveBeenCalledTimes(1);
      expect(toastHandler.mock.calls[0][0].detail.variant).toBe("success");
      expect(publish).toHaveBeenCalledWith(undefined, expect.anything(), {
        gameKey: "block-drop",
        score: 1200
      });
    });

    it("warns without publishing when the round could not be saved", async () => {
      const { element, toastHandler } = await mountWithGame(BLOCK_DROP);

      await endRound(element, {
        gameKey: "block-drop",
        gameName: "Block Drop",
        score: 50,
        saved: false
      });

      expect(toastHandler.mock.calls[0][0].detail.variant).toBe("warning");
      expect(publish).not.toHaveBeenCalled();
    });
  });

  describe("rounds saved by the host", () => {
    const snakeRound = {
      gameKey: "snake",
      gameName: "Snake",
      score: 12,
      level: 3,
      durationSeconds: 41
    };

    it("creates the score record, toasts and publishes", async () => {
      const { element, toastHandler } = await mountWithGame(SNAKE, {
        game: "snake"
      });

      await endRound(element, snakeRound);

      expect(createRecord).toHaveBeenCalledWith({
        apiName: "Arcade_Score__c",
        fields: {
          Game__c: SNAKE.Id,
          Score__c: 12,
          Level__c: 3,
          Duration_Seconds__c: 41,
          Source__c: "Embedded"
        }
      });
      expect(toastHandler.mock.calls[0][0].detail).toMatchObject({
        title: "Snake over",
        variant: "success"
      });
      expect(publish).toHaveBeenCalledWith(undefined, expect.anything(), {
        gameKey: "snake",
        score: 12
      });
    });

    it("attributes the round to the Account of the record page", async () => {
      const { element } = await mountWithGame(SNAKE, {
        game: "snake",
        recordId: ACCOUNT_ID,
        objectApiName: "Account"
      });

      await endRound(element, snakeRound);

      expect(createRecord.mock.calls[0][0].fields.Account__c).toBe(ACCOUNT_ID);
    });

    it("does not attribute rounds to other record types", async () => {
      const { element } = await mountWithGame(SNAKE, {
        game: "snake",
        recordId: "003000000000001AAA",
        objectApiName: "Contact"
      });

      await endRound(element, snakeRound);

      expect(createRecord.mock.calls[0][0].fields).not.toHaveProperty(
        "Account__c"
      );
    });

    it("saves the round for its own game and ignores the guest's saved flag", async () => {
      const { element } = await mountWithGame(SNAKE, { game: "snake" });

      await endRound(element, {
        ...snakeRound,
        gameKey: "block-drop",
        level: -1,
        durationSeconds: "41",
        saved: false
      });

      expect(createRecord.mock.calls[0][0].fields).toMatchObject({
        Game__c: SNAKE.Id,
        Level__c: null,
        Duration_Seconds__c: null
      });
      expect(publish).toHaveBeenCalled();
    });

    it("warns when the score record cannot be created", async () => {
      createRecord.mockRejectedValueOnce(new Error("FIELD_INTEGRITY"));
      const { element, toastHandler } = await mountWithGame(SNAKE, {
        game: "snake"
      });

      await endRound(element, snakeRound);

      expect(toastHandler.mock.calls[0][0].detail.variant).toBe("warning");
      expect(publish).not.toHaveBeenCalled();
    });

    it("does not save a round without a valid score", async () => {
      const { element, toastHandler } = await mountWithGame(SNAKE, {
        game: "snake"
      });

      await endRound(element, { ...snakeRound, score: 2.5 });

      expect(createRecord).not.toHaveBeenCalled();
      expect(toastHandler.mock.calls[0][0].detail.variant).toBe("warning");
    });
  });

  it("is accessible", async () => {
    const { element } = await mountWithGame(SNAKE, { game: "snake" }, HUB_URL);
    await expect(element).toBeAccessible();
  });
});
