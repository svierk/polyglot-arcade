#!/usr/bin/env node
/**
 * Checks whether an org can run Polyglot Arcade before anything is deployed.
 * Every finding is a warning with a hint, never a blocker: some orgs work with
 * a gap (without English as the default language only embedding fails), and
 * the checks cannot see everything.
 *
 *   API version     67.0 (Winter '27) or later
 *   Multi-Framework the org knows the UIBundle metadata type
 *   Language        English as the default language (lightning-ui-embedding)
 *   Hyperforce      instance name like SWE44S or USA876 (lightning-ui-embedding)
 *   Edge Network    MyDomainSettings.useEdge (UI bundles open from the App Launcher)
 *
 * Runs as the first step of `npm run setup` and standalone:
 *
 * Usage: node scripts/preflight.mjs [--target-org <alias>]
 */
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const MIN_API_VERSION = 67;
// Hyperforce instances are named <country code><number>, often with a trailing
// S: USA244S, SWE44S, USA876. First-party instances have two letters (NA, CS, EU).
const HYPERFORCE_INSTANCE = /^[A-Z]{3}\d+S?$/;

const args = process.argv.slice(2);
const orgIndex = args.findIndex((a) => a === "--target-org" || a === "-o");
let orgArgs = orgIndex >= 0 ? ["--target-org", args[orgIndex + 1]] : [];

async function sf(argv, options = {}) {
  const { stdout } = await promisify(execFile)(
    "sf",
    [...argv, ...orgArgs, "--json"],
    { maxBuffer: 32 * 1024 * 1024, ...options }
  );
  return JSON.parse(stdout).result;
}

function checkApiVersion({ apiVersion }) {
  return Number(apiVersion) >= MIN_API_VERSION
    ? { ok: true, text: `API version ${apiVersion}` }
    : {
        ok: false,
        text: `API version ${apiVersion} is older than ${MIN_API_VERSION}.0`,
        hint: "UI bundles need Winter '27 or later. Use an org on a newer release."
      };
}

async function checkMultiFramework() {
  const { metadataObjects } = await sf(["org", "list", "metadata-types"]);
  return metadataObjects.some((type) => type.xmlName === "UIBundle")
    ? { ok: true, text: "Salesforce Multi-Framework (UI bundles) available" }
    : {
        ok: false,
        text: "The org does not know the UIBundle metadata type",
        hint: "Salesforce Multi-Framework is not available in this org, so the deploy will fail. Use a scratch org, a Developer Edition or a sandbox on Winter '27 or later."
      };
}

async function checkOrganization() {
  const [org] = (
    await sf([
      "data",
      "query",
      "--query",
      "SELECT LanguageLocaleKey, InstanceName FROM Organization"
    ])
  ).records;
  return [
    org.LanguageLocaleKey.startsWith("en")
      ? { ok: true, text: `Default language ${org.LanguageLocaleKey}` }
      : {
          ok: false,
          text: `Default language ${org.LanguageLocaleKey} is not English`,
          hint: "Embedded games stay blank: lightning-ui-embedding needs English as the default language (Setup > Company Information). The hub and the cabinet work anyway."
        },
    HYPERFORCE_INSTANCE.test(org.InstanceName)
      ? { ok: true, text: `Hyperforce instance ${org.InstanceName}` }
      : {
          ok: false,
          text: `Instance ${org.InstanceName} does not look like Hyperforce`,
          hint: "lightning-ui-embedding needs a Hyperforce org. Check the instance in Setup > Company Information."
        }
  ];
}

async function checkEdgeNetwork() {
  // MyDomainSettings has no query API; retrieve it into a throwaway folder.
  // The retrieve runs outside the project so source tracking stays untouched.
  const dir = mkdtempSync(join(tmpdir(), "polyglot-arcade-preflight-"));
  try {
    await sf(
      [
        "project",
        "retrieve",
        "start",
        "--metadata",
        "Settings:MyDomain",
        "--target-metadata-dir",
        dir,
        "--unzip"
      ],
      { cwd: dir }
    );
    const file = findFile(dir, "MyDomain.settings");
    const useEdge = /<useEdge>true<\/useEdge>/.test(readFileSync(file, "utf8"));
    return useEdge
      ? { ok: true, text: "Salesforce Edge Network enabled" }
      : {
          ok: false,
          text: "Salesforce Edge Network is not enabled",
          hint: "UI bundles do not open from the App Launcher without it. Enable Salesforce Edge Network in Setup > My Domain."
        };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function findFile(dir, name) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(path, name);
      if (found) return found;
    } else if (entry.name === name) {
      return path;
    }
  }
  return null;
}

// A check that cannot run turns into a manual check, not a failed setup.
function manual(label, hint) {
  return (error) => ({
    ok: false,
    text: `Could not check ${label} (${error.message.split("\n")[0]})`,
    hint
  });
}

let org;
try {
  org = await sf(["org", "display"]);
} catch (error) {
  console.log(
    `⚠ Could not connect to the org (${error.message.split("\n")[0]})`
  );
  console.log("    → Log in with sf org login web, or pass --target-org.");
  process.exit(0);
}
// Pin the resolved username: the Edge Network retrieve runs outside the
// project, where a project-local default org is unknown.
orgArgs = ["--target-org", org.username];

const results = await Promise.all([
  checkApiVersion(org),
  checkMultiFramework().catch(
    manual(
      "Multi-Framework",
      "Make sure Salesforce Multi-Framework is available in the org."
    )
  ),
  checkOrganization().catch(
    manual(
      "language and instance",
      "Make sure the org runs on Hyperforce with English as the default language."
    )
  ),
  checkEdgeNetwork().catch(
    manual(
      "Edge Network",
      "Make sure Salesforce Edge Network is enabled in Setup > My Domain."
    )
  )
]);

const findings = results.flat();
for (const finding of findings) {
  console.log(`${finding.ok ? "✓" : "⚠"} ${finding.text}`);
  if (finding.hint) console.log(`    → ${finding.hint}`);
}
const warnings = findings.filter((f) => !f.ok).length;
console.log(
  warnings === 0
    ? "Preflight: the org is ready for Polyglot Arcade."
    : `Preflight: ${warnings} warning(s). Setup continues; see the hints above.`
);
