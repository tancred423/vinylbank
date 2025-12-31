# VinylBank Development Setup

This guide is for developers who want to contribute to VinylBank or run it in development mode with hot reloading.

## Prerequisites

- Docker and Docker Compose
- Git

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/vinylbank.git
cd vinylbank
cp .env.skel .env  # Optional: customize environment variables
./dev up
```

That's it! The development environment is now running:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| phpMyAdmin | http://localhost:8080 |

## Dev Script Commands

```bash
./dev up            # Start all containers
./dev stop          # Stop containers (keeps data)
./dev down          # Stop and remove containers
./dev rebuild       # Rebuild frontend and backend
./dev logs          # Follow frontend and backend logs
./dev reset-db      # Reset database (removes volumes) and restart
./dev check-backend # Run deno fmt, deno lint and deno check in backend container
./dev check-frontend # Run npm format, npm lint and type-check in frontend container
```

## Project Structure

```
vinylbank/
├── backend/              # Deno backend
│   ├── src/
│   │   ├── db/          # Database
│   │   ├── routes/      # API routes
│   │   └── main.ts      # Entry point
│   └── drizzle/         # SQL migrations
├── frontend/            # Vue 3 frontend
│   └── src/
│       ├── components/  # Vue components
│       ├── views/       # Page views
│       └── services/    # API client
├── docker-compose.yml      # Production (uses pre-built GHCR images)
└── docker-compose.dev.yml  # Development (builds from source with hot reload)
```

## Tech Stack

- **Backend**: Deno + TypeScript + Drizzle ORM
- **Frontend**: Vue 3 + TypeScript + Vite
- **Database**: MySQL 8.0

## Database

### Credentials (Development)

| | |
|-|-|
| Host | `localhost:3306` |
| Database | `vinylbank` |
| User | `vinylbank` |
| Password | `vinylbank` |
| Root Password | `rootpassword` |

### Migrations

```bash
cd backend
deno task db:generate   # Generate migration from schema changes
deno task db:migrate    # Run migrations
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/media` | Get all media items |
| GET | `/api/media/:id` | Get single item |
| POST | `/api/media` | Create item |
| PUT | `/api/media/:id` | Update item |
| DELETE | `/api/media/:id` | Delete item |
| GET | `/api/media/types/list` | Get media types |
| GET | `/health` | Health check |

## Code Quality

```bash
./dev check-backend    # Run deno fmt, deno lint and deno check in backend container
./dev check-frontend   # Run npm format, npm lint and type-check in frontend container
```

