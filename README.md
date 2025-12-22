# PPP Telemetry Service

A SvelteKit-based telemetry service for collecting and storing PinePhone Pro device metrics.

## Tech Stack

- **Framework**: SvelteKit with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Runtime**: Bun
- **Deployment**: Kamal

## Development

### Prerequisites

- [Bun](https://bun.sh/) installed
- Docker (for local PostgreSQL)

### Setup

1. Install dependencies:

```sh
bun install
```

2. Start the PostgreSQL database:

```sh
bun run db:start
```

3. Create a `.env` file with your database connection:

```sh
DATABASE_URL=postgres://root:mysecretpassword@localhost:5432/local
```

4. Push the database schema:

```sh
bun run db:push
```

5. Start the development server:

```sh
bun run dev
```

### Database Commands

```sh
bun run db:start     # Start PostgreSQL container
bun run db:push      # Push schema changes to database
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio
```

## Building

Create a production build:

```sh
bun run build
```

Preview the production build:

```sh
bun run preview
```

---

## Deployment with Kamal

This project uses [Kamal](https://kamal-deploy.org/) for zero-downtime deployments to a VM on your local network.

### Prerequisites

1. **Install Kamal** on your local machine:

```sh
gem install kamal
```

Or with Docker:

```sh
alias kamal='docker run -it --rm -v "${PWD}:/workdir" -v "${SSH_AUTH_SOCK}:/ssh-agent" -e SSH_AUTH_SOCK=/ssh-agent ghcr.io/basecamp/kamal:latest'
```

2. **Prepare your VM**:
   - Linux server accessible via SSH (Ubuntu 22.04+ recommended)
   - Docker installed on the server
   - SSH key-based authentication configured

3. **Container registry access**:
   - A container registry account (GitHub Container Registry, Docker Hub, etc.)
   - Personal access token with package write permissions

### Configuration

1. **Update the deploy configuration** in `config/deploy.yml`:

   - Replace `192.168.1.100` with your VM's IP address
   - Update the registry settings if not using GitHub Container Registry
   - Adjust the SSH user if not using `root`

2. **Set up secrets**:

```sh
cp .kamal/secrets.example .kamal/secrets
```

Edit `.kamal/secrets` with your actual credentials:

```sh
# Container registry credentials
KAMAL_REGISTRY_USERNAME=your-github-username
KAMAL_REGISTRY_PASSWORD=ghp_your_token_here

# PostgreSQL credentials
POSTGRES_USER=ppp_telemetry
POSTGRES_PASSWORD=your_secure_password

# Database URL (uses the db accessory hostname)
DATABASE_URL=postgres://ppp_telemetry:your_secure_password@ppp-telemetry-db:5432/ppp_telemetry
```

### Initial Setup

Run the setup command to prepare your server:

```sh
kamal setup
```

This will:
- Install Docker on the server (if needed)
- Set up Traefik as a reverse proxy
- Deploy the PostgreSQL accessory
- Build and push your Docker image
- Deploy the application

### Database Migration

After the initial deployment, run migrations:

```sh
kamal app exec 'bun run db:push'
```

### Deployment Commands

```sh
# Full deployment (build, push, deploy)
kamal deploy

# Deploy without building (uses existing image)
kamal deploy --skip-push

# View application logs
kamal app logs

# View accessory (database) logs
kamal accessory logs db

# Open a console on the server
kamal app exec -i 'sh'

# Rollback to previous version
kamal rollback

# Check deployment status
kamal details
```

### Updating the Application

To deploy updates:

```sh
# Commit your changes
git add .
git commit -m "Your changes"

# Deploy
kamal deploy
```

### Managing Accessories

```sh
# Start the database
kamal accessory start db

# Stop the database
kamal accessory stop db

# Restart the database
kamal accessory restart db

# Remove the database (⚠️ destroys data)
kamal accessory remove db
```

### Troubleshooting

**SSH connection issues:**
```sh
# Test SSH connection
ssh root@192.168.1.100

# Use verbose mode
kamal deploy -v
```

**Container registry authentication:**
```sh
# Test registry login
docker login ghcr.io -u your-username
```

**Application not starting:**
```sh
# Check logs
kamal app logs

# Check container status
kamal details
```

**Database connection issues:**
```sh
# Verify the db accessory is running
kamal accessory details db

# Check database logs
kamal accessory logs db
```

### Local DNS (Optional)

To access your service via `telemetry.local`:

1. Add to `/etc/hosts` on your local machine:
```
192.168.1.100 telemetry.local
```

2. Access the service at `http://telemetry.local`

Alternatively, access directly via IP: `http://192.168.1.100`

## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/telemetry` - Submit single telemetry reading
- `POST /api/telemetry/batch` - Submit batch telemetry readings

## License

MIT
