import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Download Native Rust Desktop & Local Server (v1.3.1) | CulinaryOS',
  description:
    'Download the open-source CulinaryOS v1.3.1 Native Rust Single-Port Workstation (CulinaryOS-v1.3.1-Windows-x64.zip). Required for all Free and SaaS Cloud Bridge restaurants.',
};

const RELEASE_VERSION = 'v1.3.1';
const WINDOWS_INSTALLER_URL =
  'https://github.com/ShadowWalkerNC/CulinaryOS/releases/download/v1.3.1/CulinaryOS-v1.3.1-Windows-x64.zip';
const WINDOWS_INSTALLER_SHA256 =
  'bf86464cc6a510bbf3c89b5932b490810f0d05a6e00d3153d2d9a70170c2afa2';

const binaries = [
  {
    name: 'culinaryos-desktop.exe',
    role: 'v1.3.1 Native Rust Single-Port Workstation (Port 3000)',
    desc: 'Single native Rust binary serving the Master Workstation shell (http://127.0.0.1:3000), 5-Step Setup Wizard (/setup), POS (/pos/), KDS (/kds/), Admin (/admin/), KitchenKit (/kitchenkit/), Storefront (/menu/), Ops (/ops/), Display (/display/), and Embedded REST API Gateway on Port 3000.',
    cmd: 'culinaryos-desktop.exe --port 3000',
  },
  {
    name: 'culinaryos-site.exe',
    role: 'Headless Local LAN Server & Cloud Bridge Node',
    desc: 'High-throughput Axum server exposing /v1/orders, /v1/kds/tickets, /v1/tips/calculate, and /v1/cloud/connect for multi-terminal dining rooms.',
    cmd: 'cargo run --release --bin culinaryos-site',
  },
  {
    name: 'culinaryos-edge-daemon.exe',
    role: 'ESC/POS Thermal/Impact Printer & Cash Drawer Daemon',
    desc: 'Direct hardware daemon for Star TSP143IV, Epson TM-m30, Star SP742 impact kitchen printers, and RJ11/RJ12 cash drawer kick ports.',
    cmd: 'cargo run --release --bin culinaryos-edge-daemon',
  },
];

