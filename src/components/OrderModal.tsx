import React, { useState } from 'react';
import { BlackBoxSignal, InstrumentSymbol, ActiveTrade } from '../types/trading';
import { INSTRUMENT_METAS } from '../services/marketData';
import { haptics } from '../utils/haptics';
import { X, Zap, Shield, ArrowUpRight, ArrowDownRight, Check, AlertTriangle } from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  signal: BlackBoxSignal;
  symbol: InstrumentSymbol;
  balance: number;
  onExecuteTrade: (trade: ActiveTrade) => void;
  isDark: boolean;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  signal,
  symbol,
  balance,
  onExecuteTrade,
  isDark,
}) => {
  if (!isOpen) return null;

  const meta = INSTRUMENT_METAS[symbol];
  const isHigh = signal.confidence >= 90;
  const isLong = signal.direction === 'LONG';

  // Position Sizing state
  const [riskPercent, setRiskPercent] = useState<number>(2.0); // 2% risk default
  const [selectedTp, setSelectedTp] = useState<'TP1' | 'TP2'>('TP1');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Risk Math
  const riskDollar = (balance * riskPercent) / 100;
  const priceDistance = Math.abs(signal.entryPrice - signal.stopLoss);
  const tpTarget = selectedTp === 'TP1' ? signal.takeProfit1 : signal.takeProfit2;
  const rewardDistance = Math.abs(tpTarget - signal.entryPrice);
  const riskReward = rewardDistance / (priceDistance || 1);

  // Lot size calculation:
  // For Forex: 1 standard lot = 100,000 units, 1 pip = 0.0001 = $10 per lot (or ~10 in quote)
  // For Gold: 1 lot = 100 oz, $1 move = $100 per lot
  let calculatedLots = 0.1;
  if (symbol === 'XAU/USD') {
    // Risk $ / (priceDistance * 100)
    calculatedLots = riskDollar / (priceDistance * 100);
  } else {
    // Risk $ / (pips * 10)
    const pips = priceDistance / meta.pipSize;
    calculatedLots = riskDollar / (pips * 10);
  }
  calculatedLots = Math.max(0.01, Math.round(calculatedLots * 100) / 100);

  const potentialProfitDollar = Math.round(riskDollar * riskReward);

  const handleConfirmOrder = () => {
    setIsSubmitting(true);
    haptics.orderFilled();

    setTimeout(() => {
      const newTrade: ActiveTrade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        symbol,
        direction: signal.direction,
        entryPrice: signal.entryPrice,
        currentPrice: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: tpTarget,
        lotSize: calculatedLots,
        riskAmount: Math.round(riskDollar),
        potentialReward: potentialProfitDollar,
        openTime: Date.now(),
        status: 'OPEN',
        pnl: 0,
        confidenceAtEntry: signal.confidence,
      };

      onExecuteTrade(newTrade);
      setSuccess(true);
      setIsSubmitting(false);

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1100);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-md rounded-3xl border p-6 backdrop-blur-2xl shadow-2xl transition-all transform scale-100 ${
          isDark
            ? 'bg-[#12141c]/95 border-white/10 text-slate-100'
            : 'bg-white/95 border-black/10 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                isLong ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
              }`}
            >
              {isLong ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg tracking-tight">Order Execution Ticket</h3>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                    isHigh
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {signal.confidence}% CONFIDENCE
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {symbol} · 4-Hour Swing Setup
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className={`p-1.5 rounded-full transition-colors ${
              isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/5 text-slate-600'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Confidence Notice */}
        {isHigh ? (
          <div className="mt-3.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-center gap-2">
            <Zap size={16} className="text-emerald-400 flex-shrink-0 fill-current" />
            <div>
              <strong>High-Conviction Reversal Signal (&gt;90%):</strong> Optimal institutional entry timing confirmed.
            </div>
          </div>
        ) : (
          <div className="mt-3.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
            <div>
              <strong>Pre-Trigger Execution:</strong> Current confidence is {signal.confidence}%. Standard rules recommend executing when &gt;90%.
            </div>
          </div>
        )}

        {/* Pricing Parameters Card */}
        <div
          className={`mt-4 p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#181a24] border-white/5' : 'bg-slate-50 border-black/5'
          }`}
        >
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Entry Price</span>
              <div className="text-sm font-bold text-slate-100 dark:text-slate-100 mt-0.5">
                {signal.entryPrice}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-rose-400 uppercase">Stop Loss</span>
              <div className="text-sm font-bold text-rose-500 mt-0.5">
                {signal.stopLoss}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 uppercase">Target TP</span>
              <div className="text-sm font-bold text-emerald-500 mt-0.5">
                {tpTarget}
              </div>
            </div>
          </div>
        </div>

        {/* Take Profit Target Selector (1:2 vs 1:3.5) */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Take Profit Horizon
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                haptics.light();
                setSelectedTp('TP1');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedTp === 'TP1'
                  ? isDark
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold shadow-sm'
                    : 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold shadow-sm'
                  : isDark
                  ? 'bg-[#161822] border-white/5 text-slate-400'
                  : 'bg-slate-50 border-black/5 text-slate-600'
              }`}
            >
              <div className="text-xs">TP1 (1:2.0 R:R)</div>
              <div className="font-mono text-[11px] text-emerald-500 mt-0.5">
                {signal.takeProfit1}
              </div>
            </button>

            <button
              onClick={() => {
                haptics.light();
                setSelectedTp('TP2');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedTp === 'TP2'
                  ? isDark
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold shadow-sm'
                    : 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold shadow-sm'
                  : isDark
                  ? 'bg-[#161822] border-white/5 text-slate-400'
                  : 'bg-slate-50 border-black/5 text-slate-600'
              }`}
            >
              <div className="text-xs">TP2 (1:3.5 R:R)</div>
              <div className="font-mono text-[11px] text-emerald-500 mt-0.5">
                {signal.takeProfit2}
              </div>
            </button>
          </div>
        </div>

        {/* Risk Percentage Selector */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-400">Account Risk</span>
            <span className="font-mono font-bold text-slate-200 dark:text-slate-200">
              {riskPercent}% (${riskDollar.toFixed(0)})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1.0, 2.0, 3.0].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  haptics.light();
                  setRiskPercent(pct);
                }}
                className={`py-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                  riskPercent === pct
                    ? isDark
                      ? 'bg-white/15 border-white/30 text-white font-bold'
                      : 'bg-slate-900 border-slate-900 text-white font-bold'
                    : isDark
                    ? 'bg-[#161822] border-white/5 text-slate-400 hover:text-white'
                    : 'bg-slate-100 border-black/5 text-slate-600 hover:text-slate-900'
                }`}
              >
                {pct}% Risk
              </button>
            ))}
          </div>
        </div>

        {/* Calculated Position Stats */}
        <div className="mt-4 p-3 rounded-2xl bg-black/10 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs">
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Position Size</span>
            <span className="font-mono font-semibold text-slate-100 dark:text-slate-100">
              {calculatedLots} Standard Lots
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Max Dollar Risk</span>
            <span className="font-mono font-semibold text-rose-400">
              -${riskDollar.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Estimated Swing Profit</span>
            <span className="font-mono font-bold text-emerald-400">
              +${potentialProfitDollar} ({riskReward.toFixed(1)}x)
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5">
          {success ? (
            <div className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30">
              <Check size={18} />
              <span>SWING ORDER PLACED SUCCESSFULLY</span>
            </div>
          ) : (
            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-white ${
                isLong
                  ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25'
                  : 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/25'
              }`}
            >
              <Zap size={16} className="fill-current" />
              <span>
                {isSubmitting
                  ? 'ROUTING ORDER TO LIQUIDITY...'
                  : `EXECUTE ${signal.direction} SWING ORDER`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
