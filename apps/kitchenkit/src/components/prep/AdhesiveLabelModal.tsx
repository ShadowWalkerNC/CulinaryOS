import { useState } from 'react';
import {
  Printer,
  X,
  QrCode,
  Check,
  Copy,
  Tag,
} from 'lucide-react';
import {
  formatAdhesiveLabel,
  FDA_ALLERGENS,
  type PrepBatch,
  type LabelFormat,
} from '@culinaryos/prep-engine';

interface Props {
  initialBatch?: Partial<PrepBatch>;
  onClose: () => void;
}

export default function AdhesiveLabelModal({ initialBatch, onClose }: Props) {
  const [format, setFormat] = useState<LabelFormat>('2x1');
  const [recipeName, setRecipeName] = useState(initialBatch?.recipeName || 'Garlic Confit Aioli');
  const [batchNumber, setBatchNumber] = useState(
    initialBatch?.batchNumber || `LOT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-01`
  );
  const [cookInitials, setCookInitials] = useState(initialBatch?.cookInitials || 'MK');
  const [shelfLifeHours, setShelfLifeHours] = useState(initialBatch?.shelfLifeHours || 72);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    initialBatch?.allergens || ['Eggs']
  );
  const [storageLocation, setStorageLocation] = useState(
    initialBatch?.storageLocation || 'Walk-In Cooler'
  );
  const [storageTemp, setStorageTemp] = useState(initialBatch?.storageTemp || '≤ 40°F (4°C)');
  const [yieldQuantity, setYieldQuantity] = useState(initialBatch?.yieldQuantity || 2);
  const [yieldUnit, setYieldUnit] = useState(initialBatch?.yieldUnit || 'quarts');
  const [copied, setCopied] = useState(false);
  const [printed, setPrinted] = useState(false);

  const batch: PrepBatch = {
    recipeName,
    batchNumber,
    cookInitials,
    prepDate: initialBatch?.prepDate || new Date(),
    shelfLifeHours: Number(shelfLifeHours) || 72,
    allergens: selectedAllergens,
    storageLocation,
    storageTemp,
    yieldQuantity: Number(yieldQuantity) || 1,
    yieldUnit,
  };

  const labelPayload = formatAdhesiveLabel(batch, format);

  function toggleAllergen(a: string) {
    if (selectedAllergens.includes(a)) {
      setSelectedAllergens(selectedAllergens.filter((item) => item !== a));
    } else {
      setSelectedAllergens([...selectedAllergens, a]);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(labelPayload.formattedAscii);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    // In browser environment, we simulate printer feed or dispatch to ESC/POS thermal service
    setPrinted(true);
    setTimeout(() => setPrinted(false), 2500);
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full p-6 text-zinc-100 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                Adhesive Thermal Expiration Label Generator
              </h2>
              <p className="text-xs text-zinc-400">
                Print 2"x1" and 2"x2" direct thermal food rotation labels with allergen warnings & QR code.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Label Stock Format:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormat('2x1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                format === '2x1'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              2" × 1" (Standard Pantry Roll)
            </button>
            <button
              type="button"
              onClick={() => setFormat('2x2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                format === '2x2'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              2" × 2" (Full Traceability + QR)
            </button>
          </div>
        </div>

        {/* Form and Preview Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Inputs */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Prep Item / Recipe Name
              </label>
              <input
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Lot / Batch #
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Cook Initials
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={cookInitials}
                  onChange={(e) => setCookInitials(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Shelf Life (Hours)
                </label>
                <input
                  type="number"
                  value={shelfLifeHours}
                  onChange={(e) => setShelfLifeHours(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Yield Output
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={yieldQuantity}
                    onChange={(e) => setYieldQuantity(Number(e.target.value))}
                    className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={yieldUnit}
                    onChange={(e) => setYieldUnit(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                FDA Major Allergens Warning
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FDA_ALLERGENS.map((alg) => {
                  const isSel = selectedAllergens.includes(alg);
                  return (
                    <button
                      key={alg}
                      type="button"
                      onClick={() => toggleAllergen(alg)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold border transition ${
                        isSel
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {alg}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Storage Location
                </label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  HACCP Target Temp
                </label>
                <input
                  type="text"
                  value={storageTemp}
                  onChange={(e) => setStorageTemp(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right: Visual Adhesive Label Preview */}
          <div className="flex flex-col space-y-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Thermal Label Preview ({format})
            </span>

            {/* Realistic Thermal Label Card */}
            <div
              className={`bg-white text-zinc-950 p-4 rounded-xl border-2 border-dashed border-zinc-400 font-sans shadow-lg flex flex-col justify-between select-none ${
                format === '2x1' ? 'min-h-[170px]' : 'min-h-[260px]'
              }`}
            >
              <div>
                {/* Header */}
                <div className="border-b-2 border-zinc-950 pb-1 flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-tight leading-tight">
                      {labelPayload.recipeName}
                    </h3>
                    <div className="text-[10px] font-bold text-zinc-700">
                      LOT: #{labelPayload.batchNumber}
                    </div>
                  </div>
                  <span className="text-[11px] font-black bg-zinc-950 text-white px-2 py-0.5 rounded">
                    {labelPayload.cookInitials}
                  </span>
                </div>

                {/* Dates */}
                <div className="py-2 space-y-1 text-xs">
                  <div className="flex justify-between font-medium text-[11px]">
                    <span className="text-zinc-600">PREP DATE:</span>
                    <span className="font-mono font-bold">{labelPayload.prepDateTime}</span>
                  </div>

                  <div className="flex justify-between font-bold text-xs bg-red-100 px-1.5 py-0.5 rounded border border-red-200 text-red-900">
                    <span>USE BY:</span>
                    <span className="font-mono">{labelPayload.useByDateTime}</span>
                  </div>

                  <div className="flex justify-between text-[10px] text-zinc-600">
                    <span>KEEP: {labelPayload.storageLocation}</span>
                    <span className="font-bold">{labelPayload.storageTemp}</span>
                  </div>

                  <div className="text-[10px] text-zinc-600">
                    YIELD: <span className="font-bold text-zinc-900">{labelPayload.yieldSummary}</span>
                  </div>
                </div>

                {/* Allergen Warning */}
                {selectedAllergens.length > 0 && (
                  <div className="mt-1 px-1.5 py-1 bg-amber-100 border border-amber-300 rounded text-[9px] font-black text-amber-950 uppercase tracking-tight">
                    ⚠ {labelPayload.allergenWarningText}
                  </div>
                )}
              </div>

              {/* QR Code section for 2x2 */}
              {format === '2x2' && (
                <div className="pt-2 border-t border-zinc-300 flex items-center justify-between text-[9px] text-zinc-600">
                  <div>
                    <span className="font-bold block text-zinc-900">CulinaryOS Traceability</span>
                    <span>Scan for HACCP Log & Recipe</span>
                  </div>
                  <div className="w-12 h-12 bg-zinc-950 text-white rounded flex items-center justify-center p-1">
                    <QrCode className="w-full h-full text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied ASCII' : 'Copy ASCII'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                {printed ? <Check className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                <span>{printed ? 'Sent to Printer!' : `Print ${format} Label`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
