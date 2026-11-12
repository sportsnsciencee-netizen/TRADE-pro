import React from 'react';

interface StrategySparklineProps {
  type: string;
  className?: string;
}

export const StrategySparkline: React.FC<StrategySparklineProps> = ({ type, className = 'w-16 h-8' }) => {
  // SVG coordinates: viewBox="0 0 80 40", midY = 20 (zero line)
  // Green color: #16a34a (emerald-600), Red color: #dc2626 (rose-600)
  const midY = 20;

  const renderShape = () => {
    switch (type) {
      case 'buy-call':
      case 'long-call':
        return (
          <>
            {/* Flat loss below zero, then rising into profit */}
            <path d="M 4 28 L 40 28" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 40 28 L 50 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 50 20 L 76 6" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'sell-put':
      case 'short-put':
        return (
          <>
            {/* Deep loss on left, rising into flat profit on right */}
            <path d="M 4 34 L 28 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 28 20 L 38 12" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 38 12 L 76 12" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'bull-call-spread':
      case 'bull-put-spread':
        return (
          <>
            {/* Flat loss left, slope in middle, flat profit right */}
            <path d="M 4 30 L 26 30" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 26 30 L 40 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 40 20 L 54 10" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 54 10 L 76 10" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'call-ratio-back-spread':
        return (
          <>
            {/* Small flat profit/loss left, dip in middle (red), explosive profit (green) right */}
            <path d="M 4 18 L 28 18" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 28 18 L 44 32" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 44 32 L 56 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 56 20 L 76 5" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'long-calendar-calls':
      case 'calendar-spread':
        return (
          <>
            {/* Bell curve: red on flanks, green peak in center */}
            <path d="M 4 28 C 15 28 25 24 32 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 32 20 C 38 15 42 10 44 10 C 46 10 50 15 56 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 56 20 C 62 24 68 28 76 28" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'double-calendar-spread':
        return (
          <>
            {/* Broad neutral plateau: loss on far sides, wide profit dome in middle */}
            <path d="M 4 28 L 18 28" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 18 28 L 26 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 26 20 C 32 10 48 10 54 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 54 20 L 62 28" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 62 28 L 76 28" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'triple-calendar-spread':
        return (
          <>
            {/* Triple wave / multi-cycle fine-tuned time curve */}
            <path d="M 4 26 C 16 26 22 20 28 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 28 20 C 33 11 37 13 40 8 C 43 13 47 11 52 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 52 20 C 58 20 64 26 76 26" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'bull-condor':
        return (
          <>
            {/* Defined loss wings, plateau of profit slightly shifted to the right */}
            <path d="M 4 30 L 22 30" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 22 30 L 32 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 32 20 L 40 10 L 60 10 L 68 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 68 20 L 76 30" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'bull-butterfly':
        return (
          <>
            {/* Capped loss on wings, triangular profit peak in center-right */}
            <path d="M 4 28 L 28 28" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 28 28 L 38 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 38 20 L 52 8 L 64 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 64 20 L 70 28 L 76 28" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'range-forward':
        return (
          <>
            {/* Downside loss (red) left, flat zero corridor, upside profit (green) right */}
            <path d="M 4 34 L 26 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 26 20 L 54 20" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 2" />
            <path d="M 54 20 L 76 6" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'buy-put':
      case 'long-put':
        return (
          <>
            {/* Rising profit on left, flat loss on right */}
            <path d="M 4 6 L 30 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 30 20 L 40 28" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 40 28 L 76 28" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'sell-call':
      case 'short-call':
        return (
          <>
            {/* Flat profit on left, steep loss on right */}
            <path d="M 4 12 L 42 12" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 42 12 L 52 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 52 20 L 76 34" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'bear-put-spread':
      case 'bear-call-spread':
        return (
          <>
            {/* Flat profit on left, falling through middle, flat loss on right */}
            <path d="M 4 10 L 26 10" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 26 10 L 40 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 40 20 L 54 30" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 54 30 L 76 30" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'put-ratio-back-spread':
        return (
          <>
            {/* Explosive profit on far left, dip in middle, flat small right */}
            <path d="M 4 5 L 24 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 24 20 L 36 32" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 36 32 L 52 18" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 52 18 L 76 18" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'short-straddle':
        return (
          <>
            {/* Inverted V: peak profit in center, loss both sides */}
            <path d="M 4 34 L 26 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 26 20 L 40 8 L 54 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 54 20 L 76 34" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'short-strangle':
        return (
          <>
            {/* Inverted trapezoid: plateau profit in center, loss both sides */}
            <path d="M 4 34 L 24 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 24 20 L 32 10 L 48 10 L 56 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 56 20 L 76 34" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'iron-condor':
        return (
          <>
            {/* Capped loss flanks, profit plateau in middle */}
            <path d="M 4 30 L 20 30" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 20 30 L 28 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 28 20 L 36 10 L 44 10 L 52 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 52 20 L 60 30" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 60 30 L 76 30" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'iron-butterfly':
        return (
          <>
            {/* Capped loss flanks, peaked profit in middle */}
            <path d="M 4 30 L 22 30" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 22 30 L 30 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 30 20 L 40 8 L 50 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 50 20 L 58 30" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 58 30 L 76 30" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'long-straddle':
        return (
          <>
            {/* V-shape: profit on big moves, loss at center */}
            <path d="M 4 6 L 24 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 24 20 L 40 32 L 56 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 56 20 L 76 6" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'long-strangle':
        return (
          <>
            {/* U-shape: profit on outer wings, flat loss in center */}
            <path d="M 4 6 L 24 20" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 24 20 L 32 30 L 48 30 L 56 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 56 20 L 76 6" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'covered-call':
        return (
          <>
            {/* Stock-like slope on left into profit, capped plateau on right */}
            <path d="M 4 34 L 32 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 32 20 L 52 10" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 52 10 L 76 10" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'protective-put':
        return (
          <>
            {/* Floor on left, rising profit on right */}
            <path d="M 4 28 L 32 28" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 32 28 L 46 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 46 20 L 76 6" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      default:
        // Default standard bullish spread payoff
        return (
          <>
            <path d="M 4 28 L 30 28" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 30 28 L 40 20" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 40 20 L 54 12" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 54 12 L 76 12" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
    }
  };

  return (
    <svg viewBox="0 0 80 40" className={`${className} overflow-visible shrink-0`} preserveAspectRatio="none">
      {/* Zero PnL Reference Line */}
      <line
        x1="2"
        y1={midY}
        x2="78"
        y2={midY}
        stroke="#cbd5e1"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      {renderShape()}
    </svg>
  );
};
