#!/usr/bin/env node
/**
 * Stores where each UI bundle game lives on its record, so every surface can
 * launch, embed or return to it:
 *
 *   React games    App_Url__c = Pixel Cabinet URL, Embed_Path__c = /embed
 *                  (the hub launches the cabinet, the Arcade Game Host LWC
 *                  embeds it)
 *   Angular games  App_Url__c = Polyglot Arcade hub URL
 *                  (the Arcade Game Host LWC links back to the hub lobby)
 *
 * Internal UI bundle URLs are org-specific; the platform exposes them as the
 * StartUrl of the app's AppMenuItem.
 *
 * Usage: node scripts/connect.mjs [--target-org <alias>]
 */
import { execFileSync } from "node:child_process";

const BUNDLES = [
  {
    app: "pixelCabinet",
    label: "Pixel Cabinet",
    framework: "React",
    embedPath: "/embed"
  },
  {
    app: "polyglotArcade",
    label: "Polyglot Arcade",
    framework: "Angular",
    embedPath: null
  }
];

const args = process.argv.slice(2);
const orgIndex = args.findIndex((a) => a === "--target-org" || a === "-o");
const orgArgs = orgIndex >= 0 ? ["--target-org", args[orgIndex + 1]] : [];

function sf(argv) {
  const out = execFileSync("sf", [...argv, ...orgArgs, "--json"], {
    encoding: "utf8"
  });
  return JSON.parse(out).result;
}

const menuItems = sf([
  "data",
  "query",
  "--query",
  `SELECT Name, StartUrl FROM AppMenuItem WHERE Name IN (${BUNDLES.map((b) => `'${b.app}'`).join(", ")})`
]).records;

for (const bundle of BUNDLES) {
  const startUrl = menuItems.find((item) => item.Name === bundle.app)?.StartUrl;
  if (!startUrl) {
    console.error(
      `${bundle.label} app not found. Deploy the project first (npm run setup).`
    );
    process.exit(1);
  }
  console.log(`${bundle.label} URL: ${startUrl}`);

  const games = sf([
    "data",
    "query",
    "--query",
    `SELECT Id, Name FROM Arcade_Game__c WHERE Framework__c = '${bundle.framework}'`
  ]).records;
  const values = bundle.embedPath
    ? `App_Url__c='${startUrl}' Embed_Path__c='${bundle.embedPath}'`
    : `App_Url__c='${startUrl}'`;
  for (const game of games) {
    sf([
      "data",
      "update",
      "record",
      "--sobject",
      "Arcade_Game__c",
      "--record-id",
      game.Id,
      "--values",
      values
    ]);
    console.log(
      `  ${game.Name}: App URL${bundle.embedPath ? " and embed path" : ""} set`
    );
  }
}
