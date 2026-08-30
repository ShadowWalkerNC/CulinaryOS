import { useState } from 'react';
import { Plus, Store, Phone, Mail, FileText, Trash2, Printer, ExternalLink, Upload, Download, Check, Copy, Sparkles } from 'lucide-react';
import {
  useVendors,
  useCreateVendor,
  useDeleteVendor,
  useVendorItems,
  useUpsertVendorItem,
  useDeleteVendorItem,
  DEFAULT_DENNIS_ITEMS,
} from '../hooks/useVendors';
import { useParLevels } from '../hooks/useParLevels';

export default function VendorsPage() {
  const { data: vendors = [], isLoading: loadingVendors } = useVendors();
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const { data: vendorItems = [] } = useVendorItems(selectedVendorId || undefined);
  const { data: parLevels = [] } = useParLevels();

  const createVendorMutation = useCreateVendor();
  const deleteVendorMutation = useDeleteVendor();
  const upsertItemMutation = useUpsertVendorItem();
  const deleteItemMutation = useDeleteVendorItem();

  // Form states
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [minOrder, setMinOrder] = useState('');

  // Item form states
  const [showAddItem, setShowAddItem] = useState(false);
  const [ingName, setIngName] = useState('');
  const [sku, setSku] = useState('');
  const [pkgSize, setPkgSize] = useState('');
  const [unitCost, setUnitCost] = useState('');

  // Dennis Pepr Order Guide Importer State
  const [showPeprImportModal, setShowPeprImportModal] = useState(false);
  const [peprImportText, setPeprImportText] = useState('');
  const [copiedPO, setCopiedPO] = useState(false);

  // Order Guide Modal
  const [showOrderGuide, setShowOrderGuide] = useState(false);

  const activeVendor = vendors.find(v => v.id === selectedVendorId) || vendors[0];

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) return;
    createVendorMutation.mutate(
      {
        name: vendorName,
        contact_name: contactName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        min_order_amount: minOrder ? Number(minOrder) : 0,
      },
      {
        onSuccess: () => {
          setVendorName('');
          setContactName('');
          setEmail('');
          setPhone('');
          setMinOrder('');
          setShowAddVendor(false);
        },
      }
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVendor = selectedVendorId || activeVendor?.id;
    if (!targetVendor || !ingName.trim()) return;
    upsertItemMutation.mutate(
      {
        vendor_id: targetVendor,
        ingredient_name: ingName,
        sku: sku || undefined,
        package_size: pkgSize || undefined,
        unit_cost: unitCost ? Number(unitCost) : 0,
      },
      {
        onSuccess: () => {
          setIngName('');
          setSku('');
          setPkgSize('');
          setUnitCost('');
          setShowAddItem(false);
        },
      }
    );
  };

  const handleBulkImportDennisGuide = () => {
    const targetVendor = selectedVendorId || activeVendor?.id;
    if (!targetVendor) return;

    // Process pasted items or fallback to standard Dennis catalog
    const lines = peprImportText.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      // Import standard Dennis items
      DEFAULT_DENNIS_ITEMS.forEach(it => {
        upsertItemMutation.mutate({
          vendor_id: targetVendor,
          ingredient_name: it.ingredient_name,
          sku: it.sku || undefined,
          package_size: it.package_size || undefined,
          unit_cost: it.unit_cost,
        });
      });
    } else {
      lines.forEach(line => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 1) {
          upsertItemMutation.mutate({
            vendor_id: targetVendor,
            ingredient_name: parts[0] || 'Imported Ingredient',
            sku: parts[1] || undefined,
            package_size: parts[2] || undefined,
            unit_cost: parts[3] ? parseFloat(parts[3]) : 0,
          });
        }
      });
    }
    setShowPeprImportModal(false);
    setPeprImportText('');
  };

  // Order guide items (below par)
  const belowParItems = parLevels.filter(p => Number(p.current_stock) < Number(p.par_amount));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Store className="w-6 h-6 text-amber-500" />
            Vendor & Supplier Directory
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage food distributors, ingredient pricing, and automated order guides.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://dennisfoodservice.pepr.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-xs transition"
          >
            <ExternalLink className="w-4 h-4" />
            Dennis Pepr Portal
          </a>
          <button
            onClick={() => setShowPeprImportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            Import Dennis Guide
          </button>
          <button
            onClick={() => setShowOrderGuide(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            Generate PO / Guide
          </button>
          <button
            onClick={() => setShowAddVendor(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition"
          >
            <Plus className="w-4 h-4" />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendors List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Suppliers ({vendors.length})</h2>
          {loadingVendors ? (
            <div className="p-4 text-zinc-500 text-sm">Loading vendors...</div>
          ) : vendors.length === 0 ? (
            <div className="p-6 text-center border border-zinc-800 rounded-xl bg-zinc-900/50">
              <Store className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">No vendors registered yet.</p>
              <p className="text-xs text-zinc-500 mt-1">Click Add Vendor to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vendors.map((vendor) => {
                const isSelected = activeVendor?.id === vendor.id;
                return (
                  <div
                    key={vendor.id}
                    onClick={() => setSelectedVendorId(vendor.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'border-amber-500/50 bg-amber-500/10 text-zinc-100'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-zinc-100">{vendor.name}</h3>
                        {vendor.contact_name && (
                          <p className="text-xs text-zinc-400 mt-0.5">{vendor.contact_name}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete vendor "${vendor.name}"?`)) {
                            deleteVendorMutation.mutate(vendor.id);
                          }
                        }}
                        className="text-zinc-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      {vendor.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-zinc-500" /> {vendor.phone}
                        </span>
                      )}
                      {vendor.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-zinc-500" /> {vendor.email}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vendor Catalog / Item Mapping */}
        <div className="lg:col-span-2 space-y-4">
          {activeVendor ? (
            <div className="border border-zinc-800 rounded-xl bg-zinc-900/40 p-5 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">{activeVendor.name} — Item Catalog</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Min Order: ${activeVendor.min_order_amount || '0.00'}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-100 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Map Ingredient
                </button>
              </div>

              {vendorItems.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-sm">
                  No ingredients mapped to {activeVendor.name} yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="text-xs text-zinc-400 uppercase bg-zinc-950/40 border-b border-zinc-800">
                      <tr>
                        <th className="py-3 px-4">Ingredient</th>
                        <th className="py-3 px-4">SKU / Item #</th>
                        <th className="py-3 px-4">Package Size</th>
                        <th className="py-3 px-4">Unit Cost</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {vendorItems.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-800/30">
                          <td className="py-3 px-4 font-medium text-zinc-200">{item.ingredient_name}</td>
                          <td className="py-3 px-4 text-zinc-400">{item.sku || '—'}</td>
                          <td className="py-3 px-4 text-zinc-400">{item.package_size || '—'}</td>
                          <td className="py-3 px-4 text-amber-400 font-mono">${item.unit_cost?.toFixed(2) || '0.00'}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              className="text-zinc-500 hover:text-red-400 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
              Select a vendor on the left to view mapped ingredients.
            </div>
          )}
        </div>
      </div>

      {/* Add Vendor Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-100">Add New Supplier</h2>
            <form onSubmit={handleCreateVendor} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-400">Vendor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Baldor Specialty Foods"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Contact Rep</label>
                <input
                  type="text"
                  placeholder="e.g. Maria Rossi"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400">Phone</label>
                  <input
                    type="text"
                    placeholder="555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Email</label>
                  <input
                    type="email"
                    placeholder="orders@baldor.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Min Order ($)</label>
                <input
                  type="number"
                  placeholder="250"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddVendor(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVendorMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Ingredient Modal */}
      {showAddItem && activeVendor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-100">Map Item to {activeVendor.name}</h2>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-400">Ingredient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Extra Virgin Olive Oil"
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400">SKU / Item #</label>
                  <input
                    type="text"
                    placeholder="BAL-9821"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Package Size</label>
                  <input
                    type="text"
                    placeholder="4 x 3L tin"
                    value={pkgSize}
                    onChange={(e) => setPkgSize(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Unit Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="48.50"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={upsertItemMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dennis Pepr Order Guide Importer Modal */}
      {showPeprImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded">
                    Dennis Food Service
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Pepr Importer</span>
                </div>
                <h2 className="text-lg font-bold text-zinc-100">Import Dennis Catalog / Order Guide</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPeprImportModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Paste catalog items or CSV export from <a href="https://dennisfoodservice.pepr.app/" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline font-medium">dennisfoodservice.pepr.app</a>. Leave blank to automatically import Dennis standard broadline items (Meats, Dairy, Flour, Oils, Produce).
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Format: <code className="text-amber-400 bg-zinc-950 px-1 py-0.5 rounded">Item Name, SKU / Case#, Pack Size, Case Cost</code>
              </label>
              <textarea
                rows={6}
                value={peprImportText}
                onChange={(e) => setPeprImportText(e.target.value)}
                placeholder="BACON 10-12 APPLEWOOD, 20231, 4 X 5 LB, 74.50&#10;BACON 10-12 SLAB FRESH, 16454, 1 X 15 LB, 58.20&#10;GROUND CHUCK 80/20 FRESH, 11204, 2 X 10 LB, 68.00&#10;MOZZARELLA WHOLE MILK, 30412, 6 X 5 LB, 89.50"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-xs space-y-1 text-zinc-400">
              <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>1-Click Dennis Pepr Catalog Sync:</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Clicking "Import to Vendor" with an empty box will load the verified Dennis Food Service product catalog (10 top broadline SKUs).
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowPeprImportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImportDennisGuide}
                className="px-4 py-2 text-xs font-bold text-zinc-950 bg-amber-500 rounded-xl hover:bg-amber-400 transition flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Import to {activeVendor.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Guide Generator Modal */}
      {showOrderGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                    Purchase Order Draft
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">{activeVendor.name}</span>
                </div>
                <h2 className="text-lg font-bold text-zinc-100 mt-1">Vendor Order Guide & PO</h2>
                <p className="text-xs text-zinc-400">Automated replenishment calculation based on inventory par levels</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const poText = belowParItems.map(i => `${i.ingredient_name} — Qty: ${Number(i.par_amount) - Number(i.current_stock)} ${i.unit}`).join('\n');
                    navigator.clipboard.writeText(`PURCHASE ORDER: ${activeVendor.name}\n${poText}`);
                    setCopiedPO(true);
                    setTimeout(() => setCopiedPO(false), 2500);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700"
                >
                  {copiedPO ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy PO</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print PO
                </button>
              </div>
            </div>

            {belowParItems.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-sm">
                All inventory items are currently at or above par level! No orders required.
              </div>
            ) : (
              <div className="space-y-4">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="text-xs text-zinc-400 uppercase bg-zinc-950/60 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">Ingredient</th>
                      <th className="py-2.5 px-3">Current Stock</th>
                      <th className="py-2.5 px-3">Par Level</th>
                      <th className="py-2.5 px-3 font-bold text-amber-400">To Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {belowParItems.map((item) => {
                      const needed = Number(item.par_amount) - Number(item.current_stock);
                      return (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3 font-semibold text-zinc-100">{item.ingredient_name}</td>
                          <td className="py-2.5 px-3 text-zinc-400">{item.current_stock} {item.unit}</td>
                          <td className="py-2.5 px-3 text-zinc-400">{item.par_amount} {item.unit}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-400">+{needed} {item.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-zinc-800 text-xs text-zinc-400">
              <span>Next Delivery Cutoff: <strong className="text-zinc-200">4:00 PM EST</strong></span>
              <button
                onClick={() => setShowOrderGuide(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
