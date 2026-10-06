import { Candle, InstrumentMeta, InstrumentSymbol } from '../types/trading';

export const INSTRUMENT_METAS: Record<InstrumentSymbol, InstrumentMeta> = {
  'EUR/USD': {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    description: 'World benchmark forex pair. Sensitive to ECB vs Fed interest rate spreads & global trade flows.',
    pipSize: 0.0001,
    digits: 4,
    unit: 'USD',
    standardLotUnits: 100000,
    category: 'Forex Major',
  },
  'EUR/GBP': {
    symbol: 'EUR/GBP',
    name: 'Euro / British Pound',
    description: 'Key European cross. Highly sensitive to UK-EU trade policy, BoE vs ECB rate paths, and Brexit flows.',
    pipSize: 0.0001,
    digits: 4,
    unit: 'GBP',
    standardLotUnits: 100000,
    category: 'Forex Cross',
  },
  'GBP/USD': {
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    description: 'The "Cable" pair. High volatility swing asset responsive to UK economic health and US dollar liquidity.',
    pipSize: 0.0001,
    digits: 4,
    unit: 'USD',
    standardLotUnits: 100000,
    category: 'Forex Major',
  },
  'XAU/USD': {
    symbol: 'XAU/USD',
    name: 'Gold / US Dollar',
    description: 'Premier global safe-haven commodity. Inverse to real yields, driven by central bank buying & geopolitical risk.',
    pipSize: 0.01,
    digits: 2,
    unit: 'USD',
    standardLotUnits: 100,
    category: 'Precious Metal',
  },
};

interface BaseParams {
  basePrice: number;
  volatility: number;
  pipSize: number;
  seedTrend: number[];
}

const INSTRUMENT_BASES: Record<InstrumentSymbol, BaseParams> = {
  'EUR/USD': {
    basePrice: 1.1217,
    volatility: 0.0016,
    pipSize: 0.0001,
    seedTrend: [1.1140, 1.1180, 1.1160, 1.1220, 1.1190, 1.1240, 1.1217],
  },
  'EUR/GBP': {
    basePrice: 0.8485,
    volatility: 0.0011,
    pipSize: 0.0001,
    seedTrend: [0.8520, 0.8500, 0.8470, 0.8450, 0.8490, 0.8485],
  },
  'GBP/USD': {
    basePrice: 1.3215,
    volatility: 0.0022,
    pipSize: 0.0001,
    seedTrend: [1.3120, 1.3160, 1.3240, 1.3190, 1.3270, 1.3215],
  },
  'XAU/USD': {
    basePrice: 4131.50,
    volatility: 12.50,
    pipSize: 0.01,
    seedTrend: [4080.0, 4110.0, 4095.0, 4145.0, 4120.0, 4155.0, 4131.5],
  },
};

/**
 * Generates realistic candlestick sequence with technical indicators across 1H, 4H, and 1D timeframes
 */
export function generateHistoricalCandles(
  symbol: InstrumentSymbol,
  count: number = 72,
  timeframe: '1H' | '4H' | '1D' = '4H'
): Candle[] {
  const cfg = INSTRUMENT_BASES[symbol];
  const candles: Candle[] = [];

  const now = Date.now();
  let intervalMs = 4 * 60 * 60 * 1000;
  let volatilityMult = 1.0;

  if (timeframe === '1H') {
    intervalMs = 1 * 60 * 60 * 1000;
    volatilityMult = 0.55;
  } else if (timeframe === '1D') {
    intervalMs = 24 * 60 * 60 * 1000;
    volatilityMult = 2.4;
  }

  const effectiveVolatility = cfg.volatility * volatilityMult;
  let currentClose = cfg.basePrice - (count * 0.00015 * (symbol === 'XAU/USD' ? 40 : 1) * volatilityMult);

  // Create smooth multi-wave swing structure
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * intervalMs;
    const dateObj = new Date(timestamp);
    const timeLabel =
      timeframe === '1D'
        ? `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
        : `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${String(dateObj.getHours()).padStart(2, '0')}:00`;

    // Multi-cycle swing wave components
    const freq = timeframe === '1H' ? 0.25 : timeframe === '1D' ? 0.08 : 0.15;
    const wave1 = Math.sin(i * freq) * (effectiveVolatility * 3.5);
    const wave2 = Math.cos(i * (freq * 2.2)) * (effectiveVolatility * 1.8);
    const noise = (Math.random() - 0.49) * effectiveVolatility;

    const delta = wave1 * 0.3 + wave2 * 0.25 + noise;
    const open = currentClose;
    let close = open + delta;

    // Introduce sharp liquidity sweeps at specific swing pivots
    const isSweep = i === 1 || i === Math.floor(count * 0.35) || i === Math.floor(count * 0.7);
    const highWick = Math.random() * effectiveVolatility * (isSweep ? 2.5 : 1.2);
    const lowWick = Math.random() * effectiveVolatility * (isSweep ? 2.5 : 1.2);

    let high = Math.max(open, close) + highWick;
    let low = Math.min(open, close) - lowWick;

    // Volume calculation
    const baseVol = symbol === 'XAU/USD' ? (timeframe === '1D' ? 180000 : 45000) : (timeframe === '1D' ? 350000 : 85000);
    const volMultiplier = isSweep ? 2.8 + Math.random() * 0.8 : 0.8 + Math.random() * 0.6;
    const volume = Math.round(baseVol * volMultiplier * (timeframe === '1H' ? 0.4 : 1.0));
    const volumeDelta = close >= open ? Math.round(volume * 0.65) : -Math.round(volume * 0.65);

    // Round according to instrument precision
    const mult = Math.pow(10, cfg.pipSize === 0.01 ? 2 : 4);
    const roundedOpen = Math.round(open * mult) / mult;
    const roundedClose = Math.round(close * mult) / mult;
    const roundedHigh = Math.round(high * mult) / mult;
    const roundedLow = Math.round(low * mult) / mult;

    candles.push({
      timestamp,
      timeLabel,
      open: roundedOpen,
      high: roundedHigh,
      low: roundedLow,
      close: roundedClose,
      volume,
      volumeDelta,
    });

    currentClose = close;
  }

  // Calculate indicators (EMA, Bollinger Bands, RSI)
  return calculateIndicators(candles);
}

export async function fetchLiveMarketQuotes(): Promise<Record<InstrumentSymbol, number> | null> {
  try {
    const res = await fetch('/api/live-rates');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        return {
          'EUR/USD': data.rates['EUR/USD'],
          'EUR/GBP': data.rates['EUR/GBP'],
          'GBP/USD': data.rates['GBP/USD'],
          'XAU/USD': data.rates['XAU/USD'],
        };
      }
    }
  } catch {}
  return null;
}

export async function fetchRealMarketCandles(
  symbol: InstrumentSymbol,
  timeframe: '1H' | '4H' | '1D'
): Promise<Candle[] | null> {
  try {
    const res = await fetch(`/api/market-candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success' && Array.isArray(data.candles) && data.candles.length > 0) {
        return calculateIndicators(data.candles);
      }
    }
  } catch {}
  return null;
}

