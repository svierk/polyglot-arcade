import { createElement } from "lwc";
import PixelCabinetHost, { buildEmbedSrc } from "c/pixelCabinetHost";
import { graphql } from "lightning/graphql";
import { publish } from "lightning/messageService";

const CABINET_URL =
  "https://org--c.scratch.my.salesforce.app/app/c__pixelCabinet";

function appUrlResponse(value) {
  return {
    uiapi: {
      query: {
        Arcade_Game__c: { edges: [{ node: { App_Url__c: { value } } }] }
      }
    }
  };
}

function mount(props = {}) {
  const element = createElement("c-pixel-cabinet-host", {
    is: PixelCabinetHost
  });
  Object.assign(element, props);
  document.body.appendChild(element);
  return element;
}

const embedding = (element) =>
  element.shadowRoot.querySelector("lightning-ui-embedding");

describe("c-pixel-cabinet-host", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  describe("buildEmbedSrc", () => {
    it("appends the embed route", () => {
      expect(buildEmbedSrc(CABINET_URL)).toBe(`${CABINET_URL}/embed`);
    });

    it("handles trailing slashes, query strings and hashes", () => {
      expect(
        buildEmbedSrc("https://x.salesforce.app/app/c__a/?mode=1#top")
      ).toBe("https://x.salesforce.app/app/c__a/embed?mode=1");
    });

    it("rejects empty and invalid URLs", () => {
      expect(buildEmbedSrc(undefined)).toBeNull();
      expect(buildEmbedSrc("not a url")).toBeNull();
    });
  });

  it("shows setup instructions while no cabinet URL is known", async () => {
    const element = mount();
    await Promise.resolve();
    expect(embedding(element)).toBeNull();
    expect(element.shadowRoot.querySelector(".setup")).not.toBeNull();
  });

  it("embeds the cabinet from the App URL on the game record", async () => {
    const element = mount({ game: "block-drop" });
    graphql.emit(appUrlResponse(CABINET_URL));
    await Promise.resolve();

    expect(graphql.getLastConfig().variables).toEqual({
      gameKey: "block-drop"
    });
    expect(embedding(element).src).toBe(`${CABINET_URL}/embed`);
  });

  it("prefers the Cabinet URL property and passes host props", async () => {
    const element = mount({
      cabinetUrl: "https://override.salesforce.app/app/c__pixelCabinet",
      game: "pellet-chase",
      recordId: "001000000000001AAA",
      objectApiName: "Account"
    });
    graphql.emit(appUrlResponse(CABINET_URL));
    await Promise.resolve();

    const frame = embedding(element);
    expect(frame.src).toBe(
      "https://override.salesforce.app/app/c__pixelCabinet/embed"
    );
    expect(frame.props).toEqual({
      game: "pellet-chase",
      recordId: "001000000000001AAA",
      objectApiName: "Account"
    });
  });

  it("looks up the URL via a cabinet game when showing the lobby", async () => {
    mount({ game: "lobby" });
    await Promise.resolve();
    expect(graphql.getLastConfig().variables).toEqual({
      gameKey: "block-drop"
    });
  });

  it("shows a lookup error only when no explicit URL is configured", async () => {
    const element = mount();
    graphql.emitErrors([{ message: "No access" }]);
    await Promise.resolve();
    expect(
      element.shadowRoot.querySelector('[role="alert"]').textContent
    ).toContain("No access");

    element.cabinetUrl = CABINET_URL;
    await Promise.resolve();
    expect(element.shadowRoot.querySelector('[role="alert"]')).toBeNull();
    expect(embedding(element)).not.toBeNull();
  });

  it("toasts and publishes a saved round", async () => {
    const element = mount({ cabinetUrl: CABINET_URL });
    const toastHandler = jest.fn();
    element.addEventListener("lightning__showtoast", toastHandler);
    await Promise.resolve();

    embedding(element).dispatchEvent(
      new CustomEvent("gameover", {
        detail: {
          gameKey: "block-drop",
          gameName: "Block Drop",
          score: 1200,
          saved: true
        }
      })
    );

    expect(toastHandler).toHaveBeenCalledTimes(1);
    expect(toastHandler.mock.calls[0][0].detail.variant).toBe("success");
    expect(publish).toHaveBeenCalledWith(undefined, expect.anything(), {
      gameKey: "block-drop",
      score: 1200
    });
  });

  it("warns without publishing when the round could not be saved", async () => {
    const element = mount({ cabinetUrl: CABINET_URL });
    const toastHandler = jest.fn();
    element.addEventListener("lightning__showtoast", toastHandler);
    await Promise.resolve();

    embedding(element).dispatchEvent(
      new CustomEvent("gameover", {
        detail: {
          gameKey: "block-drop",
          gameName: "Block Drop",
          score: 50,
          saved: false
        }
      })
    );

    expect(toastHandler.mock.calls[0][0].detail.variant).toBe("warning");
    expect(publish).not.toHaveBeenCalled();
  });

  it("is accessible", async () => {
    const element = mount({ cabinetUrl: CABINET_URL });
    await Promise.resolve();
    await expect(element).toBeAccessible();
  });
});
