/**
 * CulinaryOS Port Conflict Auto-Healing & Process Supervisor
 *
 * Automatically detects and cleans up zombie processes holding ports:
 * 3000 (API), 5172 (POS), 5173 (KDS), 5174 (Admin), 5175 (KitchenKit),
 * 5176 (Storefront), 5177 (Ops), 5180 (Desktop Workstation).
 *
 * Cross-platform: Windows (netstat/PowerShell/taskkill), POSIX (lsof/ss/kill).
 */
import * as net from 'net';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const CULINARYOS_PORTS = [3000, 5172, 5173, 5174, 5175, 5176, 5177, 5180] as const;

export interface PortProcessInfo {
  port: number;
  pid: number;
  processName?: string;
  commandLine?: string;
}

export interface PortHealResult {
  port: number;
  occupied: boolean;
  pid?: number;
  processName?: string;
  healed: boolean;
  message: string;
}

/**
 * Checks if a TCP port is currently free/available for binding.
 */
export function isPortAvailable(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, host);
  });
}

/**
 * Finds the Process ID (PID) occupying a specific TCP port.
 */
export async function findProcessOnPort(port: number): Promise<PortProcessInfo | null> {
  const isWin = process.platform === 'win32';

  if (isWin) {
    try {
      const { stdout } = await execAsync(`netstat -ano -p tcp`);
      const lines = stdout.split('\n');
      for (const line of lines) {
        // Look for LISTENING on :port
        const trimmed = line.trim();
        if (!trimmed.includes('LISTENING')) continue;

        // Match patterns like 0.0.0.0:3000 or 127.0.0.1:3000 or [::]:3000
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 5) {
          const localAddr = parts[1];
          const pidStr = parts[parts.length - 1];
          const portMatch = localAddr.match(/:(\d+)$/);
          if (portMatch && parseInt(portMatch[1], 10) === port) {
            const pid = parseInt(pidStr, 10);
            if (!isNaN(pid) && pid > 0) {
              const name = await getProcessNameByPid(pid);
              return { port, pid, processName: name };
            }
          }
        }
      }
    } catch {
      // Fallback or command error
    }
  } else {
    // macOS / Linux using lsof or fuser
    try {
      const { stdout } = await execAsync(`lsof -i :${port} -sTCP:LISTEN -t`);
      const pidStr = stdout.trim().split('\n')[0];
      const pid = parseInt(pidStr, 10);
      if (!isNaN(pid) && pid > 0) {
        const name = await getProcessNameByPid(pid);
        return { port, pid, processName: name };
      }
    } catch {
      // lsof returns exit 1 if no process found
    }
  }

  return null;
}

/**
 * Retrieves the executable or process name for a given PID.
 */
export async function getProcessNameByPid(pid: number): Promise<string> {
  if (pid <= 0) return 'unknown';
  const isWin = process.platform === 'win32';

  try {
    if (isWin) {
      const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
      const match = stdout.match(/"([^"]+)"/);
      if (match && match[1]) {
        return match[1];
      }
    } else {
      const { stdout } = await execAsync(`ps -p ${pid} -o comm=`);
      return stdout.trim() || 'unknown';
    }
  } catch {
    // Process might have exited
  }
  return 'unknown';
}

/**
 * Safely kills a process by PID, preventing suicide or killing critical OS processes.
 */
export async function killProcess(pid: number): Promise<boolean> {
  if (pid <= 4 || pid === process.pid) {
    // Refuse to kill system processes or self
    return false;
  }

  const isWin = process.platform === 'win32';

  try {
    if (isWin) {
      await execAsync(`taskkill /F /PID ${pid} /T`);
    } else {
      process.kill(pid, 'SIGKILL');
    }
    // Give OS a moment to release socket
    await new Promise((r) => setTimeout(r, 300));
    return true;
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
      await new Promise((r) => setTimeout(r, 300));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Scans a list of ports (or default CulinaryOS ports), detects conflicts,
 * terminates zombie processes locking them, and verifies recovery.
 */
export async function healPortConflicts(ports: readonly number[] = CULINARYOS_PORTS): Promise<PortHealResult[]> {
  const results: PortHealResult[] = [];

  for (const port of ports) {
    const available = await isPortAvailable(port);
    if (available) {
      results.push({
        port,
        occupied: false,
        healed: false,
        message: `Port ${port} is free and ready.`,
      });
      continue;
    }

    // Port is occupied, find PID
    const proc = await findProcessOnPort(port);
    if (!proc) {
      results.push({
        port,
        occupied: true,
        healed: false,
        message: `Port ${port} is occupied by an external/system socket.`,
      });
      continue;
    }

    // Kill the zombie process
    const killed = await killProcess(proc.pid);
    const freeNow = await isPortAvailable(port);

    if (killed && freeNow) {
      results.push({
        port,
        occupied: true,
        pid: proc.pid,
        processName: proc.processName,
        healed: true,
        message: `Successfully terminated zombie process ${proc.processName || 'PID ' + proc.pid} on port ${port}. Port is now free.`,
      });
    } else {
      results.push({
        port,
        occupied: true,
        pid: proc.pid,
        processName: proc.processName,
        healed: false,
        message: `Failed to release port ${port} from ${proc.processName || 'PID ' + proc.pid}.`,
      });
    }
  }

  return results;
}

/**
 * Ensures all required ports are free, attempting auto-heal on any conflicts.
 * Returns true if all ports are available.
 */
export async function ensurePortsFree(ports: readonly number[] = CULINARYOS_PORTS): Promise<boolean> {
  const results = await healPortConflicts(ports);
  for (const res of results) {
    const isFree = !res.occupied || res.healed;
    if (!isFree) {
      return false;
    }
  }
  return true;
}

// Standalone CLI execution
if (process.argv[1]?.replace(/\\/g, '/').includes('port-healer')) {
  console.log('\n======================================================');
  console.log('       CulinaryOS Port Conflict Auto-Healer           ');
  console.log('======================================================\n');

  healPortConflicts().then((results) => {
    console.log('| Port | Status | Process / PID | Action / Details |');
    console.log('|---|---|---|---|');
    for (const r of results) {
      const status = !r.occupied ? '🟢 FREE' : r.healed ? '⚡ HEALED' : '🔴 OCCUPIED';
      const proc = r.pid ? `${r.processName || 'Unknown'} (PID ${r.pid})` : 'None';
      console.log(`| ${r.port} | ${status} | ${proc} | ${r.message} |`);
    }
    console.log('------------------------------------------------------\n');
  });
}
