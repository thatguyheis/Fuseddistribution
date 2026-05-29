# Windows PC Setup — Postiz Social Media Server

This PC will run Postiz as a dedicated always-on server. The Mac's daily pipeline will post content here via the local network API.

---

## Step 1 — Prerequisites

### 1a. Check Windows version
Must be Windows 10 version 2004+ or Windows 11.

```
Settings → System → About → Windows specifications → Version
```

### 1b. Enable WSL2
Open PowerShell as Administrator:
```powershell
wsl --install
```
Restart when prompted. WSL2 is the backend Docker Desktop uses.

### 1c. Install Docker Desktop
Download from: https://www.docker.com/products/docker-desktop/

During install:
- Select "Use WSL 2 instead of Hyper-V" (should be default)
- Launch Docker Desktop after install
- Wait for the whale icon in the taskbar to stop animating (engine started)

Verify:
```powershell
docker --version
docker compose version
```

### 1d. Install Git
Download from: https://git-scm.com/download/win

Use defaults during install.

### 1e. Install Node.js
Download LTS version from: https://nodejs.org/

Verify:
```powershell
node --version
npm --version
```

---

## Step 2 — Install Claude Code

Open PowerShell:
```powershell
npm install -g @anthropic-ai/claude-code
```

Verify:
```powershell
claude --version
```

Log in:
```powershell
claude
```
Follow the browser-based auth flow. This links Claude Code to your Anthropic account.

---

## Step 3 — Get the project files

Clone the Fused Distribution repo:
```powershell
cd C:\Users\[YourUsername]\Documents
git clone https://github.com/thatguyheis/Fuseddistribution.git "New project"
cd "New project"
```

---

## Step 4 — Set static IP for this PC

The Mac needs a stable address to reach Postiz. Set via router (easiest):

1. Find this PC's MAC address:
   ```powershell
   ipconfig /all
   ```
   Look for "Physical Address" under your network adapter (e.g. `B4-2E-99-XX-XX-XX`).

2. Log into your router admin page (usually `192.168.1.1` or `192.168.0.1`)
3. Find DHCP reservations (sometimes called "Static DHCP" or "Address Reservation")
4. Add a reservation: MAC address → assign IP e.g. `192.168.1.50`
5. Restart this PC or run `ipconfig /release && ipconfig /renew` to apply

Verify:
```powershell
ipconfig
```
Should show your reserved IP under IPv4 Address.

---

## Step 5 — Install Postiz

### 5a. Create Postiz directory
```powershell
mkdir C:\postiz
cd C:\postiz
```

### 5b. Create docker-compose.yml

Copy the official Postiz docker-compose into `C:\postiz\docker-compose.yml`.
Get it from: https://github.com/gitroomhq/postiz-app/blob/main/docker-compose.yaml

Key values to fill in:
```yaml
JWT_SECRET: 'generate-a-long-random-string-here'
FACEBOOK_APP_ID: 'your-facebook-app-id'
FACEBOOK_APP_SECRET: 'your-facebook-app-secret'
LINKEDIN_CLIENT_ID: 'your-linkedin-client-id'
LINKEDIN_CLIENT_SECRET: 'your-linkedin-client-secret'
X_API_KEY: 'your-x-api-key'
X_API_SECRET: 'your-x-api-secret'
```

### 5c. Create dynamicconfig directory (required by Temporal)
```powershell
mkdir C:\postiz\dynamicconfig
```

Create file `C:\postiz\dynamicconfig\development-sql.yaml` with content:
```yaml
# Temporal dynamic config — required but can be empty for basic use
```

### 5d. Open Windows Firewall for port 4007
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="Postiz" dir=in action=allow protocol=TCP localport=4007
```

### 5e. Start Postiz
```powershell
cd C:\postiz
docker compose up -d
```

Wait ~2 minutes for all containers to initialize.

Verify all containers running:
```powershell
docker compose ps
```
All services should show `Up` or `healthy`.

### 5f. Open the Postiz UI
Open browser: `http://localhost:4007`

Create an account (first registration = admin).

### 5g. Get your API key
Settings → Developers → Public API → Generate key

Save this key — you'll need it in the Mac's `video/.env`.

---

## Step 6 — Connect social accounts

In the Postiz UI:
1. Go to Settings → Channels
2. Connect Facebook (also links Instagram if same Business account)
3. Connect LinkedIn
4. Connect X

Each connection requires OAuth — Postiz will open a browser popup. Follow the prompts.

For Facebook/Instagram: you need a Facebook Developer App with the correct permissions. See SOCIAL-SOP.md → Platform API Setup section.

---

## Step 7 — Tell the Mac where Postiz lives

On the Mac, add to `/Users/nick/Documents/New project/video/.env`:
```
POSTIZ_URL=http://192.168.1.50:4007
POSTIZ_API_KEY=your-api-key-from-step-5g
```

Replace `192.168.1.50` with the actual IP you reserved in Step 4.

---

## Step 8 — Keep Postiz running after reboot

Docker Desktop starts automatically on login by default. But set Docker to start minimized:

Docker Desktop → Settings → General → "Start Docker Desktop when you sign in" ✓

Also ensure the PC does not sleep:
```
Settings → System → Power & sleep → Sleep → Never (when plugged in)
```

---

## Troubleshooting

**Containers not starting:**
```powershell
docker compose logs postiz
docker compose logs temporal
```

**Can't reach Postiz from Mac:**
- Verify PC IP: `ipconfig` on Windows
- Verify firewall rule: try `curl http://[PC-IP]:4007` from Mac
- Check Docker Desktop is running

**Postiz UI blank after startup:**
Wait 3-5 minutes. Temporal and Elasticsearch take time to initialize on first run.

**Reset everything (nuclear option):**
```powershell
cd C:\postiz
docker compose down -v
docker compose up -d
```
This wipes all data including accounts — reconnect everything after.

---

## Running Claude Code on this PC

Once Claude Code is installed (Step 2), you can run the implementation tasks from this machine. Claude Code on Windows works the same as Mac.

Open PowerShell in the project directory:
```powershell
cd "C:\Users\[YourUsername]\Documents\New project"
claude
```
