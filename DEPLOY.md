# Deploying Cerise Scholar with Cloudflare Tunnel

Follow these steps when you're ready to make your app accessible on the internet.

## Prerequisites

1. A **Cloudflare account** (free) — https://dash.cloudflare.com/sign-up
2. A **domain name** registered with or transferred to Cloudflare (~$10/year)
3. **cloudflared** installed — already done: `brew install cloudflared`

## Step-by-step

### 1. Log in to Cloudflare from terminal
```bash
cloudflared tunnel login
```
This opens your browser. Authorize the connection.

### 2. Create a tunnel
```bash
cloudflared tunnel create cerise-scholar
```
Note the **Tunnel ID** that gets printed.

### 3. Create the config file
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /Users/mrperfect/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:3000
  - service: http_status:404
```
Replace `YOUR_TUNNEL_ID` and `your-domain.com` with your actual values.

### 4. Set up DNS
```bash
cloudflared tunnel route dns cerise-scholar your-domain.com
```

### 5. Build and run the production app
```bash
npm run build -- --webpack
npm run start
```

### 6. Start the tunnel (in a separate terminal)
```bash
cloudflared tunnel run cerise-scholar
```

### 7. Keep your Mac awake
```bash
caffeinate -s
```
This prevents your Mac from sleeping and killing the tunnel.

## Quick start (development mode)
For local development without Cloudflare:
```bash
./start.sh
```
Then open http://localhost:3000
