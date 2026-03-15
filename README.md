# Studio Site

This repository now runs as a single Node-served app with:

- public site pages rendered from file-backed JSON
- a hidden browser admin at `/studio-admin` by default
- authenticated JSON/media APIs for editing content, uploading portfolio images, and publishing changes immediately
- backup snapshots written to `backups/` before each content mutation

The editable source of truth lives in:

- [data/site-content.json](/E:/src/repos/dad's%20site/data/site-content.json)
- [data/portfolio.json](/E:/src/repos/dad's%20site/data/portfolio.json)
- [data/blog.json](/E:/src/repos/dad's%20site/data/blog.json)
- [data/events.json](/E:/src/repos/dad's%20site/data/events.json)

Uploaded originals are stored under `public/media/originals/` and generated thumbnails under `public/media/thumbnails/`.

## Environment

Set these before running the server outside local testing:

```bash
ADMIN_PASSWORD=your-shared-password
SESSION_SECRET=a-long-random-secret
ADMIN_ROUTE=/studio-admin
PORT=3000
```

`ADMIN_PASSWORD` and `SESSION_SECRET` should not be committed.

The server falls back to insecure local defaults if these are missing. On any deployed machine, set both values explicitly.

## Commands

Install dependencies:

```bash
npm install
```

Run the Node server in development with Vite middleware:

```bash
npm run dev
```

Build the client bundle:

```bash
npm run build
```

Serve the built app in production mode:

```bash
npm run start
```

Preview the built app locally:

```bash
npm run preview
```

## Ubuntu Deployment

These steps assume a personal Ubuntu server running the app as a long-lived Node process behind `systemd`.

### Prerequisites

- Node.js 20+ installed
- `npm` available on the server
- a non-root user to run the app
- a cloned copy of this repository

Recommended package setup:

```bash
sudo apt update
sudo apt install -y curl git build-essential
```

Install Node.js from NodeSource if the Ubuntu repo version is too old:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify the runtime:

```bash
node -v
npm -v
```

### First-time Server Setup

Clone the repo, install dependencies, and build the client bundle:

```bash
git clone <your-repo-url>
cd "dad's site"
npm install
npm run build
```

The production server expects the built files in `dist/`, while content stays file-backed in `data/`.

### Environment File

Store secrets outside the repo:

```bash
sudo nano /etc/dads-site.env
```

Example:

```env
ADMIN_PASSWORD=replace-this-with-a-real-password
SESSION_SECRET=replace-this-with-a-long-random-secret
ADMIN_ROUTE=/studio-admin
PORT=3000
```

Lock down that file:

```bash
sudo chmod 600 /etc/dads-site.env
```

Changing `SESSION_SECRET` signs out existing admin sessions. Changing `ADMIN_PASSWORD` affects the next login attempt.

### systemd Service

Create `/etc/systemd/system/dads-site.service`:

```ini
[Unit]
Description=Dad's Site
After=network.target

[Service]
Type=simple
WorkingDirectory=/absolute/path/to/dad's site
EnvironmentFile=/etc/dads-site.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=your-ubuntu-user
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable dads-site
sudo systemctl restart dads-site
sudo systemctl status dads-site
```

Useful logs:

```bash
journalctl -u dads-site -n 100 --no-pager
journalctl -u dads-site -f
```

### Updating After Deployment

When you push a new version:

```bash
cd "/absolute/path/to/dad's site"
git pull
npm install
npm run build
sudo systemctl restart dads-site
```

If you only changed environment values:

```bash
sudo nano /etc/dads-site.env
sudo systemctl restart dads-site
```

### File Storage and Permissions

This app writes to these directories at runtime:

- `data/`
- `backups/`
- `public/media/originals/`
- `public/media/thumbnails/`

The Linux user running `dads-site.service` must have write access to the project directory and those folders.

If needed:

```bash
sudo chown -R your-ubuntu-user:your-ubuntu-user "/absolute/path/to/dad's site"
```

### Reverse Proxy and HTTPS

This app listens on `PORT` and is intended to sit behind `nginx` or another reverse proxy.

Typical flow:

- Node app listens on `127.0.0.1:3000`
- `nginx` serves the public domain and proxies requests to the Node app
- TLS is terminated at `nginx`, usually with Let's Encrypt

At minimum, make sure the public web server forwards:

- the normal site pages
- `/api/*`
- `/media/*`
- the hidden admin route from `ADMIN_ROUTE`

If you use HTTPS, the admin cookie remains `HttpOnly`, but the current server code does not force the cookie `Secure` flag itself. In practice, you should still put the site behind HTTPS on the public internet.

### Recommended Checks

After the service starts, verify:

```bash
curl http://127.0.0.1:3000/api/public/content
```

Then open:

- `https://your-domain/`
- `https://your-domain/studio-admin` or your custom `ADMIN_ROUTE`

Confirm that:

- the public pages load
- the admin login works
- content edits persist
- uploaded images appear under portfolio entries
- new backup snapshots appear in `backups/`