export default function DownloadPage() {
  return (
    <div className="pt-16 pb-24">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="max-w-3xl mb-14">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-block px-3 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-xs font-mono font-bold uppercase tracking-widest">
              STEP 01 / OFFICIAL RELEASE {RELEASE_VERSION} (FREE &amp; SAAS)
            </span>
            <span className="inline-block px-3 py-1 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-mono font-bold uppercase tracking-widest">
              SHA-256 VERIFIED RELEASE
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-5">
            Install the Native <span className="text-[#ff6b35]">Rust Workstation</span>
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">
            Every CulinaryOS venue runs our standalone open-source Rust application locally on-premise on a single unified port (<code className="text-[#ff6b35] font-mono">127.0.0.1:3000</code>) so Point of Sale, Kitchen Display, receipt printers, and cash drawers execute at sub-millisecond LAN speed and never stop when internet drops.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href={WINDOWS_INSTALLER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] inline-flex items-center justify-center px-6 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white font-bold text-xs uppercase tracking-wider active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35]"
            >
              Download Windows Workstation Installer (v1.3.1 .zip)
            </a>
            <a
              href="https://github.com/ShadowWalkerNC/CulinaryOS/releases/tag/v1.3.1"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] inline-flex items-center justify-center px-6 rounded-lg bg-[#141820] border border-[#2a303c] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1c222d] active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35]"
            >
              View Release Notes &amp; Source
            </a>
          </div>

          <div className="mt-6 rounded-xl bg-[#0e1117] border border-[#232832] p-4 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-emerald-400 font-bold uppercase tracking-wider">
                SHA-256 Checksum Verification Badge (CulinaryOS-v1.3.1-Windows-x64.zip)
              </span>
              <span className="px-2 py-0.5 rounded bg-[#181c24] border border-[#2a303c] text-slate-300 text-[11px]">
                Port 3000 Single-Port Architecture
              </span>
            </div>
            <div className="text-slate-300 break-all bg-[#090b0e] p-2.5 rounded border border-[#1c2029]">
              {WINDOWS_INSTALLER_SHA256}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Verify in PowerShell: <code className="text-amber-300">Get-FileHash .\CulinaryOS-v1.3.1-Windows-x64.zip -Algorithm SHA256</code>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {binaries.map((bin) => (
            <div
              key={bin.name}
              className="p-6 rounded-xl bg-[#12151b] border border-[#232832] flex flex-col justify-between"
            >
              <div>
                <span className="inline-block px-2.5 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] font-mono text-xs font-bold mb-3">
                  {bin.name}
                </span>
                <h2 className="text-base font-bold text-white mb-2">{bin.role}</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-5">{bin.desc}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#090b0e] border border-[#1c2029] font-mono text-xs text-emerald-400 overflow-x-auto">
                $ {bin.cmd}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-[#12151b] border border-[#232832] p-8 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#ff6b35] font-bold">
                STEP 02 / SINGLE-PORT WORKSTATION &amp; OPTIONAL SAAS BRIDGE
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 mb-4">
                1-Click Local Boot on Port 3000 + Optional Cloud Bridge
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Extract <code className="text-[#ff6b35] font-mono">CulinaryOS-v1.3.1-Windows-x64.zip</code> and run <code className="text-[#ff6b35] font-mono">Install-CulinaryOS.cmd</code>. It installs to <code className="text-slate-200 font-mono">%LOCALAPPDATA%\CulinaryOS\culinaryos-desktop.exe</code> (no admin rights required) and launches all 7 restaurant SPAs plus the embedded REST API on <code className="text-emerald-400 font-mono">http://127.0.0.1:3000</code>. Subscribing to a CulinaryOS SaaS plan issues a signed <code className="text-[#ff6b35] font-mono">SignedSaasGrant</code> token that connects your local Rust server to our hosted Cloud Bridge:
              </p>
              <ul className="space-y-3 text-xs text-slate-200 mb-8 font-mono">
                <li className="flex items-start gap-2.5">
                  <span className="text-[#ff6b35] font-bold">+</span>
                  <span className="font-sans">
                    <strong className="font-mono text-white">cloud_storage_sync:</strong> Automated SHA-256 verified offsite delta replication &amp; encrypted disaster recovery vault.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#ff6b35] font-bold">+</span>
                  <span className="font-sans">
                    <strong className="font-mono text-white">online_ordering_bridge:</strong> Public web storefront orders relayed directly into your on-premise Rust KDS rail.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#ff6b35] font-bold">+</span>
                  <span className="font-sans">
                    <strong className="font-mono text-white">ai_autopilot:</strong> Predictive prep scaling, waste forecasting, and live 86-countdown intelligence.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#ff6b35] font-bold">+</span>
                  <span className="font-sans">
                    <strong className="font-mono text-white">multi_unit_commissary:</strong> Multi-location commissary transfer orders and organization-wide financial rollups.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#ff6b35] font-bold">+</span>
                  <span className="font-sans">
                    <strong className="font-mono text-white">managed_stripe_connect:</strong> Bring-Your-Own-Stripe Connect Standard with SAQ-A compliance.
                  </span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="min-h-[48px] inline-flex items-center px-6 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35]"
                >
                  Provision Cloud Bridge Grant
                </Link>
                <Link
                  href="/pricing"
                  className="min-h-[48px] inline-flex items-center px-6 rounded-lg bg-[#181c24] border border-[#2a303c] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#222834] active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35]"
                >
                  Compare Plans
                </Link>
              </div>
            </div>

            <div className="rounded-lg bg-[#090b0e] border border-[#1c2029] p-6 font-mono text-xs text-slate-200 space-y-3 overflow-x-auto">
              <div className="text-slate-500"># 1. Extract v1.3.1 zip &amp; launch Native Rust Single-Port Workstation (Port 3000)</div>
              <div className="text-emerald-400">$ .\Install-CulinaryOS.cmd</div>
              <div className="text-slate-400"># Master Shell: http://127.0.0.1:3000 | Setup: /setup | POS: /pos/ | KDS: /kds/</div>
              <div className="text-slate-500 pt-2"># 2. Enroll your local Rust node with your SaaS Grant</div>
              <div className="text-amber-300">
                $ curl -X POST http://127.0.0.1:3000/v1/cloud/connect \
              </div>
              <div className="text-amber-300 pl-4">
                -H &quot;Content-Type: application/json&quot; \
              </div>
              <div className="text-amber-300 pl-4">
                -d &apos;&#123;&quot;payload&quot;: &#123;...&#125;, &quot;signatureHex&quot;: &quot;...&quot;&#125;&apos;
              </div>
              <div className="text-slate-500 pt-2"># 3. Verify unlocked SaaS add-on capabilities</div>
              <div className="text-sky-300">$ curl http://127.0.0.1:3000/v1/cloud/status</div>
              <pre className="text-[11px] text-slate-300 bg-[#12151b] p-3 rounded border border-[#232832]">
{`{
  "installedApp": true,
  "version": "1.3.1",
  "port": 3000,
  "cloudConnected": true,
  "planTier": "saas_pro",
  "addons": [
    "ai_autopilot",
    "cloud_storage_sync",
    "managed_stripe_connect",
    "online_ordering_bridge"
  ]
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
