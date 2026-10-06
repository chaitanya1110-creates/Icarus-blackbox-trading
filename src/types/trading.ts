export type InstrumentSymbol = 'EUR/USD' | 'EUR/GBP' | 'GBP/USD' | 'XAU/USD';

export interface Candle {
  timestamp: number;
  timeLabel: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  volumeDelta: number; // positive = buy volume dominant, negative = sell volume dominant
  rsi?: number;
  ema20?: number;
  ema50?: number;
  bbUpper?: number;
  bbLower?: number;
  bbMiddle?: number;
  signal?: 'BULLISH_REVERSAL' | 'BEARISH_REVERSAL';
  signalConfidence?: number;
}

export type OrderDirection = 'LONG' | 'SHORT';

export interface BlackBoxSignal {
  symbol: InstrumentSymbol;
  direction: OrderDirection;
  confidence: number; // 0 to 100
  isHighConviction: boolean; // >= 90%
  timestamp: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: number;
  exhaustionStage: 'Pre-Exhaustion' | 'Liquidity Sweep' | 'Climax Volume' | 'Confirmed Shift';
  confluenceFactors: {
    name: string;
    description: string;
    satisfied: boolean;
    weight: number;
  }[];
}

export interface SentimentAnalysis {
  sentimentBias: string;
  sentimentScore: number;
  summary: string;
  reversalDrivers: string[];
  thesis: string;
  invalidationLevel: string;
  bestTimingWindow: string;
  keyRisks: string[];
  retailBias: {
    long: number;
    short: number;
  };
  institutionalBias: 'Heavy Accumulation' | 'Heavy Distribution' | 'Neutral' | 'Slight Accumulation' | 'Slight Distribution';
  macroIndex: number; // -100 to +100
  lastUpdated: string;
  isAiLive: boolean;
}

export interface ActiveTrade {
  id: string;
  symbol: InstrumentSymbol;
  direction: OrderDirection;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  riskAmount: number;
  potentialReward: number;
  openTime: number;
  status: 'OPEN' | 'CLOSED';
  pnl: number;
  confidenceAtEntry: number;
}

export interface PortfolioState {
  balance: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
  trades: ActiveTrade[];
  history: ActiveTrade[];
}

export interface InstrumentMeta {
  symbol: InstrumentSymbol;
  name: string;
  description: string;
  pipSize: number;
  digits: number;
  unit: string;
  standardLotUnits: number;
  category: 'Forex Major' | 'Forex Cross' | 'Precious Metal';
}
