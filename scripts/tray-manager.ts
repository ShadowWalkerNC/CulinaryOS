/**
 * CulinaryOS System Tray Daemon & Supervisor Engine
 *
 * Provides:
 * 1. Background process supervisor managing API, POS, KDS, Admin, Storefront, Desktop.
 * 2. Automated pre-launch port self-healing (kills lingering zombie locks).
 * 3. Local IPC / HTTP Supervisor API on port 5188 for UI integration & desktop control.
 * 4. Background mDNS advertiser (culinaryos.local).
 * 5. Windows System Tray NotifyIcon integration & interactive CLI dashboard.
 * 6. Clean logging to `.culinaryos-daemon.log`.
 */
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { healPortConflicts, isPortAvailable, CULINARYOS_PORTS } from './port-healer.js';
import { startMdnsAdvertiser, generatePairingPayload, generateDataUrlQr, getLanIpv4, MdnsService } from './mdns-qr-discovery.js';
import { runDiagnostics, DiagnosticReport } from './doctor.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logFile = path.join(rootDir, '.culinaryos-daemon.log');
const SUPERVISOR_PORT = 5188;

export interface SupervisorState {
  status: 'stopped' | 'starting' | 'running' | 'error';
  startedAt: string | null;
  pid: number | null;
  lanIp: string;
  ports: { port: number; status: 'active' | 'free' | 'unknown' }[];
  lastDiagnostics: DiagnosticReport | null;
}

export class TrayManager {
  private child: ChildProcess | null = null;
  private mdns: MdnsService | null = null;
  private httpServer: http.Server | null = null;
  private state: SupervisorState = {
    status: 'stopped',
    startedAt: null,
    pid: null,
    lanIp: getLanIpv4(),
    ports: CULINARYOS_PORTS.map((p) => ({ port: p, status: 'free' })),
    lastDiagnostics: null,
  };

  /**
   * Starts supervisor, heals ports, launches services, boots mDNS and HTTP control API.
   */
  async start(silent = false): Promise<void> {
    if (this.state.status === 'running') return;
    this.state.status = 'starting';

    if (!silent) {
      console.log('⚡ [Supervisor] Performing port conflict auto-healing...');
    }
    await healPortConflicts();

    // Start background child process
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';

    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    logStream.write(`\n--- CulinaryOS Workstation Started: ${new Date().toISOString()} ---\n`);

    this.child = spawn(npmCmd, ['dev'], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: false,
    });

    this.state.pid = this.child.pid || null;
    this.state.startedAt = new Date().toISOString();
    this.state.status = 'running';

    if (this.child.stdout) {
      this.child.stdout.pipe(logStream);
    }
    if (this.child.stderr) {
      this.child.stderr.pipe(logStream);
    }

    this.child.on('exit', (code) => {
      this.state.status = 'stopped';
      this.state.pid = null;
      logStream.write(`\n--- Services Exited with code ${code}: ${new Date().toISOString()} ---\n`);
    });

    // Start mDNS advertising
    try {
      this.mdns = startMdnsAdvertiser();
    } catch {
      // Ignored
    }

    // Start HTTP Control API
    this.startHttpControlApi();

