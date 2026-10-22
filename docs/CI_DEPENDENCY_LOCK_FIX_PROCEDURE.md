# CI Dependency Lock Failure — Analysis and Fix Procedure

## 1. Incident

GitHub Actions failed at `npm ci` with:

```text
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.
npm error Missing: @opentelemetry/api@1.10.0 from lock file
```

This is a dependency-manifest/lockfile synchronization failure. It is not an application runtime error.

## 2. Root-cause analysis

The repository now contains the dependency explicitly in `package.json`:

```json
"@opentelemetry/api": "1.10.0"
```

The same dependency is present in `package-lock.json` as:

```text
node_modules/@opentelemetry/api
version: 1.10.0
```

The corrected commit is:

```text
9acef74 fix: sync opentelemetry dependency lock
```

Remote `main` was verified to point to:

```text
9acef74a47cb0ab8944bbde3787827c0aa741442
```

A clean local installation was also verified after deleting `node_modules`:

```text
npm ci --no-audit --no-fund
added 245 packages
exit code 0
```

Therefore, the pasted GitHub failure is consistent with a workflow run that checked out an older commit or otherwise did not use the corrected lockfile. `npm ci` itself is behaving correctly: it refuses to repair a mismatched lockfile.

## 3. Correct fix

Do **not** solve this in CI with `npm install`. CI must remain deterministic and use `npm ci`.

The repository fix is:

1. Keep `@opentelemetry/api` explicitly declared in `package.json`.
2. Keep the matching `1.10.0` entry in `package-lock.json`.
3. Commit both files together.
4. Push the commit to `main`.
5. Start a new GitHub Actions run from that commit.
6. Confirm the workflow checks out the expected SHA before `npm ci`.

The workflow has now also been hardened with a pre-`npm ci` verification step. It prints the checked-out commit, Node/npm versions, and verifies that both manifest and lockfile contain `@opentelemetry/api@1.10.0`.

## 4. Required verification order

Run locally from `/home/yash/tnpsc`:

```bash
git status --short
git log -1 --oneline
git ls-remote origin refs/heads/main
```

Then verify the dependency:

```bash
git show HEAD:package.json | grep '@opentelemetry/api'
git show HEAD:package-lock.json | grep -A8 'node_modules/@opentelemetry/api'
```

Then perform a clean install:

```bash
rm -rf node_modules
npm ci --no-audit --no-fund
```

Expected result: exit code `0`.

## 5. GitHub Actions verification

The first lines around dependency installation must show:

```text
Commit: 9acef74...   (or a newer commit containing the same fix)
Node: v22.x
npm: ...
package.json @opentelemetry/api: 1.10.0
lock root @opentelemetry/api: 1.10.0
lock package entry: 1.10.0
```

Only after these checks pass should `npm ci` execute.

If GitHub still reports the old missing-lockfile error, inspect the printed commit SHA first. If it is older than `9acef74`, the failing run is stale/old and must not be used as evidence against the current branch.

If the SHA is current but the lock verification says `MISSING`, investigate checkout/ref/workspace configuration before changing dependencies again.

## 6. Do not use these workarounds

Do not:

- replace `npm ci` with `npm install` in CI;
- delete `package-lock.json`;
- generate a new lockfile during the GitHub workflow;
- manually add random transitive dependencies without verifying why they are required;
- ignore the lockfile failure;
- claim CI is fixed from a local `npm ci` result alone.

## 7. CI completion criteria

Dependency-lock issue is considered resolved only when all are true:

- `package.json` and `package-lock.json` are committed together;
- remote `main` contains the corrected commit;
- GitHub Actions checks out that commit;
- lock verification passes;
- `npm ci` passes;
- `npm test` passes;
- content validation passes;
- production build passes;
- database-backed `test:loop` passes against the CI PostgreSQL service.

The final criterion is separate from the dependency problem. A failure in `test:loop` due to PostgreSQL credentials/configuration must be fixed as a database/CI environment issue, not misclassified as an npm lockfile issue.

## 8. Current state

Verified locally:

- Correct dependency declaration: **PASS**
- Correct lockfile entry: **PASS**
- Remote `main` points to corrected commit: **PASS**
- Clean `npm ci`: **PASS**

The next authoritative check is the new GitHub Actions run created from the corrected workflow/commit.
