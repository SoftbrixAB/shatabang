# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Shatabang is an image and video library management web application that organizes media files chronologically. It consists of three main components:

1. **Server** (Express.js): REST API and web server with authentication
2. **Processor**: Background task processor using Bull queues for media processing
3. **Client** (Ember.js): Web frontend (separate submodule)

The application imports media files, extracts EXIF metadata, generates resized images, detects duplicates using perceptual hashing, and serves them through a responsive web interface.

## Requirements

### Node.js

This project requires **Node.js 22.11.0 or higher** (LTS).

```bash
# Check your Node.js version
node --version  # Should be v22.11.0 or higher

# If using nvm, switch to the correct version
nvm use
# or
nvm install 22.11.0
```

The `.nvmrc` file is provided for automatic version management with nvm.

## Common Development Commands

### Running the Application

```bash
# Install all dependencies (root, server, and processor workspaces)
npm install

# Run both server and processor in development mode
npm run dev

# Run only the server with auto-reload
npm run server

# Run only the processor with auto-reload
npm run processor

# Start the application in production mode
npm start

# Start Redis (required for both server and processor)
npm run start_redis
```

### Testing

```bash
# Run all tests with Jest
npm test

# Run tests with coverage
npm test  # Coverage enabled by default in jest.config.js
```

### Docker

```bash
# Build Docker images
docker build . -t softbrix/shatabang

# Run with Docker Compose (includes Redis)
docker-compose up -d
```

### Package Management

```bash
# List outdated packages across workspaces
npm outdated

# Update a specific package in both workspaces
npm install <package-name>@latest --workspace=server --workspace=processor

# Audit dependencies
npm audit
npm run postaudit  # Audits server and processor workspaces
```

## Architecture

### Core Components

**Server** (`server/`)
- Entry point: `server/server.js`
- Routes in `server/routes/`: Express routers for different API endpoints (images, duplicates, uploads, auth, queue, etc.)
- Authentication: Supports both Google OAuth2 and local admin authentication via Passport.js
- Session management: Redis-backed sessions via `connect-redis`
- Task queue monitoring: Bull Arena and Bull Board for queue visualization

**Processor** (`processor/`)
- Entry point: `processor/main.js`
- Workers in `processor/workers/`: Individual task processors registered with Bull queues
- Continuously polls the import directory for new media files
- Each worker handles specific tasks: `import_meta`, `resize_image`, `create_image_finger`, `encode_video`, etc.

**Shared Modules** (`modules/`)
- Symlinked to both `server/common` and `processor/common`
- Contains: `config.js` (environment/config file merging), `directories.js`, `task_queue.js` (Bull queue wrapper), `indexes.js` (Redis/file-based indexes)

### Data Flow

1. Media files are uploaded or placed in the import directory
2. `update_import_directory` worker scans for new files
3. Tasks are queued for each file: `import_meta`, `resize_image`, `create_image_finger`
4. Metadata extracted via exiftool and cached in Redis (vemdalen-index for metadata, stureby-index for file hashes)
5. Perceptual hashes (pHash) detect duplicates, which are moved to `filtered/duplicates`
6. Processed images stored in `sorted/YYYY/MM/DD/` structure with cache sizes in `cache/320`, etc.
7. Server API serves media files and metadata to the web client

### Directory Structure

The application manages several directories defined in `config_server.json` or environment variables:

- `STORAGE_DIR`: Root for media storage
  - `import/`: Files to be processed
  - `upload/`: Web upload destination
  - `sorted/YYYY/MM/DD/`: Organized media by date
  - `filtered/`: Files filtered out during import
    - `deleted/`, `duplicates/`, `unknown/`
- `CACHE_DIR`: Resized images and indexes
  - `120/`, `320/`, etc.: Different size thumbnails
  - `info/`: Metadata cache
  - `idx_*`: Stureby file-based indexes

### Task Queue Architecture

The application uses Bull (Redis-based queues) with prefix `shTasks`:

**Key Queues:**
- `update_import_directory`: Scans import folder
- `import_meta`: Extracts EXIF/metadata with exiftool
- `resize_image`: Generates thumbnails using Sharp
- `create_image_finger`: Creates perceptual hash for duplicate detection
- `encode_video`: Processes video files (separate process)
- `worker_log`: Periodic logging task
- `upgrade_check`: Database migration checker

**Queue Monitoring:**
- Bull Arena UI exposed at `/arena/*` (requires authentication)
- Bull Board at `/admin/*` (requires authentication)

### Authentication System

Two authentication methods are supported:

1. **Google OAuth2**: Configured via `config_server.json` or `GOOGLE_AUTH`, `GOOGLE_AUTH_ALLOW` env vars
2. **Local Admin**: Uses hashed password (`ADMIN_HASH` + `SERVER_SALT`)

Protected routes:
- `/images/*`, `/media/*`, `/video/*`: Media files
- `/api/*`: Most API endpoints (except auth, users, version)
- `/arena/*`, `/admin/*`: Queue monitoring

### Index System

The application uses two indexing libraries:

- **vemdalen-index**: Redis-based indexes for keywords and metadata (in-memory, fast)
- **stureby-index**: File-based indexes for SHA hashes, perceptual hashes, ratings (persistent)

Indexed properties per media file:
- `a`: aspect ratio
- `b`: blur score
- `r`: rating
- `s`: file size
- SHA-1 hash for exact duplicate detection
- Perceptual hash (pHash) for similar image detection

## Configuration

Configuration is merged from `config_server.json` (fallback) and environment variables (priority).

**Key Configuration:**
- `BASE_URL`: Application base path (default: `/`)
- `PORT`: Server port (default: `3000`)
- `SERVER_SALT`: Unique server salt for password hashing
- `ADMIN_HASH`: Admin password hash
- `STORAGE_DIR`: Media storage root path
- `CACHE_DIR`: Cache and index storage path
- `REDIS_HOST` / `REDIS_PORT`: Redis connection (default: `127.0.0.1:6379`)
- `GOOGLE_AUTH`: OAuth2 credentials and allowed user IDs/emails

Use `./install_scripts/shatabang_config.sh` to generate `config_server.json`.

## External Dependencies

The application requires these system-level dependencies:

- **Node.js**: Runtime platform
- **Redis**: Session storage and task queues
- **exiftool**: EXIF metadata extraction (libimage-exiftool-perl)
- **libvips**: Fast image resizing (used by Sharp)
- **ffmpeg**: Video processing and frame extraction
- **OpenCV 3**: Object detection in images (optional TensorFlow integration)

### macOS Installation:
```bash
brew install exiftool redis
```

### Debian Installation:
```bash
sudo apt-get install git libimage-exiftool-perl libvips-dev build-essential ffmpeg redis-server -y
```

## Development Notes

### Workspace Structure
This is a monorepo using npm workspaces with `server/` and `processor/` as separate packages that share a common root `package.json`.

### Symbolic Links
Both server and processor symlink `../modules` as `./common` to share code. Preserve these symlinks when running the application with `--preserve-symlinks` flag.

### File Naming Convention
All directories and files use lowercase names to maintain compatibility across case-sensitive and case-insensitive filesystems.

### Testing
- Tests are in the `test/` directory at the root
- Uses Jest for testing framework
- Test data in `test/test_data/`
- Coverage reports generated in `coverage/` directory

### Hot Reloading
Both server and processor use `nodemon` for automatic restart on file changes. Configuration in `nodemon.json`.

### Debugging
The processor can be debugged remotely on port `9229` when run via Docker Compose.

### Version Tracking
Environment variable `_DB_VERSION` is used to track data schema versions for migrations (e.g., `202101`).
