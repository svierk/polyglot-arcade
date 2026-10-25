/**
 * Checks how links in the Markdown copies of the docs are made absolute - see
 * scripts/docs/llms-links.mjs. Run with `npm run test:docs`.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  absolutizeFile,
  absolutizeLinks,
  resolveLink,
  sourcePathFor
} from "./llms-links.mjs";

const urls = {
  siteUrl: "https://svierk.github.io/polyglot-arcade/",
  repoBlob: "https://github.com/svierk/polyglot-arcade/blob/main/"
};
const site = (path) => `${urls.siteUrl}${path}`;
const repo = (path) => `${urls.repoBlob}${path}`;

describe("resolveLink", () => {
  const cases = [
    // [target, page it appears on, expected]
    ["patterns.md", "architecture/index.md", site("architecture/patterns.md")],
    ["index.md", "architecture/patterns.md", site("architecture.md")],
    ["architecture/index.md", "concepts.md", site("architecture.md")],
    [
      "communication.md#embedded-cabinet-round",
      "architecture/patterns.md",
      site("architecture/communication.md#embedded-cabinet-round")
    ],
    [
      "/deploy/troubleshooting",
      "architecture/patterns.md",
      site("deploy/troubleshooting.md")
    ],
    ["/games", "index.md", site("games.md")],
    ["../../README.md", "decisions/0001-surface-roles.md", repo("README.md")],
    ["../images/lobby.png", "games.md", repo("images/lobby.png")],
    [
      "../force-app/main/default/lwc/arcadeGameHost",
      "concepts.md",
      repo("force-app/main/default/lwc/arcadeGameHost")
    ],
    [
      "../architecture/patterns.md",
      "deploy/index.md",
      site("architecture/patterns.md")
    ],
    [
      "/images/polyglot-arcade-hero.svg",
      "index.md",
      site("images/polyglot-arcade-hero.svg")
    ],
    [
      "https://github.com/svierk/lwc-oss-snake-game",
      "games.md",
      "https://github.com/svierk/lwc-oss-snake-game"
    ],
    [
      "mailto:someone@example.com",
      "development.md",
      "mailto:someone@example.com"
    ],
    ["#prerequisites", "deploy/index.md", "#prerequisites"]
  ];
  for (const [target, page, expected] of cases) {
    test(`${target} on ${page}`, () =>
      assert.equal(resolveLink(target, page, urls), expected));
  }
});

test("absolutizeLinks leaves fenced code alone", () => {
  const markdown =
    "See [patterns](patterns.md).\n\n```md\n[x](y.md)\n```\n\nAnd [data](data-model.md).\n";
  assert.equal(
    absolutizeLinks(markdown, "architecture/index.md", urls),
    `See [patterns](${site("architecture/patterns.md")}).\n\n\`\`\`md\n[x](y.md)\n\`\`\`\n\nAnd [data](${site("architecture/data-model.md")}).\n`
  );
});

test("sourcePathFor finds index pages", () => {
  const isFile = (path) => path === "architecture/index.md";
  assert.equal(
    sourcePathFor(
      "/polyglot-arcade/architecture.md",
      "/polyglot-arcade/",
      isFile
    ),
    "architecture/index.md"
  );
  assert.equal(
    sourcePathFor(
      "/polyglot-arcade/architecture/patterns.md",
      "/polyglot-arcade/",
      isFile
    ),
    "architecture/patterns.md"
  );
});

test("absolutizeFile resolves each page of llms-full.txt against its own url", () => {
  const content = [
    "---\nurl: /polyglot-arcade/concepts.md\n---\n# Concepts\n\n[Architecture](architecture/index.md)\n\n",
    "---\nurl: /polyglot-arcade/architecture.md\ndescription: >-\n  Three surfaces,\n  one arcade.\n---\n# Architecture\n\n[Patterns](patterns.md)\n"
  ].join("");
  const result = absolutizeFile(content, {
    base: "/polyglot-arcade/",
    isFile: (path) => path === "architecture/index.md",
    ...urls
  });
  assert.match(
    result,
    /\[Architecture\]\(https:\/\/svierk\.github\.io\/polyglot-arcade\/architecture\.md\)/
  );
  assert.match(
    result,
    /\[Patterns\]\(https:\/\/svierk\.github\.io\/polyglot-arcade\/architecture\/patterns\.md\)/
  );
  assert.match(
    result,
    /^---\nurl: \/polyglot-arcade\/architecture\.md\ndescription: >-\n {2}Three surfaces,\n {2}one arcade\.\n---\n/m
  );
});
