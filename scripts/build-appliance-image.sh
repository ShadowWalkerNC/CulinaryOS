#!/usr/bin/env bash
# ==============================================================================
# CulinaryOS Turnkey POS & KDS Linux Appliance Image Builder
# Targets: Raspberry Pi 4/5 (ARM64) and Intel/AMD Mini-PCs (x86_64)
# ==============================================================================

set -euo pipefail

echo "========================================================"
echo "  CulinaryOS Turnkey Linux Appliance Builder (v1.2)     "
echo "========================================================"

APPLIANCE_DIR="/opt/culinaryos"
USER_NAME="culinary"

# 1. System Dependencies
echo "[1/5] Installing core runtime packages..."
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
  curl \
  git \
  chromium \
  xorg \
  openbox \
  lightdm \
  avahi-daemon \
  libnss-mdns \
  alsa-utils

# 2. Node.js 20 LTS & pnpm
echo "[2/5] Setting up Node.js LTS and pnpm..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo corepack enable
sudo corepack prepare pnpm@9.15.4 --activate

# 3. Create CulinaryOS Systemd Unit
echo "[3/5] Configuring systemd background services..."
sudo tee /etc/systemd/system/culinaryos-appliance.service > /dev/null << 'EOF'
[Unit]
Description=CulinaryOS High-Availability Restaurant Appliance
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=culinary
WorkingDirectory=/opt/culinaryos
ExecStart=/usr/bin/pnpm run start
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable culinaryos-appliance.service || true

# 4. Openbox Auto-Kiosk for POS & KDS
echo "[4/5] Setting up Chromium full-screen auto-kiosk..."
mkdir -p /home/${USER_NAME}/.config/openbox
tee /home/${USER_NAME}/.config/openbox/autostart > /dev/null << 'EOF'
# Disable screen sleep and DPMS blanking
xset -dpms
xset s off
xset s noblank

# Wait for local server
while ! curl -s http://localhost:5172 > /dev/null; do
  sleep 1
done

# Launch Chromium in kiosk mode
chromium --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --disable-features=Translate \
  --check-for-update-interval=31536000 \
  --touch-events=enabled \
  http://localhost:5172
EOF

# 5. Local Network mDNS Broadcast
echo "[5/5] Broadcasting culinaryos.local over mDNS..."
sudo systemctl enable avahi-daemon || true
sudo systemctl start avahi-daemon || true

echo "========================================================"
echo "  CulinaryOS Turnkey Appliance Configured Successfully  "
echo "  Access POS: http://localhost:5172                     "
echo "  Access KDS: http://localhost:5173                     "
echo "  Access CFD: http://localhost:5172 -> CFD View         "
echo "========================================================"
