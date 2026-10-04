# CulinaryOS Edge Hardware Daemon (Rust)

Standalone hardware spooler and GPIO coordinator for **Raspberry Pi 5** and **Compute Module 5 (CM5)** edge appliances running Raspberry Pi OS (Debian 12 Bookworm / 64-bit ARM).

## Capabilities
- Raw high-speed socket listener on `127.0.0.1:8100`
- Direct USB kernel character device spooling (`/dev/usb/lp0`) for Epson TM-m30 / Star TSP143IV / Epson TM-U220
- Cash drawer RJ11/12 kick detection and hardware relay
- Headless simulation fallback when physical printer device is unmounted

## Native Build on Raspberry Pi
```bash
cd packages/hardware/daemon
cargo build --release
sudo cp target/release/culinaryos-edge-daemon /usr/local/bin/
```

## Systemd Service (`/etc/systemd/system/culinaryos-edge.service`)
```ini
[Unit]
Description=CulinaryOS Edge Hardware Daemon
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/culinaryos-edge-daemon
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```
