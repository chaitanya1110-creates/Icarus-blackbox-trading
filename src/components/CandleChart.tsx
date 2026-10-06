import React, { useRef, useState, useEffect } from 'react';
import { Candle, InstrumentSymbol, BlackBoxSignal } from '../types/trading';
import { INSTRUMENT_METAS } from '../services/marketData';
import { haptics } from '../utils/haptics';
import { Layers, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Zap, RefreshCw, BarChart2 } from 'lucide-react';

interface CandleChartProps {
  symbol: InstrumentSymbol;
  candles: Candle[];
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  isDark: boolean;
  signal?: BlackBoxSignal;
  onSimulateTick?: () => void;
  highConvictionActive?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  symbol,
  candles,
  timeframe,
  onTimeframeChange,
  isDark,
  signal,
  onRefresh,
  isRefreshing,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meta = INSTRUMENT_METAS[symbol];

  // Chart view configuration
  const [visibleCount, setVisibleCount] = useState<number>(36); // number of candles visible
  const [panOffset, setPanOffset] = useState<number>(0); // 0 = latest candle at right
  const [showEMA, setShowEMA] = useState<boolean>(true);
  const [showBollinger, setShowBollinger] = useState<boolean>(true);
  const [showSignals, setShowSignals] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showBlackBox, setShowBlackBox] = useState<boolean>(true);
  const [showVolumeProfile, setShowVolumeProfile] = useState<boolean>(true);

  // Crosshair state
  const [hoverData, setHoverData] = useState<{
    candle: Candle;
    x: number;
    y: number;
    price: number;
  } | null>(null);

  // Touch / Drag Pan state
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const initialPanRef = useRef<number>(0);

  // Render chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI (Retina)
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // Color definitions
    const bg = isDark ? '#0d0e14' : '#ffffff';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const greenBody = '#10b981';
    const greenBorder = '#059669';
    const redBody = '#f43f5e';
    const redBorder = '#e11d48';

    // Clear background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Margins
    const rightAxisWidth = 64;
    const bottomAxisHeight = 28;
    const volumeHeight = showVolume ? Math.min(80, height * 0.18) : 0;
    const chartWidth = width - rightAxisWidth;
    const chartHeight = height - bottomAxisHeight - volumeHeight;

    // Visible slice of candles
    const totalCandles = candles.length;
    const endIndex = Math.min(totalCandles, totalCandles - panOffset);
    const startIndex = Math.max(0, endIndex - visibleCount);
    const visibleCandles = candles.slice(startIndex, endIndex);

    if (visibleCandles.length === 0) return;

    // Min and Max prices for the visible range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    visibleCandles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (showBollinger) {
        if (c.bbLower && c.bbLower < minPrice) minPrice = c.bbLower;
        if (c.bbUpper && c.bbUpper > maxPrice) maxPrice = c.bbUpper;
      }
      if (c.volume > maxVol) maxVol = c.volume;
    });

    // Add 8% vertical padding
    const priceRange = maxPrice - minPrice || 0.001;
    const paddedMin = minPrice - priceRange * 0.08;
    const paddedMax = maxPrice + priceRange * 0.08;
    const paddedRange = paddedMax - paddedMin;

    const priceToY = (p: number) => chartHeight - ((p - paddedMin) / paddedRange) * chartHeight;
    const yToPrice = (y: number) => paddedMax - (y / chartHeight) * paddedRange;

    // Grid lines - Horizontal Price levels
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.font = '10px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillStyle = textMuted;
    ctx.textAlign = 'left';

    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const y = (chartHeight / gridSteps) * i;
      const price = yToPrice(y);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Right axis price label
      ctx.fillText(price.toFixed(meta.digits), chartWidth + 8, y + 3);
    }

    // Grid lines - Vertical Time markers
    const timeStep = Math.max(1, Math.floor(visibleCandles.length / 5));
    for (let i = 0; i < visibleCandles.length; i += timeStep) {
      const c = visibleCandles[i];
      const candleWidth = chartWidth / visibleCandles.length;
      const x = i * candleWidth + candleWidth / 2;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartHeight + volumeHeight);
      ctx.stroke();

      // Bottom label
      ctx.textAlign = 'center';
      ctx.fillText(c.timeLabel.split(' ')[0], x, height - 10);
    }

    // Draw Bollinger Bands Cloud
    if (showBollinger) {
      ctx.beginPath();
      visibleCandles.forEach((c, idx) => {
        if (!c.bbUpper) return;
        const candleWidth = chartWidth / visibleCandles.length;
        const x = idx * candleWidth + candleWidth / 2;
        const yUpper = priceToY(c.bbUpper);
        if (idx === 0) ctx.moveTo(x, yUpper);
        else ctx.lineTo(x, yUpper);
      });
      for (let idx = visibleCandles.length - 1; idx >= 0; idx--) {
        const c = visibleCandles[idx];
        if (!c.bbLower) continue;
        const candleWidth = chartWidth / visibleCandles.length;
        const x = idx * candleWidth + candleWidth / 2;
        const yLower = priceToY(c.bbLower);
        ctx.lineTo(x, yLower);
      }
      ctx.closePath();
      ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.04)' : 'rgba(56, 189, 248, 0.06)';
      ctx.fill();

      // Bollinger Upper and Lower lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(14, 165, 233, 0.45)';
      ctx.stroke();
    }

    // Draw EMAs
    if (showEMA) {
      // EMA 20 (Cyan)
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#38bdf8';
      visibleCandles.forEach((c, idx) => {
        if (!c.ema20) return;
        const candleWidth = chartWidth / visibleCandles.length;
        const x = idx * candleWidth + candleWidth / 2;
        const y = priceToY(c.ema20);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // EMA 50 (Amber)
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#f59e0b';
      visibleCandles.forEach((c, idx) => {
        if (!c.ema50) return;
        const candleWidth = chartWidth / visibleCandles.length;
        const x = idx * candleWidth + candleWidth / 2;
        const y = priceToY(c.ema50);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw Volume Delta Bars
    if (showVolume && maxVol > 0) {
      const volBaseY = chartHeight + volumeHeight;
      const candleWidth = chartWidth / visibleCandles.length;
      const barW = Math.max(2, candleWidth * 0.65);

      visibleCandles.forEach((c, idx) => {
        const x = idx * candleWidth + candleWidth / 2 - barW / 2;
        const volRatio = c.volume / maxVol;
        const barH = volRatio * (volumeHeight - 12);
        const y = volBaseY - barH;
        const isUp = c.close >= c.open;

        ctx.fillStyle = isUp
          ? isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.4)'
          : isDark ? 'rgba(244, 63, 94, 0.3)' : 'rgba(244, 63, 94, 0.4)';
        ctx.fillRect(x, y, barW, barH);
      });
    }

    // Draw Volume Profile (Horizontal volume distribution across visible price range)
    if (showVolumeProfile && visibleCandles.length > 0) {
      const numBins = 28;
      const priceBinStep = paddedRange / numBins;
      interface VPBin {
        priceLow: number;
        priceHigh: number;
        priceMid: number;
        buyVolume: number;
        sellVolume: number;
        totalVolume: number;
      }

      const bins: VPBin[] = [];
      for (let i = 0; i < numBins; i++) {
        const pLow = paddedMin + i * priceBinStep;
        const pHigh = pLow + priceBinStep;
        bins.push({
          priceLow: pLow,
          priceHigh: pHigh,
          priceMid: (pLow + pHigh) / 2,
          buyVolume: 0,
          sellVolume: 0,
          totalVolume: 0,
        });
      }

      // Distribute volume of visible candles across intersecting price levels
      let totalVisibleVolume = 0;
      visibleCandles.forEach((c) => {
        totalVisibleVolume += c.volume;
        const cHigh = c.high;
        const cLow = c.low;
        const cRange = Math.max(cHigh - cLow, priceBinStep * 0.2);
        const isUp = c.close >= c.open;
        const buyShare = isUp ? 0.65 : 0.35;
        const sellShare = 1 - buyShare;

        bins.forEach((b) => {
          const overlapMin = Math.max(cLow, b.priceLow);
          const overlapMax = Math.min(cHigh, b.priceHigh);
          if (overlapMax > overlapMin) {
            const fraction = (overlapMax - overlapMin) / cRange;
            const binVol = c.volume * fraction;
            b.buyVolume += binVol * buyShare;
            b.sellVolume += binVol * sellShare;
            b.totalVolume += binVol;
          }
        });
      });

      // Find Max Volume Bin (POC - Point of Control)
      let maxBinVol = 0;
      let pocIndex = 0;
      bins.forEach((b, idx) => {
        if (b.totalVolume > maxBinVol) {
          maxBinVol = b.totalVolume;
          pocIndex = idx;
        }
      });

      // Determine Value Area (70% of total volume)
      const sortedBins = [...bins].sort((a, b) => b.totalVolume - a.totalVolume);
      let accumulatedVA = 0;
      const vaTarget = totalVisibleVolume * 0.7;
      const vaBinSet = new Set<VPBin>();

      for (const b of sortedBins) {
        accumulatedVA += b.totalVolume;
        vaBinSet.add(b);
        if (accumulatedVA >= vaTarget) break;
      }

      let vahPrice = -Infinity;
      let valPrice = Infinity;
      vaBinSet.forEach((b) => {
        if (b.priceHigh > vahPrice) vahPrice = b.priceHigh;
        if (b.priceLow < valPrice) valPrice = b.priceLow;
      });

      // Width of Volume Profile along left edge
      const maxVPBarWidth = Math.min(150, chartWidth * 0.22);

      // Render horizontal histogram bars along left edge
      if (maxBinVol > 0) {
        bins.forEach((b) => {
          const yTop = priceToY(b.priceHigh);
          const yBottom = priceToY(b.priceLow);
          const y = Math.min(yTop, yBottom);
          const barH = Math.max(1, Math.abs(yBottom - yTop) - 0.75);

          const totalRatio = b.totalVolume / maxBinVol;
          const barW = totalRatio * maxVPBarWidth;
          const buyRatio = b.buyVolume / (b.totalVolume || 1);
          const buyW = barW * buyRatio;
          const sellW = Math.max(0, barW - buyW);

          const inValueArea = vaBinSet.has(b);

          // Buy volume portion
          ctx.fillStyle = inValueArea
            ? isDark
              ? 'rgba(16, 185, 129, 0.40)'
              : 'rgba(16, 185, 129, 0.45)'
            : isDark
            ? 'rgba(16, 185, 129, 0.16)'
            : 'rgba(16, 185, 129, 0.20)';
          ctx.fillRect(0, y, buyW, barH);

          // Sell volume portion
          ctx.fillStyle = inValueArea
            ? isDark
              ? 'rgba(244, 63, 94, 0.40)'
              : 'rgba(244, 63, 94, 0.45)'
            : isDark
            ? 'rgba(244, 63, 94, 0.16)'
            : 'rgba(244, 63, 94, 0.20)';
          ctx.fillRect(buyW, y, sellW, barH);
        });

        // Draw Point of Control (POC) Line
        const pocBin = bins[pocIndex];
        if (pocBin) {
          const pocY = priceToY(pocBin.priceMid);
          ctx.save();
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = '#f59e0b'; // Amber POC line
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(0, pocY);
          ctx.lineTo(chartWidth * 0.45, pocY);
          ctx.stroke();

          // POC Badge
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 9px "Helvetica Neue", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`POC: ${pocBin.priceMid.toFixed(meta.digits)}`, maxVPBarWidth + 4, pocY - 2);
          ctx.restore();
        }

        // Draw Value Area High (VAH) and Value Area Low (VAL) lines
        if (vahPrice !== -Infinity && valPrice !== Infinity) {
          ctx.save();
          ctx.setLineDash([2, 4]);
          ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(14, 165, 233, 0.6)';
          ctx.lineWidth = 1;

          const vahY = priceToY(vahPrice);
          ctx.beginPath();
          ctx.moveTo(0, vahY);
          ctx.lineTo(maxVPBarWidth + 24, vahY);
          ctx.stroke();

          ctx.font = '8px "Helvetica Neue", sans-serif';
          ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.85)' : 'rgba(14, 165, 233, 0.9)';
          ctx.fillText(`VAH ${vahPrice.toFixed(meta.digits)}`, maxVPBarWidth + 4, vahY - 2);

          const valY = priceToY(valPrice);
          ctx.beginPath();
          ctx.moveTo(0, valY);
          ctx.lineTo(maxVPBarWidth + 24, valY);
          ctx.stroke();
          ctx.fillText(`VAL ${valPrice.toFixed(meta.digits)}`, maxVPBarWidth + 4, valY + 8);

          ctx.restore();
        }
      }
    }

    // Draw Candlesticks
    const candleWidth = chartWidth / visibleCandles.length;
    const bodyWidth = Math.max(2, candleWidth * 0.72);

    visibleCandles.forEach((c, idx) => {
      const centerX = idx * candleWidth + candleWidth / 2;
      const isUp = c.close >= c.open;

      const yOpen = priceToY(c.open);
      const yClose = priceToY(c.close);
      const yHigh = priceToY(c.high);
      const yLow = priceToY(c.low);

      const topBody = Math.min(yOpen, yClose);
      const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));

      // Wick
      ctx.strokeStyle = isUp ? greenBorder : redBorder;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(centerX, yHigh);
      ctx.lineTo(centerX, yLow);
      ctx.stroke();

      // Body
      ctx.fillStyle = isUp ? greenBody : redBody;
      ctx.fillRect(centerX - bodyWidth / 2, topBody, bodyWidth, bodyH);

      // Reversal Signal Markers
      if (showSignals && c.signal) {
        const isBull = c.signal === 'BULLISH_REVERSAL';
        const markerY = isBull ? yLow + 16 : yHigh - 16;
        const markerColor = isBull ? '#10b981' : '#f43f5e';

        // Glowing pulse halo
        ctx.beginPath();
        ctx.arc(centerX, markerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
        ctx.fill();

        // Arrow icon
        ctx.beginPath();
        if (isBull) {
          ctx.moveTo(centerX, markerY - 5);
          ctx.lineTo(centerX - 4, markerY + 3);
          ctx.lineTo(centerX + 4, markerY + 3);
        } else {
          ctx.moveTo(centerX, markerY + 5);
          ctx.lineTo(centerX - 4, markerY - 3);
          ctx.lineTo(centerX + 4, markerY - 3);
        }
        ctx.closePath();
        ctx.fillStyle = markerColor;
        ctx.fill();

        // 90%+ tag text
        ctx.fillStyle = markerColor;
        ctx.font = 'bold 9px "Helvetica Neue", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${c.signalConfidence || 92}%`,
          centerX,
          isBull ? markerY + 12 : markerY - 8
        );
      }
    });

    // Draw Black Box Strategy Setup Overlays directly on canvas
    if (showBlackBox && signal) {
      const yEntry = priceToY(signal.entryPrice);
      const ySL = priceToY(signal.stopLoss);
      const yTP1 = priceToY(signal.takeProfit1);
      const yTP2 = priceToY(signal.takeProfit2);
      const isLong = signal.direction === 'LONG';

      const boxStartX = Math.max(chartWidth * 0.45, chartWidth - 240);
      const boxEndX = chartWidth;

      // 1. Shaded Profit Target Corridor (Emerald)
      const topProfitY = Math.min(yEntry, yTP1);
      const profitHeight = Math.abs(yTP1 - yEntry);
      ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.12)';
      ctx.fillRect(boxStartX, topProfitY, boxEndX - boxStartX, profitHeight);

      // 2. Shaded Stop Loss Corridor (Rose)
      const topLossY = Math.min(yEntry, ySL);
      const lossHeight = Math.abs(ySL - yEntry);
      ctx.fillStyle = isDark ? 'rgba(244, 63, 94, 0.08)' : 'rgba(244, 63, 94, 0.12)';
      ctx.fillRect(boxStartX, topLossY, boxEndX - boxStartX, lossHeight);

      // 3. Dashed Horizontal Level Lines
      ctx.setLineDash([4, 4]);

      // Take Profit 2 Line
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(boxStartX, yTP2);
      ctx.lineTo(chartWidth, yTP2);
      ctx.stroke();

      // Take Profit 1 Line
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(boxStartX, yTP1);
      ctx.lineTo(chartWidth, yTP1);
      ctx.stroke();

      // Entry Price Line
      ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(boxStartX, yEntry);
      ctx.lineTo(chartWidth, yEntry);
      ctx.stroke();

      // Stop Loss Line
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(boxStartX, ySL);
      ctx.lineTo(chartWidth, ySL);
      ctx.stroke();

      ctx.setLineDash([]); // Reset line dash

      // Level Badges & Text
      ctx.font = 'bold 9px "Helvetica Neue", sans-serif';
      ctx.textAlign = 'left';

      // TP2 Label
      ctx.fillStyle = '#059669';
      ctx.fillText(`BB TP2: ${signal.takeProfit2.toFixed(meta.digits)} (1:3.5 R:R)`, boxStartX + 6, yTP2 - 3);

      // TP1 Label
      ctx.fillStyle = '#10b981';
      ctx.fillText(`BB TP1: ${signal.takeProfit1.toFixed(meta.digits)} (1:2.0 R:R)`, boxStartX + 6, yTP1 - 3);

      // Entry Label
      ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
      ctx.fillText(`BB ENTRY: ${signal.entryPrice.toFixed(meta.digits)}`, boxStartX + 6, yEntry - 3);

      // Stop Loss Label
      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`BB SL: ${signal.stopLoss.toFixed(meta.digits)}`, boxStartX + 6, ySL + 11);

      // Strategy Phase Stamp
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
      ctx.font = '8px "Helvetica Neue", sans-serif';
      ctx.fillText(`PHASE: ${signal.exhaustionStage.toUpperCase()} (${signal.confidence}%)`, boxStartX + 6, topProfitY + profitHeight / 2);
    }

    // Draw Current Live Price Line & Badge across the canvas
    const lastVisibleCandle = visibleCandles[visibleCandles.length - 1];
    if (lastVisibleCandle) {
      const liveY = priceToY(lastVisibleCandle.close);
      const isUpTick = lastVisibleCandle.close >= lastVisibleCandle.open;
      const liveColor = isUpTick ? '#10b981' : '#f43f5e';

      ctx.save();
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = liveColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, liveY);
      ctx.lineTo(chartWidth, liveY);
      ctx.stroke();

      // Right axis live price tag
      ctx.setLineDash([]);
      ctx.fillStyle = liveColor;
      ctx.fillRect(chartWidth + 1, liveY - 10, rightAxisWidth - 2, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px "Helvetica Neue", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(lastVisibleCandle.close.toFixed(meta.digits), chartWidth + 5, liveY + 4);
      ctx.restore();
    }

    // Crosshair overlay if hovered
    if (hoverData) {
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverData.x, 0);
      ctx.lineTo(hoverData.x, height - bottomAxisHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, hoverData.y);
      ctx.lineTo(chartWidth, hoverData.y);
      ctx.stroke();

      ctx.setLineDash([]); // Reset line dash

      // Hover Price badge on right axis
      ctx.fillStyle = isDark ? '#1e293b' : '#334155';
      ctx.fillRect(chartWidth + 1, hoverData.y - 10, rightAxisWidth - 2, 20);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(hoverData.price.toFixed(meta.digits), chartWidth + 6, hoverData.y + 4);
    }
  }, [
    candles,
    visibleCount,
    panOffset,
    showEMA,
    showBollinger,
    showSignals,
    showVolume,
    showBlackBox,
    showVolumeProfile,
    signal,
    isDark,
    hoverData,
    meta,
  ]);

  // Pointer / Touch move handler for Crosshair and Panning
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    initialPanRef.current = panOffset;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rightAxisWidth = 64;
    const bottomAxisHeight = 28;
    const chartWidth = rect.width - rightAxisWidth;
    const chartHeight = rect.height - bottomAxisHeight;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartXRef.current;
      const candleWidth = chartWidth / visibleCount;
      const candlesMoved = Math.round(deltaX / candleWidth);
      const maxPan = candles.length - visibleCount;
      const newPan = Math.max(0, Math.min(maxPan, initialPanRef.current + candlesMoved));
      setPanOffset(newPan);
      return;
    }

    if (x >= 0 && x <= chartWidth && y >= 0 && y <= chartHeight) {
      const totalCandles = candles.length;
      const endIndex = Math.min(totalCandles, totalCandles - panOffset);
      const startIndex = Math.max(0, endIndex - visibleCount);
      const visibleCandles = candles.slice(startIndex, endIndex);

      const candleWidth = chartWidth / visibleCandles.length;
      const index = Math.floor(x / candleWidth);
      const candle = visibleCandles[index];

      if (candle) {
        // Compute price from y
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        visibleCandles.forEach((c) => {
          if (c.low < minPrice) minPrice = c.low;
          if (c.high > maxPrice) maxPrice = c.high;
        });
        const priceRange = maxPrice - minPrice || 0.001;
        const paddedMin = minPrice - priceRange * 0.08;
        const paddedMax = maxPrice + priceRange * 0.08;
        const price = paddedMax - (y / chartHeight) * (paddedMax - paddedMin);

        setHoverData({
          candle,
          x,
          y,
          price,
        });
      }
    } else {
      setHoverData(null);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Zoom controls
  const handleZoomIn = () => {
    haptics.light();
    setVisibleCount((prev) => Math.max(16, prev - 8));
  };

  const handleZoomOut = () => {
    haptics.light();
    setVisibleCount((prev) => Math.min(candles.length, prev + 8));
  };

  const handleReset = () => {
    haptics.light();
    setVisibleCount(36);
    setPanOffset(0);
  };

  const latestCandle = candles[candles.length - 1] || null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col select-none ${
        isDark ? 'bg-[#0d0e14] text-slate-100' : 'bg-white text-slate-800'
      }`}
    >
      {/* Top Header Bar / Chart Controls */}
      <div
        className={`flex flex-wrap items-center justify-between px-3.5 py-2.5 border-b backdrop-blur-md ${
          isDark ? 'border-white/5 bg-[#12141c]/80' : 'border-black/5 bg-[#f8f9fc]/85'
        }`}
      >
        {/* Left: Timeframe Switcher & Current Quote */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-base font-semibold tracking-tight">{symbol}</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-mono font-medium ${
                isDark ? 'bg-white/10 text-slate-300' : 'bg-black/5 text-slate-600'
              }`}
            >
              {timeframe}
            </span>
          </div>

          {/* Timeframe Segmented Control (Hero is 4H) */}
          <div
            className={`flex items-center p-0.5 rounded-lg border ${
              isDark ? 'bg-[#181a24] border-white/5' : 'bg-slate-100 border-black/5'
            }`}
          >
            {['1H', '4H', '1D'].map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  haptics.light();
                  onTimeframeChange(tf);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  timeframe === tf
                    ? isDark
                      ? 'bg-slate-700/80 text-white shadow-sm font-semibold'
                      : 'bg-white text-slate-900 shadow-sm font-semibold'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {latestCandle && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono ml-1">
              <span className={latestCandle.close >= latestCandle.open ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'}>
                {latestCandle.close.toFixed(meta.digits)}
              </span>
              <span className="text-slate-500">
                {latestCandle.close >= latestCandle.open ? '+' : ''}
                {((latestCandle.close - latestCandle.open) * (symbol === 'XAU/USD' ? 1 : 10000)).toFixed(1)} {symbol === 'XAU/USD' ? '$' : 'pips'}
              </span>
            </div>
          )}
        </div>

        {/* Right: Technical Indicators & View Toggles */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => {
              haptics.light();
              setShowEMA(!showEMA);
            }}
            className={`px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${
              showEMA
                ? isDark
                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-400 font-medium'
                  : 'bg-sky-50 border-sky-200 text-sky-700 font-medium'
                : isDark
                ? 'border-white/5 text-slate-400 hover:text-slate-200'
                : 'border-black/5 text-slate-500 hover:text-slate-800'
            }`}
            title="Toggle EMA 20 & 50"
          >
            EMA
          </button>

          <button
            onClick={() => {
              haptics.light();
              setShowBollinger(!showBollinger);
            }}
            className={`px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${
              showBollinger
                ? isDark
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 font-medium'
                  : 'bg-amber-50 border-amber-200 text-amber-700 font-medium'
                : isDark
                ? 'border-white/5 text-slate-400 hover:text-slate-200'
                : 'border-black/5 text-slate-500 hover:text-slate-800'
            }`}
            title="Toggle Bollinger Bands"
          >
            BB
          </button>

          <button
            onClick={() => {
              haptics.light();
              setShowSignals(!showSignals);
            }}
            className={`px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${
              showSignals
                ? isDark
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-medium'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium'
                : isDark
                ? 'border-white/5 text-slate-400 hover:text-slate-200'
                : 'border-black/5 text-slate-500 hover:text-slate-800'
            }`}
            title="Toggle Black Box Reversal Signal Markers"
          >
            Signals
          </button>

          <button
            onClick={() => {
              haptics.light();
              setShowBlackBox(!showBlackBox);
            }}
            className={`px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${
              showBlackBox
                ? isDark
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 font-medium'
                  : 'bg-amber-50 border-amber-200 text-amber-700 font-medium'
                : isDark
                ? 'border-white/5 text-slate-400 hover:text-slate-200'
                : 'border-black/5 text-slate-500 hover:text-slate-800'
            }`}
            title="Toggle Black Box Strategy Bracket (Entry, SL, TP1, TP2)"
          >
            <Zap size={11} className={showBlackBox ? 'fill-current' : ''} />
            <span>BB Strategy</span>
          </button>

          <button
            onClick={() => {
              haptics.light();
              setShowVolumeProfile(!showVolumeProfile);
            }}
            className={`px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${
              showVolumeProfile
                ? isDark
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-medium'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium'
                : isDark
                ? 'border-white/5 text-slate-400 hover:text-slate-200'
                : 'border-black/5 text-slate-500 hover:text-slate-800'
            }`}
            title="Toggle Volume Profile (POC & Value Area)"
          >
            <BarChart2 size={11} />
            <span>VP</span>
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center border rounded-md ml-1 divide-x overflow-hidden border-black/5 dark:border-white/5">
            <button
              onClick={handleZoomIn}
              className={`p-1.5 transition-colors ${
                isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-black/5 text-slate-700'
              }`}
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={handleZoomOut}
              className={`p-1.5 transition-colors ${
                isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-black/5 text-slate-700'
              }`}
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              onClick={handleReset}
              className={`p-1.5 transition-colors ${
                isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-black/5 text-slate-700'
              }`}
              title="Reset View"
            >
              <RotateCcw size={13} />
            </button>
            {onRefresh && (
              <button
                onClick={() => {
                  haptics.light();
                  onRefresh();
                }}
                disabled={isRefreshing}
                className={`p-1.5 transition-colors ${
                  isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-black/5 text-slate-700'
                }`}
                title="Refresh Live Exchange Candles"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating HUD info bar */}
      <div
        className={`px-3 py-1 text-[11px] font-mono flex items-center gap-3 border-b overflow-x-auto whitespace-nowrap ${
          isDark ? 'border-white/5 bg-[#0e1017] text-slate-400' : 'border-black/5 bg-slate-50 text-slate-600'
        }`}
      >
        {hoverData ? (
          <>
            <span>TIME: <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{hoverData.candle.timeLabel}</span></span>
            <span>O: <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{hoverData.candle.open.toFixed(meta.digits)}</span></span>
            <span>H: <span className="text-emerald-500">{hoverData.candle.high.toFixed(meta.digits)}</span></span>
            <span>L: <span className="text-rose-500">{hoverData.candle.low.toFixed(meta.digits)}</span></span>
            <span>C: <span className={hoverData.candle.close >= hoverData.candle.open ? 'text-emerald-500' : 'text-rose-500'}>{hoverData.candle.close.toFixed(meta.digits)}</span></span>
            <span>VOL: <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{hoverData.candle.volume.toLocaleString()}</span></span>
            <span>RSI: <span className="text-sky-400">{hoverData.candle.rsi?.toFixed(1) || '--'}</span></span>
          </>
        ) : latestCandle ? (
          <>
            <span className="text-emerald-500 font-medium">LIVE 4H</span>
            <span>O: {latestCandle.open.toFixed(meta.digits)}</span>
            <span>H: {latestCandle.high.toFixed(meta.digits)}</span>
            <span>L: {latestCandle.low.toFixed(meta.digits)}</span>
            <span>C: {latestCandle.close.toFixed(meta.digits)}</span>
            <span>RSI(14): <span className="text-sky-400 font-semibold">{latestCandle.rsi?.toFixed(1) || '48.2'}</span></span>
            <span>VOL: {latestCandle.volume.toLocaleString()}</span>
          </>
        ) : null}
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            isDraggingRef.current = false;
            setHoverData(null);
          }}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Legend Overlay at top left of chart */}
        <div className="absolute top-2 left-3 pointer-events-none flex flex-wrap gap-3 text-[11px] font-mono">
          {showEMA && (
            <>
              <span className="text-sky-400 font-semibold">EMA 20</span>
              <span className="text-amber-400 font-semibold">EMA 50</span>
            </>
          )}
          {showBollinger && (
            <span className="text-sky-400/80 font-medium">Bollinger (20, 2.0)</span>
          )}
          {showSignals && (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Reversal Triggers (&gt;90%)
            </span>
          )}
          {showVolumeProfile && (
            <span className="text-amber-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Volume Profile (POC / VA)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