    if (!silent) {
      console.log('✅ [Supervisor] CulinaryOS services running in background.');
      console.log(`📡 [Supervisor] Management API active on http://localhost:${SUPERVISOR_PORT}`);
      console.log(`📝 [Supervisor] Logs streaming to ${logFile}`);
    }
  }

  /**
   * Stops background services and cleanups.
   */
  async stop(): Promise<void> {
    if (this.child && this.child.pid) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/F', '/PID', this.child.pid.toString(), '/T']);
        } else {
          this.child.kill('SIGTERM');
        }
      } catch {
        // Ignored
      }
      this.child = null;
    }

    if (this.mdns) {
      this.mdns.stop();
      this.mdns = null;
    }

    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }

    this.state.status = 'stopped';
    this.state.pid = null;
  }

  /**
   * Restarts all services.
   */
  async restart(): Promise<void> {
    await this.stop();
    await new Promise((r) => setTimeout(r, 1000));
    await this.start();
  }

  /**
   * Starts the local HTTP control server for UI / tray interaction.
   */
  private startHttpControlApi(): void {
    if (this.httpServer) return;

    this.httpServer = http.createServer(async (req, res) => {
      // Enable CORS for all local development surfaces
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://localhost:${SUPERVISOR_PORT}`);

      try {
        if (url.pathname === '/api/status' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.state));
          return;
        }

        if (url.pathname === '/api/diagnostics' && req.method === 'GET') {
          const report = await runDiagnostics();
          this.state.lastDiagnostics = report;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(report));
          return;
        }

        if (url.pathname === '/api/heal-ports' && req.method === 'POST') {
          const results = await healPortConflicts();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, results }));
          return;
        }

        if (url.pathname === '/api/pairing-qr' && req.method === 'GET') {
          const lanIp = getLanIpv4();
          const pairing = generatePairingPayload({ lanIp });
          const qrDataUrl = await generateDataUrlQr(pairing.urls.desktop);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ pairing, qrDataUrl }));
          return;
        }

        if (url.pathname === '/api/start' && req.method === 'POST') {
          await this.start(true);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, state: this.state }));
          return;
        }

        if (url.pathname === '/api/stop' && req.method === 'POST') {
          await this.stop();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, state: this.state }));
          return;
        }

        if (url.pathname === '/api/restart' && req.method === 'POST') {
          await this.restart();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, state: this.state }));
          return;
        }

        if (url.pathname === '/api/open' && req.method === 'POST') {
          const target = url.searchParams.get('surface') || 'desktop';
          const portMap: Record<string, number> = {
            desktop: 5180,
            pos: 5172,
            kds: 5173,
            admin: 5174,
            kitchenkit: 5175,
            web: 5176,
            ops: 5177,
          };
          const port = portMap[target] || 5180;
          this.openBrowser(`http://localhost:${port}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, url: `http://localhost:${port}` }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
      }
    });

    this.httpServer.listen(SUPERVISOR_PORT, '127.0.0.1');
  }

  /**
   * Spawns OS default browser to open specified URL.
   */
  openBrowser(targetUrl: string): void {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    if (isWin) {
      spawn('cmd', ['/c', 'start', targetUrl], { detached: true, stdio: 'ignore' });
    } else if (isMac) {
      spawn('open', [targetUrl], { detached: true, stdio: 'ignore' });
    } else {
      spawn('xdg-open', [targetUrl], { detached: true, stdio: 'ignore' });
    }
  }

  /**
   * Launches Windows System Tray NotifyIcon via PowerShell script.
   */
  launchWindowsSystemTrayIcon(): void {
    if (process.platform !== 'win32') return;

    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing

      $notify = New-Object System.Windows.Forms.NotifyIcon
      $notify.Icon = [System.Drawing.SystemIcons]::Application
      $notify.Text = "CulinaryOS Workstation"
      $notify.Visible = $true

      $contextMenu = New-Object System.Windows.Forms.ContextMenu
      $itemDesktop = $contextMenu.MenuItems.Add("Open Desktop Workstation (:5180)")
      $itemPOS = $contextMenu.MenuItems.Add("Open POS Terminal (:5172)")
      $itemKDS = $contextMenu.MenuItems.Add("Open Kitchen KDS (:5173)")
      $itemAdmin = $contextMenu.MenuItems.Add("Open Admin Back-Office (:5174)")
      $contextMenu.MenuItems.Add("-")
      $itemDoctor = $contextMenu.MenuItems.Add("Run Diagnostics Preflight")
      $itemHeal = $contextMenu.MenuItems.Add("Heal Port Conflicts")
      $contextMenu.MenuItems.Add("-")
      $itemRestart = $contextMenu.MenuItems.Add("Restart Services")
      $itemExit = $contextMenu.MenuItems.Add("Exit CulinaryOS")

      $itemDesktop.add_Click({ Start-Process "http://localhost:5180" })
      $itemPOS.add_Click({ Start-Process "http://localhost:5172" })
      $itemKDS.add_Click({ Start-Process "http://localhost:5173" })
      $itemAdmin.add_Click({ Start-Process "http://localhost:5174" })
      $itemDoctor.add_Click({ Invoke-RestMethod -Uri "http://localhost:${SUPERVISOR_PORT}/api/diagnostics" -Method Get; Start-Process "http://localhost:5180" })
      $itemHeal.add_Click({ Invoke-RestMethod -Uri "http://localhost:${SUPERVISOR_PORT}/api/heal-ports" -Method Post })
      $itemRestart.add_Click({ Invoke-RestMethod -Uri "http://localhost:${SUPERVISOR_PORT}/api/restart" -Method Post })
      $itemExit.add_Click({
        Invoke-RestMethod -Uri "http://localhost:${SUPERVISOR_PORT}/api/stop" -Method Post
        $notify.Visible = $false
        [System.Windows.Forms.Application]::Exit()
      })

      $notify.ContextMenu = $contextMenu
      $notify.ShowBalloonTip(3000, "CulinaryOS Active", "Restaurant OS is running silently in the background.", [System.Windows.Forms.ToolTipIcon]::Info)

      [System.Windows.Forms.Application]::Run()
    `;

    spawn('powershell', ['-WindowStyle', 'Hidden', '-Command', psScript], {
      detached: true,
      stdio: 'ignore',
    });
  }
}

// -------------------------------------------------------------
// Interactive CLI Supervisor Runner
// -------------------------------------------------------------
if (process.argv[1]?.endsWith('tray-manager.ts') || process.argv[1]?.endsWith('tray-manager.js')) {
  const manager = new TrayManager();

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
  console.log('\x1b[1m\x1b[36m  🚀 CulinaryOS Background System Tray & Supervisor Daemon\x1b[0m\n');

  manager.start().then(() => {
    manager.launchWindowsSystemTrayIcon();

    const lanIp = getLanIpv4();
    console.log(`\n======================================================`);
    console.log(`  🖥️  Desktop Workstation: \x1b[36mhttp://localhost:5180\x1b[0m (LAN: \x1b[33mhttp://${lanIp}:5180\x1b[0m)`);
    console.log(`  📱 POS Terminal:        \x1b[36mhttp://localhost:5172\x1b[0m`);
    console.log(`  🍳 Kitchen KDS:         \x1b[36mhttp://localhost:5173\x1b[0m`);
    console.log(`  📦 Admin Portal:        \x1b[36mhttp://localhost:5174\x1b[0m`);
    console.log(`  🏷️ mDNS Discovery:      \x1b[32mhttp://culinaryos.local:5180\x1b[0m`);
    console.log(`  ⚙️ Supervisor API:      \x1b[35mhttp://localhost:5188\x1b[0m`);
    console.log(`======================================================\n`);
    console.log(`[INFO] System tray icon initialized. Press Ctrl+C to stop all services.\n`);
  });

  const cleanup = async () => {
    console.log('\n\x1b[33m[Supervisor] Shutting down all CulinaryOS services...\x1b[0m');
    await manager.stop();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
