import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Input,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Sliders,
  Printer,
  Download,
  Copy,
  Check,
  Package,
  Layers,
  UtensilsCrossed,
  Tag,
  Palette,
  Terminal,
  Zap,
} from '@culinaryos/ui';
import { apiHeaders, getApiBase } from '@culinaryos/shared';

const API = getApiBase();

interface ExtensionItem {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  author: { name: string; email?: string; url?: string };
  pricing: { model: string; price_cents: number };
  installed?: boolean;
}

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primary: string;
  background: string;
  card: string;
  text: string;
}

// Built-in ingredient density factors (grams per 1 US Cup)
const INGREDIENT_DENSITIES: Record<string, { label: string; gramsPerCup: number }> = {
  flour: { label: 'All-Purpose Flour', gramsPerCup: 120 },
  bread_flour: { label: 'High Gluten Bread Flour', gramsPerCup: 127 },
  sugar: { label: 'Granulated White Sugar', gramsPerCup: 200 },
  brown_sugar: { label: 'Brown Sugar (Packed)', gramsPerCup: 220 },
  butter: { label: 'Unsalted Butter', gramsPerCup: 227 },
  olive_oil: { label: 'Extra Virgin Olive Oil', gramsPerCup: 216 },
  milk: { label: 'Whole Milk', gramsPerCup: 245 },
  heavy_cream: { label: 'Heavy Cream 36%', gramsPerCup: 238 },
  water: { label: 'Water', gramsPerCup: 236.6 },
  honey: { label: 'Honey / Maple Syrup', gramsPerCup: 340 },
  salt: { label: 'Kosher Salt (Diamond Crystal)', gramsPerCup: 140 },
};

