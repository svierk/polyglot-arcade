# Base Angular App

Base Angular App is a template application that demonstrates how to build an Angular UI Bundle on the Salesforce platform with the Angular CLI, TypeScript, Tailwind, and the Salesforce UI Bundle SDK. It provides a minimal shell (home, 404), routing with standalone components and signals, so feature apps can extend it via the patches pipeline.

This UI Bundle lives inside an SFDX project. The project root is the directory that contains `force-app/` and `sfdx-project.json`. Run the commands in the sections below from the paths indicated.

## Table of contents

- [Run (development)](#run-development)
- [Build](#build)
- [Deploy](#deploy)
- [Test](#test)
- [Lint](#lint)

## Run (development)

From the UI Bundle directory (`force-app/main/default/uiBundles/base-angular-app`):

```bash
npm install
npm run dev
```

This starts the Salesforce Angular dev server (`sf-angular-serve`).

## Build

From the UI Bundle directory:

```bash
npm install
npm run build
```

The production build is written to `dist/` inside the UI Bundle folder. Use `npm run watch` to rebuild on change in development mode. Deploy using the steps in [Deploy](#deploy).

## Deploy

From the **SFDX project root** (the directory that contains `force-app/`):

1. Build the UI Bundle:

   ```bash
   cd force-app/main/default/uiBundles/base-angular-app && npm install && npm run build && cd -
   ```

2. Deploy the UI Bundle only:

   ```bash
   sf project deploy start --source-dir force-app/main/default/ui-bundles --target-org <alias>
   ```

   Or deploy all metadata:

   ```bash
   sf project deploy start --source-dir force-app --target-org <alias>
   ```

   Replace `<alias>` with your target org alias.

## Test

From the UI Bundle directory:

```bash
npm install
npm run test
```

This runs the unit test suite via `ng test`. For end-to-end tests:

```bash
npm run build:e2e
npm run e2e
```

This builds with E2E asset rewrites and runs Playwright against the static build. Ensure Chromium is installed (`npx playwright install chromium` if needed).

## Lint

From the UI Bundle directory:

```bash
npm run lint
```
