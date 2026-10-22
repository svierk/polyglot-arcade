# Salesforce DX Project: Next Steps

Now that you’ve created a Salesforce DX project, what’s next? Here are some documentation resources to get you started.

## Web app: install, build, and dev server

From the **SFDX project root** (this directory), run:

```bash
npm run sf-project-setup
```

This installs dependencies in the UI Bundle, builds it, and starts the Vite dev server. Use this after cloning or extracting the project.

## Set up the org

`npm run setup` configures a target org from this project in one command: it logs in
(a required precondition — auto-skipped if the org is already connected), deploys
metadata, assigns permission sets, imports sample data, refreshes the GraphQL
schema/types, and builds the UI Bundle. When `--target-org` is omitted it uses your
default org or, in an interactive terminal, prompts you to pick one.

```bash
npm run setup -- --target-org <alias>     # or omit --target-org to use the default / pick
```

Setup does **not** start the dev server. Once the org is set up, use `dev:preview` to
refresh the GraphQL types against the org and launch the Vite dev server on its own:

```bash
npm run dev:preview
```

### Setup configuration (`scripts/org-setup.config.json`)

`org-setup.config.json` controls which steps run and how. Every top-level section is
optional; an absent section hides its step. It is validated against a shared schema
at build/CI time and again at the start of every `npm run setup`, so a malformed
config fails fast rather than misbehaving.

```jsonc
{
  "permsetAssignments": {
    "assignments": {
      "My_Access": { "assignee": "currentUser" }
    }
  },
  "role": { "assignee": "currentUser", "roleName": "Admin" },
  "selfRegistration": {
    "selfRegProfile": "My Prospect Profile",
    "accountName": "My Self-Registration"
  }
}
```

When a `selfRegistration` section is present, setup runs a **license pre-check**
before configuring self-registration: it derives the required `UserLicense` from the
configured `selfRegProfile` (matched on the stable `LicenseDefinitionKey`, not the
display name) and, if the org lacks that license or has no available seats, **warns
and skips** self-registration instead of reporting success — so prospect login can't
silently fail on an under-provisioned org. No separate license field is configured;
the requirement always follows the profile the flow assigns.

## How Do You Plan to Deploy Your Changes?

Do you want to deploy a set of changes, or create a self-contained application? Choose a [development model](https://developer.salesforce.com/tools/vscode/en/user-guide/development-models).

## Configure Your Salesforce DX Project

The `sfdx-project.json` file contains useful configuration information for your project. See [Salesforce DX Project Configuration](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_config.htm) in the _Salesforce DX Developer Guide_ for details about this file.

## Read All About It

- [Salesforce Extensions Documentation](https://developer.salesforce.com/tools/vscode/)
- [Salesforce CLI Setup Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm)
- [Salesforce DX Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_intro.htm)
- [Salesforce CLI Command Reference](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference.htm)
