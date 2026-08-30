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
    <div className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-xl max-w-2xl w-full">
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-600/10 text-orange-600 flex items-center justify-center font-bold">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base uppercase tracking-wider text-foreground">
              Theme & UI Customizer
            </h3>
            <p className="text-xs text-muted-foreground">
              Customize colors, radiuses, fonts, and dark/light modes in real-time
            </p>
          </div>
        </div>

        <button
          onClick={resetTheme}
          title="Reset to default theme"
          className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Theme Presets Grid */}
      <div className="mb-6">
        <label className="block text-xs font-black uppercase tracking-wider text-foreground mb-3">
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
                    ? 'border-orange-600 ring-2 ring-orange-600/20 bg-orange-600/5'
                    : 'border-border hover:border-foreground/40 bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground line-clamp-1">
                    {preset.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs"
                    style={{ backgroundColor: preset.colors.cosBrand || preset.colors.primary }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs"
                    style={{ backgroundColor: preset.colors.background }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs"
                    style={{ backgroundColor: preset.colors.card }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs"
                    style={{ backgroundColor: preset.colors.success }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Mode, Radius & Font Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border pt-6 mb-6">
        {/* Color Mode */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Display Mode
          </label>
          <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-xl">
            {(['light', 'dark', 'oled'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`py-1.5 rounded-lg text-xs font-bold capitalize transition flex items-center justify-center gap-1 ${
                  theme.mode === m
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
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
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Corner Radius
          </label>
          <div className="grid grid-cols-4 gap-1 bg-muted p-1 rounded-xl">
            {(['none', 'sm', 'lg', 'full'] as const).map((r) => (
              <button
                key={r}
                onClick={() => handleRadiusChange(r)}
                className={`py-1.5 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center ${
                  theme.radius === r
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Font */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Typography
          </label>
          <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-xl">
            {(['inter', 'mono', 'serif'] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleFontChange(f)}
                className={`py-1.5 rounded-lg text-xs font-bold capitalize transition flex items-center justify-center ${
                  theme.font === f
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Export & Actions */}
      <div className="border-t border-border pt-4 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground font-mono">
          Theme active: <strong className="text-foreground">{theme.name}</strong>
        </span>

        <button
          onClick={handleCopyCSS}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 shadow-xs transition"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>{copied ? 'CSS Copied!' : 'Copy CSS Tokens'}</span>
        </button>
      </div>
    </div>
  );
}
