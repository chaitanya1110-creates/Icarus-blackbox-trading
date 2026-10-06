import React from 'react';
import { BlackBoxSignal, InstrumentSymbol } from '../types/trading';
import { haptics } from '../utils/haptics';
import { AlertCircle, ArrowUpRight, ArrowDownRight, CheckCircle2, Zap, ShieldAlert } from 'lucide-react';

interface BlackBoxMeterProps {
  signal: BlackBoxSignal;
  symbol: InstrumentSymbol;
  isDark: boolean;
  onOpenOrderModal: () => void;
  onTriggerHighConviction: () => void;
  isSimulatingHighConviction: boolean;
}

export const BlackBoxMeter: React.FC<BlackBoxMeterProps> = ({
  signal,
  symbol,
  isDark,
  onOpenOrderModal,
  onTriggerHighConviction,
  isSimulatingHighConviction,
}) => {
  const isHigh = signal.confidence >= 90;
  const isLong = signal.direction === 'LONG';

  // Gauge geometry
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (signal.confidence / 100) * circumference;

  // Colors
  const accentColor = isHigh
    ? '#10b981' // Green for >= 90%
    : signal.confidence >= 75
    ? '#f59e0b' // Amber
    : '#f43f5e'; // Red for low

  return (
    <div
      className={`rounded-2xl border p-4.5 backdrop-blur-xl transition-all duration-300 relative overflow-hidden ${
        isDark
          ? 'bg-[#12141c]/90 border-white/5 text-slate-100 shadow-xl'
          : 'bg-white/95 border-black/5 text-slate-900 shadow-lg'
      } ${
        isHigh
          ? isDark
            ? 'ring-1 ring-emerald-500/30'
            : 'ring-1 ring-emerald-500/20'
          : ''
      }`}
    >
      {/* Background Ambient Glow when >= 90% */}
      {isHigh && (
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      )}

      {/* Header section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase font-medium tracking-wider text-slate-400">
              Black Box Strategy
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                isDark ? 'bg-white/10 text-slate-300' : 'bg-black/5 text-slate-600'
              }`}
            >
              H4 SWING
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight mt-0.5">Trend Reversal Engine</h2>
        </div>

        {/* Quick simulation toggle */}
        <button
          onClick={() => {
            haptics.medium();
            onTriggerHighConviction();
          }}
          className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
            isSimulatingHighConviction
              ? 'bg-emerald-500 text-white border-emerald-400 font-semibold shadow-sm'
              : isDark
              ? 'bg-[#181b26] border-white/10 text-slate-300 hover:text-white'
              : 'bg-slate-100 border-black/5 text-slate-700 hover:text-slate-900'
          }`}
          title="Toggle >90% High Conviction Reversal Trigger"
        >
          <Zap size={12} className={isSimulatingHighConviction ? 'fill-current' : ''} />
          <span>{isSimulatingHighConviction ? 'Reset Scenario' : 'Simulate >90% Signal'}</span>
        </button>
      </div>

      {/* Main Gauge & Signal Direction Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left: Circular Confidence Meter */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background Track */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}
                strokeWidth="10"
                fill="none"
              />
              {/* Progress Arc */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                stroke={accentColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span
                className="text-3xl font-extrabold tracking-tight font-mono"
                style={{ color: accentColor }}
              >
                {signal.confidence}%
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mt-0.5">
                Confidence
              </span>
              {isHigh && (
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mt-0.5 animate-pulse">
                  Trigger Ready
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 text-center">
            <span className="text-xs font-medium text-slate-400">Order Trigger Threshold: </span>
            <span className="text-xs font-semibold text-emerald-500 font-mono">&gt;90%</span>
          </div>
        </div>

        {/* Right: Signal Breakdown & Action Banner */}
        <div className="md:col-span-7 flex flex-col justify-between h-full space-y-3">
          {/* Signal Direction Badge */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              isDark ? 'bg-[#181a24]/80 border-white/5' : 'bg-slate-50 border-black/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isLong ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                }`}
              >
                {isLong ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-tight">
                    {isLong ? 'BULLISH SWING REVERSAL' : 'BEARISH SWING REVERSAL'}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Phase: <span className="text-slate-200 dark:text-slate-200 font-medium">{signal.exhaustionStage}</span>
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <div className="text-slate-400">Target R:R</div>
              <div className="font-bold text-emerald-500">1 : {signal.riskRewardRatio.toFixed(1)}</div>
            </div>
          </div>

          {/* Pricing Parameters Grid */}
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div
              className={`p-2 rounded-lg border ${
                isDark ? 'bg-[#151722] border-white/5' : 'bg-slate-50 border-black/5'
              }`}
            >
              <div className="text-[10px] text-slate-400 uppercase">Entry Price</div>
              <div className="font-semibold text-slate-100 dark:text-slate-100 text-sm mt-0.5">
                {signal.entryPrice}
              </div>
            </div>
            <div
              className={`p-2 rounded-lg border ${
                isDark ? 'bg-[#151722] border-white/5' : 'bg-slate-50 border-black/5'
              }`}
            >
              <div className="text-[10px] text-rose-400 uppercase">Stop Loss</div>
              <div className="font-semibold text-rose-500 text-sm mt-0.5">
                {signal.stopLoss}
              </div>
            </div>
            <div
              className={`p-2 rounded-lg border ${
                isDark ? 'bg-[#151722] border-white/5' : 'bg-slate-50 border-black/5'
              }`}
            >
              <div className="text-[10px] text-emerald-400 uppercase">Take Profit</div>
              <div className="font-semibold text-emerald-500 text-sm mt-0.5">
                {signal.takeProfit1}
              </div>
            </div>
          </div>

          {/* Action Trigger Banner */}
          {isHigh ? (
            <div className="flex flex-col gap-2">
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                  isDark
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                <span>
                  <strong>Optimal Order Trigger Active:</strong> All 5 Black Box reversal confluences met.
                </span>
              </div>

              <button
                onClick={() => {
                  haptics.orderFilled();
                  onOpenOrderModal();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm tracking-wide shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Zap size={16} className="fill-current" />
                <span>PLACE 4H SWING ORDER NOW ({signal.confidence}%)</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${
                  isDark
                    ? 'bg-[#181a24] border-white/5 text-slate-400'
                    : 'bg-slate-100 border-black/5 text-slate-600'
                }`}
              >
                <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
                <span>
                  Confidence is at {signal.confidence}%. Waiting for final 4H volume climax or liquidity sweep to reach &gt;90% threshold.
                </span>
              </div>

              <button
                onClick={() => {
                  haptics.light();
                  onOpenOrderModal();
                }}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    : 'bg-slate-100 border-black/5 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Open Order Execution Ticket (Manual Staging)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confluence Factors Checklist */}
      <div className="mt-4 pt-3.5 border-t border-black/5 dark:border-white/5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Black Box Confluence Matrix
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {signal.confluenceFactors.map((factor, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${
                factor.satisfied
                  ? isDark
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200'
                    : 'bg-emerald-50/50 border-emerald-200/60 text-slate-800'
                  : isDark
                  ? 'bg-white/[0.02] border-white/5 text-slate-400'
                  : 'bg-slate-50 border-black/5 text-slate-500'
              }`}
            >
              <div className="mt-0.5">
                {factor.satisfied ? (
                  <CheckCircle2 size={13} className="text-emerald-500" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium flex items-center justify-between">
                  <span>{factor.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">+{factor.weight}%</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  {factor.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
