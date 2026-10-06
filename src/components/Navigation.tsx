import React from 'react';
import { InstrumentSymbol } from '../types/trading';
import { haptics } from '../utils/haptics';
import { Moon, Sun, Volume2, VolumeX, Flame, Activity } from 'lucide-react';

interface NavigationProps {
  currentSymbol: InstrumentSymbol;
  onSelectSymbol: (symbol: InstrumentSymbol) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeTradesCount: number;
  balance: number;
  liveQuotes?: Record<InstrumentSymbol, number>;
}

const INSTRUMENTS: { symbol: InstrumentSymbol; label: string; sub: string }[] = [
  { symbol: 'EUR/USD', label: 'EUR/USD', sub: 'Euro' },
  { symbol: 'EUR/GBP', label: 'EUR/GBP', sub: 'EUR/GBP' },
  { symbol: 'GBP/USD', label: 'GBP/USD', sub: 'Cable' },
  { symbol: 'XAU/USD', label: 'GOLD (XAU)', sub: 'Bullion' },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentSymbol,
  onSelectSymbol,
  isDark,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  activeTradesCount,
  balance,
  liveQuotes,
}) => {
  return (
    <>
      {/* Top Desktop & Tablet Glassmorphism Navigation Bar */}
      <header
        className={`sticky top-0 z-40 w-full backdrop-blur-2xl border-b transition-colors duration-300 ${
          isDark
            ? 'bg-[#0d0e14]/85 border-white/5 text-slate-100'
            : 'bg-[#f8f9fc]/85 border-black/5 text-slate-900'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-15 flex items-center justify-between">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame size={18} className="fill-amber-400/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-base font-['Helvetica_Neue',Helvetica,sans-serif]">
                  ICARUS<span className="text-amber-500">.TRADING</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="text-[10px] text-slate-400 hidden sm:block">
                Black Box Trend Reversal & Quantitative Terminal
              </div>
            </div>
          </div>

          {/* Desktop Instrument Page Selector Tabs with Live Rates */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl border bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5">
            {INSTRUMENTS.map((inst) => {
              const isActive = currentSymbol === inst.symbol;
              const quote = liveQuotes ? liveQuotes[inst.symbol] : null;
              return (
                <button
                  key={inst.symbol}
                  onClick={() => {
                    haptics.light();
                    onSelectSymbol(inst.symbol);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                    isActive
                      ? isDark
                        ? 'bg-[#181a24] text-white shadow-md border border-white/10 font-bold'
                        : 'bg-white text-slate-900 shadow-md border border-black/5 font-bold'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{inst.label}</span>
                    {quote && (
                      <span className="font-mono text-[11px] font-normal opacity-80">
                        {quote.toFixed(inst.symbol === 'XAU/USD' ? 2 : 4)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls: Balance, Audio Haptics, Dark/Light Mode */}
          <div className="flex items-center gap-2">
            {/* Account Balance Widget */}
            <div
              className={`hidden sm:flex flex-col text-right px-3 py-1 rounded-xl border text-xs font-mono ${
                isDark ? 'bg-[#151722] border-white/5' : 'bg-slate-100 border-black/5'
              }`}
            >
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Balance</span>
              <span className="font-bold text-slate-100 dark:text-slate-100">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                haptics.light();
                onToggleSound();
              }}
              className={`p-2 rounded-xl border transition-colors ${
                soundEnabled
                  ? isDark
                    ? 'bg-white/10 border-white/15 text-slate-200'
                    : 'bg-slate-200 border-slate-300 text-slate-800'
                  : isDark
                  ? 'border-white/5 text-slate-500 hover:text-slate-300'
                  : 'border-black/5 text-slate-400 hover:text-slate-700'
              }`}
              title={soundEnabled ? 'Mute Haptic Audio Clicks' : 'Enable Haptic Audio Clicks'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={() => {
                haptics.medium();
                onToggleTheme();
              }}
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-[#181a24] border-white/10 text-amber-400 hover:bg-white/10'
                  : 'bg-slate-100 border-black/5 text-slate-700 hover:bg-slate-200'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Floating Bottom Bar with iOS Glass Effect */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl border-t px-2 py-2 safe-area-bottom ${
          isDark
            ? 'bg-[#0b0c12]/92 border-white/5'
            : 'bg-white/92 border-black/5 shadow-lg'
        }`}
      >
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {INSTRUMENTS.map((inst) => {
            const isActive = currentSymbol === inst.symbol;
            const quote = liveQuotes ? liveQuotes[inst.symbol] : null;
            return (
              <button
                key={inst.symbol}
                onClick={() => {
                  haptics.light();
                  onSelectSymbol(inst.symbol);
                }}
                className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-white/10 text-emerald-400 font-bold'
                      : 'bg-slate-900 text-white font-bold'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span className="text-[11px] tracking-tight">{inst.symbol.split('/')[0]}</span>
                <span className="text-[9px] opacity-75 font-mono">
                  {quote ? quote.toFixed(inst.symbol === 'XAU/USD' ? 1 : 4) : inst.symbol.split('/')[1] || 'USD'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
