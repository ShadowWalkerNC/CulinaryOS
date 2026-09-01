// ============================================================
// CulinaryOS — One-Command Turnkey Quickstart Launcher
// For Sean, operators, developers, and first-time testers.
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

const ROOT_DIR = path.resolve(__dirname, '..');

function getLanIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const list = interfaces[name];
      if (list) {
        for (const iface of list) {
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address;
          }
        }
      }
    }
  } catch {
    // fallback
  }
  return 'localhost';
}

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
  const lanIp = getLanIp();
  const lanTag = lanIp !== 'localhost' ? ` \x1b[90m(Wi-Fi: \x1b[33mhttp://${lanIp}:\x1b[90m` : '';

  console.log('\x1b[1m\x1b[37m========================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[32m                     LIVE APPLICATION SURFACES                         \x1b[0m');
  console.log('\x1b[1m\x1b[37m========================================================================\x1b[0m\n');

  console.log(`  \x1b[1m\x1b[35m[🖥️] Desktop Workstation\x1b[0m ➜ \x1b[4m\x1b[36mhttp://localhost:5180\x1b[0m${lanTag ? lanTag + '5180)\x1b[0m' : ''}`);
  console.log('      • \x1b[90mFeatures:\x1b[0m Multi-Surface Kiosk, F1-F6 Hotkeys, Split-Screen POS & KDS Dual View\n');

  console.log(`  \x1b[1m\x1b[33m[1] POS Terminal\x1b[0m       ➜ \x1b[4m\x1b[36mhttp://localhost:5172\x1b[0m${lanTag ? lanTag + '5172)\x1b[0m' : ''}`);
  console.log('      • \x1b[90mPIN Logins:\x1b[0m \x1b[32m1234\x1b[0m (Server) · \x1b[35m5678\x1b[0m (Manager)');
  console.log('      • \x1b[90mFeatures:\x1b[0m 2D Grid / 3D Three.js Spatial Floor Map, Tap-to-Pay, Hardware Hub\n');

  console.log(`  \x1b[1m\x1b[33m[2] Kitchen Display\x1b[0m    ➜ \x1b[4m\x1b[36mhttp://localhost:5173\x1b[0m${lanTag ? lanTag + '5173)\x1b[0m' : ''}`);
  console.log('      • \x1b[90mFeatures:\x1b[0m Live Ticket Aging Timers, Station Tabs (Grill/Fry/Cold/Pass), Bump Bar\n');

  console.log(`  \x1b[1m\x1b[33m[3] Admin Portal\x1b[0m       ➜ \x1b[4m\x1b[36mhttp://localhost:5174\x1b[0m${lanTag ? lanTag + '5174)\x1b[0m' : ''}`);
  console.log('      • \x1b[90mFeatures:\x1b[0m Inventory Par Levels, 1-Click Purchase Orders, Menu 86ing, Staff & Tools\n');

  console.log(`  \x1b[1m\x1b[33m[4] Online Storefront\x1b[0m  ➜ \x1b[4m\x1b[36mhttp://localhost:5176\x1b[0m${lanTag ? lanTag + '5176)\x1b[0m' : ''}`);
  console.log('      • \x1b[90mFeatures:\x1b[0m FDA Top 9 Allergen Badges, Dietary Filters (Vegan/GF), Customer Cart\n');

  console.log(`  \x1b[1m\x1b[33m[5] Unified Hono API\x1b[0m   ➜ \x1b[4m\x1b[36mhttp://localhost:3000\x1b[0m${lanTag ? lanTag + '3000)\x1b[0m' : ''}`);
  console.log('      • \x1b[90mFeatures:\x1b[0m Order Fire Spine, Ops Routes (/v1/ops/*), Extension Marketplace\n');

  if (lanIp !== 'localhost') {
    console.log('\x1b[1m\x1b[36m  📱 Connect Mobile Tablets, iPads & Kitchen TVs:\x1b[0m');
    console.log(`     Open \x1b[1m\x1b[33mhttp://${lanIp}:5172\x1b[0m on any device connected to your Wi-Fi network!\n`);
  }

  console.log('\x1b[1m\x1b[37m------------------------------------------------------------------------\x1b[0m');
  console.log('\x1b[1m\x1b[35m  🧭 3-MINUTE TEST WORKFLOW:\x1b[0m');
  console.log('  1. Open \x1b[36mhttp://localhost:5172\x1b[0m ➔ Enter PIN \x1b[32m1234\x1b[0m.');
  console.log('  2. Click \x1b[1m"Table Service"\x1b[0m ➔ Switch to \x1b[1m"3D Spatial"\x1b[0m to view the Three.js dining room.');
  console.log('  3. Click any table ➔ Add items ➔ Click \x1b[32m"Send to Kitchen"\x1b[0m.');
  console.log('  4. Open \x1b[36mhttp://localhost:5173\x1b[0m ➔ Watch tickets appear with live aging timers.');
  console.log('  5. Open \x1b[36mhttp://localhost:5174\x1b[0m ➔ View real-time inventory deductions in Pantry.');
  console.log('\x1b[1m\x1b[37m========================================================================\x1b[0m\n');
  console.log('\x1b[90mStarting services via Turborepo... Press Ctrl+C at any time to stop.\x1b[0m\n');
}

function getProfile(): 'demo' | 'clean' | 'marketing' {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith('--profile=')) {
      const p = arg.split('=')[1]?.toLowerCase();
      if (p === 'clean' || p === 'marketing' || p === 'demo') return p;
    }
    if (arg === '--clean') return 'clean';
    if (arg === '--marketing') return 'marketing';
    if (arg === '--demo') return 'demo';
  }
  const envProfile = (process.env.INSTALL_PROFILE || 'demo').toLowerCase();
  if (envProfile === 'clean' || envProfile === 'marketing') return envProfile;
  return 'demo';
}

async function start() {
  const profile = getProfile();
  printBanner();
  ensureEnvFile();

  console.log(`\x1b[1m\x1b[35m⚡ Active Profile: \x1b[32m${profile.toUpperCase()}\x1b[0m ` +
    (profile === 'demo' ? '(Sandbox pre-loaded with "The Golden Fork")' :
     profile === 'clean' ? '(Clean slate for live restaurant onboarding)' :
     '(Public marketing landing page & feature showcase)'));
  console.log();

  printServiceDirectory();

  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';

  const child: ChildProcess = spawn(npmCmd, ['dev'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true,
  });

  // Automatically open the user's browser to the tailored landing page
  setTimeout(() => {
    try {
      let targetUrl = 'http://localhost:5180'; // Demo Workstation
      if (profile === 'clean') {
        targetUrl = 'http://localhost:5174'; // Admin Portal setup & onboarding
      } else if (profile === 'marketing') {
        targetUrl = 'http://localhost:5176'; // Marketing Landing Page
      }

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
