// ============================================================
// CulinaryOS — One-Command Turnkey Quickstart Launcher
// For Sean, operators, developers, and first-time testers.
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

const ROOT_DIR = path.resolve(__dirname, '..');

function printBanner() {
  console.clear();
  console.log('\x1b[38;5;208m');
  console.log(`
   ██████╗██╗   ██╗██╗     ██╗███╗   ██╗ █████╗ ██████╗ ██╗   ██╗ ██████╗ ███████╗
  ██╔════╝██║   ██║██║     ██║████╗  ██║██╔══██╗██╔══██╗╚██╗ ██╔╝██╔═══██╗██╔════╝
  ██║     ██║   ██║██║     ██║██╔██╗ ██║███████║██████╔╝ ╚████╔╝ ██║   ██║███████╗
  ██║     ██║   ██║██║     ██║██║╚██╗██║██╔══██║██╔══██╗  ╚██╔╝  ██║   ██║╚════██║
  ╚██████╗╚██████╔╝███████╗██║██║ ╚████║██║  ██║██║  ██║   ██║   ╚██████╔╝███████║
   ╚═════╝ ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚══════╝
  `);
  console.log('\x1b[0m');
  console.log('\x1b[1m\x1b[36m  🚀 The Open Operating System for Restaurants ("Linux for Restaurants")\x1b[0m');
  console.log('\x1b[90m  MIT Licensed · Sovereign · Real-Time 3D Spatial · Zero Hard AI Dependencies\x1b[0m\n');
}

function ensureEnvFile() {
  const envPath = path.join(ROOT_DIR, '.env');
  const examplePath = path.join(ROOT_DIR, '.env.example');

  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    console.log('\x1b[33m⚡ No .env found. Automatically creating .env from .env.example for zero-config demo mode...\x1b[0m');
    fs.copyFileSync(examplePath, envPath);
    console.log('\x1b[32m✅ .env created successfully.\x1b[0m\n');
  }
}

function printServiceDirectory() {
  console.log('\x1b[1m\x1b[37m========================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[32m                     LIVE APPLICATION SURFACES                         \x1b[0m');
  console.log('\x1b[1m\x1b[37m========================================================================\x1b[0m\n');

  console.log('  \x1b[1m\x1b[35m[🖥️] Desktop Workstation\x1b[0m ➜ \x1b[4m\x1b[36mhttp://localhost:5180\x1b[0m');
  console.log('      • \x1b[90mFeatures:\x1b[0m Multi-Surface Kiosk, F1-F6 Hotkeys, Split-Screen POS & KDS Dual View\n');

  console.log('  \x1b[1m\x1b[33m[1] POS Terminal\x1b[0m       ➜ \x1b[4m\x1b[36mhttp://localhost:5172\x1b[0m');
  console.log('      • \x1b[90mPIN Logins:\x1b[0m \x1b[32m1234\x1b[0m (Server) · \x1b[35m5678\x1b[0m (Manager)');
  console.log('      • \x1b[90mFeatures:\x1b[0m 2D Grid / 3D Three.js Spatial Floor Map, Tap-to-Pay, Hardware Hub\n');

  console.log('  \x1b[1m\x1b[33m[2] Kitchen Display\x1b[0m    ➜ \x1b[4m\x1b[36mhttp://localhost:5173\x1b[0m');
  console.log('      • \x1b[90mFeatures:\x1b[0m Live Ticket Aging Timers, Station Tabs (Grill/Fry/Cold/Pass), Bump Bar\n');

  console.log('  \x1b[1m\x1b[33m[3] Admin Portal\x1b[0m       ➜ \x1b[4m\x1b[36mhttp://localhost:5174\x1b[0m');
  console.log('      • \x1b[90mFeatures:\x1b[0m Inventory Par Levels, 1-Click Purchase Orders, Menu 86ing, Staff & Tools\n');

  console.log('  \x1b[1m\x1b[33m[4] Online Storefront\x1b[0m  ➜ \x1b[4m\x1b[36mhttp://localhost:5176\x1b[0m');
  console.log('      • \x1b[90mFeatures:\x1b[0m FDA Top 9 Allergen Badges, Dietary Filters (Vegan/GF), Customer Cart\n');

  console.log('  \x1b[1m\x1b[33m[5] Android Mobile / POS\x1b[0m➜ \x1b[4m\x1b[36mpnpm mobile:android\x1b[0m');
  console.log('      • \x1b[90mFeatures:\x1b[0m Native Android Tablet & Handheld Terminal build (React Native + Expo)\n');

  console.log('  \x1b[1m\x1b[33m[6] Unified Hono API\x1b[0m   ➜ \x1b[4m\x1b[36mhttp://localhost:3000\x1b[0m');
  console.log('      • \x1b[90mFeatures:\x1b[0m Order Fire Spine, Ops Routes (/v1/ops/*), Extension Marketplace\n');

  console.log('\x1b[1m\x1b[37m------------------------------------------------------------------------\x1b[0m');
  console.log('\x1b[1m\x1b[35m  🧭 SEAN\'S 3-MINUTE TEST WORKFLOW:\x1b[0m');
  console.log('  1. Open \x1b[36mhttp://localhost:5172\x1b[0m ➔ Enter PIN \x1b[32m1234\x1b[0m.');
  console.log('  2. Click \x1b[1m"Table Service"\x1b[0m ➔ Switch to \x1b[1m"3D Spatial"\x1b[0m to view the Three.js dining room.');
  console.log('  3. Click any table ➔ Add items ➔ Click \x1b[32m"Send to Kitchen"\x1b[0m.');
  console.log('  4. Open \x1b[36mhttp://localhost:5173\x1b[0m ➔ Watch tickets appear with live aging timers.');
  console.log('  5. Open \x1b[36mhttp://localhost:5174\x1b[0m ➔ View real-time inventory deductions in Pantry.');
  console.log('\x1b[1m\x1b[37m========================================================================\x1b[0m\n');
  console.log('\x1b[90mStarting services via Turborepo... Press Ctrl+C at any time to stop.\x1b[0m\n');
}

async function start() {
  printBanner();
  ensureEnvFile();
  printServiceDirectory();

  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';

  const child: ChildProcess = spawn(npmCmd, ['dev'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true,
  });

  // Automatically open the user's browser to the Workstation dashboard after booting
  setTimeout(() => {
    try {
      const targetUrl = 'http://localhost:5180';
      if (isWindows) {
        spawn('cmd', ['/c', 'start', targetUrl], { detached: true, stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        spawn('open', [targetUrl], { detached: true, stdio: 'ignore' });
      } else {
        spawn('xdg-open', [targetUrl], { detached: true, stdio: 'ignore' });
      }
    } catch {
      // Non-fatal if browser cannot be automatically launched
    }
  }, 4000);

  const cleanup = () => {
    console.log('\n\x1b[33mShutting down all CulinaryOS services...\x1b[0m');
    child.kill('SIGINT');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

start().catch((err) => {
  console.error('Failed to start quickstart launcher:', err);
  process.exit(1);
});
