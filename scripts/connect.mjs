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
 * Then it connects the headless surface: it activates the Polyglot Arcade MCP
 * server and prints the server URL and OAuth client ID an MCP client such as
 * Claude needs to render the HXL widgets.
 *
 * Usage: node scripts/connect.mjs [--target-org <alias>]
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MCP_SERVER = "polyglotArcade";
const MCP_OAUTH_SETTINGS = "polyglotArcadeMcp_glbloauth";

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

function sf(argv, options = {}) {
  const out = execFileSync("sf", [...argv, ...orgArgs, "--json"], {
    encoding: "utf8",
    ...options
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

// The headless surface. An MCP server is activated by its McpServerAccess
// record; its metadata has no active flag.
const server = sf([
  "data",
  "query",
  "--use-tooling-api",
  "--query",
  `SELECT Id FROM McpServerDefinition WHERE DeveloperName = '${MCP_SERVER}'`
]).records[0];
if (!server) {
  console.error(
    "Polyglot Arcade MCP server not found. Deploy the project first (npm run setup)."
  );
  process.exit(1);
}
const access = sf([
  "data",
  "query",
  "--use-tooling-api",
  "--query",
  `SELECT Id, Active FROM McpServerAccess WHERE McpServerId = '${server.Id}'`
]).records[0];
if (!access) {
  sf([
    "data",
    "create",
    "record",
    "--use-tooling-api",
    "--sobject",
    "McpServerAccess",
    "--values",
    `DeveloperName=${MCP_SERVER} MasterLabel='Polyglot Arcade' Active=true McpServerId=${server.Id}`
  ]);
} else if (!access.Active) {
  sf([
    "data",
    "update",
    "record",
    "--use-tooling-api",
    "--sobject",
    "McpServerAccess",
    "--record-id",
    access.Id,
    "--values",
    "Active=true"
  ]);
}

// Sandboxes and scratch orgs sign in at test.salesforce.com, so MCP clients
// need the sandbox variant of the server URL.
const [org] = sf([
  "data",
  "query",
  "--query",
  "SELECT IsSandbox FROM Organization"
]).records;
const serverUrl = `https://api.salesforce.com/platform/mcp/v1/${org.IsSandbox ? "sandbox/" : ""}custom/${MCP_SERVER}`;

// The OAuth client ID is the consumer key the platform generated for the
// External Client App. It is a public identifier, not a secret. The retrieve
// runs outside the project so source tracking stays untouched.
const retrieveDir = mkdtempSync(join(tmpdir(), "polyglot-arcade-eca-"));
let clientId;
try {
  sf(
    [
      "project",
      "retrieve",
      "start",
      "--metadata",
      `ExtlClntAppGlobalOauthSettings:${MCP_OAUTH_SETTINGS}`,
      "--target-metadata-dir",
      retrieveDir,
      "--unzip"
    ],
    { cwd: retrieveDir }
  );
  const file = readdirSync(retrieveDir, { recursive: true }).find((path) =>
    String(path).endsWith(".ecaGlblOauth")
  );
  clientId = file
    ? readFileSync(join(retrieveDir, String(file)), "utf8").match(
        /<consumerKey>([^<]+)<\/consumerKey>/
      )?.[1]
    : undefined;
} finally {
  rmSync(retrieveDir, { recursive: true, force: true });
}

console.log(`Polyglot Arcade MCP server: active`);
console.log(`  Server URL:       ${serverUrl}`);
console.log(
  `  OAuth client ID:  ${clientId ?? "(see External Client App Manager → Polyglot Arcade MCP)"}`
);
console.log(
  "  In Claude: Customize → Connectors → Add custom connector, paste both, then ask"
);
console.log(
  '  "Who is this week\'s arcade champion?" A new External Client App can take up to 30 minutes to work.'
);
