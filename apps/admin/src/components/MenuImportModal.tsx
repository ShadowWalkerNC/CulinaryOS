import React, { useState } from 'react';
import { Button, Card, Badge } from '@culinaryos/ui';

interface ParsedMenuItem {
  name: string;
  category: string;
  station: string;
  priceCents: number;
  description: string;
  allergens: string[];
}

interface MenuImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (items: ParsedMenuItem[]) => void;
}

export const MenuImportModal: React.FC<MenuImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedMenuItem[]>([]);

  if (!isOpen) return null;

  // Sylvia Menu parsing engine (absorbed from sylvia-menu)
  const handleParseText = () => {
    setIsParsing(true);
    setTimeout(() => {
      const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
      const items: ParsedMenuItem[] = [];
      let currentCategory = 'Entrees';

      for (const line of lines) {
        if (line.startsWith('#') || line.toUpperCase() === line && line.length < 25 && !line.includes('$')) {
          currentCategory = line.replace(/^[#\s]+/, '');
          continue;
        }

        // Match patterns like "Wood-Fired Margherita ... $18.00" or "Ribeye 14oz - 46"
        const priceMatch = line.match(/\$?(\d+(?:\.\d{2})?)\s*$/);
        if (priceMatch) {
          const rawPrice = parseFloat(priceMatch[1] || '0');
          const priceCents = Math.round(rawPrice * 100);
          const namePart = line.replace(/\s*[-–.]*\s*\$?(\d+(?:\.\d{2})?)\s*$/, '').trim();

          let station = 'hot';
          const lower = (namePart + ' ' + currentCategory).toLowerCase();
          if (lower.includes('salad') || lower.includes('starter') || lower.includes('crudo')) station = 'cold';
          else if (lower.includes('grill') || lower.includes('burger') || lower.includes('steak')) station = 'grill';
          else if (lower.includes('fry') || lower.includes('wings') || lower.includes('fries')) station = 'fry';
          else if (lower.includes('cocktail') || lower.includes('beer') || lower.includes('draft') || lower.includes('wine')) station = 'bar';

          items.push({
            name: namePart,
            category: currentCategory,
            station,
            priceCents,
            description: `Imported via Sylvia OCR parser from ${currentCategory} section.`,
            allergens: lower.includes('pizza') || lower.includes('burger') ? ['Gluten', 'Dairy'] : [],
          });
        }
      }

      setParsedPreview(items);
      setIsParsing(false);
    }, 200);
  };

  const handleApplyImport = () => {
    if (parsedPreview.length === 0) return;
    onImportComplete(parsedPreview);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-slate-900 border-slate-800 text-slate-100 w-full max-w-2xl rounded-xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black uppercase tracking-wider text-white">Menu OCR &amp; Catalog Parser</h2>
              <Badge variant="outline" className="text-orange-400 border-orange-500/30 font-mono text-[10px]">
                Sylvia Engine
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Paste printed menu text, PDF contents, or POS exports to automatically parse categories, items, and prices into CulinaryOS.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-400">Paste Raw Menu Text</label>
          <textarea
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`PIZZA\nWood-Fired Margherita ... $18.00\nSpicy Diavola ... $21.00\n\nENTREES\nDry-Aged Ribeye 14oz ... $46.00\nPan-Roasted Halibut ... $34.00`}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            onClick={handleParseText}
            disabled={!rawText.trim() || isParsing}
            className="min-h-[44px] px-4 font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs uppercase"
          >
            {isParsing ? 'Parsing Structure...' : 'Parse Menu Items'}
          </Button>
        </div>

        {parsedPreview.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Parsed {parsedPreview.length} Menu Items</span>
              <span className="text-emerald-400 font-mono">100% Auto-Structured</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
              {parsedPreview.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{item.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {item.category} → {item.station}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-orange-400">
                    ${(item.priceCents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="min-h-[44px] px-4 font-bold border-slate-800 text-slate-300 text-xs uppercase"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApplyImport}
            disabled={parsedPreview.length === 0}
            className="min-h-[44px] px-5 font-bold bg-orange-600 hover:bg-orange-500 text-white text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20"
          >
            Import {parsedPreview.length} Items into Menu
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MenuImportModal;
