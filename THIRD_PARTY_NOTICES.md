# Third-party notices

Polyglot Arcade is licensed under the [MIT License](LICENSE). Parts of it are derived from third-party templates under their own licenses, listed below.

## Salesforce Multi-Framework project templates

The project was scaffolded with the Salesforce CLI templates `angularinternalapp` and `reactbasic` (`sf template generate project` / `sf template generate ui-bundle`, package [`@salesforce/templates`](https://github.com/forcedotcom/salesforcedx-templates)). The following parts are derived from these templates and remain under the BSD 3-Clause License below:

- the project tooling in `scripts/` (org setup, project setup, GraphQL helpers), except `scripts/connect-cabinet.mjs`
- the build, lint and test configuration of both UI bundles (`angular.json`, `vite.config.ts`, `esbuild/`, `middleware/`, ESLint, Playwright and codegen configs)
- the UI kits and helpers of the bundles: `src/app/components/ui/`, `src/app/shared/`, `src/app/utils/`, `src/app/api/data-client.service.ts` (Angular) and `src/components/ui/`, `src/lib/`, `src/api/graphqlClient.ts` (React)

Files that carry a Salesforce copyright header keep it.

```
Copyright (c) 2025, Salesforce, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

* Neither the name of Salesforce nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY SALESFORCE AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL SALESFORCE OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
