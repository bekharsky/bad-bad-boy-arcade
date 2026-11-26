# Cloudflare leaderboard and score sharing

The GitHub Pages game calls a small Cloudflare Worker API. The Worker stores one all-time best score per browser profile in D1. Player IDs are random UUIDs stored in that browser's local storage; no login or email address is collected.

The same Worker creates share links for individual results. `POST /shares` stores the submitted nickname, score, and district in `shared_scores`, then returns a short `/share/<id>` URL. That URL serves the game page with result-specific Open Graph metadata, and `/share/<id>/card.png` renders a 1200×630 PNG card on demand. The regular game link uses a checked-in share image and static metadata, so it works without the Worker.

## Setup

1. Create a D1 database named `piss-deal-leaderboard` in the intended Cloudflare account.
2. Run `schema.sql` against that database. If the leaderboard is already deployed, run it again to create the new `shared_scores` table.
3. Bind it to the Worker as `DB` and deploy `index.js` as `piss-deal-leaderboard` with `workers.dev` enabled.
4. Set the GitHub repository variable `LEADERBOARD_API_URL` to the Worker URL, for example `https://piss-deal-leaderboard.<account-subdomain>.workers.dev`. The game build reads it as `VITE_LEADERBOARD_API_URL`; score-card sharing uses that same Worker endpoint.

For Wrangler deployments, put the real database ID in `wrangler.toml`, then run from this directory:

```sh
npx wrangler d1 execute piss-deal-leaderboard --remote --file=./schema.sql
npx wrangler deploy
```

Run `npm ci` from the repository root before deploying so Wrangler can bundle the score-card renderer dependency.

The leaderboard and share-creation APIs accept the production GitHub Pages origin, the Worker's own origin and the local Vite origins used during development. Public `/share/<id>` and `/card.png` GETs are also available to social preview crawlers, which do not send an `Origin` header. The Worker validates request size, score fields and nickname length, and updates a leaderboard profile only when its score improves. Names and scores are public; scores are client-submitted and are not cryptographically verified.
