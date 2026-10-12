# CarX Deployment & Operations Guide

## 1. Environment Configurations

CarX is configured completely through environment variables (defined in `.env` or system environment):

| Variable | Default | Purpose |
|---|---|---|
| `APP_ENV` | `development` | Set to `production` in live environments |
| `DATABASE_URL` | `sqlite:///./carx.db` | SQLAlchemy connection string |
| `OPENROUTER_API_KEY` | None | Secret key for Gemma LLM invocation |
| `OPENROUTER_MODEL` | `google/gemma-2-9b-it:free` | Model target on OpenRouter |
| `PORT` | `8000` | Backend listening port |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed web origins |

## 2. Docker / Container Deployment

CarX can be containerized into lightweight Alpine/Debian slim containers:
- **Backend**: Python 3.12/3.14 container running `uvicorn app.main:app --workers 4`.
- **Frontend**: Node 20/22 container running `npm run build && npm start`.
- **Database**: Managed PostgreSQL instance with automated backups.

## 3. Disaster Recovery and Backups

- SQLite (Development): automated snapshot copy of `carx.db`.
- PostgreSQL (Production): `pg_dump` automated cron with retention on object storage.
