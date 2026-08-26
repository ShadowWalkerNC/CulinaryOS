import { useState, useEffect } from 'react';
import { usePOSStore } from '../lib/store';
import { hardwarePrinter } from '../lib/hardware-printer';
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
  const [pairedReader, setPairedReader] = useState<string | null>('Counter WisePOS E');
  const [routingCold, setRoutingCold] = useState('cold-prep');
  const [routingHot, setRoutingHot] = useState('hot-grill');

  // Hardware Printer Configuration State
  const [printerConfig, setPrinterConfig] = useState(hardwarePrinter.getConfig());
  const [hardwareStatus, setHardwareStatus] = useState(hardwarePrinter.getConnectionStatus());
  const [testPrintStatus, setTestPrintStatus] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState<string | null>(null);

  useEffect(() => {
    setHardwareStatus(hardwarePrinter.getConnectionStatus());
  }, [printerConfig]);

  function handleConfigChange(key: string, value: any) {
    const updated = hardwarePrinter.updateConfig({ [key]: value });
    setPrinterConfig(updated);
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
              Terminal Hardware
            </Badge>
            <h1 className="text-xl font-black text-foreground uppercase tracking-wider">
              Device & Hardware Settings
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Configure real thermal receipt printers (ESC/POS via USB, Bluetooth, Serial, Network), Stripe card readers, and KDS station routing.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setView('dashboard')}
          className="font-black text-xs uppercase tracking-wider rounded-xl"
        >
          Exit Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Hardware Receipt Printers Control Hub */}
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
            {/* Paper Width */}
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
                  80mm (Standard 48 Col)
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
                  58mm (Compact 32 Col)
                </button>
              </div>
            </div>

            {/* Custom Network IP */}
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
                Print Kitchen Duplicate
              </span>
            </label>
          </div>

          {/* Hardware Diagnostics Status & Action Buttons */}
          <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs font-bold text-muted-foreground">
              {testPrintStatus ? (
                <span className="text-primary font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{testPrintStatus}</span>
                </span>
              ) : (
                <span>Click Test Print to verify paper alignment, cut & cash drawer.</span>
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
                <span>Test Print Sample</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* 2. Stripe Card Readers & KDS Station Routing */}
        <div className="space-y-6">
          {/* Card Readers */}
          <Card className="p-5 space-y-4 border-border bg-card shadow-xs">
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

          {/* KDS Item Routing */}
          <Card className="p-5 space-y-4 border-border bg-card shadow-xs">
            <div className="border-b border-border pb-3 flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-primary" />
              <div>
                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">
                  KDS Item Routing
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Assign menu category items to specific kitchen displays.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">
                  Starters & Cold Items
                </label>
                <select
                  value={routingCold}
                  onChange={(e) => setRoutingCold(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground font-bold outline-none focus:border-foreground"
                >
                  <option value="cold-prep">Cold Prep Station (KDS 01)</option>
                  <option value="fryer">Fryer Station (KDS 02)</option>
                  <option value="main-pass">Main Pass (KDS 03)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">
                  Mains & Hot Grill Items
                </label>
                <select
                  value={routingHot}
                  onChange={(e) => setRoutingHot(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground font-bold outline-none focus:border-foreground"
                >
                  <option value="hot-grill">Grill Station (KDS 04)</option>
                  <option value="pizza-oven">Pizza Oven (KDS 05)</option>
                  <option value="main-pass">Main Pass (KDS 03)</option>
                </select>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
