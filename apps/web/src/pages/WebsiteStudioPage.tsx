import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TEMPLATE_NAMES,
  BUILTIN_TEMPLATES,
  getTemplateManifest,
} from '@culinaryos/template-engine';
import { generateSchemaOrg } from '@culinaryos/seo-tools';
import { generateMenuPdf, generateQrDataUrl } from '@culinaryos/pdf-tools';
import type { BusinessType, StyleTemplate, ProjectSchema, MenuSchema } from '@culinaryos/types';
import {
  MarketingHeader,
  Smartphone,
  Tablet,
  Laptop,
  Sparkles,
  Check,
  Copy,
  Download,
  ExternalLink,
  Search,
  Eye,
  Sliders,
  FileCode,
  Printer,
  ShoppingBag,
  ArrowRight,
  UtensilsCrossed,
  ChefHat,
  MapPin,
  Clock,
  Phone,
  Mail,
  QrCode,
  Button,
} from '@culinaryos/ui';

// Style archetypes with color palettes
interface StyleTheme {
  id: StyleTemplate;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  bgLight: string;
  bgDark: string;
  fontHeadline: string;
}

const STYLE_THEMES: StyleTheme[] = [
  {
    id: 'hearth',
    name: 'Hearth & Stone',
    description: 'Warm terracotta, dark brass & artisanal rustic timber',
    primaryColor: '#c2410c',
    accentColor: '#d97706',
    bgLight: '#fffbeb',
    bgDark: '#1c1917',
    fontHeadline: 'serif',
  },
  {
    id: 'canvas',
    name: 'Canvas Minimalist',
    description: 'Crisp editorial white, mono typography & structured lines',
    primaryColor: '#0f172a',
    accentColor: '#3b82f6',
    bgLight: '#ffffff',
    bgDark: '#090d16',
    fontHeadline: 'sans-serif',
  },
  {
    id: 'midnight',
    name: 'Midnight Luxury',
    description: 'Deep obsidian black, champagne gold & opulent ambient mood',
    primaryColor: '#eab308',
    accentColor: '#ca8a04',
    bgLight: '#f8fafc',
    bgDark: '#030712',
    fontHeadline: 'serif',
  },
  {
    id: 'market',
    name: 'Botanical Market',
    description: 'Fresh rosemary green, sage hues & farm-to-table lightness',
    primaryColor: '#15803d',
    accentColor: '#84cc16',
    bgLight: '#f0fdf4',
    bgDark: '#052e16',
    fontHeadline: 'sans-serif',
  },
  {
    id: 'coast',
    name: 'Coastal Maritime',
    description: 'Pacific ocean navy, salt spray cyan & airy seaside dining',
    primaryColor: '#0369a1',
    accentColor: '#06b6d4',
    bgLight: '#f0f9ff',
    bgDark: '#082f49',
    fontHeadline: 'sans-serif',
  },
  {
    id: 'ember',
    name: 'Smoked Ember',
    description: 'Fiery charcoal, blazing crimson & wood-fired barbecue smoke',
    primaryColor: '#dc2626',
    accentColor: '#f97316',
    bgLight: '#fef2f2',
    bgDark: '#18181b',
    fontHeadline: 'sans-serif',
  },
];

type StudioTab = 'concept' | 'brand' | 'schema' | 'print';
type ViewportMode = 'mobile' | 'tablet' | 'desktop';

