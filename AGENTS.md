# Outpost source and deployment rules

GitHub `ryangleason82/ggilabs-outpost`, branch `master`, is the canonical source.
Read `DEPLOYMENT.md` before publishing or changing hosting, database, or storage.

- Start every environment from GitHub; fetch and use a feature branch based on current `origin/master`.
- Push a branch and use a pull request. Do not bypass the required CI check or force-push master.
- Preserve `.openai/hosting.json` project identity, D1 `DB`, and R2 `BUCKET`. Never create a replacement Site to update this one.
- Site source is a deployment mirror. Never treat its independent edits as canonical or overwrite newer GitHub work with them.
- Publish only clean GitHub master after `npm run verify:source`, typecheck, deployment tests, and build succeed. Recheck master immediately before publishing.
- Push the exact same GitHub commit to the Sites source repository; do not generate a separate copy commit. Build artifacts must embed that commit and tree.
- After a successful Sites deployment, run `npm run verify:deployment` with the Site service token in memory, and dispatch the **Verify production** GitHub workflow on master. Do not report synchronization until live commit and tree match master.
- Production verification can be red between a master merge and its verified deployment. It is not a pre-merge requirement; **Build and typecheck** is.
- Do not commit credentials, database snapshots, uploads, or runtime data. Application data lives in D1/R2 and must survive source deployments.
- Do not reimport, reseed, clear, or replace the production database when deploying code. Schema migrations must preserve existing rows and be reviewed separately.

The framework is Vinext on Cloudflare Workers; Prisma must retain the `cloudflare` runtime and static WASM import. Use the supplied Sites build/publish workflow.
