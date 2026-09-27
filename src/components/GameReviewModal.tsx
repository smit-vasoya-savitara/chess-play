/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { GameReviewReport, MoveAnalysis, MoveClassification } from '../types/chess';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Award,
  CheckCircle,
  HelpCircle,
  Copy,
  Share2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

interface GameReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: GameReviewReport | null;
  moves: { san: string; from: string; to: string }[];
  whiteName: string;
  blackName: string;
}

const CLASSIFICATION_CONFIG: Record<
  MoveClassification,
  { label: string; symbol: string; color: string; bg: string; border: string }
> = {
  brilliant: { label: 'Brilliant', symbol: '!!', color: 'text-cyan-400', bg: 'bg-cyan-950/40', border: 'border-cyan-500/50' },
  great: { label: 'Great', symbol: '!', color: 'text-sky-400', bg: 'bg-sky-950/40', border: 'border-sky-500/50' },
  best: { label: 'Best', symbol: '★', color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-500/50' },
  excellent: { label: 'Excellent', symbol: '✓', color: 'text-teal-400', bg: 'bg-teal-950/40', border: 'border-teal-500/50' },
  good: { label: 'Good', symbol: '○', color: 'text-gray-300', bg: 'bg-gray-800/40', border: 'border-gray-600/40' },
  book: { label: 'Book', symbol: '📖', color: 'text-amber-300', bg: 'bg-amber-950/40', border: 'border-amber-600/40' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', color: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-600/50' },
  mistake: { label: 'Mistake', symbol: '?', color: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-600/50' },
  blunder: { label: 'Blunder', symbol: '??', color: 'text-red-400', bg: 'bg-red-950/40', border: 'border-red-600/50' },
  'missed-win': { label: 'Missed Win', symbol: '✕', color: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-600/50' },
};

const PIECE_SYMBOLS: Record<string, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  isOpen,
  onClose,
  report,
  moves,
  whiteName,
  blackName,
}) => {
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000);
  const [previewChess, setPreviewChess] = useState<Chess>(new Chess());
  const [showVariation, setShowVariation] = useState<boolean>(false);
  const [copiedPgn, setCopiedPgn] = useState<boolean>(false);

  // Sync board position with current selected ply
  useEffect(() => {
    const c = new Chess();
    for (let i = 0; i <= currentPly && i < moves.length; i++) {
      try {
        c.move({ from: moves[i].from, to: moves[i].to, promotion: 'q' });
      } catch {
        try {
          c.move(moves[i].san);
        } catch {
          // ignore
        }
      }
    }
    setPreviewChess(c);
  }, [currentPly, moves]);

  // Auto-play loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && currentPly < moves.length - 1) {
      timer = setTimeout(() => {
        setCurrentPly((p) => {
          if (p < moves.length - 1) {
            audioEngine.playMove();
            return p + 1;
          }
          setIsPlaying(false);
          return p;
        });
      }, playbackSpeed);
    } else if (currentPly >= moves.length - 1) {
      setIsPlaying(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, currentPly, moves.length, playbackSpeed]);

  if (!isOpen || !report) return null;

  const currentAnalysis: MoveAnalysis | undefined = report.moveAnalyses[currentPly];

  // Helper to jump to next blunder or turning point
  const jumpToNextBlunder = () => {
    const nextIdx = report.moveAnalyses.findIndex(
      (m, idx) => idx > currentPly && (m.classification === 'blunder' || m.classification === 'mistake' || m.classification === 'missed-win')
    );
    if (nextIdx !== -1) {
      setCurrentPly(nextIdx);
      audioEngine.playMove();
    }
  };

  const jumpToKeyTurningPoint = () => {
    if (report.keyTurningPoint) {
      setCurrentPly(report.keyTurningPoint.moveIndex);
      audioEngine.playMove();
    }
  };

  const handleCopyPgn = () => {
    const pgnText = moves.reduce((acc, m, idx) => {
      if (idx % 2 === 0) return `${acc} ${Math.floor(idx / 2) + 1}. ${m.san}`;
      return `${acc} ${m.san}`;
    }, '');
    navigator.clipboard.writeText(pgnText.trim());
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  // Evaluation bar height (50% is equal 0.0)
  const currentEval = currentAnalysis ? currentAnalysis.evalAfter : 0;
  // Bounded between -1000 and +1000 centipawns for bar
  const evalNormalized = Math.max(-1000, Math.min(1000, currentEval));
  const whiteBarHeightPct = 50 + (evalNormalized / 1000) * 45;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="stone-slab rounded-2xl border-2 border-primary/50 w-full max-w-6xl shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col my-auto relative">
        {/* Header */}
        <div className="bg-surface-container-lowest px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border border-primary/60 bg-surface-container flex items-center justify-center text-primary shadow-[0_0_12px_rgba(212,175,55,0.2)]">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-headline-sm text-lg text-primary font-bold tracking-wider uppercase flex items-center gap-2">
                Grandmaster Game Review & Analysis
                <span className="px-2 py-0.5 bg-tertiary/20 text-tertiary text-[10px] font-label-sm border border-tertiary/40 rounded uppercase font-semibold">
                  Stockfish-Calibrated
                </span>
              </h2>
              <p className="text-outline font-label-sm text-xs tracking-widest uppercase">
                Move-by-Move Tactical Evaluation & Engine Variations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPgn}
              className="px-3 py-1.5 rounded bg-surface-container border border-outline-variant/40 hover:border-primary text-xs font-label-md text-on-surface-variant flex items-center gap-1.5 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedPgn ? 'Copied PGN!' : 'Copy PGN'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-outline hover:text-primary transition-colors p-2 rounded hover:bg-surface-container active:scale-95"
              title="Close Review"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Accuracy & Player Performance Scorecards */}
        <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/30 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* White Player Stats */}
          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container border-2 border-primary flex items-center justify-center font-bold text-primary text-xl">
                ♔
              </div>
              <div>
                <h3 className="font-headline-sm text-sm font-semibold text-primary">{whiteName}</h3>
                <span className="text-outline text-xs font-label-sm">Perf: ~{report.whitePerformanceElo} Elo</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-outline font-label-sm uppercase tracking-wider block">Accuracy</span>
              <span className="font-headline-sm text-2xl font-bold text-primary">
                {report.whiteAccuracy}%
              </span>
            </div>
          </div>

          {/* Black Player Stats */}
          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container border border-secondary/50 flex items-center justify-center font-bold text-secondary text-xl">
                ♚
              </div>
              <div>
                <h3 className="font-headline-sm text-sm font-semibold text-on-surface">{blackName}</h3>
                <span className="text-outline text-xs font-label-sm">Perf: ~{report.blackPerformanceElo} Elo</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-outline font-label-sm uppercase tracking-wider block">Accuracy</span>
              <span className="font-headline-sm text-2xl font-bold text-secondary">
                {report.blackAccuracy}%
              </span>
            </div>
          </div>
        </div>

        {/* Main Review Body: 3-column Bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-outline-variant/30 bg-surface-container-lowest/80">
          {/* Left Column: Interactive Mini Board & Evaluation Bar (5 cols) */}
          <div className="lg:col-span-5 p-4 flex flex-col items-center">
            {/* Board and Eval Bar Side-by-Side */}
            <div className="flex items-center gap-3">
              {/* Vertical Evaluation Bar */}
              <div className="w-4 h-[320px] sm:h-[360px] bg-slate-900 rounded-full border border-outline-variant/40 overflow-hidden flex flex-col justify-end relative shadow-inner">
                <div
                  className="bg-primary w-full transition-all duration-300"
                  style={{ height: `${whiteBarHeightPct}%` }}
                />
                <span className="absolute inset-x-0 top-1 text-[8px] font-mono text-center text-slate-300 font-bold">
                  {currentEval > 0 ? `+${(currentEval / 100).toFixed(1)}` : (currentEval / 100).toFixed(1)}
                </span>
              </div>

              {/* 2D Preview Board (8x8) */}
              <div className="grid grid-cols-8 grid-rows-8 w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] border-2 border-outline-variant/70 rounded-lg overflow-hidden shadow-2xl bg-[#14181f]">
                {['8', '7', '6', '5', '4', '3', '2', '1'].map((rank) =>
                  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((file) => {
                    const sq = `${file}${rank}` as Square;
                    const fIdx = file.charCodeAt(0) - 97;
                    const rIdx = parseInt(rank, 10) - 1;
                    const isDark = (fIdx + rIdx) % 2 === 0;

                    const piece = previewChess.get(sq);
                    const isMoveFrom = currentAnalysis && currentAnalysis.from === sq;
                    const isMoveTo = currentAnalysis && currentAnalysis.to === sq;
                    const isBestTarget = currentAnalysis && currentAnalysis.bestMoveFromTo.to === sq;

                    let bgClass = isDark ? 'bg-[#181c22]' : 'bg-[#282d36]';
                    if (isMoveFrom || isMoveTo) {
                      bgClass = isDark ? 'bg-[#2b446a]' : 'bg-[#3b5987]';
                    } else if (isBestTarget) {
                      bgClass = 'bg-[#134e4a] border border-teal-400/60';
                    }

                    return (
                      <div
                        key={sq}
                        className={`flex items-center justify-center select-none text-2xl sm:text-3xl relative ${bgClass}`}
                      >
                        {piece && (
                          <span
                            className={
                              piece.color === 'w'
                                ? 'text-[#f5d77f] drop-shadow-[0_2px_4px_rgba(242,202,80,0.5)]'
                                : 'text-[#e2e2e6] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                            }
                          >
                            {PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Playback Controls */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setCurrentPly(0);
                  audioEngine.playMove();
                }}
                className="p-2 rounded bg-surface-container border border-outline-variant/30 hover:border-primary text-on-surface-variant hover:text-primary transition-all active:scale-95"
                title="First Move"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentPly((p) => Math.max(0, p - 1));
                  audioEngine.playMove();
                }}
                className="p-2 rounded bg-surface-container border border-outline-variant/30 hover:border-primary text-on-surface-variant hover:text-primary transition-all active:scale-95"
                title="Previous Move"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 px-3 rounded bg-primary text-on-primary font-bold hover:bg-primary-fixed transition-all flex items-center gap-1 active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="text-xs font-label-md uppercase">{isPlaying ? 'Pause' : 'Replay'}</span>
              </button>
              <button
                onClick={() => {
                  setCurrentPly((p) => Math.min(moves.length - 1, p + 1));
                  audioEngine.playMove();
                }}
                className="p-2 rounded bg-surface-container border border-outline-variant/30 hover:border-primary text-on-surface-variant hover:text-primary transition-all active:scale-95"
                title="Next Move"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentPly(moves.length - 1);
                  audioEngine.playMove();
                }}
                className="p-2 rounded bg-surface-container border border-outline-variant/30 hover:border-primary text-on-surface-variant hover:text-primary transition-all active:scale-95"
                title="Last Move"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Tactical Jump Buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={jumpToNextBlunder}
                className="px-2.5 py-1 rounded bg-surface-container border border-orange-500/40 text-orange-400 hover:border-orange-400 text-xs font-label-sm uppercase tracking-wider flex items-center gap-1 transition-all"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Next Mistake</span>
              </button>
              {report.keyTurningPoint && (
                <button
                  onClick={jumpToKeyTurningPoint}
                  className="px-2.5 py-1 rounded bg-surface-container border border-tertiary/40 text-tertiary hover:border-tertiary text-xs font-label-sm uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Key Turning Point</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: "You Missed This", Coach Commentary & Move Breakdown (7 cols) */}
          <div className="lg:col-span-7 p-5 flex flex-col justify-between space-y-4">
            {currentAnalysis ? (
              <div className="space-y-4">
                {/* Active Move Header & Classification */}
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-xs text-outline">
                      Turn {currentAnalysis.moveNumber} · {currentAnalysis.color === 'w' ? 'White' : 'Black'}
                    </span>
                    <span className="font-headline-sm text-lg font-bold text-on-surface">
                      {currentAnalysis.san}
                    </span>
                  </div>

                  {/* Classification Badge */}
                  {(() => {
                    const cfg = CLASSIFICATION_CONFIG[currentAnalysis.classification];
                    return (
                      <div
                        className={`px-3 py-1 rounded-full border ${cfg.border} ${cfg.bg} flex items-center gap-1.5 shadow-md`}
                      >
                        <span className={`font-bold font-mono text-xs ${cfg.color}`}>{cfg.symbol}</span>
                        <span className={`text-xs font-label-md font-semibold tracking-wider uppercase ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* "You Missed This & What Should Be This Move" Coach Banner */}
                <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-outline uppercase tracking-wider font-label-sm flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-tertiary" />
                      Arithmancer Engine Evaluation
                    </span>
                    <span className="text-tertiary font-mono text-xs">
                      Eval: {currentAnalysis.evalAfter > 0 ? `+${(currentAnalysis.evalAfter / 100).toFixed(2)}` : (currentAnalysis.evalAfter / 100).toFixed(2)}
                    </span>
                  </div>

                  <p className="font-headline-sm text-sm text-primary font-semibold">
                    {currentAnalysis.classification === 'best' || currentAnalysis.classification === 'brilliant'
                      ? `Masterful choice: ${currentAnalysis.san} cements the initiative!`
                      : currentAnalysis.classification === 'blunder' || currentAnalysis.classification === 'mistake'
                      ? `You missed: ${currentAnalysis.bestMove} was the critical response!`
                      : `Solid move, though ${currentAnalysis.bestMove} offered sharper control.`}
                  </p>

                  <p className="font-body-sm text-on-surface-variant text-xs leading-relaxed">
                    {currentAnalysis.coachCommentary}
                  </p>

                  {/* Best Engine Variation Sequence */}
                  {currentAnalysis.bestVariation.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-outline-variant/20 flex flex-wrap items-center gap-1.5 text-xs font-mono">
                      <span className="text-outline font-label-sm uppercase">Engine Line:</span>
                      {currentAnalysis.bestVariation.map((v, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-tertiary text-xs"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Move Breakdown Matrix */}
                <div>
                  <h4 className="text-outline font-label-sm text-xs uppercase tracking-widest mb-2">
                    Classification Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {(['brilliant', 'best', 'good', 'inaccuracy', 'mistake', 'blunder'] as MoveClassification[]).map(
                      (cat) => {
                        const cfg = CLASSIFICATION_CONFIG[cat];
                        const countWhite = report.summary.white[cat] || 0;
                        const countBlack = report.summary.black[cat] || 0;

                        return (
                          <div
                            key={cat}
                            className="p-2 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-between"
                          >
                            <span className={`font-semibold flex items-center gap-1 ${cfg.color}`}>
                              <span className="font-mono text-xs">{cfg.symbol}</span>
                              <span className="capitalize">{cat}</span>
                            </span>
                            <div className="font-mono text-[11px] space-x-1">
                              <span className="text-primary">{countWhite}</span>
                              <span className="text-outline">/</span>
                              <span className="text-secondary">{countBlack}</span>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-outline">
                <span>Select a move on the timeline to analyze.</span>
              </div>
            )}

            {/* Bottom Evaluation Advantage Timeline Graph */}
            <div className="pt-3 border-t border-outline-variant/30">
              <div className="flex items-center justify-between text-xs text-outline mb-1.5">
                <span className="font-label-sm uppercase tracking-wider">Evaluation Advantage Curve</span>
                <span className="font-label-sm text-[10px]">
                  Ply {currentPly + 1} of {moves.length}
                </span>
              </div>

              {/* Sparkline Histogram of Moves */}
              <div className="h-10 w-full bg-surface-container-lowest rounded border border-outline-variant/30 flex items-center px-1 gap-0.5 overflow-x-auto">
                {report.moveAnalyses.map((m, idx) => {
                  const ev = Math.max(-500, Math.min(500, m.evalAfter));
                  const isPos = ev >= 0;
                  const heightPct = Math.max(10, Math.min(100, Math.abs(ev) / 5));
                  const isCurrent = idx === currentPly;

                  let barColor = isPos ? 'bg-primary/70' : 'bg-slate-500/70';
                  if (m.classification === 'blunder') barColor = 'bg-red-500';
                  else if (m.classification === 'brilliant') barColor = 'bg-cyan-400';
                  else if (isCurrent) barColor = 'bg-white';

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setCurrentPly(idx);
                        audioEngine.playMove();
                      }}
                      className="flex-1 h-full flex flex-col justify-center items-center cursor-pointer group relative"
                      title={`Move ${m.moveNumber} (${m.san}): ${m.classification}`}
                    >
                      <div
                        className={`w-full transition-all duration-150 rounded-xs ${barColor} ${
                          isCurrent ? 'ring-1 ring-white' : 'group-hover:opacity-100'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