export function ToolsPage() {
  const [activeTab, setActiveTab] = useState<'tools' | 'marketplace' | 'themes' | 'developer'>('tools');
  const [activeTool, setActiveTool] = useState<'scaler' | 'converter' | 'flyer'>('scaler');

  // Marketplace state
  const [extensions, setExtensions] = useState<ExtensionItem[]>([]);
  const [themes, setThemes] = useState<ThemePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Active theme selection
  const [selectedTheme, setSelectedTheme] = useState<string>('bistro-dark');

  // Tool 1: Batch Scaler State
  const [baseServings, setBaseServings] = useState<number>(4);
  const [targetServings, setTargetServings] = useState<number>(24);
  const [batchItems, setBatchItems] = useState([
    { name: 'Tipo 00 / Bread Flour', amount: 500, unit: 'g', bakersPct: 100 },
    { name: 'Warm Water (68% Hydration)', amount: 340, unit: 'g', bakersPct: 68 },
    { name: 'Active Sourdough Starter', amount: 100, unit: 'g', bakersPct: 20 },
    { name: 'Extra Virgin Olive Oil', amount: 15, unit: 'g', bakersPct: 3 },
    { name: 'Fine Sea Salt', amount: 12, unit: 'g', bakersPct: 2.4 },
  ]);

  // Tool 2: Unit Converter State
  const [convertIngredient, setConvertIngredient] = useState<string>('flour');
  const [convertQty, setConvertQty] = useState<number>(2);
  const [convertUnit, setConvertUnit] = useState<'cups' | 'tbsp' | 'tsp' | 'grams' | 'ounces' | 'lbs'>('cups');

  // Tool 3: Flyer Builder State
  const [flyerType, setFlyerType] = useState<'happy_hour' | 'brunch' | 'specials' | 'event'>('happy_hour');
  const [flyerTitle, setFlyerTitle] = useState('Sunset Happy Hour');
  const [flyerSubtitle, setFlyerSubtitle] = useState('Tuesday - Friday · 4:00 PM to 6:30 PM');
  const [flyerBullet1, setFlyerBullet1] = useState('$6 Wood-Fired Margherita Personal Pizzas');
  const [flyerBullet2, setFlyerBullet2] = useState('$5 Local Draft Craft IPAs & House Wines');
  const [flyerBullet3, setFlyerBullet3] = useState('$8 Signature Smoked Old Fashioneds');
  const [copiedFlyer, setCopiedFlyer] = useState(false);

  // Developer Submission Form State
  const [customToolName, setCustomToolName] = useState('');
  const [customToolCat, setCustomToolCat] = useState('Kitchen Tools');
  const [customToolDesc, setCustomToolDesc] = useState('');
  const [customToolAuthor, setCustomToolAuthor] = useState('');
  const [customToolEntry, setCustomToolEntry] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [extRes, themeRes] = await Promise.all([
        fetch(`${API}/v1/marketplace/extensions`, { headers: apiHeaders() }).then((r) => r.json()).catch(() => ({ ok: false })),
        fetch(`${API}/v1/marketplace/themes`, { headers: apiHeaders() }).then((r) => r.json()).catch(() => ({ ok: false })),
      ]);

      if (extRes.ok && extRes.data) {
        setExtensions(extRes.data);
      }
      if (themeRes.ok && themeRes.data) {
        setThemes(themeRes.data);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleToggleInstall = async (ext: ExtensionItem) => {
    try {
      const endpoint = ext.installed ? 'DELETE' : 'POST';
      const res = await fetch(`${API}/v1/marketplace/extensions/${ext.id}/install`, {
        method: endpoint,
        headers: apiHeaders(),
      });
      if (res.ok) {
        setExtensions((prev) =>
          prev.map((e) => (e.id === ext.id ? { ...e, installed: !e.installed } : e))
        );
        setMsg({
          text: ext.installed ? `Uninstalled "${ext.name}"` : `Installed & Activated "${ext.name}"!`,
          type: 'success',
        });
      }
    } catch {
      setMsg({ text: 'Network error updating extension', type: 'error' });
    }
  };

  const handleRegisterCustomTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customToolName.trim()) return;

    try {
      const res = await fetch(`${API}/v1/marketplace/extensions/custom`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          name: customToolName,
          category: customToolCat,
          description: customToolDesc,
          author: { name: customToolAuthor || 'Restaurant Operator' },
          entry_point: customToolEntry || `/tools/${customToolName.toLowerCase().replace(/\s+/g, '-')}`,
        }),
      });

      const body = await res.json();
      if (body.ok) {
        setMsg({ text: body.data?.message ?? 'Custom tool registered successfully!', type: 'success' });
        setCustomToolName('');
        setCustomToolDesc('');
        setCustomToolAuthor('');
        setCustomToolEntry('');
        void loadData();
        setActiveTab('marketplace');
      }
    } catch {
      setMsg({ text: 'Network error registering custom tool', type: 'error' });
    }
  };

  // Scaling Factor
  const scaleRatio = targetServings > 0 && baseServings > 0 ? targetServings / baseServings : 1;

  // Unit Conversion Math
  const density = INGREDIENT_DENSITIES[convertIngredient]?.gramsPerCup ?? 120;
  let weightInGrams = 0;

  if (convertUnit === 'cups') weightInGrams = convertQty * density;
  else if (convertUnit === 'tbsp') weightInGrams = (convertQty / 16) * density;
  else if (convertUnit === 'tsp') weightInGrams = (convertQty / 48) * density;
  else if (convertUnit === 'grams') weightInGrams = convertQty;
  else if (convertUnit === 'ounces') weightInGrams = convertQty * 28.3495;
  else if (convertUnit === 'lbs') weightInGrams = convertQty * 453.592;

  const resultOunces = (weightInGrams / 28.3495).toFixed(2);
  const resultLbs = (weightInGrams / 453.592).toFixed(2);
  const resultCups = (weightInGrams / density).toFixed(2);
  const resultTbsp = ((weightInGrams / density) * 16).toFixed(1);
  const resultML = ((weightInGrams / density) * 236.588).toFixed(1);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-foreground uppercase tracking-wider">
            Addons, Tools & Ecosystem Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Expand CulinaryOS with built-in culinary calculators, marketing tools, visual themes, and community extensions.
          </p>
        </div>

        {/* Master Tab Bar */}
        <div className="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border">
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'tools'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="w-3.5 h-3.5 inline mr-1.5 text-amber-500" />
            Built-in Tools
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'marketplace'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-3.5 h-3.5 inline mr-1.5 text-blue-500" />
            Addons & Marketplace ({extensions.length})
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'themes'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Palette className="w-3.5 h-3.5 inline mr-1.5 text-emerald-500" />
            UI Themes ({themes.length || 5})
          </button>
          <button
            onClick={() => setActiveTab('developer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'developer'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 inline mr-1.5 text-purple-500" />
            Create Tool / Dev
          </button>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold animate-fadeIn ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="text-xs font-bold hover:underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: BUILT-IN OPERATIONAL TOOLS */}
      {activeTab === 'tools' && (
        <div className="space-y-6">
          {/* Sub-tool Selector */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            {[
              { id: 'scaler', label: 'Batch Sizing & Yield Engine', icon: Sliders },
              { id: 'converter', label: 'Density-Aware Unit Math', icon: UtensilsCrossed },
              { id: 'flyer', label: 'Promo Flyer & Specials Builder', icon: Tag },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTool === t.id
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* TOOL 1: BATCH SCALER */}
          {activeTool === 'scaler' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <Card className="p-5 lg:col-span-2 space-y-4">
                <div className="flex justify-between items-start border-b border-border pb-3">
                  <div>
                    <CardTitle>Recipe Batch Scaler</CardTitle>
                    <CardDescription>
                      Dynamically scale ingredient batches by covers, pan volume, or baker's percentage
                    </CardDescription>
                  </div>
                  <Badge variant="brand" className="font-mono text-xs">
                    Scaling: {scaleRatio.toFixed(2)}x
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-xl border border-border">
                  <div>
                    <Label htmlFor="baseServ">Base Servings</Label>
                    <Input
                      id="baseServ"
                      type="number"
                      min={1}
                      value={baseServings}
                      onChange={(e) => setBaseServings(Number(e.target.value) || 1)}
                      className="mt-1 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetServ">Target Servings</Label>
                    <Input
                      id="targetServ"
                      type="number"
                      min={1}
                      value={targetServings}
                      onChange={(e) => setTargetServings(Number(e.target.value) || 1)}
                      className="mt-1 font-mono font-bold text-primary"
                    />
                  </div>
                  <div className="col-span-2 flex items-end gap-1.5">
                    {[
                      { label: '10 Servings', val: 10 },
                      { label: '50 Servings', val: 50 },
                      { label: '100 Batch', val: 100 },
                      { label: '250 Event', val: 250 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        onClick={() => setTargetServings(p.val)}
                        className="px-2.5 py-2 rounded-lg bg-background border border-input text-[11px] font-bold hover:bg-muted transition"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Base Qty ({baseServings})</TableHead>
                      <TableHead className="text-primary font-bold">Scaled Qty ({targetServings})</TableHead>
                      <TableHead className="text-right">Baker's %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchItems.map((item, idx) => {
                      const scaledAmount = (item.amount * scaleRatio).toFixed(1);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-foreground">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground font-mono">
                            {item.amount} {item.unit}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-primary text-sm">
                            {scaledAmount} {item.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {item.bakersPct}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>

              <Card className="p-5 space-y-4">
                <CardTitle>Batch Prep Card Export</CardTitle>
                <CardDescription>Print a laminated station card for your line cooks</CardDescription>

                <div className="p-4 bg-muted rounded-xl border border-border space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold text-foreground">
                    <span>Sourdough Pizza Batch #{Math.floor(100 + Math.random() * 900)}</span>
                    <span className="text-primary font-mono">{targetServings} Portions</span>
                  </div>
                  <div className="divide-y divide-border/60 text-[11px]">
                    {batchItems.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between">
                        <span className="text-muted-foreground">{item.name}</span>
                        <strong className="text-foreground font-mono">
                          {(item.amount * scaleRatio).toFixed(1)} {item.unit}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => window.print()}
                  className="w-full uppercase font-bold text-xs"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Prep Station Card
                </Button>
              </Card>
            </div>
          )}

          {/* TOOL 2: CULINARY UNIT & DENSITY CONVERTER */}
          {activeTool === 'converter' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <Card className="p-5 space-y-4">
                <CardTitle>Density-Aware Culinary Math</CardTitle>
                <CardDescription>
                  Accurately convert volume to true weight based on standard ingredient specific gravity.
                </CardDescription>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="cIng">Select Ingredient</Label>
                    <select
                      id="cIng"
                      value={convertIngredient}
                      onChange={(e) => setConvertIngredient(e.target.value)}
                      className="mt-1 flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs font-bold text-foreground"
                    >
                      {Object.entries(INGREDIENT_DENSITIES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label} ({v.gramsPerCup}g / cup)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="cQty">Quantity</Label>
                      <Input
                        id="cQty"
                        type="number"
                        step="0.1"
                        value={convertQty}
                        onChange={(e) => setConvertQty(Number(e.target.value) || 0)}
                        className="mt-1 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cUnit">Unit</Label>
                      <select
                        id="cUnit"
                        value={convertUnit}
                        onChange={(e) => setConvertUnit(e.target.value as any)}
                        className="mt-1 flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs font-bold text-foreground capitalize"
                      >
                        <option value="cups">Cups (US Volume)</option>
                        <option value="tbsp">Tablespoons (tbsp)</option>
                        <option value="tsp">Teaspoons (tsp)</option>
                        <option value="grams">Grams (g)</option>
                        <option value="ounces">Ounces (oz weight)</option>
                        <option value="lbs">Pounds (lbs)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Conversion Outputs */}
              <Card className="p-5 space-y-4 bg-muted/30">
                <div className="flex justify-between items-center">
                  <CardTitle>Calculated Equivalents</CardTitle>
                  <Badge variant="brand">{INGREDIENT_DENSITIES[convertIngredient]?.label}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-background p-3.5 rounded-xl border border-border shadow-xs">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Metric Weight</span>
                    <span className="text-xl font-black text-foreground font-mono mt-1 block">
                      {weightInGrams.toFixed(1)} <span className="text-xs text-muted-foreground">g</span>
                    </span>
                  </div>

                  <div className="bg-background p-3.5 rounded-xl border border-border shadow-xs">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Imperial Weight</span>
                    <span className="text-xl font-black text-primary font-mono mt-1 block">
                      {resultOunces} <span className="text-xs text-muted-foreground">oz ({resultLbs} lb)</span>
                    </span>
                  </div>

                  <div className="bg-background p-3.5 rounded-xl border border-border shadow-xs">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">US Cups</span>
                    <span className="text-xl font-black text-foreground font-mono mt-1 block">
                      {resultCups} <span className="text-xs text-muted-foreground">cups</span>
                    </span>
                  </div>

                  <div className="bg-background p-3.5 rounded-xl border border-border shadow-xs">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Liquid Volume</span>
                    <span className="text-xl font-black text-emerald-600 font-mono mt-1 block">
                      {resultML} <span className="text-xs text-muted-foreground">mL</span>
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TOOL 3: PROMO FLYER & SPECIALS BUILDER */}
          {activeTool === 'flyer' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Form Controls */}
              <Card className="p-5 space-y-4">
                <CardTitle>Promo Flyer & Event Designer</CardTitle>
                <CardDescription>Generate tabletop promotional cards, happy hour inserts, and event flyers</CardDescription>

                <div className="space-y-3">
                  <div>
                    <Label>Template Theme</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {[
                        { id: 'happy_hour', label: 'Sunset Happy Hour' },
                        { id: 'brunch', label: 'Weekend Brunch Feature' },
                        { id: 'specials', label: "Chef's Tasting Specials" },
                        { id: 'event', label: 'Live Music & Events' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setFlyerType(t.id as any);
                            setFlyerTitle(t.label);
                          }}
                          className={`p-2 rounded-lg text-xs font-bold text-left border transition ${
                            flyerType === t.id
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-background border-border text-foreground hover:bg-muted'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="fTitle">Headline</Label>
                    <Input
                      id="fTitle"
                      value={flyerTitle}
                      onChange={(e) => setFlyerTitle(e.target.value)}
                      className="mt-1 font-bold"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fSub">Subtitle / Schedule</Label>
                    <Input
                      id="fSub"
                      value={flyerSubtitle}
                      onChange={(e) => setFlyerSubtitle(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <Label htmlFor="b1">Highlight 1</Label>
                    <Input id="b1" value={flyerBullet1} onChange={(e) => setFlyerBullet1(e.target.value)} className="mt-1 text-xs" />
                  </div>
                  <div>
                    <Label htmlFor="b2">Highlight 2</Label>
                    <Input id="b2" value={flyerBullet2} onChange={(e) => setFlyerBullet2(e.target.value)} className="mt-1 text-xs" />
                  </div>
                  <div>
                    <Label htmlFor="b3">Highlight 3</Label>
                    <Input id="b3" value={flyerBullet3} onChange={(e) => setFlyerBullet3(e.target.value)} className="mt-1 text-xs" />
                  </div>
                </div>
              </Card>

              {/* Live Card Flyer Preview */}
              <div className="space-y-4">
                <div className="p-8 bg-slate-950 text-white rounded-3xl shadow-2xl border border-slate-800 text-center space-y-6 max-w-sm mx-auto">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                      The Golden Fork
                    </span>
                    <h2 className="text-2xl font-black tracking-tight text-white pt-2">{flyerTitle}</h2>
                    <p className="text-xs text-slate-400 font-medium">{flyerSubtitle}</p>
                  </div>

                  <div className="space-y-2.5 text-left bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-200">{flyerBullet1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-200">{flyerBullet2}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-200">{flyerBullet3}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Order Tableside with POS</span>
                    <span className="font-bold text-amber-400">Scan QR Code</span>
                  </div>
                </div>

                <div className="flex justify-center gap-2">
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => window.print()}
                    className="uppercase font-bold text-xs"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    Print Tabletop Flyer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXTENSIONS & ADDONS MARKETPLACE */}
      {activeTab === 'marketplace' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Installed & Available Extensions ({extensions.length})
            </h3>
            <Button
              variant="brand"
              size="sm"
              onClick={() => setActiveTab('developer')}
              className="uppercase font-bold tracking-wider text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Submit / Create Addon
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extensions.map((ext) => (
              <Card key={ext.id} className="p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="brand">{ext.category}</Badge>
                    <span className="text-[11px] font-mono text-muted-foreground">v{ext.version}</span>
                  </div>
                  <h4 className="font-bold text-foreground text-sm leading-snug">{ext.name}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ext.description}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">By: {ext.author.name}</p>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    {ext.pricing?.price_cents === 0 ? 'FREE' : `$${(ext.pricing.price_cents / 100).toFixed(2)}/mo`}
                  </span>
                  <Button
                    variant={ext.installed ? 'outline' : 'brand'}
                    size="sm"
                    onClick={() => handleToggleInstall(ext)}
                    className="text-xs font-bold uppercase"
                  >
                    {ext.installed ? 'Installed (Active)' : 'Install Addon'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: UI THEMES & VISUAL PALETTES */}
      {activeTab === 'themes' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              System Color Schemes & Terminal Themes
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select an optimized palette for POS handhelds, high-heat kitchen KDS screens, or back-office admin.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {themes.map((theme) => (
              <Card
                key={theme.id}
                onClick={() => {
                  setSelectedTheme(theme.id);
                  setMsg({ text: `Theme switched to "${theme.name}"!`, type: 'success' });
                }}
                className={`p-5 space-y-4 cursor-pointer transition-all border-2 ${
                  selectedTheme === theme.id
                    ? 'border-primary shadow-md'
                    : 'border-border hover:border-border/80'
                }`}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-foreground text-sm">{theme.name}</h4>
                  {selectedTheme === theme.id && (
                    <Badge variant="success" className="text-[10px]">
                      ACTIVE
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">{theme.description}</p>

                {/* Color Swatch Previews */}
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-8 h-8 rounded-lg border shadow-xs" style={{ backgroundColor: theme.primary }} title="Primary Accent" />
                  <div className="w-8 h-8 rounded-lg border shadow-xs" style={{ backgroundColor: theme.background }} title="Background" />
                  <div className="w-8 h-8 rounded-lg border shadow-xs" style={{ backgroundColor: theme.card }} title="Card Surface" />
                  <div className="w-8 h-8 rounded-lg border shadow-xs flex items-center justify-center font-bold text-xs" style={{ backgroundColor: theme.card, color: theme.text }} title="Typography">
                    Aa
                  </div>
                </div>

                <Button
                  variant={selectedTheme === theme.id ? 'brand' : 'outline'}
                  size="sm"
                  className="w-full text-xs font-bold uppercase mt-2"
                >
                  {selectedTheme === theme.id ? 'Active Theme' : 'Apply Palette'}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DEVELOPER "CREATE & SUBMIT TOOL" STUDIO */}
      {activeTab === 'developer' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="p-6 space-y-4">
            <div className="border-b border-border pb-3">
              <CardTitle>Developer Extension & Custom Tool Creator</CardTitle>
              <CardDescription>
                Build and register custom calculators, hardware bridges, or third-party integrations into CulinaryOS.
              </CardDescription>
            </div>

            <form onSubmit={handleRegisterCustomTool} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="tName">Tool / Addon Name *</Label>
                <Input
                  id="tName"
                  required
                  placeholder="e.g. Sommelier Wine Pairing Advisor"
                  value={customToolName}
                  onChange={(e) => setCustomToolName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="tCat">Category</Label>
                  <select
                    id="tCat"
                    value={customToolCat}
                    onChange={(e) => setCustomToolCat(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground font-bold"
                  >
                    <option value="Kitchen Tools">Kitchen Tools</option>
                    <option value="Calculators">Calculators</option>
                    <option value="Marketing & Design">Marketing & Design</option>
                    <option value="Beverage & Bar">Beverage & Bar</option>
                    <option value="Hardware">Hardware Drivers</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tAuth">Author / Organization</Label>
                  <Input
                    id="tAuth"
                    placeholder="e.g. Acme Culinary Labs"
                    value={customToolAuthor}
                    onChange={(e) => setCustomToolAuthor(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tEntry">Entry Point / URL Route</Label>
                <Input
                  id="tEntry"
                  placeholder="e.g. /tools/sommelier or https://my-service.com/embed"
                  value={customToolEntry}
                  onChange={(e) => setCustomToolEntry(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tDesc">Description</Label>
                <textarea
                  id="tDesc"
                  rows={3}
                  placeholder="Explain what your tool does and how kitchen/POS operators can use it..."
                  value={customToolDesc}
                  onChange={(e) => setCustomToolDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              <div className="p-3 bg-muted rounded-xl border border-border text-xs text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">CulinaryOS Extension Standard Compliance:</p>
                <p className="text-[11px]">
                  Custom tools generate a compliant <code>culinaryos_extension.json</code> manifest and register to the active event bus.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="submit"
                  variant="brand"
                  size="sm"
                  className="uppercase font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Publish Tool to Marketplace
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ToolsPage;
