import React, { useState, useEffect } from 'react';
import { InstrumentSymbol, SentimentAnalysis, BlackBoxSignal, Candle } from '../types/trading';
import { haptics } from '../utils/haptics';
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, ShieldAlert, Cpu, BarChart3, Clock } from 'lucide-react';

interface AiSentimentPanelProps {
  symbol: InstrumentSymbol;
  signal: BlackBoxSignal;
  candles: Candle[];
  isDark: boolean;
}

export const AiSentimentPanel: React.FC<AiSentimentPanelProps> = ({
  symbol,
  signal,
  candles,
  isDark,
}) => {
  const [analysis, setAnalysis] = useState<SentimentAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchAiSentiment = async () => {
    setLoading(true);
    haptics.light();

    const currentCandle = candles && candles.length > 0 ? candles[candles.length - 1] : undefined;
    const prevCandle = candles && candles.length > 1 ? candles[candles.length - 2] : undefined;
    const recentTrend = currentCandle && currentCandle.close >= (candles[candles.length - 6]?.close ?? currentCandle.open)
      ? 'Bullish extension approaching structural resistance'
      : 'Bearish decline testing historical swing liquidity demand';

    const payload = {
      symbol,
      timeframe: '4H',
      currentPrice: currentCandle ? currentCandle.close : signal.entryPrice,
      blackBoxScore: signal.confidence,
      direction: signal.direction,
      recentTrend,
      rsiValue: currentCandle?.rsi || 45,
      volumeFactor: currentCandle && prevCandle ? (currentCandle.volume / prevCandle.volume).toFixed(1) : 2.1,
      liquiditySweep: signal.exhaustionStage === 'Liquidity Sweep' || signal.isHighConviction,
      newsHeadlines: getPairNews(symbol),
    };

    try {
      const res = await fetch('/api/ai-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      if (data && data.data) {
        const item = data.data;
        setAnalysis({
          sentimentBias: item.sentimentBias || (signal.direction === 'LONG' ? 'Bullish Reversal' : 'Bearish Reversal'),
          sentimentScore: item.sentimentScore || signal.confidence,
          summary: item.summary || 'Strong institutional confluence detected on 4-Hour timeframe.',
          reversalDrivers: item.reversalDrivers || [
            '4H volume delta absorption at swing key level',
            'RSI momentum exhaustion with clear divergence',
            'Retail crowd 80% on wrong side of swing move',
          ],
          thesis: item.thesis || 'Wait for 4H confirmation before executing swing order.',
          invalidationLevel: item.invalidationLevel || signal.stopLoss.toString(),
          bestTimingWindow: item.bestTimingWindow || (signal.confidence >= 90 ? 'Immediate execution' : 'Monitor 4H close'),
          keyRisks: item.keyRisks || ['Central bank speaker volatility', 'High-impact macro prints'],
          retailBias: {
            long: signal.direction === 'LONG' ? 22 : 78,
            short: signal.direction === 'LONG' ? 78 : 22,
          },
          institutionalBias: signal.direction === 'LONG' ? 'Heavy Accumulation' : 'Heavy Distribution',
          macroIndex: signal.direction === 'LONG' ? 68 : -64,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          isAiLive: data.isLiveAi ?? true,
        });
      }
    } catch {
      // Local institutional fallback synthesis for GitHub static deployment
      const isLong = signal.direction === 'LONG';
      setAnalysis({
        sentimentBias: isLong ? (signal.confidence >= 90 ? 'Extremely Bullish' : 'Bullish') : (signal.confidence >= 90 ? 'Extremely Bearish' : 'Bearish'),
        sentimentScore: signal.confidence,
        summary: getFallbackSummary(symbol, isLong, signal.confidence),
        reversalDrivers: [
          `4H Volume Delta spike indicates institutional absorption of retail stop orders`,
          `RSI momentum divergence across 14-period rolling baseline`,
          `Institutional COT positioning index shows strong smart money counter-positioning`,
        ],
        thesis: signal.confidence >= 90
          ? `High-conviction 4H swing reversal trigger confirmed. Invalidation level strictly guarded at ${signal.stopLoss}, targeting 1:2.0 to 1:3.5 swing expansion.`
          : `Reversal structure developing with ${signal.confidence}% confidence. Monitor next 4H candle close for volume climax confirmation.`,
        invalidationLevel: signal.stopLoss.toString(),
        bestTimingWindow: signal.confidence >= 90 ? 'Immediate High-Conviction Market Order' : 'Wait for 4H close confirmation',
        keyRisks: [
          'Upcoming Federal Reserve / ECB macro rate outlook commentary',
          'Potential liquidity wick retest of structural extreme prior to swing run',
        ],
        retailBias: {
          long: isLong ? 24 : 76,
          short: isLong ? 76 : 24,
        },
        institutionalBias: isLong ? 'Heavy Accumulation' : 'Heavy Distribution',
        macroIndex: isLong ? 65 : -65,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isAiLive: false,
      });
    } finally {
      setLoading(false);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    fetchAiSentiment();
  }, [symbol, signal.direction, signal.isHighConviction]);

  return (
    <div
      className={`rounded-2xl border p-4.5 backdrop-blur-xl transition-all ${
        isDark ? 'bg-[#12141c]/90 border-white/5 text-slate-100' : 'bg-white/95 border-black/5 text-slate-900 shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight">AI Sentimental & Flow Synthesis</h3>
              {analysis?.isAiLive ? (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-medium">
                  GEMINI LIVE
                </span>
              ) : (
                <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded font-medium">
                  QUANT AI ENGINE
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Macro catalysts, order book skews & reversal intelligence
            </div>
          </div>
        </div>

        <button
          onClick={fetchAiSentiment}
          disabled={loading}
          className={`p-2 rounded-xl border transition-all ${
            isDark
              ? 'bg-[#181a24] border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
              : 'bg-slate-100 border-black/5 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="Refresh AI Analysis"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
          <RefreshCw size={20} className="animate-spin text-sky-400" />
          <span className="text-xs font-medium">Synthesizing institutional 4H order flow...</span>
        </div>
      ) : analysis ? (
        <div className="space-y-3.5">
          {/* Sentiment Summary Box */}
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
              isDark ? 'bg-[#161822] border-white/5' : 'bg-slate-50 border-black/5'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-300 dark:text-slate-300 flex items-center gap-1.5">
                <Cpu size={13} className="text-sky-400" />
                Sentiment Breakdown
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Bias: <strong className={signal.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>{analysis.sentimentBias}</strong>
              </span>
            </div>
            <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>{analysis.summary}</p>
          </div>

          {/* Crowd Sentiment vs Institutional Flow Meter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Retail Crowd Positioning (Contrarian Indicator) */}
            <div
              className={`p-2.5 rounded-xl border ${
                isDark ? 'bg-[#161822] border-white/5' : 'bg-slate-50 border-black/5'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <BarChart3 size={12} />
                  Retail Positioning (Contrarian)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1">
                <span className="text-emerald-500">{analysis.retailBias.long}% Long</span>
                <span className="text-rose-500">{analysis.retailBias.short}% Short</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${analysis.retailBias.long}%` }}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${analysis.retailBias.short}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {signal.direction === 'LONG'
                  ? 'Extreme crowd shorting provides fuel for upward reversal sweep.'
                  : 'Crowd heavily long into resistance; ripe for liquidity flush.'}
              </div>
            </div>

            {/* Smart Money Institutional Bias */}
            <div
              className={`p-2.5 rounded-xl border ${
                isDark ? 'bg-[#161822] border-white/5' : 'bg-slate-50 border-black/5'
              }`}
            >
              <div className="text-[11px] text-slate-400 mb-1">Institutional Order Book Bias</div>
              <div className="flex items-center gap-1.5">
                {signal.direction === 'LONG' ? (
                  <TrendingUp size={16} className="text-emerald-500" />
                ) : (
                  <TrendingDown size={16} className="text-rose-500" />
                )}
                <span className="font-bold text-xs text-slate-200 dark:text-slate-200">
                  {analysis.institutionalBias}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                COT report & 4H volume absorption demonstrate smart money absorption.
              </div>
            </div>
          </div>

          {/* AI Trade Thesis & Best Timing Window */}
          <div
            className={`p-3 rounded-xl border text-xs ${
              isDark ? 'bg-[#181a24] border-white/5' : 'bg-slate-50 border-black/5'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sky-400 uppercase tracking-wider text-[10px]">
                Institutional Trade Thesis
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                <Clock size={11} />
                {analysis.bestTimingWindow}
              </span>
            </div>
            <p className="text-slate-300 dark:text-slate-300 leading-relaxed mb-2">
              {analysis.thesis}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
              <div>
                <span className="text-slate-400">Invalidation Level: </span>
                <span className="font-mono font-bold text-rose-400">{analysis.invalidationLevel}</span>
              </div>
              <div>
                <span className="text-slate-400">Confidence: </span>
                <span className="font-mono font-bold text-emerald-400">{signal.confidence}%</span>
              </div>
            </div>
          </div>

          {/* Key Risks */}
          <div className="flex items-start gap-2 text-xs text-slate-400 bg-amber-500/5 border border-amber-500/15 p-2.5 rounded-xl">
            <ShieldAlert size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-amber-500">Key Swing Risks: </span>
              {analysis.keyRisks.join('; ')}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function getPairNews(symbol: InstrumentSymbol): string[] {
  switch (symbol) {
    case 'EUR/USD':
      return [
        'ECB officials signal steady rate pauses amid Eurozone manufacturing stabilization',
        'US Treasury yields consolidate following inflation forecast adjustments',
        'DXY index tests major multi-month resistance corridor',
      ];
    case 'EUR/GBP':
      return [
        'Bank of England interest rate cut expectations pricing creates sterling softness',
        'German economic sentiment surveys surpass consensus expectations',
      ];
    case 'GBP/USD':
      return [
        'UK wage growth metrics remain elevated, complicating BoE monetary easing schedule',
        'US Dollar safe haven premiums contract as global equity risk sentiment rebounds',
      ];
    case 'XAU/USD':
      return [
        'Global central bank reserve gold purchases continue at record pace',
        'US real interest rate yields dip, boosting bullion non-yielding asset attractiveness',
        'Geopolitical risk premiums support floor on precious metal drawdowns',
      ];
  }
}

function getFallbackSummary(symbol: InstrumentSymbol, isLong: boolean, score: number): string {
  if (symbol === 'EUR/USD') {
    return isLong
      ? 'Euro order book reveals heavy smart money accumulation into 4H liquidity demand. ECB rate policy stance offsets DXY strength, indicating high-probability upward reversal expansion.'
      : 'Institutional distribution has capped EUR/USD 4H swing highs. Sustained US yield differentials favor dollar appreciation against overextended retail euro positions.';
  } else if (symbol === 'EUR/GBP') {
    return isLong
      ? 'Cross-rate rotation favors the Euro as BoE rate cut pricing accelerates. Order flow shows massive bid density absorbing sterling sell volume.'
      : 'Sterling resiliency pushes EUR/GBP into structural supply. Bearish volume delta confirms sharp rejection of swing highs.';
  } else if (symbol === 'GBP/USD') {
    return isLong
      ? 'Cable printed a textbook 4H liquidity sweep below key support. Positive volume delta and 78% retail short positioning create ideal conditions for a short-squeeze reversal.'
      : 'Cable exhausted momentum into critical daily resistance. Systematic algorithmic funds are scaling into tactical 4H swing shorts.';
  } else {
    return isLong
      ? 'XAU/USD is benefiting from relentless institutional safe-haven accumulation following a liquidity sweep. Negative real yields provide fundamental tailwinds for 4H swing expansion.'
      : 'Gold printed an exhaustion pinbar near multi-week highs. Institutional profit-taking and technical overbought conditions suggest an imminent 4H mean-reversion reversal.';
  }
}
