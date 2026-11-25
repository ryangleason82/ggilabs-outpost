# One source across development environments

Canonical repository: https://github.com/ryangleason82/ggilabs-outpost (master).
Production: https://ggilabs-outpost.ryangleason.chatgpt.site (private).

## Develop

Clone GitHub, fetch master, and create a feature branch. Run `npm ci`, `npm run prisma:generate`, and `npm run dev`. Local preview databases and uploads are separate from production. Commit and push a branch, open a PR into master, and wait for **Build and typecheck**. Rebase or merge updated master before merging when required. Generated Prisma files are committed and checked for drift.

## What Actions verifies

**CI** runs on PRs, master pushes, and manual dispatch. It installs the lockfile, checks generated Prisma output, tests deployment comparison, typechecks, and builds.

**Verify production** runs on master pushes and manual dispatch. It reads `/api/deployment` from the live Site, using the repository secret `OUTPOST_SITE_ACCESS_TOKEN`, and compares the repository, branch, project ID, clean-build flag, exact commit, and Git tree against current GitHub master. Missing authentication, stale code, or any mismatch fails. It fetches master again after readback to catch a concurrent push. It never deploys or changes data.

That workflow is expected to be red after a merge until the new source is deployed. Run it again after publishing. Do not require it before a PR merge: production can only match the merge commit after the merge.

## Publish through Sites

1. Fetch GitHub master into a clean checkout. Run `npm run verify:source`. This rejects dirty work or any commit other than current GitHub master, including an unmerged feature branch.
2. Run `npm ci`, `npm run prisma:generate`, `npm run test:deployment`, `npm run typecheck`, and `npm run build`. The build embeds its Git commit and tree directly into the Worker; runtime environment variables cannot replace them.
3. Obtain a fresh Sites source credential for the existing project. Use the Sites source helper to open/synchronize this checkout, retaining its GitHub history. Push/package the same commit; never force-push or create a copy commit. The histories have been joined to make this a normal fast-forward.
4. Recheck `npm run verify:source` immediately before native Sites publication. Publish the matching archive and commit, keeping the Site owner-private and preserving the existing DB/BUCKET bindings.
5. Wait for deployment success. Run `npm run verify:deployment` with `OUTPOST_SITE_ACCESS_TOKEN` supplied in memory, and manually run **Verify production** in GitHub Actions on master. Confirm green before saying production matches master.

Sites publication still runs through an authenticated Sites session. These Actions do not contain Sites publishing credentials or provide automatic deployment.

## Access and data

`OUTPOST_SITE_ACCESS_TOKEN` is stored only as an encrypted GitHub Actions secret. The Worker rejects identity-less service requests except GET `/api/deployment` and platform-authenticated `/mcp`. Thus the verifier's Site service token cannot read records, export backups, upload files, or mutate application data. Browser sessions use ChatGPT identity normally; MCP has its separate platform OAuth boundary. Never log or commit the token.

D1 and R2 are persistent runtime state, not Git content. Deploying code must not recreate storage, rerun the initial import, or replace production with a local preview database. Keep separate database/file backups. A code rollback does not roll back data or migrations.

## Repository enforcement

Protect master with required **Build and typecheck** from GitHub Actions, up-to-date branches, PR merges, no force pushes, and no branch deletion. Zero external approvals is sufficient for a solo maintainer. Administration access is required to enable branch protection or set the verification secret; checked-in workflow files alone do not enforce protection.