export function WebsiteStudioPage() {
  const navigate = useNavigate();

  // Concept & Theme State
  const [selectedConcept, setSelectedConcept] = useState<BusinessType>('restaurant');
  const [selectedStyle, setSelectedStyle] = useState<StyleTemplate>('hearth');
  const [activeTab, setActiveTab] = useState<StudioTab>('concept');
  const [viewport, setViewport] = useState<ViewportMode>('desktop');

  // Customization Form State
  const [businessName, setBusinessName] = useState('Gabriel Osteria');
  const [tagline, setTagline] = useState('Modern Italian Kitchen & Wine Bar');
  const [story, setStory] = useState(
    'Handmade heirloom pastas, wood-fired seasonal pizzas, and biodynamic natural wines crafted with reverence for regional Mediterranean traditions.'
  );
  const [phone, setPhone] = useState('(212) 555-0199');
  const [email, setEmail] = useState('host@gabrielosteria.com');
  const [address, setAddress] = useState('427 Hudson Street');
  const [city, setCity] = useState('New York');
  const [state, setState] = useState('NY');
  const [zip, setZip] = useState('10014');
  const [hours, setHours] = useState('Daily 11:30 AM – 10:30 PM');
  const [customPrimaryColor, setCustomPrimaryColor] = useState('#c2410c');

  // Interaction Feedback
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Active Manifest & Theme
  const activeManifest = useMemo(() => {
    return getTemplateManifest(selectedConcept) || BUILTIN_TEMPLATES['restaurant'];
  }, [selectedConcept]);

  const activeTheme = useMemo(() => {
    return STYLE_THEMES.find((t: StyleTheme) => t.id === selectedStyle) || STYLE_THEMES[0];
  }, [selectedStyle]);

  // Sync default style when concept changes
  function handleConceptChange(newConcept: BusinessType) {
    setSelectedConcept(newConcept);
    const tm = TEMPLATE_NAMES.find((t: any) => t.id === newConcept);
    if (tm) {
      setSelectedStyle(tm.defaultStyle as StyleTemplate);
      const th = STYLE_THEMES.find((s: StyleTheme) => s.id === tm.defaultStyle);
      if (th) setCustomPrimaryColor(th.primaryColor);
    }
  }

  // Construct typed ProjectSchema for SEO & Schema.org engine
  const projectSchema: ProjectSchema = useMemo(() => {
    return {
      id: `proj-${selectedConcept}`,
      schemaVersion: '1.0',
      businessType: selectedConcept,
      styleTemplate: selectedStyle,
      colorTheme: 'terracotta',
      darkMode: false,
      business: {
        name: businessName,
        tagline,
        description: story,
        phone,
        email,
        cuisineType: 'Italian / Mediterranean',
      },
      branding: {
        primaryColor: customPrimaryColor,
        secondaryColor: activeTheme.accentColor,
        accentColor: activeTheme.accentColor,
      },
      locations: [
        {
          id: 'loc-1',
          name: 'Main Dining Room',
          address: {
            street: address,
            city,
            state,
            zip,
            country: 'US',
          },
          phone,
          email,
          hours: {
            mon: { open: '11:30', close: '22:30' },
            tue: { open: '11:30', close: '22:30' },
            wed: { open: '11:30', close: '22:30' },
            thu: { open: '11:30', close: '22:30' },
            fri: { open: '11:30', close: '23:30' },
            sat: { open: '10:30', close: '23:30' },
            sun: { open: '10:30', close: '22:00' },
          },
          coordinates: { lat: 40.73061, lng: -73.935242 },
        },
      ],
      primaryLocationIndex: 0,
      seo: {
        siteTitle: `${businessName} | ${tagline}`,
        metaDescription: story.slice(0, 155),
      },
      deployment: {
        target: 'vercel',
        subdomain: selectedConcept,
        customDomain: `${selectedConcept}.culinaryos.app`,
      },
    } as unknown as ProjectSchema;
  }, [
    selectedConcept,
    selectedStyle,
    businessName,
    tagline,
    story,
    phone,
    email,
    address,
    city,
    state,
    zip,
    customPrimaryColor,
    activeTheme,
  ]);

  // Generate live Schema.org JSON-LD graph object
  const schemaOrgGraph = useMemo(() => {
    try {
      return generateSchemaOrg(projectSchema);
    } catch {
      return { '@context': 'https://schema.org', '@graph': [] };
    }
  }, [projectSchema]);

  const jsonLdString = useMemo(() => {
    return JSON.stringify(schemaOrgGraph, null, 2);
  }, [schemaOrgGraph]);

  function handleCopyJsonLd() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(jsonLdString);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2500);
    }
  }

  // Sample menu schema for PDF generator
  const sampleMenu: MenuSchema = useMemo(() => {
    return {
      categories: [
        {
          id: 'cat-1',
          name: 'Antipasti & Small Plates',
          displayOrder: 1,
          description: 'Shareable appetizers and artisanal house-cured salumi',
          items: [
            {
              id: 'i-1',
              name: 'Burrata Pugliese',
              price: '$18.00',
              description: 'Heirloom tomatoes, basil oil, grilled sourdough crust',
              available: true,
              displayOrder: 1,
              dietaryTags: ['vegetarian'],
            },
            {
              id: 'i-2',
              name: 'Tuscan Truffle Tartare',
              price: '$22.00',
              description: 'Hand-cut prime beef, egg yolk, caperberry emulsion',
              available: true,
              displayOrder: 2,
              dietaryTags: ['gluten-free'],
            },
          ],
        },
        {
          id: 'cat-2',
          name: 'Handmade Pasta & Primi',
          displayOrder: 2,
          description: 'Crafted fresh daily with organic semolina and pasture-raised eggs',
          items: [
            {
              id: 'i-3',
              name: 'Tagliolini al Tartufo',
              price: '$28.00',
              description: 'Shaved black Norcia truffle, alpine butter, 24-month Parmigiano',
              available: true,
              displayOrder: 1,
              dietaryTags: ['vegetarian'],
            },
            {
              id: 'i-4',
              name: 'Pappardelle al Cinghiale',
              price: '$26.00',
              description: 'Slow-braised wild boar ragu, rosemary, aged pecorino',
              available: true,
              displayOrder: 2,
              dietaryTags: [],
            },
          ],
        },
        {
          id: 'cat-3',
          name: 'Wood-Fired Pizza & Secondi',
          displayOrder: 3,
          description: 'Naturally fermented dough baked at 900°F over applewood',
          items: [
            {
              id: 'i-5',
              name: 'Margherita Verace',
              price: '$19.00',
              description: 'San Marzano D.O.P., mozzarella di bufala, fresh basil',
              available: true,
              displayOrder: 1,
              dietaryTags: ['vegetarian'],
            },
            {
              id: 'i-6',
              name: 'Bistecca Fiorentina (16oz)',
              price: '$48.00',
              description: 'Wood-grilled dry-aged strip steak, charred lemon, salsa verde',
              available: true,
              displayOrder: 2,
              dietaryTags: ['gluten-free', 'dairy-free'],
            },
          ],
        },
      ],
    };
  }, []);

  // 1-Click Physical Menu PDF Generator with Table QR Code
  async function handleDownloadMenuPdf() {
    setGeneratingPdf(true);
    setPdfSuccessMessage(null);
    try {
      // 1. Generate live tableside ordering QR code pointing to tableside self-order
      const orderingUrl = `https://culinaryos.app/table/demo/1`;
      const qrDataUrl = await generateQrDataUrl(orderingUrl, {
        size: 320,
        darkColor: customPrimaryColor,
      });

      // 2. Generate vector PDF via jsPDF with embedded QR code
      const pdfBytes = generateMenuPdf(sampleMenu, {
        restaurantName: businessName,
        tagline,
        accentColor: customPrimaryColor,
        pageSize: 'letter',
        qrDataUrl,
        qrLabel: 'Scan for Tableside Order',
      });

      // 3. Trigger browser download
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-print-menu.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setPdfSuccessMessage('Print Menu PDF with scannable QR ordering code downloaded successfully!');
      setTimeout(() => setPdfSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to generate menu PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Platform Navigation */}
      <MarketingHeader currentPath="/studio" />

      {/* Studio Header Bar */}
      <div className="bg-[#0f172a] border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black uppercase tracking-wider text-white">
                  Storefront Studio & Website Builder
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Phase 4 Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                8 hospitality templates · Realtime device preview · Schema.org SEO · QR Print Menu generator
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/menu/demo')}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white text-xs font-bold gap-1.5"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>Live Storefront</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/table/demo/1')}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white text-xs font-bold gap-1.5"
            >
              <QrCode className="w-4 h-4 text-sky-400" />
              <span>Tableside QR</span>
            </Button>

            <Button
              type="button"
              variant="brand"
              size="sm"
              disabled={generatingPdf}
              onClick={handleDownloadMenuPdf}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs gap-1.5 shadow-sm active:scale-[0.97] transition-transform"
            >
              <Printer className="w-4 h-4" />
              <span>{generatingPdf ? 'Generating...' : 'Export Print Menu PDF'}</span>
            </Button>
          </div>
        </div>
      </div>

      {pdfSuccessMessage && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2 text-center text-xs font-bold text-emerald-400 animate-fadeIn">
          ✓ {pdfSuccessMessage}
        </div>
      )}

      {/* Main Studio Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Controls (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Studio Navigation Tabs */}
          <div className="bg-[#0f172a] p-1.5 rounded-2xl border border-slate-800 grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('concept')}
              className={`min-h-[44px] py-2 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'concept'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Theme</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('brand')}
              className={`min-h-[44px] py-2 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'brand'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Brand</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('schema')}
              className={`min-h-[44px] py-2 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'schema'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>SEO</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('print')}
              className={`min-h-[44px] py-2 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'print'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>

          {/* TAB 1: CONCEPT & STYLES */}
          {activeTab === 'concept' && (
            <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 space-y-5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 block mb-2">
                  1. Select Hospitality Concept (8 Templates)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATE_NAMES.map((concept: any) => {
                    const isSelected = selectedConcept === concept.id;
                    return (
                      <button
                        key={concept.id}
                        type="button"
                        onClick={() => handleConceptChange(concept.id)}
                        className={`min-h-[52px] p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/50 text-white'
                            : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-amber-400">
                              {concept.icon}
                            </span>
                            <span>{concept.name}</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <span className="text-[10px] text-slate-500 truncate mt-1">
                          {concept.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 block mb-2">
                  2. Visual Style Archetype (6 Designs)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STYLE_THEMES.map((theme) => {
                    const isSelected = selectedStyle === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setSelectedStyle(theme.id);
                          setCustomPrimaryColor(theme.primaryColor);
                        }}
                        className={`min-h-[48px] p-3 rounded-xl text-left border transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-white shadow-xs'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-200">{theme.name}</span>
                          <div className="flex items-center gap-1">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/20"
                              style={{ backgroundColor: theme.primaryColor }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/20"
                              style={{ backgroundColor: theme.accentColor }}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {theme.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Manifest Metadata Card */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Template Manifest:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {activeManifest.displayName} v{activeManifest.manifestVersion}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Declared Pages:</span>
                  <span className="text-slate-300 font-bold">
                    {activeManifest.pages.map((p: any) => p.title).join(', ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Content Slots:</span>
                  <span className="text-slate-300 font-mono font-bold">
                    {activeManifest.slots.length} configurable fields
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRAND IDENTITY & CONTENT */}
          {activeTab === 'brand' && (
            <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Restaurant / Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Tagline / Catchphrase
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Brand Story & Atmosphere
                </label>
                <textarea
                  rows={3}
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Street Address & Operating Hours
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    type="text"
                    value={address}
                    placeholder="Address"
                    onChange={(e) => setAddress(e.target.value)}
                    className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={city}
                    placeholder="City"
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <input
                  type="text"
                  value={hours}
                  placeholder="Hours schedule"
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Brand Primary Color (Hex)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customPrimaryColor}
                    onChange={(e) => setCustomPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customPrimaryColor}
                    onChange={(e) => setCustomPrimaryColor(e.target.value)}
                    className="w-32 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCHEMA.ORG & SEARCH ENGINE METADATA */}
          {activeTab === 'schema' && (
            <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Google Search Snippet Preview
                </h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  Preview how your restaurant appears in organic Google search and maps results:
                </p>

                {/* Simulated Google Card */}
                <div className="p-4 rounded-xl bg-white text-slate-900 shadow-md border border-slate-200">
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mb-0.5">
                    <span className="font-medium">https://{selectedConcept}.culinaryos.app</span>
                    <span>› menu</span>
                  </div>
                  <h4 className="text-base font-semibold text-blue-700 hover:underline cursor-pointer leading-snug">
                    {businessName} — {tagline}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-700 my-1 font-sans">
                    <span className="text-amber-500 font-bold">★★★★★ 4.9</span>
                    <span>·</span>
                    <span>$$$ · {address}, {city}</span>
                    <span>·</span>
                    <span className="text-emerald-700 font-bold">Open now</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {story}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-4 text-xs font-bold text-blue-600">
                    <span className="cursor-pointer hover:underline">View Menu</span>
                    <span className="cursor-pointer hover:underline">Order Online</span>
                    <span className="cursor-pointer hover:underline">Reservations</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Live Schema.org JSON-LD Output
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyJsonLd}
                    className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 gap-1.5"
                  >
                    {copiedSchema ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSchema ? 'Copied!' : 'Copy JSON-LD'}</span>
                  </Button>
                </div>

                <div className="relative">
                  <pre className="p-3 bg-black/60 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-400 max-h-56 overflow-y-auto leading-relaxed">
                    {jsonLdString}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PHYSICAL MENU PDF & QR EXPORT */}
          {activeTab === 'print' && (
            <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Print Menu Generation Engine (@culinaryos/pdf-tools)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Export vector-crisp, letter-size physical print menus for host-stands, laminated dining cards, and clipboard presentations. Every printout includes a scannable tableside QR code linking guests directly to mobile payment and self-ordering.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Page Standard:</span>
                  <span className="font-bold text-white">US Letter (216 × 279 mm)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Embedded QR Endpoint:</span>
                  <span className="font-mono text-amber-400 font-bold truncate max-w-[200px]">
                    https://culinaryos.app/table/demo/1
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Dietary Badges Included:</span>
                  <span className="text-emerald-400 font-bold">V, VE, GF, DF, NF, ALC</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Accent Tone:</span>
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: customPrimaryColor }} />
                    <span>{customPrimaryColor}</span>
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="brand"
                disabled={generatingPdf}
                onClick={handleDownloadMenuPdf}
                className="w-full min-h-[48px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
              >
                <Printer className="w-4 h-4" />
                <span>{generatingPdf ? 'Rendering Print PDF...' : 'Download Print Menu (PDF)'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Live Interactive Device Preview (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Viewport Mode Bar */}
          <div className="bg-[#0f172a] border border-slate-800 p-2 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 pl-2 hidden sm:inline">
                Viewport Preview:
              </span>
              <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewport('mobile')}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewport === 'mobile'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mobile (375px)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewport('tablet')}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewport === 'tablet'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tablet (768px)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewport('desktop')}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewport === 'desktop'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400 pr-2">
              Theme: <span className="text-amber-400 font-bold">{activeTheme.name}</span>
            </div>
          </div>

          {/* Interactive Live Screen Canvas */}
          <div className="flex-1 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-center overflow-x-auto min-h-[640px]">
            <div
              className={`bg-white text-slate-900 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden flex flex-col border border-slate-300/80 ${
                viewport === 'mobile'
                  ? 'w-[375px] min-h-[600px]'
                  : viewport === 'tablet'
                  ? 'w-[680px] min-h-[580px]'
                  : 'w-full min-h-[580px]'
              }`}
            >
              {/* Simulated Browser Bar */}
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center justify-between text-xs text-slate-500 select-none">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="bg-white border border-slate-200 rounded-md px-3 py-0.5 text-[10px] font-mono font-medium text-slate-600 truncate max-w-[260px]">
                  https://{selectedConcept}.culinaryos.app
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </div>

              {/* Rendered Restaurant Storefront Content */}
              <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Storefront Header */}
                <div
                  className="px-5 py-4 border-b border-black/10 flex items-center justify-between"
                  style={{ backgroundColor: activeTheme.bgLight }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: customPrimaryColor }}
                    >
                      <ChefHat className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black tracking-tight text-slate-900">
                        {businessName}
                      </h2>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {city}, {state}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 text-slate-700">
                      {hours}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/menu/demo')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs"
                      style={{ backgroundColor: customPrimaryColor }}
                    >
                      Order Ahead
                    </button>
                  </div>
                </div>

                {/* Hero Banner Section */}
                <div
                  className="p-6 md:p-8 text-white relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${customPrimaryColor} 0%, #1e1b18 100%)`,
                  }}
                >
                  <div className="max-w-md space-y-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md">
                      {activeManifest.displayName} Concept
                    </span>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
                      {tagline}
                    </h1>
                    <p className="text-xs text-white/90 leading-relaxed font-sans line-clamp-2">
                      {story}
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('/menu/demo')}
                        className="px-4 py-2 rounded-xl text-xs font-black bg-white text-slate-900 shadow-sm hover:bg-slate-100 transition-colors"
                      >
                        Explore Menu
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/table/demo/1')}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-black/30 text-white backdrop-blur-md hover:bg-black/50 transition-colors"
                      >
                        Tableside QR
                      </button>
                    </div>
                  </div>
                </div>

                {/* Featured Menu Categories */}
                <div className="p-5 space-y-5 bg-white flex-1">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Seasonal Highlights & Specials
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400">Live POS Integrated</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sampleMenu.categories[0].items.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors flex justify-between items-start"
                        >
                          <div className="space-y-1 pr-2">
                            <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                            <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-1 pt-1">
                              {item.dietaryTags?.map((tag: any) => (
                                <span
                                  key={tag}
                                  className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span
                            className="text-xs font-black font-mono shrink-0"
                            style={{ color: customPrimaryColor }}
                          >
                            {item.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Location & Hospitality Info Box */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">{address}</p>
                        <p className="text-[11px] text-slate-500">{city}, {state} {zip}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">Service Hours</p>
                        <p className="text-[11px] text-slate-500">{hours}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">Contact & Bookings</p>
                        <p className="text-[11px] text-slate-500">{phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Thumb-Zone Ergonomic Action Bar (Jakob's Law Rule 13) */}
                {viewport === 'mobile' && (
                  <div className="p-3 bg-white border-t border-slate-200 sticky bottom-0 shadow-lg">
                    <button
                      type="button"
                      onClick={() => navigate('/menu/demo')}
                      className="w-full min-h-[48px] rounded-xl text-white font-black text-xs uppercase tracking-wider flex items-center justify-between px-4 shadow-sm active:scale-[0.97] transition-transform"
                      style={{ backgroundColor: customPrimaryColor }}
                    >
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4" />
                        <span>Order Online & Pickup</span>
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
