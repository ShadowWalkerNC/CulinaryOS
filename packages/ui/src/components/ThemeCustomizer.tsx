import { useState } from 'react';
import { THEME_PRESETS } from '../theme/presets';
import { useTheme } from '../theme/ThemeContext';
import { exportThemeCSS } from '../theme/engine';
import { RadiusPreset, FontPreset, ColorMode } from '../theme/types';
import { Palette, Sun, Moon, Check, Copy, RotateCcw, Monitor } from 'lucide-react';

export function ThemeCustomizer() {
  const { theme, setTheme, setPreset, resetTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handlePresetSelect = (key: string) => {
    setPreset(key);
  };

  const handleModeChange = (mode: ColorMode) => {
    setTheme({
      ...theme,
      mode,
    });
  };

  const handleRadiusChange = (radius: RadiusPreset) => {
    setTheme({ ...theme, radius });
  };

  const handleFontChange = (font: FontPreset) => {
    setTheme({ ...theme, font });
  };

  const handleCopyCSS = () => {
    navigator.clipboard.writeText(exportThemeCSS(theme));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 text-slate-100 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-2xl w-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base uppercase tracking-wider text-slate-100">
              Theme & UI Customizer
            </h3>
            <p className="text-xs text-slate-400">
              Customize colors, radiuses, fonts, and dark/light modes in real-time
            </p>
          </div>
        </div>

        <button
          onClick={resetTheme}
          title="Reset to default theme"
          className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-100 px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Theme Presets Grid */}
      <div className="mb-6">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-3">
          1. Curated Palette Presets
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Object.entries(THEME_PRESETS).map(([key, preset]) => {
            const isSelected = theme.id === preset.id;
            return (
              <button
                key={key}
                onClick={() => handlePresetSelect(key)}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col gap-2 ${
                  isSelected
                    ? 'border-orange-500 ring-2 ring-orange-500/30 bg-orange-950/40 text-white'
                    : 'border-slate-800 hover:border-slate-600 bg-slate-950 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 line-clamp-1">
                    {preset.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="w-4 h-4 rounded-full border border-black/30 shrink-0 shadow-xs"
                    style={{ backgroundColor: preset.colors.cosBrand || preset.colors.primary }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-black/30 shrink-0 shadow-xs"
                    style={{ backgroundColor: preset.colors.background }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-black/30 shrink-0 shadow-xs"
                    style={{ backgroundColor: preset.colors.card }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-black/30 shrink-0 shadow-xs"
                    style={{ backgroundColor: preset.colors.success }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Mode, Radius & Font Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-800 pt-6 mb-6">
        {/* Color Mode */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Display Mode
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['light', 'dark', 'oled'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`py-1.5 rounded-lg text-xs font-bold capitalize transition flex items-center justify-center gap-1 ${
                  theme.mode === m
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'light' && <Sun className="w-3.5 h-3.5" />}
                {m === 'dark' && <Moon className="w-3.5 h-3.5" />}
                {m === 'oled' && <Monitor className="w-3.5 h-3.5" />}
                <span>{m}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Radius */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Corner Radius
          </label>
          <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['none', 'sm', 'lg', 'full'] as const).map((r) => (
              <button
                key={r}
                onClick={() => handleRadiusChange(r)}
                className={`py-1.5 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center ${
                  theme.radius === r
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Font */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Typography
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['inter', 'mono', 'serif'] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleFontChange(f)}
                className={`py-1.5 rounded-lg text-xs font-bold capitalize transition flex items-center justify-center ${
                  theme.font === f
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Export & Actions */}
      <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-mono">
          Theme active: <strong className="text-slate-200">{theme.name}</strong>
        </span>

        <button
          onClick={handleCopyCSS}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-500 shadow-xs transition"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>{copied ? 'CSS Copied!' : 'Copy CSS Tokens'}</span>
        </button>
      </div>
    </div>
  );
}
