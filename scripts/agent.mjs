#!/usr/bin/env node
/**
 * Ships the Arcade Host, the Agentforce employee agent of the headless surface:
 * publishes it if its Agent Script changed, activates it and gives the current
 * user access, so it opens in the Agentforce panel in Lightning.
 *
 * The agent lives in agent/, outside force-app: an org without Agentforce could
 * not deploy it, and its permission set needs the published agent. This step
 * skips such an org instead of failing, the rest of the arcade works without
 * the agent.
 *
 * It works in a temporary project because `sf agent publish` retrieves the
 * generated agent metadata and the action classes into the project it runs in.
 *
 * Usage: node scripts/agent.mjs [--target-org <alias>]
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AGENT = "Arcade_Host";
const AGENT_LICENSE = "EinsteinGPTCopilotPsl";
const PERMISSION_SETS = ["CopilotSalesforceUser", "arcadeHost_Access"];

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AGENT_SOURCE = join(ROOT, "agent");
const AGENT_SCRIPT = join("aiAuthoringBundles", AGENT, `${AGENT}.agent`);

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

function hasAgentforce() {
  const { records } = sf([
    "data",
    "query",
    "--query",
    `SELECT Id FROM PermissionSetLicense WHERE DeveloperName = '${AGENT_LICENSE}'`
  ]);
  return records.length > 0;
}

/** The Agent Script of the agent's latest version in the org, if it has one. */
function publishedScript(project) {
  const versions = sf([
    "org",
    "list",
    "metadata",
    "--metadata-type",
    "AiAuthoringBundle"
  ]);
  const latest = (Array.isArray(versions) ? versions : [versions])
    .map((bundle) => bundle?.fullName?.match(new RegExp(`^${AGENT}_(\\d+)$`)))
    .filter(Boolean)
    .sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  if (!latest) return null;
  const retrieveDir = join(project, "retrieved");
  mkdirSync(retrieveDir);
  sf(
    [
      "project",
      "retrieve",
      "start",
      "--metadata",
      `AiAuthoringBundle:${latest[0]}`,
      "--target-metadata-dir",
      retrieveDir,
      "--unzip"
    ],
    { cwd: project }
  );
  const file = readdirSync(retrieveDir, { recursive: true }).find((path) =>
    String(path).endsWith(".agent")
  );
  return file ? readFileSync(join(retrieveDir, String(file)), "utf8") : null;
}

/**
 * Always names the version: without --version, `sf agent activate --json` picks
 * the latest version that is not active, which is the one before the latest
 * when the latest is already active.
 */
function activateLatestVersion(project) {
  const {
    records: [latest]
  } = sf([
    "data",
    "query",
    "--query",
    `SELECT VersionNumber, Status FROM BotVersion WHERE BotDefinition.DeveloperName = '${AGENT}' ORDER BY VersionNumber DESC LIMIT 1`
  ]);
  if (latest.Status !== "Active") {
    sf(
      [
        "agent",
        "activate",
        "--api-name",
        AGENT,
        "--version",
        String(latest.VersionNumber)
      ],
      { cwd: project }
    );
  }
  return latest.VersionNumber;
}

if (!hasAgentforce()) {
  console.log(
    "This org has no Agentforce, so the Arcade Host is skipped. The arcade and its MCP server work without it."
  );
  process.exit(0);
}

const project = mkdtempSync(join(tmpdir(), "arcade-agent-"));
try {
  const source = join(project, "force-app", "main", "default");
  mkdirSync(source, { recursive: true });
  cpSync(AGENT_SOURCE, source, { recursive: true });
  const { sourceApiVersion } = JSON.parse(
    readFileSync(join(ROOT, "sfdx-project.json"), "utf8")
  );
  writeFileSync(
    join(project, "sfdx-project.json"),
    JSON.stringify({
      packageDirectories: [{ path: "force-app", default: true }],
      sourceApiVersion
    })
  );

  const script = readFileSync(join(AGENT_SOURCE, AGENT_SCRIPT), "utf8");
  if (publishedScript(project) === script) {
    console.log("Arcade Host: Agent Script unchanged, nothing to publish");
  } else {
    sf(["agent", "publish", "authoring-bundle", "--api-name", AGENT], {
      cwd: project
    });
    console.log("Arcade Host: published");
  }
  const version = activateLatestVersion(project);

  // The permission set grants the agent, so it can only follow the publish.
  sf(
    [
      "project",
      "deploy",
      "start",
      "--source-dir",
      join("force-app", "main", "default", "permissionsets"),
      "--ignore-conflicts" // the temporary project has no source tracking history
    ],
    { cwd: project }
  );
  sf(["org", "assign", "permsetlicense", "--name", AGENT_LICENSE]);
  for (const name of PERMISSION_SETS) {
    try {
      sf(["org", "assign", "permset", "--name", name]);
    } catch (error) {
      // Already assigned by an earlier run.
      if (!`${error.stdout}${error.stderr}`.includes("Duplicate")) throw error;
    }
  }

  console.log(`Arcade Host: active (version ${version})`);
  console.log(
    '  In Lightning: open the Agentforce panel and ask "Who is this week\'s arcade champion?"'
  );
} finally {
  rmSync(project, { recursive: true, force: true });
}