export function calculateIndicators(candles: Candle[]): Candle[] {
  const result = [...candles];
  const closes = result.map((c) => c.close);

  // EMA 20
  const k20 = 2 / (20 + 1);
  let ema20 = closes[0];
  for (let i = 0; i < result.length; i++) {
    if (i < 20) {
      const sum = closes.slice(0, i + 1).reduce((a, b) => a + b, 0);
      ema20 = sum / (i + 1);
    } else {
      ema20 = closes[i] * k20 + ema20 * (1 - k20);
    }
    result[i].ema20 = ema20;
  }

  // EMA 50
  const k50 = 2 / (50 + 1);
  let ema50 = closes[0];
  for (let i = 0; i < result.length; i++) {
    if (i < 50) {
      const sum = closes.slice(0, i + 1).reduce((a, b) => a + b, 0);
      ema50 = sum / (i + 1);
    } else {
      ema50 = closes[i] * k50 + ema50 * (1 - k50);
    }
    result[i].ema50 = ema50;
  }

  // Bollinger Bands (20 period, 2 std dev)
  for (let i = 0; i < result.length; i++) {
    if (i < 19) {
      result[i].bbMiddle = result[i].ema20;
      result[i].bbUpper = (result[i].ema20 || closes[i]) * 1.004;
      result[i].bbLower = (result[i].ema20 || closes[i]) * 0.996;
    } else {
      const slice = closes.slice(i - 19, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / 20;
      const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      result[i].bbMiddle = mean;
      result[i].bbUpper = mean + 2 * stdDev;
      result[i].bbLower = mean - 2 * stdDev;
    }
  }

  // RSI 14
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= 14 && i < result.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= 14;
  avgLoss /= 14;

  for (let i = 0; i < result.length; i++) {
    if (i < 14) {
      result[i].rsi = 50;
    } else {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * 13 + gain) / 14;
      avgLoss = (avgLoss * 13 + loss) / 14;

      if (avgLoss === 0) {
        result[i].rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        result[i].rsi = Math.round((100 - 100 / (1 + rs)) * 10) / 10;
      }
    }
  }

  // Inject historical reversal markers where high-conviction conditions aligned
  for (let i = 15; i < result.length - 1; i++) {
    const c = result[i];
    const prev = result[i - 1];
    const rsi = c.rsi || 50;
    const vol = c.volume;
    const avgVol = result.slice(i - 10, i).reduce((s, x) => s + x.volume, 0) / 10;

    // Bullish Reversal at swing low
    if (rsi < 33 && vol > avgVol * 1.8 && c.low < prev.low && c.close > c.open) {
      c.signal = 'BULLISH_REVERSAL';
      c.signalConfidence = 92 + Math.floor(Math.random() * 6);
    }
    // Bearish Reversal at swing high
    else if (rsi > 68 && vol > avgVol * 1.8 && c.high > prev.high && c.close < c.open) {
      c.signal = 'BEARISH_REVERSAL';
      c.signalConfidence = 91 + Math.floor(Math.random() * 6);
    }
  }

  return result;
}
