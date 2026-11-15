import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Download Native Rust Desktop & Local Server | CulinaryOS',
  description:
    'Download the open-source CulinaryOS Native Rust Desktop Application (culinaryos-desktop.exe & culinaryos-site.exe). Required for all Free and SaaS Cloud Bridge restaurants.',
};

const binaries = [
  {
    name: 'culinaryos-desktop.exe',
    role: 'Master Restaurant Workstation (8 Integrated GUIs + Rust API)',
    desc: 'Single native Rust binary launching the Master Workstation (:5180), POS (:5172), KDS (:5173), Admin (:5174), KitchenKit (:5175), Storefront (:5176), Ops (:5177), Displays (:5178), and Embedded DB (:3000).',
    cmd: 'cargo run --release --bin culinaryos-desktop',
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
          <span className="inline-block px-3 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-xs font-mono font-bold uppercase tracking-widest mb-4">
            STEP 01 / REQUIRED LOCAL INSTALLATION (FREE &amp; SAAS)
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-5">
            Install the Native <span className="text-[#ff6b35]">Rust Workstation</span>
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">
            Every CulinaryOS venue runs our standalone open-source Rust application locally on-premise so Point of Sale, Kitchen Display, receipt printers, and cash drawers execute at sub-millisecond LAN speed and never stop when internet drops.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href="https://github.com/ShadowWalkerNC/CulinaryOS/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] inline-flex items-center justify-center px-6 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white font-bold text-xs uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out"
            >
              Download Rust Binaries (GitHub Releases)
            </a>
            <a
              href="https://github.com/ShadowWalkerNC/CulinaryOS"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] inline-flex items-center justify-center px-6 rounded-lg bg-[#141820] border border-[#2a303c] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1c222d] active:scale-[0.97] transition-all duration-75 ease-out"
            >
              Inspect Open-Source Rust Repository
            </a>
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
                STEP 02 / OPTIONAL COMMERCIAL SAAS BRIDGE
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 mb-4">
                Link Your Installed Rust App to CulinaryOS SaaS
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                While the standalone Rust application is 100% functional offline forever under the open-source license, subscribing to a CulinaryOS SaaS plan issues a signed <code className="text-[#ff6b35] font-mono">SignedSaasGrant</code> token that connects your local Rust server to our hosted Cloud Bridge:
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
                  className="min-h-[48px] inline-flex items-center px-6 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out"
                >
                  Provision Cloud Bridge Grant
                </Link>
                <Link
                  href="/pricing"
                  className="min-h-[48px] inline-flex items-center px-6 rounded-lg bg-[#181c24] border border-[#2a303c] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#222834] active:scale-[0.97] transition-all duration-75 ease-out"
                >
                  Compare Plans
                </Link>
              </div>
            </div>

            <div className="rounded-lg bg-[#090b0e] border border-[#1c2029] p-6 font-mono text-xs text-slate-200 space-y-3 overflow-x-auto">
              <div className="text-slate-500"># 1. Start the native Rust workstation locally</div>
              <div className="text-emerald-400">$ culinaryos-desktop.exe --port 3000</div>
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
