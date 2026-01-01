# VinylBank

A self-hosted app to manage your physical media collection — CDs, DVDs, Blu-rays, Vinyl records, and more.
Track what you own, who borrowed it, and add notes to your items.
You add own mediums and customise the fields that each medium has.

<img width="1700" height="1273" alt="2026_01_01_GOziyrC2Is" src="https://github.com/user-attachments/assets/eab3be80-212c-4942-85cc-626810936d52" />

## Quick Start

1. Download the compose file:

```bash
curl -O https://raw.githubusercontent.com/tancred423/vinylbank/main/docker-compose.yml
```

2. Start the application:

```bash
docker compose up -d
```

### Optional: Custom Configuration

Create a `.env` file in the same directory:

```bash
curl -O https://raw.githubusercontent.com/tancred423/vinylbank/main/.env.skel
cp .env.skel .env
nano .env
```

```bash
# Database Passwords
# Change these to secure passwords
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_PASSWORD=vinylbank

# Port Configuration
# Leave as default (80) unless you know what you're doing
# Change if port 80 is already in use on your system
FRONTEND_PORT=80
# Use this to connect to your NAS if needed
#CORS_ORIGIN=http://YOUR_SERVER_IP

# Language
# Set to 'en' for English or 'de' for German
VITE_DEFAULT_LANGUAGE=en
```

Then restart: `docker compose up -d`

## Network Access

To access VinylBank from other devices on your network:

1. Find your server's IP address:
   
   hostname -I  # Linux
   ipconfig     # Windows
   
2. Update your `.env` file:
  
   FRONTEND_PORT=80
   CORS_ORIGIN=http://YOUR_SERVER_IP
   3. Restart: `docker compose up -d`

4. Access from any device on your network: `http://YOUR_SERVER_IP`

If you change to a different port, you have to provide it: `http://YOUR_SERVER_IP:PORT`

## Data & Backups

Your data is stored in Docker volumes and persists across restarts.

To backup your database:

```bash
docker exec vinylbank-mysql mysqldump -u root -p vinylbank > backup.sql
```

## Updates

```bash
docker compose pull
docker compose up -d
```

## Development

See [DEV.md](DEV.md) for development setup and building from source.

## License

[MIT](LICENSE)
