# Cloudflare leaderboard

The GitHub Pages game calls a small Cloudflare Worker API. The Worker stores one all-time best score per browser profile in D1. Player IDs are random UUIDs stored in that browser's local storage; no login or email address is collected.

## Setup

1. Create a D1 database named `piss-deal-leaderboard` in the intended Cloudflare account.
2. Run `schema.sql` against that database.
3. Bind it to the Worker as `DB` and deploy `index.js` as `piss-deal-leaderboard` with `workers.dev` enabled.
4. Set `VITE_LEADERBOARD_API_URL` to the Worker URL when building the game, for example `https://piss-deal-leaderboard.<account-subdomain>.workers.dev`.

For Wrangler deployments, put the real database ID in `wrangler.toml`, then run from this directory:

```sh
npx wrangler d1 execute piss-deal-leaderboard --remote --file=./schema.sql
npx wrangler deploy
```

The Worker accepts only the production GitHub Pages origin and the local Vite origins used during development. It validates request size, score fields and nickname length, and updates a profile only when its score improves. Names and scores are public; scores are client-submitted and are not cryptographically verified.
