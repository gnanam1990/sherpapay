# SherpaPay Worker

Cron daemon for executing scheduled payments on Celo.

## How it works

1. Runs on a cron schedule (default: every minute)
2. Fetches due schedules from the API
3. Executes each due schedule by calling the smart contract
4. Logs results and handles failures

## Configuration

See `.env.example` for required environment variables.

## Development

```bash
pnpm dev:worker
```

## Docker

```bash
docker build -t sherpapay-worker .
docker run -e API_URL=http://api:3001 sherpapay-worker
```
