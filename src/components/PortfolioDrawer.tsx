import React, { useState } from 'react';
import { ActiveTrade, PortfolioState, InstrumentSymbol } from '../types/trading';
import { INSTRUMENT_METAS } from '../services/marketData';
import { haptics } from '../utils/haptics';
import { Briefcase, ArrowUpRight, ArrowDownRight, ShieldCheck, XCircle, CheckCircle2, History } from 'lucide-react';

interface PortfolioDrawerProps {
  portfolio: PortfolioState;
  onCloseTrade: (tradeId: string) => void;
  onMoveToBreakeven: (tradeId: string) => void;
  isDark: boolean;
}

export const PortfolioDrawer: React.FC<PortfolioDrawerProps> = ({
  portfolio,
  onCloseTrade,
  onMoveToBreakeven,
  isDark,
}) => {
  const [tab, setTab] = useState<'OPEN' | 'HISTORY'>('OPEN');

  const openTradesCount = portfolio.trades.length;
  const totalOpenPnl = portfolio.trades.reduce((acc, t) => acc + t.pnl, 0);

  return (
    <div
      className={`rounded-2xl border p-4.5 backdrop-blur-xl transition-all ${
        isDark ? 'bg-[#12141c]/90 border-white/5 text-slate-100' : 'bg-white/95 border-black/5 text-slate-900 shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Briefcase size={16} />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight">Active Swing Portfolio</h3>
            <div className="text-[11px] text-slate-400">
              Live orders, risk exposure & trailing breakeven management
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div
          className={`flex items-center p-0.5 rounded-xl border text-xs font-medium ${
            isDark ? 'bg-[#181a24] border-white/5' : 'bg-slate-100 border-black/5'
          }`}
        >
          <button
            onClick={() => {
              haptics.light();
              setTab('OPEN');
            }}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              tab === 'OPEN'
                ? isDark
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'bg-white text-slate-900 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Open ({openTradesCount})
          </button>
          <button
            onClick={() => {
              haptics.light();
              setTab('HISTORY');
            }}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              tab === 'HISTORY'
                ? isDark
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'bg-white text-slate-900 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            History ({portfolio.history.length})
          </button>
        </div>
      </div>

      {/* Account Snapshot Bar */}
      <div
        className={`grid grid-cols-4 gap-2 p-3 rounded-xl border text-xs font-mono mb-3.5 ${
          isDark ? 'bg-[#161822] border-white/5' : 'bg-slate-50 border-black/5'
        }`}
      >
        <div>
          <span className="text-[10px] text-slate-400 uppercase">Balance</span>
          <div className="font-bold text-slate-100 dark:text-slate-100 mt-0.5">
            ${portfolio.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase">Equity</span>
          <div className="font-bold text-slate-100 dark:text-slate-100 mt-0.5">
            ${portfolio.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase">Floating P&L</span>
          <div
            className={`font-bold mt-0.5 ${
              totalOpenPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {totalOpenPnl >= 0 ? '+' : ''}${totalOpenPnl.toFixed(2)}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase">Closed P&L</span>
          <div
            className={`font-bold mt-0.5 ${
              portfolio.balance - 10000 >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {portfolio.balance - 10000 >= 0 ? '+' : ''}${(portfolio.balance - 10000).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tab content: Open Trades */}
      {tab === 'OPEN' ? (
        portfolio.trades.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No active swing positions. Wait for the Black Box confidence to cross &gt;90% and execute an order.
          </div>
        ) : (
          <div className="space-y-2.5">
            {portfolio.trades.map((trade) => {
              const meta = INSTRUMENT_METAS[trade.symbol];
              const isLong = trade.direction === 'LONG';
              const isProfit = trade.pnl >= 0;

              return (
                <div
                  key={trade.id}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isDark ? 'bg-[#181a24] border-white/5' : 'bg-slate-50 border-black/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          isLong ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {isLong ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                      </div>
                      <span className="font-bold text-sm">{trade.symbol}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold ${
                          isLong ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {trade.direction} · {trade.lotSize}L
                      </span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[10px] text-slate-400 mr-1.5">P&L:</span>
                      <span
                        className={`font-bold text-sm ${
                          isProfit ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {isProfit ? '+' : ''}${trade.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Trade Parameters */}
                  <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px] text-slate-400 py-1.5 border-y border-black/5 dark:border-white/5">
                    <div>
                      <span>Entry:</span> <strong className="text-slate-200 dark:text-slate-200">{trade.entryPrice}</strong>
                    </div>
                    <div>
                      <span>Current:</span> <strong className="text-slate-200 dark:text-slate-200">{trade.currentPrice.toFixed(meta.digits)}</strong>
                    </div>
                    <div>
                      <span>SL:</span> <strong className="text-rose-400">{trade.stopLoss}</strong>
                    </div>
                    <div>
                      <span>TP:</span> <strong className="text-emerald-400">{trade.takeProfit}</strong>
                    </div>
                  </div>

                  {/* Quick Trade Controls */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        haptics.medium();
                        onMoveToBreakeven(trade.id);
                      }}
                      className={`text-[11px] font-medium px-2 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                        trade.stopLoss === trade.entryPrice
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-semibold'
                          : isDark
                          ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
                          : 'border-black/10 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="Move Stop Loss to Entry Price (Zero Risk)"
                    >
                      <ShieldCheck size={13} />
                      <span>{trade.stopLoss === trade.entryPrice ? 'Risk-Free Breakeven' : 'Move SL to Breakeven'}</span>
                    </button>

                    <button
                      onClick={() => {
                        haptics.light();
                        onCloseTrade(trade.id);
                      }}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/20 transition-colors flex items-center gap-1"
                    >
                      <XCircle size={13} />
                      <span>Close Order</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Trade History */
        portfolio.history.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No closed trades recorded yet in this session.
          </div>
        ) : (
          <div className="space-y-2">
            {portfolio.history.map((trade) => {
              const isProfit = trade.pnl >= 0;
              return (
                <div
                  key={trade.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    isDark ? 'bg-[#181a24] border-white/5' : 'bg-slate-50 border-black/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={isProfit ? 'text-emerald-500' : 'text-rose-500'} />
                    <span className="font-semibold">{trade.symbol}</span>
                    <span className="font-mono text-slate-400">{trade.direction}</span>
                  </div>

                  <div className="font-mono text-xs">
                    <span className={isProfit ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                      {isProfit ? '+' : ''}${trade.pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
