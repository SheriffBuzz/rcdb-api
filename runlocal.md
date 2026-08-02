Steps for running locally.

Create .env file containing

RCDB_URL=https://rcdb.com

This is needed as this was stored as a github action variable before being deployed to vercel

run the scraper from root
npm run scrape
(see package.json for list of available runnable commands)

Run build/start commands using git bash (this app is designed with unix environment in mind

Add port config to .env file
PORT=8000

Run following to build (in cmd not git bash). npm run build currently fails.
npx tsc
npx tsc-alias

run server
npm run start:prod
npm run start:dev