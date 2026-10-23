#!/usr/bin/env node
/**
 * Stores the Pixel Cabinet URL and its embed route on every React game record
 * (Arcade_Game__c.App_Url__c, Embed_Path__c), so the hub can launch the cabinet
 * and the Arcade Game Host LWC can embed it.
 *
 * Internal UI bundle URLs are org-specific; the platform exposes them as the
 * StartUrl of the app's AppMenuItem.
 *
 * Usage: node scripts/connect-cabinet.mjs [--target-org <alias>]
 */
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const orgIndex = args.findIndex((a) => a === "--target-org" || a === "-o");
const orgArgs = orgIndex >= 0 ? ["--target-org", args[orgIndex + 1]] : [];

function sf(argv) {
  const out = execFileSync("sf", [...argv, ...orgArgs, "--json"], {
    encoding: "utf8"
  });
  return JSON.parse(out).result;
}

const [menuItem] = sf([
  "data",
  "query",
  "--query",
  "SELECT StartUrl FROM AppMenuItem WHERE Name = 'pixelCabinet' LIMIT 1"
]).records;
if (!menuItem?.StartUrl) {
  console.error(
    "Pixel Cabinet app not found. Deploy the project first (npm run setup)."
  );
  process.exit(1);
}
console.log(`Pixel Cabinet URL: ${menuItem.StartUrl}`);

const games = sf([
  "data",
  "query",
  "--query",
  "SELECT Id, Name FROM Arcade_Game__c WHERE Framework__c = 'React'"
]).records;
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
    `App_Url__c='${menuItem.StartUrl}' Embed_Path__c='/embed'`
  ]);
  console.log(`  ${game.Name}: App URL and embed path set`);
}
