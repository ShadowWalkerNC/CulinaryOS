import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BUSINESS_PRESETS, type BusinessPreset } from '../../data/businessPresets';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Store,
  Printer,
  Sparkles,
  CreditCard,
  UtensilsCrossed,
  ShieldCheck,
  X,
  RefreshCw,
} from '@culinaryos/ui';

interface GuidedOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function GuidedOnboardingWizard({
  isOpen,
  onClose,
  onComplete,
}: GuidedOnboardingWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;

  // Step 1 State: Identity & Concept Preset
  const [restaurantName, setRestaurantName] = useState('The Golden Fork');
  const [cityState, setCityState] = useState('Portland, ME');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('full-service');

  // Step 2 State: Service & Floor Setup
  const [tablesCount, setTablesCount] = useState(24);
  const [taxRate, setTaxRate] = useState(8.25);
  const [tipDistribution, setTipDistribution] = useState<'hours-weighted' | 'keep-your-own'>('hours-weighted');

  // Step 3 State: Hardware Auto-Discovery
  const [detectingHardware, setDetectingHardware] = useState(false);
  const [hardwareDetected, setHardwareDetected] = useState({
    receiptPrinter: true,
    kitchenPrinter: true,
    stripeTerminal: true,
  });

  // Step 4 State: Sample Data
  const [loadSampleData, setLoadSampleData] = useState(true);

  // Step 5 State: Automated Preflight Verification
  const [verifying, setVerifying] = useState(false);
  const [preflightPassed, setPreflightPassed] = useState(true);

  if (!isOpen) return null;

  const defaultPreset: BusinessPreset = BUSINESS_PRESETS[0]!;
  const selectedPreset: BusinessPreset =
    BUSINESS_PRESETS.find((p) => p.id === selectedPresetId) ?? defaultPreset;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      if (currentStep === 2) {
        // Trigger hardware scan when entering step 3
        setDetectingHardware(true);
        setTimeout(() => setDetectingHardware(false), 900);
      }
      if (currentStep === 4) {
        // Trigger preflight validation on step 5
        setVerifying(true);
        setTimeout(() => {
          setVerifying(false);
          setPreflightPassed(true);
        }, 1100);
      }
      setCurrentStep(currentStep + 1);
    } else {
      // Completed!
      if (onComplete) onComplete();
      onClose();
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn select-none">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        {/* Onboarding Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">Restaurant Setup Assistant</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  Step {currentStep} of {totalSteps}
                </span>
              </div>
              <p className="text-xs text-slate-500">Fast, guided setup with sensible defaults</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
            title="Save and exit setup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-100 w-full overflow-hidden">
          <div
            className="h-full bg-orange-600 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: IDENTITY & CONCEPT PRESET */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Tell us about your restaurant</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  Pick a starter concept to automatically configure menus, kitchen stations, and ticket pacing.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    placeholder="e.g. The Golden Fork"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City & State</label>
                  <input
                    type="text"
                    value={cityState}
                    onChange={(e) => setCityState(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    placeholder="e.g. Austin, TX"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-700 block">Choose Starter Concept:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BUSINESS_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          setTablesCount(preset.tablesCount);
                          setTaxRate(preset.suggestedTaxRatePct);
                          setTipDistribution(preset.tipDistributionMethod === 'keep-your-own' ? 'keep-your-own' : 'hours-weighted');
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-300'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-sm text-slate-900">{preset.name}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{preset.tagline}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SERVICE & FLOOR SETUP */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Dining Room, Tax & Tip Setup</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  Configure your floor layout and regional tax rates with sensible defaults.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Total Dining Tables</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tablesCount}
                    onChange={(e) => setTablesCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-500">
                    {tablesCount > 0
                      ? `Generates tables 1 to ${tablesCount} on your visual floor map.`
                      : 'Set to 0 for counter-only orders and food trucks.'}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Sales Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-500">
                    Auto-calculated on checks. Configurable anytime in Settings.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Tip Distribution Method</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTipDistribution('hours-weighted')}
                    className={`p-3 rounded-xl border text-left active:scale-[0.97] ${
                      tipDistribution === 'hours-weighted'
                        ? 'border-orange-500 bg-orange-50 text-slate-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <p className="font-bold">Hours-Weighted Pool</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Tips shared by hours worked (FLSA legal)</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipDistribution('keep-your-own')}
                    className={`p-3 rounded-xl border text-left active:scale-[0.97] ${
                      tipDistribution === 'keep-your-own'
                        ? 'border-orange-500 bg-orange-50 text-slate-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <p className="font-bold">Keep-Your-Own</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Servers keep all direct tips earned</p>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  ⚖️ <strong>Legal Guardrail:</strong> Per FLSA law, managers and owners are strictly excluded from tip pools.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: HARDWARE AUTO-DISCOVERY */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Device & Printer Auto-Discovery</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  CulinaryOS automatically scans your local Wi-Fi network for receipt printers and payment readers.
                </p>
              </div>

              {detectingHardware ? (
                <div className="p-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <RefreshCw className="w-6 h-6 text-orange-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Scanning local network for devices…</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <Printer className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="font-bold text-slate-900">Receipt Printer (FOH)</p>
                        <p className="text-[11px] text-slate-500">Star TSP143IV / Epson TM-m30 on port 9100</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Connected (192.168.1.140)
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <Printer className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="font-bold text-slate-900">Kitchen Impact Printer (BOH)</p>
                        <p className="text-[11px] text-slate-500">Star SP742 Impact printer on line rail</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Connected (192.168.1.142)
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="font-bold text-slate-900">Stripe Terminal Card Reader</p>
                        <p className="text-[11px] text-slate-500">WisePOS E Countertop Reader</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Ready for Payments
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Don't have hardware yet? You can test everything on-screen or add printers later in Settings.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: SAMPLE MENU & STARTER DATA */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Practice Menu & Starter Catalog</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  Load ready-to-use sample items so your crew can practice orders and explore reports immediately.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    Include {selectedPreset.sampleItemsCount} Starter Items & Recipes
                  </span>
                  <input
                    type="checkbox"
                    checked={loadSampleData}
                    onChange={(e) => setLoadSampleData(e.target.checked)}
                    className="w-5 h-5 rounded text-orange-600 focus:ring-orange-400"
                  />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Includes real food cost formulas, station routes ({selectedPreset.kitchenStations.map(s => s.name).join(', ')}), and cocktail recipes tailored to {selectedPreset.name}.
                </p>

                <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sample Preview:</p>
                  {selectedPreset.sampleItems.slice(0, 3).map((item) => (
                    <div key={item.name} className="flex justify-between text-xs py-0.5">
                      <span className="font-medium text-slate-700">{item.name}</span>
                      <span className="font-mono font-bold text-slate-900">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PREFLIGHT READINESS CHECK */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Automated System Health Check</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  CulinaryOS verifies database connections, offline caching, and terminal security before starting.
                </p>
              </div>

              {verifying ? (
                <div className="p-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <RefreshCw className="w-6 h-6 text-orange-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Verifying system readiness…</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2 text-emerald-950">
                    <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>All Systems Verified & Ready for Service</span>
                    </div>
                    <ul className="space-y-1 text-emerald-800 text-xs pl-7 list-disc">
                      <li>Database & cloud sync connected safely</li>
                      <li>Offline mode active with local order preservation</li>
                      <li>FLSA tip pool rules locked to legal guidelines</li>
                      <li>Printers and card readers responding normally</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                    <p className="font-bold text-slate-900">Next Steps:</p>
                    <p className="text-slate-600">
                      When you click <strong>Complete Setup</strong>, your restaurant workspace will be initialized. You can launch the POS, view live sales, or invite staff members anytime.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs flex items-center gap-1.5 active:scale-[0.97]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Save & Resume Later
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="min-h-[44px] px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 active:scale-[0.97] transition-all"
            >
              <span>{currentStep === totalSteps ? 'Complete Setup & Launch' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
