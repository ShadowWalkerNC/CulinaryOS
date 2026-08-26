import { useState, useEffect } from 'react';
import { usePOSStore } from '../lib/store';
import { hardwarePrinter } from '../lib/hardware-printer';
import {
  loadLocalSettings,
  saveLocalSettings,
  applyDisplaySettingsToDOM,
  type CulinaryOSSettings,
} from '@culinaryos/shared';
import {
  Printer,
  Usb,
  Bluetooth,
  Wifi,
  HardDrive,
  Radio,
  CreditCard,
  ChefHat,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Card,
  Badge,
  Button,
} from '@culinaryos/ui';

export function SettingsView() {
  const { setView } = usePOSStore();
  const [activeTab, setActiveTab] = useState<'hardware' | 'store' | 'routing' | 'display'>('hardware');

  // Shared Settings
  const [settings, setSettings] = useState<CulinaryOSSettings>(loadLocalSettings());
  const [pairedReader, setPairedReader] = useState<string | null>('Counter WisePOS E');

  // Hardware Printer Configuration State
  const [printerConfig, setPrinterConfig] = useState(hardwarePrinter.getConfig());
  const [hardwareStatus, setHardwareStatus] = useState(hardwarePrinter.getConnectionStatus());
  const [testPrintStatus, setTestPrintStatus] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setHardwareStatus(hardwarePrinter.getConnectionStatus());
  }, [printerConfig]);

  useEffect(() => {
    applyDisplaySettingsToDOM(settings.display);
  }, [settings.display]);

  function handleConfigChange(key: string, value: any) {
    const updated = hardwarePrinter.updateConfig({ [key]: value });
    setPrinterConfig(updated);
  }

  function handleSaveSettings() {
    saveLocalSettings(settings);
    applyDisplaySettingsToDOM(settings.display);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  }

  async function handlePairUsb() {
    setIsPairing('usb');
    setTestPrintStatus('Requesting USB thermal device...');
    const res = await hardwarePrinter.pairUsbPrinter();
    if (res.success) {
      setTestPrintStatus(`Paired successfully: ${res.name}`);
      setPrinterConfig(hardwarePrinter.getConfig());
    } else {
      setTestPrintStatus(`USB Pairing: ${res.error}`);
    }
    setIsPairing(null);
  }

  async function handlePairBluetooth() {
    setIsPairing('bluetooth');
    setTestPrintStatus('Searching for Bluetooth printers...');
    const res = await hardwarePrinter.pairBluetoothPrinter();
    if (res.success) {
      setTestPrintStatus(`Paired successfully: ${res.name}`);
      setPrinterConfig(hardwarePrinter.getConfig());
    } else {
      setTestPrintStatus(`Bluetooth: ${res.error}`);
    }
    setIsPairing(null);
  }

  async function handlePairSerial() {
    setIsPairing('serial');
    setTestPrintStatus('Opening Serial COM port...');
    const res = await hardwarePrinter.pairSerialPrinter();
    if (res.success) {
      setTestPrintStatus(`Connected: ${res.name}`);
      setPrinterConfig(hardwarePrinter.getConfig());
    } else {
      setTestPrintStatus(`Serial: ${res.error}`);
    }
    setIsPairing(null);
  }

  async function handleTestPrint() {
    setTestPrintStatus('Sending diagnostic test pattern...');
    const res = await hardwarePrinter.printTestPattern();
    setTestPrintStatus(`Test pattern sent via ${res.transport} (${res.message})`);
    setTimeout(() => setTestPrintStatus(null), 5000);
  }

  async function handleKickDrawer() {
    setTestPrintStatus('Sending drawer kick pulse...');
    const res = await hardwarePrinter.kickCashDrawer();
    setTestPrintStatus(res.message);
    setTimeout(() => setTestPrintStatus(null), 4000);
  }

  const READERS = ['Counter WisePOS E', 'Drive-Thru WisePOS E', 'Handheld BBPOS Chipper'];

  return (
    <div className="flex flex-col h-full bg-background animate-fadeIn p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <Badge variant="brand" className="text-[10px] font-black uppercase tracking-wider">
              POS Terminal
            </Badge>
            <h1 className="text-xl font-black text-foreground uppercase tracking-wider">
              Terminal Settings & Customizations
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Configure real thermal receipt printers, company info, kitchen routing, and live text sizing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isSaved && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Settings Saved!
            </span>
          )}
          <Button
            onClick={handleSaveSettings}
            className="font-black text-xs uppercase tracking-wider rounded-xl bg-foreground text-background"
          >
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={() => setView('dashboard')}
            className="font-black text-xs uppercase tracking-wider rounded-xl"
          >
            Exit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 mb-6">
        {[
          { id: 'hardware', label: 'Printers & Readers', icon: <Printer className="w-4 h-4" /> },
          { id: 'store', label: 'Company & Receipts', icon: <Wifi className="w-4 h-4" /> },
          { id: 'routing', label: 'Kitchen Routing', icon: <ChefHat className="w-4 h-4" /> },
          { id: 'display', label: 'Display & Text Sizing', icon: <Radio className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. Hardware & Printers */}
      {activeTab === 'hardware' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <Card className="lg:col-span-2 p-6 space-y-6 border-border bg-card shadow-xs">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-black text-foreground uppercase tracking-wider">
                    Thermal Receipt Printers (ESC/POS)
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Direct hardware streaming to Epson, Star Micronics, Munbyn, Bixolon, Sunmi, and generic 58mm/80mm printers.
                </p>
              </div>

              {/* Connection Pill */}
              <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl border border-border">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-extrabold uppercase font-mono text-foreground">
                  {hardwareStatus.transport}: {hardwareStatus.deviceName}
                </span>
              </div>
            </div>

            {/* Transport Selector Grid */}
            <div className="space-y-2">
              <label className="text-xs font-black text-foreground uppercase tracking-wider block">
                Active Hardware Interface
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'auto', name: 'Smart Auto-Detect', icon: <Radio className="w-4 h-4" /> },
                  { id: 'usb', name: 'WebUSB Direct', icon: <Usb className="w-4 h-4" /> },
                  { id: 'bluetooth', name: 'Web Bluetooth', icon: <Bluetooth className="w-4 h-4" /> },
                  { id: 'serial', name: 'Web Serial COM', icon: <HardDrive className="w-4 h-4" /> },
                  { id: 'network', name: 'Network IP / LAN', icon: <Wifi className="w-4 h-4" /> },
                  { id: 'browser', name: 'Universal Spooler', icon: <Printer className="w-4 h-4" /> },
                ].map((t) => {
                  const isSelected = printerConfig.transport === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleConfigChange('transport', t.id)}
                      className={`p-3 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-foreground bg-foreground text-background shadow-xs scale-[1.02]'
                          : 'border-border bg-card text-foreground hover:border-foreground/30'
                      }`}
                    >
                      <span className={isSelected ? 'text-background' : 'text-primary'}>{t.icon}</span>
                      <span className="truncate">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Hardware Pairing Buttons */}
            <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-3">
              <span className="text-[11px] font-black text-foreground uppercase tracking-wider block">
                Direct Physical Device Pairing
              </span>
              <div className="flex flex-wrap gap-2.5">
                <Button
                  variant="outline"
                  onClick={handlePairUsb}
                  disabled={isPairing === 'usb'}
                  className="text-xs font-extrabold flex items-center gap-2 rounded-xl"
                >
                  <Usb className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isPairing === 'usb' ? 'Pairing USB...' : 'Pair USB Thermal Printer'}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePairBluetooth}
                  disabled={isPairing === 'bluetooth'}
                  className="text-xs font-extrabold flex items-center gap-2 rounded-xl"
                >
                  <Bluetooth className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isPairing === 'bluetooth' ? 'Searching...' : 'Pair Bluetooth BLE Printer'}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePairSerial}
                  disabled={isPairing === 'serial'}
                  className="text-xs font-extrabold flex items-center gap-2 rounded-xl"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isPairing === 'serial' ? 'Opening Port...' : 'Connect Serial Port'}</span>
                </Button>
              </div>
            </div>

            {/* Configuration Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-foreground uppercase tracking-wider block">
                  Thermal Paper Width
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfigChange('paperWidth', '80mm')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      printerConfig.paperWidth === '80mm'
                        ? 'bg-foreground text-background border-foreground font-black shadow-xs'
                        : 'bg-card border-border text-foreground hover:border-foreground/30'
                    }`}
                  >
                    80mm (48 Col Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfigChange('paperWidth', '58mm')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      printerConfig.paperWidth === '58mm'
                        ? 'bg-foreground text-background border-foreground font-black shadow-xs'
                        : 'bg-card border-border text-foreground hover:border-foreground/30'
                    }`}
                  >
                    58mm (32 Col Compact)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-foreground uppercase tracking-wider block">
                  Network LAN IP (Port 9100)
                </label>
                <input
                  type="text"
                  value={printerConfig.networkIp || ''}
                  onChange={(e) => handleConfigChange('networkIp', e.target.value)}
                  placeholder="192.168.1.200"
                  className="w-full bg-card border border-border focus:border-foreground rounded-xl p-2.5 text-xs text-foreground font-mono font-bold outline-none"
                />
              </div>
            </div>

            {/* Automation Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-4">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={printerConfig.autoPrintOnPayment}
                  onChange={(e) => handleConfigChange('autoPrintOnPayment', e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-foreground"
                />
                <span className="text-xs font-bold text-foreground leading-snug">
                  Auto-Print on Payment
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={printerConfig.kickDrawerOnCash}
                  onChange={(e) => handleConfigChange('kickDrawerOnCash', e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-foreground"
                />
                <span className="text-xs font-bold text-foreground leading-snug">
                  Kick Drawer on Cash
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={printerConfig.printDuplicateKitchenTicket}
                  onChange={(e) => handleConfigChange('printDuplicateKitchenTicket', e.target.checked)}
                  className="w-4 h-4 rounded text-primary accent-foreground"
                />
                <span className="text-xs font-bold text-foreground leading-snug">
                  Kitchen Duplicate Ticket
                </span>
              </label>
            </div>

            {/* Diagnostics */}
            <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-bold text-muted-foreground">
                {testPrintStatus ? (
                  <span className="text-primary font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{testPrintStatus}</span>
                  </span>
                ) : (
                  <span>Ready to print receipts & kick cash drawer.</span>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleKickDrawer}
                  className="text-xs font-extrabold rounded-xl flex-1 sm:flex-none"
                >
                  Kick Cash Drawer
                </Button>
                <Button
                  onClick={handleTestPrint}
                  className="text-xs font-black uppercase tracking-wider rounded-xl bg-foreground text-background hover:bg-foreground/90 flex items-center gap-1.5 flex-1 sm:flex-none shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Test Print</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Card Readers */}
          <Card className="p-5 space-y-4 border-border bg-card shadow-xs h-fit">
            <div className="border-b border-border pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <div>
                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Stripe Card Readers
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Smart chip, tap-to-pay, and handheld terminals.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {READERS.map((r) => (
                <button
                  key={r}
                  onClick={() => setPairedReader(r)}
                  className={`w-full text-left p-3 rounded-xl border flex justify-between items-center transition-all ${
                    pairedReader === r
                      ? 'border-foreground bg-foreground text-background font-bold shadow-xs'
                      : 'border-border bg-card text-foreground hover:border-foreground/30'
                  }`}
                >
                  <span className="text-xs font-semibold">{r}</span>
                  {pairedReader === r && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-background/20 text-background px-2 py-0.5 rounded-md">
                      Paired
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 2. Store & Company Info */}
      {activeTab === 'store' && (
        <Card className="p-6 space-y-6 border-border bg-card shadow-xs animate-fadeIn max-w-4xl">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-black text-foreground uppercase tracking-wider">
              Store Identity & Guest Receipts
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Information printed on guest checks, receipt headers/footers, and tax percentages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black text-foreground uppercase tracking-wider block mb-1">
                Store Name
              </label>
              <input
                type="text"
                value={settings.company.name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: { ...settings.company, name: e.target.value },
                  })
                }
                className="w-full bg-muted/40 border border-border focus:border-foreground rounded-xl p-2.5 text-xs text-foreground font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-foreground uppercase tracking-wider block mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={settings.company.phone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: { ...settings.company, phone: e.target.value },
                  })
                }
                className="w-full bg-muted/40 border border-border focus:border-foreground rounded-xl p-2.5 text-xs text-foreground font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-foreground uppercase tracking-wider block mb-1">
                Sales Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.company.taxRatePercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: { ...settings.company, taxRatePercent: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full bg-muted/40 border border-border focus:border-foreground rounded-xl p-2.5 text-xs text-foreground font-mono font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-foreground uppercase tracking-wider block mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={settings.company.currencySymbol}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: { ...settings.company, currencySymbol: e.target.value },
                  })
                }
                className="w-full bg-muted/40 border border-border focus:border-foreground rounded-xl p-2.5 text-xs text-foreground font-bold outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-black text-foreground uppercase tracking-wider block mb-1">
                Receipt Welcome Header
              </label>
              <input
                type="text"
                value={settings.company.receiptHeader}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: { ...settings.company, receiptHeader: e.target.value },
                  })
                }
                className="w-full bg-muted/40 border border-border focus:border-foreground rounded-xl p-2.5 text-xs text-foreground font-bold outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-black text-foreground uppercase tracking-wider block mb-1">
                Receipt Thank You Footer
              </label>
              <input
                type="text"
                value={settings.company.receiptFooter}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: { ...settings.company, receiptFooter: e.target.value },
                  })
                }
                className="w-full bg-muted/40 border border-border focus:border-foreground rounded-xl p-2.5 text-xs text-foreground font-bold outline-none"
              />
            </div>
          </div>
        </Card>
      )}

      {/* 3. Kitchen Routing */}
      {activeTab === 'routing' && (
        <Card className="p-6 space-y-6 border-border bg-card shadow-xs animate-fadeIn max-w-4xl">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-black text-foreground uppercase tracking-wider">
              Kitchen Display Stations & Course Routing
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active preparation stations connected to kitchen screens.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {settings.stations.map((st) => (
              <div
                key={st.id}
                className="p-4 rounded-xl border border-border bg-muted/30"
                style={{ borderLeftColor: st.color, borderLeftWidth: '4px' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-background border border-border text-foreground">
                    {st.code}
                  </span>
                  {st.isExpoPass && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-foreground text-background px-1.5 py-0.5 rounded">
                      Master
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-black text-foreground">{st.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{st.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Display, Text Sizing & Accessibility */}
      {activeTab === 'display' && (
        <Card className="p-6 space-y-6 border-border bg-card shadow-xs animate-fadeIn max-w-4xl">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-black text-foreground uppercase tracking-wider">
              Display & Text Sizing Customization
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live text scaling and touch targets for tablet terminals and low-glare environments.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-foreground uppercase tracking-wider block">
              Terminal Text Scale ({settings.display.textScalePercent}%)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'compact', label: 'Compact', scale: 100, desc: '100% density' },
                { id: 'standard', label: 'Standard', scale: 110, desc: '110% balanced' },
                { id: 'large', label: 'Large (POS)', scale: 125, desc: '125% tablet' },
                { id: 'xlarge', label: 'X-Large (KDS)', scale: 140, desc: '140% kitchen' },
              ].map((s) => {
                const isSelected = settings.display.textSize === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        display: {
                          ...settings.display,
                          textSize: s.id as any,
                          textScalePercent: s.scale,
                        },
                      })
                    }
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-foreground bg-foreground text-background shadow-xs scale-[1.02]'
                        : 'border-border bg-muted/30 text-foreground hover:border-foreground/30'
                    }`}
                  >
                    <span className="text-xs font-black block">{s.label}</span>
                    <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-background/70' : 'text-muted-foreground'}`}>
                      {s.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                checked={settings.display.tableStatusGlowHalos}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    display: { ...settings.display, tableStatusGlowHalos: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded accent-foreground"
              />
              <div>
                <span className="text-xs font-black text-foreground block">3D Table Glow Status Halos</span>
                <span className="text-[10px] text-muted-foreground">Pulse halos around active dining tables</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                checked={settings.display.kdsAlertSounds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    display: { ...settings.display, kdsAlertSounds: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded accent-foreground"
              />
              <div>
                <span className="text-xs font-black text-foreground block">Audio Alerts on Order Fire</span>
                <span className="text-[10px] text-muted-foreground">Play audible chime on kitchen send</span>
              </div>
            </label>
          </div>
        </Card>
      )}
    </div>
  );
}

export default SettingsView;
