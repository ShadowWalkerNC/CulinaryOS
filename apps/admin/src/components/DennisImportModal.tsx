import React, { useState } from 'react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@culinaryos/ui';
import { apiHeaders, getApiBase, parseBroadlineCatalogCsv, type ParsedBroadlineItem } from '@culinaryos/shared';

const API = getApiBase();

interface DennisImportModalProps {
  vendorId: string;
  vendorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DennisImportModal({
  vendorId,
  vendorName,
  onClose,
  onSuccess,
}: DennisImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedBroadlineItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      processFile(droppedFile);
    }
  };

  const processFile = (file: File) => {
    setIsParsing(true);
    setError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const items = parseBroadlineCatalogCsv(text);
        setParsedItems(items);
        setStep('preview');
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file');
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading CSV file');
      setIsParsing(false);
    };

    reader.readAsText(file);
  };

  const handleCommitImport = async () => {
    setIsImporting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/v1/purchasing/import-guide`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          vendorId,
          items: parsedItems,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to import catalog items');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl text-slate-900 animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">upload_file</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Import Catalog & Order Guide
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Target Distributor: <span className="text-rose-600 font-semibold">{vendorName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-sm font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-2xl p-8 sm:p-12 text-center transition-all bg-slate-50/50 hover:bg-rose-50/20 cursor-pointer flex flex-col items-center justify-center gap-4"
              onClick={() => document.getElementById('csv-upload-input')?.click()}
            >
              <input
                id="csv-upload-input"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-rose-600">
                <span className="material-symbols-outlined text-3xl">cloud_upload</span>
              </div>
              <div>
                <p className="font-bold text-base text-slate-800">
                  Click to browse or drag & drop distributor CSV
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports Dennis Food Service (Pepr export), Sysco IMPAC, US Foods, or generic broadline sheets
                </p>
              </div>
              <Button variant="secondary" className="min-h-[44px] pointer-events-none">
                Select CSV File
              </Button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-slate-700">info</span>
                Flexible Column Auto-Detection:
              </p>
              <p>
                The importer auto-detects header columns: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">SKU / Item #</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">Description / Name</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">Brand</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">Pack / Size</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">Price / Cost</code>, and <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">Par Level</code>.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Commit */}
        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white">
                  {parsedItems.length} Products Detected
                </Badge>
                <span className="text-xs text-slate-500 font-medium">
                  from {file?.name}
                </span>
              </div>
              <button
                onClick={() => { setStep('upload'); setParsedItems([]); }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Choose different file
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">Brand</th>
                    <th className="p-2.5">Pack / UOM</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Cost</th>
                    <th className="p-2.5 text-right">Par Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {parsedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-mono font-semibold">{item.vendorSku}</td>
                      <td className="p-2.5 font-medium text-slate-950">{item.name}</td>
                      <td className="p-2.5 text-slate-500">{item.brand}</td>
                      <td className="p-2.5 text-slate-600">{item.packSize} ({item.uom})</td>
                      <td className="p-2.5 text-slate-500">{item.category}</td>
                      <td className="p-2.5 text-right font-semibold">${item.unitCost.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-rose-600">{item.parLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isImporting}
                className="min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleCommitImport}
                isLoading={isImporting}
                className="min-h-[48px] px-6 bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Commit & Import {parsedItems.length} Items
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
