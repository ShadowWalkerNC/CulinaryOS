//! CulinaryOS Edge Hardware Daemon
//! Target: Raspberry Pi 5 / Compute Module 5 (ARM64 Linux)
//!
//! Exposes a high-throughput, low-latency local socket server (127.0.0.1:8100)
//! for raw ESC/POS spooling to USB receipt/kitchen printers (/dev/usb/lp0)
//! and GPIO-based kick triggers for cash drawers and sensor relays.

use std::error::Error;
use std::net::SocketAddr;
use std::path::Path;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

const DEFAULT_LISTEN_ADDR: &str = "127.0.0.1:8100";
const USB_PRINTER_PATH: &str = "/dev/usb/lp0";

/// Standard ESC/POS Cash Drawer Kick Sequence (Pin 2, 24V pulse)
const ESCPOS_DRAWER_KICK_PIN2: [u8; 5] = [0x1b, 0x70, 0x00, 0x19, 0xfa];

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let addr: SocketAddr = DEFAULT_LISTEN_ADDR.parse()?;
    let listener = TcpListener::bind(addr).await?;

    println!("[CulinaryOS Edge Daemon] Running on {}", addr);
    println!("[CulinaryOS Edge Daemon] Target USB spooler: {}", USB_PRINTER_PATH);

    loop {
        let (socket, client_addr) = listener.accept().await?;
        println!("[Edge Daemon] Client connected: {}", client_addr);

        tokio::spawn(async move {
            if let Err(e) = handle_client(socket).await {
                eprintln!("[Edge Daemon] Error handling client {}: {}", client_addr, e);
            }
        });
    }
}

async fn handle_client(mut stream: TcpStream) -> Result<(), Box<dyn Error>> {
    let mut buffer = vec![0u8; 8192];
    let n = stream.read(&mut buffer).await?;

    if n == 0 {
        return Ok(());
    }

    let payload = &buffer[..n];
    println!("[Edge Daemon] Received {} bytes from local client", n);

    // Inspect if command contains drawer kick sequence
    if payload.windows(5).any(|w| w == ESCPOS_DRAWER_KICK_PIN2) {
        println!("[Edge Daemon] Detected hardware cash drawer kick instruction");
    }

    // Forward to physical device if present (Linux /dev/usb/lp0)
    if Path::new(USB_PRINTER_PATH).exists() {
        match tokio::fs::OpenOptions::new()
            .write(true)
            .open(USB_PRINTER_PATH)
            .await
        {
            Ok(mut file) => {
                file.write_all(payload).await?;
                println!("[Edge Daemon] Successfully spooled {} bytes to {}", n, USB_PRINTER_PATH);
            }
            Err(e) => {
                eprintln!("[Edge Daemon] Failed to write to {}: {}", USB_PRINTER_PATH, e);
            }
        }
    } else {
        println!("[Edge Daemon] Hardware path {} not mounted (Simulation Mode: {} bytes acknowledged)", USB_PRINTER_PATH, n);
    }

    // Send ACK back to caller
    stream.write_all(b"OK:ACK\n").await?;
    Ok(())
}
