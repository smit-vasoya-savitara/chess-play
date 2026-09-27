/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square, Move } from 'chess.js';
import {
  PieceColor,
  PieceType,
  GameMode,
  BotProfile,
  MatchRecord,
  GameReviewReport,
  ArcaneSpell
} from './types/chess';
import { BOT_PROFILES, chessEngine } from './services/chessEngine';
import { cloudSync, UserProfile } from './services/cloudSync';
import { FoundMatch } from './services/rankedMatchmaking';
import { audioEngine } from './services/audioEngine';
import { Chess3DScene } from './components/Chess3DScene';
import { Chess2DBoard } from './components/Chess2DBoard';
import { RelicForgeModal } from './components/RelicForgeModal';
import { GameReviewModal } from './components/GameReviewModal';
import { RankedLadderView } from './components/RankedLadderView';
import { StatsDashboard } from './components/StatsDashboard';
import { MatchmakingModal } from './components/MatchmakingModal';
import { SpellGrimoireModal, SPELL_DECK } from './components/SpellGrimoireModal';
import { SettingsModal } from './components/SettingsModal';
import { useAuth } from './context/AuthContext';
import confetti from 'canvas-confetti';
import {
  Swords,
  Shield,
  Trophy,
  BarChart3,
  Settings,
  Sparkles,
  Eye,
  RotateCcw,
  Volume2,
  VolumeX,
  Hourglass,
  HelpCircle,
  Wand2,
  Zap,
  Globe,
  Users,
  Bot,
  Play,
  Flame,
  CheckCircle2,
  AlertCircle,
  User,
  LogOut
} from 'lucide-react';

export default function App() {
  const { user, loginWithGoogle, logout, saveMatchToCloud, syncStatsToCloud } = useAuth();

  // Navigation tabs: 'arena' | 'ranked' | 'stats'
  const [activeTab, setActiveTab] = useState<'arena' | 'ranked' | 'stats'>('arena');

  // User Profile & Stats
  const [profile, setProfile] = useState<UserProfile>(cloudSync.getProfile());
  const [stats, setStats] = useState(cloudSync.getStats());
  const [matchHistory, setMatchHistory] = useState(cloudSync.getMatchHistory());

  // Game Engine & State
  const [game, setGame] = useState<Chess>(new Chess());
  const [gameMode, setGameMode] = useState<GameMode>('vs-bot');
  const [selectedBot, setSelectedBot] = useState<BotProfile>(BOT_PROFILES[3]); // Default Malakor
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validDestinations, setValidDestinations] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<{ san: string; from: string; to: string }[]>([]);
  const [gameStatusText, setGameStatusText] = useState<string>('White to Move');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [gameOverReason, setGameOverReason] = useState<string>('');

  // Clocks (Seconds)
  const [whiteTime, setWhiteTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  // Mana Pools for Arcane Duel mode (100 max)
  const [whiteMana, setWhiteMana] = useState<number>(85);
  const [blackMana, setBlackMana] = useState<number>(60);
  const [activeSpellEffect, setActiveSpellEffect] = useState<string | null>(null);

  // 3D vs 2D view toggle
  const [viewMode, setViewMode] = useState<'3d' | '2d'>(profile.viewMode || '3d');
  const [showThreatVectors, setShowThreatVectors] = useState<boolean>(false);
  const [engineHint, setEngineHint] = useState<string | null>(null);

  // Promotion Modal
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Modals
  const [isRelicForgeOpen, setIsRelicForgeOpen] = useState<boolean>(false);
  const [relicInitialPiece, setRelicInitialPiece] = useState<'knight' | 'rook' | 'queen'>('knight');
  const [isGameReviewOpen, setIsGameReviewOpen] = useState<boolean>(false);
  const [gameReviewReport, setGameReviewReport] = useState<GameReviewReport | null>(null);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState<boolean>(false);
  const [isSpellModalOpen, setIsSpellModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Active opponent display
  const [opponentName, setOpponentName] = useState<string>(selectedBot.name);
  const [opponentElo, setOpponentElo] = useState<number>(selectedBot.elo);
  const [opponentHouse, setOpponentHouse] = useState<string>(selectedBot.house);

  // Turn Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && !isGameOver) {
      interval = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime((t) => {
            if (t <= 1) {
              handleTimeOut('w');
              return 0;
            }
            return t - 1;
          });
        } else {
          setBlackTime((t) => {
            if (t <= 1) {
              handleTimeOut('b');
              return 0;
            }
            return t - 1;
          });
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, isGameOver, game]);

  const handleTimeOut = (flaggedColor: PieceColor) => {
    setIsGameOver(true);
    setTimerActive(false);
    const winner = flaggedColor === 'w' ? 'Black' : 'White';
    setGameOverReason(`Time Expired - ${winner} Wins!`);
    audioEngine.playCheck();
  };

  // Bot Turn Trigger
  useEffect(() => {
    if (isGameOver) return;
    const isBotTurn =
      gameMode === 'vs-bot' &&
      game.turn() !== playerColor;

    if (isBotTurn) {
      // Simulate realistic thinking delay (600ms - 1400ms)
      const delay = 600 + Math.random() * 800;
      const timer = setTimeout(() => {
        executeBotMove();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [game.fen(), gameMode, playerColor, isGameOver]);

  const executeBotMove = () => {
    if (isGameOver) return;
    const botMove = chessEngine.getBestMoveForBot(game, selectedBot);
    if (botMove) {
      makeMoveOnBoard(botMove.from as Square, botMove.to as Square, botMove.promotion as PieceType);
    }
  };

  // Central Move Execution
  const makeMoveOnBoard = (from: Square, to: Square, promotion: PieceType = 'q') => {
    try {
      const isCapture = !!game.get(to);
      const moveResult = game.move({ from, to, promotion });

      if (moveResult) {
        // Audio
        if (isCapture) audioEngine.playCapture();
        else audioEngine.playMove();

        // Check audio
        if (game.inCheck()) {
          setTimeout(() => audioEngine.playCheck(), 150);
        }

        // Mana regen
        if (moveResult.color === 'w') {
          setWhiteMana((m) => Math.min(100, m + 5));
        } else {
          setBlackMana((m) => Math.min(100, m + 5));
        }

        setLastMove({ from, to });
        setMoveHistory((prev) => [...prev, { san: moveResult.san, from, to }]);
        setSelectedSquare(null);
        setValidDestinations([]);
        setEngineHint(null);
        setTimerActive(true);

        // Update Game status
        if (game.isCheckmate()) {
          setIsGameOver(true);
          setTimerActive(false);
          const winner = game.turn() === 'w' ? 'Black' : 'White';
          setGameOverReason(`Checkmate! ${winner} prevails.`);
          handleMatchConclusion(winner === 'White' ? 'win' : 'loss', 'Checkmate');
        } else if (game.isDraw()) {
          setIsGameOver(true);
          setTimerActive(false);
          let reason = 'Draw by Stalemate';
          if (game.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition';
          else if (game.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
          setGameOverReason(reason);
          handleMatchConclusion('draw', reason);
        } else if (game.inCheck()) {
          setGameStatusText(`${game.turn() === 'w' ? 'White' : 'Black'} is in Check!`);
        } else {
          setGameStatusText(`${game.turn() === 'w' ? 'White' : 'Black'} to Move`);
        }

        // Force react re-render of board
        setGame(new Chess(game.fen()));
      }
    } catch {
      // Invalid move
    }
  };

  // Handle Square Clicks
  const handleSquareClick = (sq: Square) => {
    if (isGameOver) return;

    // Check if player's turn in vs-bot
    if (gameMode === 'vs-bot' && game.turn() !== playerColor) return;

    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        setValidDestinations([]);
        return;
      }

      // Check if clicked another friendly piece to switch selection
      const clickedPiece = game.get(sq);
      if (clickedPiece && clickedPiece.color === game.turn()) {
        setSelectedSquare(sq);
        const moves = game.moves({ square: sq, verbose: true });
        setValidDestinations(moves.map((m) => m.to as Square));
        audioEngine.playMove();
        return;
      }

      // Check if move is legal
      if (validDestinations.includes(sq)) {
        // Check for pawn promotion
        const movingPiece = game.get(selectedSquare);
        if (
          movingPiece?.type === 'p' &&
          ((movingPiece.color === 'w' && sq[1] === '8') || (movingPiece.color === 'b' && sq[1] === '1'))
        ) {
          setPendingPromotion({ from: selectedSquare, to: sq });
          return;
        }

        makeMoveOnBoard(selectedSquare, sq);
      } else {
        setSelectedSquare(null);
        setValidDestinations([]);
      }
    } else {
      const piece = game.get(sq);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(sq);
        const moves = game.moves({ square: sq, verbose: true });
        setValidDestinations(moves.map((m) => m.to as Square));
        audioEngine.playMove();
      }
    }
  };

  // Promotion Confirmation
  const confirmPromotion = (pieceType: PieceType) => {
    if (pendingPromotion) {
      makeMoveOnBoard(pendingPromotion.from, pendingPromotion.to, pieceType);
      setPendingPromotion(null);
    }
  };

  // Match Conclusion & Rating Update
  const handleMatchConclusion = (result: 'win' | 'loss' | 'draw', reason: string) => {
    if (result === 'win') {
      audioEngine.playVictory();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f2ca50', '#38bdf8', '#10b981']
      });
    }

    const ratingDelta = result === 'win' ? +24 : result === 'loss' ? -18 : +3;

    // Generate Game Review automatically
    const review = chessEngine.generateGameReview(moveHistory);
    setGameReviewReport(review);

    const record: MatchRecord = {
      id: `match_${Date.now()}`,
      date: new Date().toLocaleDateString(),
      opponentName,
      opponentElo,
      opponentHouse,
      playerColor,
      result,
      reason,
      pgn: game.pgn(),
      movesCount: moveHistory.length,
      ratingDelta: gameMode === 'online-ranked' || gameMode === 'vs-bot' ? ratingDelta : 0,
      accuracy: {
        player: playerColor === 'w' ? review.whiteAccuracy : review.blackAccuracy,
        opponent: playerColor === 'w' ? review.blackAccuracy : review.whiteAccuracy
      }
    };

    cloudSync.recordMatch(record);
    const updatedStats = cloudSync.getStats();
    setStats(updatedStats);
    setMatchHistory(cloudSync.getMatchHistory());

    // Save to Firestore cloud database if signed in
    if (user) {
      saveMatchToCloud(record).catch(console.error);
      syncStatsToCloud(updatedStats).catch(console.error);
    }
  };

  // Start New Duel
  const startNewDuel = (bot?: BotProfile, mode: GameMode = 'vs-bot', color: PieceColor = 'w') => {
    const freshGame = new Chess();
    setGame(freshGame);
    setGameMode(mode);
    setPlayerColor(color);
    if (bot) {
      setSelectedBot(bot);
      setOpponentName(bot.name);
      setOpponentElo(bot.elo);
      setOpponentHouse(bot.house);
    }
    setSelectedSquare(null);
    setValidDestinations([]);
    setLastMove(null);
    setMoveHistory([]);
    setIsGameOver(false);
    setGameOverReason('');
    setGameStatusText('White to Move');
    setWhiteTime(600);
    setBlackTime(600);
    setTimerActive(false);
    setWhiteMana(85);
    setBlackMana(60);
    setEngineHint(null);
    audioEngine.playSpell();
  };

  // Online Match Found Handler
  const handleOnlineMatchFound = (match: FoundMatch) => {
    setOpponentName(match.opponent.name);
    setOpponentElo(match.opponent.elo);
    setOpponentHouse(match.opponent.house);
    startNewDuel(undefined, 'online-ranked', match.assignedColor);
  };

  // Request Engine Hint
  const handleGetEngineHint = () => {
    const { bestMove, evalScore } = chessEngine.getEngineRecommendation(game, 3);
    if (bestMove) {
      audioEngine.playCheck();
      const evalText = evalScore > 0 ? `+${(evalScore / 100).toFixed(1)}` : (evalScore / 100).toFixed(1);
      setEngineHint(`Engine recommends: ${bestMove.san} (Eval: ${evalText})`);
    }
  };

  // Format Clock time MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Captured pieces calculation
  const getCapturedPieces = () => {
    const initialCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentCounts: Record<string, number> = { wp: 0, wn: 0, wb: 0, wr: 0, wq: 0, bp: 0, bn: 0, bb: 0, br: 0, bq: 0 };

    game.board().forEach((row) => {
      row.forEach((piece) => {
        if (piece && piece.type !== 'k') {
          currentCounts[`${piece.color}${piece.type}`]++;
        }
      });
    });

    const whiteCaptured: string[] = [];
    const blackCaptured: string[] = [];

    (['p', 'n', 'b', 'r', 'q'] as PieceType[]).forEach((type) => {
      const lostWhite = initialCounts[type] - (currentCounts[`w${type}`] || 0);
      for (let i = 0; i < lostWhite; i++) whiteCaptured.push(`w${type}`);

      const lostBlack = initialCounts[type] - (currentCounts[`b${type}`] || 0);
      for (let i = 0; i < lostBlack; i++) blackCaptured.push(`b${type}`);
    });

    return { whiteCaptured, blackCaptured };
  };

  const { whiteCaptured, blackCaptured } = getCapturedPieces();

  return (
    <div className="min-h-screen bg-[#0c0e11] text-[#e2e2e6] flex flex-col font-cinzel select-none">
      {/* ========================================================= */}
      {/* 1. TOP APP BAR (Strict 3-Zone Contract)                  */}
      {/* ========================================================= */}
      <header className="docked full-width top-0 z-40 bg-[#0c0e11] flex justify-between items-center w-full px-4 md:px-6 py-2.5 backdrop-blur-md shadow-2xl border-b border-[#4d4635]/40">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded border border-[#f2ca50]/50 bg-[#1e2023] flex items-center justify-center text-[#f2ca50] shadow-inner">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <span className="font-playfair text-base md:text-lg font-bold text-[#f2ca50] tracking-widest uppercase block leading-tight">
              Arcane Grandmaster Duel
            </span>
            <span className="font-geist text-[10px] text-[#99907c] uppercase tracking-widest hidden sm:block">
              Chamber of Runic Stones · Tier IV Duel
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium font-cinzel">
          <button
            onClick={() => setActiveTab('arena')}
            className={`pb-1 transition-all ${
              activeTab === 'arena'
                ? 'text-[#f2ca50] border-b-2 border-[#f2ca50] font-semibold'
                : 'text-[#d0c5af] hover:text-[#f2ca50]'
            }`}
          >
            Arena
          </button>
          <button
            onClick={() => setActiveTab('ranked')}
            className={`pb-1 transition-all ${
              activeTab === 'ranked'
                ? 'text-[#f2ca50] border-b-2 border-[#f2ca50] font-semibold'
                : 'text-[#d0c5af] hover:text-[#f2ca50]'
            }`}
          >
            Ranked Ladder
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-1 transition-all ${
              activeTab === 'stats'
                ? 'text-[#f2ca50] border-b-2 border-[#f2ca50] font-semibold'
                : 'text-[#d0c5af] hover:text-[#f2ca50]'
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => setIsRelicForgeOpen(true)}
            className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Relic Forge 3D</span>
          </button>
        </nav>

        {/* Zone 3: 1-2 Primary Actions & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsMatchmakingOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-[#f2ca50]/60 bg-[#f2ca50]/15 hover:bg-[#f2ca50]/25 text-[#f2ca50] text-xs font-geist uppercase tracking-wider font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(242,202,80,0.25)] active:scale-95 transition-all"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Online Match</span>
          </button>

          {/* Google Auth Status / Login */}
          {user ? (
            <div className="flex items-center gap-2 bg-[#1e2023] border border-[#4d4635]/50 rounded-lg py-1 px-2.5 shadow-sm">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Player'}
                  className="w-5 h-5 rounded-full border border-[#f2ca50]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#f2ca50]/20 border border-[#f2ca50] flex items-center justify-center text-[10px] text-[#f2ca50] font-bold">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <span className="text-xs font-semibold text-[#f2ca50] max-w-[85px] truncate hidden md:inline font-geist">
                {user.displayName?.split(' ')[0] || 'Player'}
              </span>
              <button
                onClick={() => logout()}
                className="text-[10px] text-[#99907c] hover:text-red-400 font-geist transition-colors ml-0.5"
                title="Sign out of Firebase"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => loginWithGoogle().catch(console.error)}
              className="px-3 py-1.5 rounded-lg border border-[#38bdf8]/50 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8] text-xs font-geist uppercase tracking-wider font-semibold flex items-center gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.2)] active:scale-95 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign in with Google</span>
            </button>
          )}

          <button
            onClick={() => setIsSpellModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg border border-[#38bdf8]/40 bg-[#1e2023] hover:border-[#38bdf8] text-[#38bdf8] text-xs font-geist uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all"
            title="Invoke Spell"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Spells</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg bg-[#1e2023] border border-[#4d4635]/40 text-[#d0c5af] hover:text-[#f2ca50] transition-colors active:scale-95"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN WORKSPACE / TAB ROUTING                          */}
      {/* ========================================================= */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-3 md:p-6 overflow-y-auto">
        {activeTab === 'ranked' && (
          <RankedLadderView
            stats={stats}
            onStartRankedMatch={() => setIsMatchmakingOpen(true)}
          />
        )}

        {activeTab === 'stats' && (
          <StatsDashboard
            stats={stats}
            matches={matchHistory}
            onReviewMatch={(m) => {
              // Parse PGN and review
              const tempGame = new Chess();
              try {
                tempGame.loadPgn(m.pgn);
                const historyMoves = tempGame.history({ verbose: true }).map((mv) => ({
                  san: mv.san,
                  from: mv.from,
                  to: mv.to
                }));
                const rev = chessEngine.generateGameReview(historyMoves);
                setGameReviewReport(rev);
                setIsGameReviewOpen(true);
              } catch {
                // Ignore
              }
            }}
            onRefreshStats={() => {
              setStats(cloudSync.getStats());
              setMatchHistory(cloudSync.getMatchHistory());
            }}
          />
        )}

        {activeTab === 'arena' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* ========================================================= */}
            {/* LEFT CONSOLE (Cols 1-3): COMBATANT HUDS & GRIMOIRE LOG   */}
            {/* ========================================================= */}
            <aside className="xl:col-span-3 flex flex-col gap-4">
              {/* Opponent Card (Black) */}
              <div className="stone-slab rounded-xl p-4 border border-[#4d4635]/40 relative overflow-hidden shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-[#4d4635]/30">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg border border-[#10b981]/50 bg-[#0c0e11] p-1 flex items-center justify-center font-bold text-xl text-[#afcdbe] relative shadow-md">
                      ♚
                      <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#10b981] border border-[#0c0e11]" />
                    </div>
                    <div>
                      <h3 className="font-playfair text-sm text-[#e2e2e6] font-semibold">{opponentName}</h3>
                      <p className="font-geist text-[10px] text-[#afcdbe] uppercase tracking-wider">
                        {opponentHouse} · {opponentElo} Elo
                      </p>
                    </div>
                  </div>

                  {/* Opponent Timer */}
                  <div className="bg-[#0c0e11] border border-[#4d4635]/50 rounded px-2 py-1 text-right">
                    <span className="font-geist text-[9px] text-[#99907c] block">CLOCK</span>
                    <span className="font-mono text-sm font-bold text-[#e2e2e6] tracking-wider">
                      {formatTime(blackTime)}
                    </span>
                  </div>
                </div>

                {/* Opponent Mana Pool */}
                <div className="mt-2.5">
                  <div className="flex justify-between items-center text-[10px] font-geist mb-1 text-[#99907c]">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[#10b981]" />
                      Arcane Mana
                    </span>
                    <span className="text-[#afcdbe] font-bold">{blackMana} / 100 MP</span>
                  </div>
                  <div className="w-full bg-[#0c0e11] h-1.5 rounded overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#344f43] to-[#10b981] h-full rounded transition-all duration-300"
                      style={{ width: `${blackMana}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Live Move Grimoire */}
              <div className="stone-slab rounded-xl border border-[#4d4635]/40 p-4 shadow-xl flex flex-col flex-1">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#4d4635]/30 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#f2ca50] font-bold text-sm">⚔</span>
                    <h2 className="font-playfair text-sm text-[#f2ca50] font-semibold">Grimoire of Moves</h2>
                  </div>
                  <span className="font-geist text-[10px] text-[#99907c] bg-[#0c0e11] px-2 py-0.5 rounded border border-[#4d4635]/30 uppercase">
                    {gameStatusText}
                  </span>
                </div>

                {/* Scrollable Move History */}
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 font-geist text-xs">
                  {moveHistory.length === 0 ? (
                    <p className="text-center py-6 text-xs text-[#99907c] italic">
                      The chamber awaits your opening incantation.
                    </p>
                  ) : (
                    moveHistory.map((m, idx) => {
                      const isLatest = idx === moveHistory.length - 1;
                      const moveNum = Math.floor(idx / 2) + 1;
                      const isWhiteMove = idx % 2 === 0;

                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded transition-all flex items-center justify-between ${
                            isLatest
                              ? 'bg-[#1e2023] border-l-2 border-[#f2ca50] border border-[#4d4635]/40 text-[#f2ca50]'
                              : 'bg-[#111316]/60 border border-[#4d4635]/20 text-[#d0c5af]'
                          }`}
                        >
                          <span className="font-mono text-xs font-semibold">
                            {isWhiteMove ? `${moveNum}.` : `${moveNum}...`} {m.san}
                          </span>
                          <span className="text-[10px] font-mono text-[#99907c] uppercase">
                            {m.from} → {m.to}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Graveyard / Fallen Relics Tray */}
                <div className="mt-3 pt-3 border-t border-[#4d4635]/30">
                  <div className="flex items-center justify-between mb-1.5 text-xs text-[#d0c5af]">
                    <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-geist">
                      <Shield className="w-3 h-3 text-[#99907c]" />
                      Graveyard Relics
                    </span>
                  </div>

                  <div className="bg-[#0c0e11] p-2 rounded-lg border border-[#4d4635]/30 min-h-[44px] flex flex-wrap items-center gap-1.5">
                    {whiteCaptured.map((p, i) => (
                      <span key={i} className="text-xl text-[#f2ca50] opacity-80" title="White Fallen Relic">
                        {p === 'wp' ? '♟' : p === 'wn' ? '♞' : p === 'wb' ? '♝' : p === 'wr' ? '♜' : '♛'}
                      </span>
                    ))}
                    {blackCaptured.map((p, i) => (
                      <span key={i} className="text-xl text-[#e2e2e6] opacity-80" title="Black Fallen Relic">
                        {p === 'bp' ? '♟' : p === 'bn' ? '♞' : p === 'bb' ? '♝' : p === 'br' ? '♜' : '♛'}
                      </span>
                    ))}
                    {whiteCaptured.length === 0 && blackCaptured.length === 0 && (
                      <span className="text-[10px] text-[#99907c] italic mx-auto">No stone casualties yet.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Player Card (White) */}
              <div className="stone-slab rounded-xl p-4 border border-[#f2ca50]/50 relative overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-[#4d4635]/40">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg border-2 border-[#f2ca50] bg-[#0c0e11] p-0.5 flex items-center justify-center font-bold text-xl text-[#f2ca50] relative shadow-lg overflow-hidden">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || 'Player'} className="w-full h-full object-cover rounded-md" referrerPolicy="no-referrer" />
                      ) : (
                        <span>♔</span>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#f2ca50] border border-[#0c0e11] animate-ping" />
                      <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#f2ca50] border border-[#0c0e11]" />
                    </div>
                    <div>
                      <h3 className="font-playfair text-sm text-[#f2ca50] font-bold">
                        {user?.displayName || profile.name}
                      </h3>
                      <p className="font-geist text-[10px] text-[#ffe088] uppercase tracking-wider">
                        {profile.house} · {stats.rating} Elo
                      </p>
                    </div>
                  </div>

                  {/* Player Clock */}
                  <div className="bg-[#0c0e11] border border-[#f2ca50]/60 rounded px-2 py-1 text-right shadow-[0_0_10px_rgba(242,202,80,0.2)]">
                    <span className="font-geist text-[9px] text-[#f2ca50] block">CHRONOMETER</span>
                    <span className="font-mono text-sm font-bold text-[#f2ca50] tracking-wider flex items-center justify-end gap-1">
                      <Hourglass className="w-3 h-3 text-[#f2ca50]" />
                      {formatTime(whiteTime)}
                    </span>
                  </div>
                </div>

                {/* Player Mana Pool */}
                <div className="mt-2.5">
                  <div className="flex justify-between items-center text-[10px] font-geist mb-1 text-[#99907c]">
                    <span className="flex items-center gap-1">
                      <Wand2 className="w-3 h-3 text-[#38bdf8]" />
                      Gryffindor Arcane Mana
                    </span>
                    <span className="text-[#f2ca50] font-bold">{whiteMana} / 100 MP</span>
                  </div>
                  <div className="w-full bg-[#0c0e11] h-1.5 rounded overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#d4af37] to-[#f2ca50] h-full rounded transition-all duration-300 shadow-[0_0_8px_rgba(242,202,80,0.5)]"
                      style={{ width: `${whiteMana}%` }}
                    />
                  </div>
                </div>
              </div>
            </aside>

            {/* ========================================================= */}
            {/* CENTER STAGE (Cols 4-9): 3D/2D CHESS BATTLEFIELD          */}
            {/* ========================================================= */}
            <section className="xl:col-span-6 flex flex-col items-center">
              {/* Battlefield Title Banner */}
              <div className="flex items-center justify-between w-full mb-3 px-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1c1f] border border-[#4d4635]/40 shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
                  <span className="font-geist text-xs text-[#99907c] tracking-widest uppercase">
                    Duel of the Whispering Crypts · {gameMode === 'vs-bot' ? `vs ${selectedBot.name}` : 'Multiplayer'}
                  </span>
                </div>

                {/* 3D vs 2D Toggle Button */}
                <div className="flex items-center gap-1 bg-[#1a1c1f] p-1 rounded-lg border border-[#4d4635]/40">
                  <button
                    onClick={() => {
                      setViewMode('3d');
                      audioEngine.playMove();
                    }}
                    className={`px-3 py-1 rounded text-xs font-geist uppercase font-semibold transition-all ${
                      viewMode === '3d'
                        ? 'bg-[#1e2023] border border-[#f2ca50]/60 text-[#f2ca50] shadow-sm'
                        : 'text-[#99907c] hover:text-[#e2e2e6]'
                    }`}
                  >
                    3D View
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('2d');
                      audioEngine.playMove();
                    }}
                    className={`px-3 py-1 rounded text-xs font-geist uppercase font-semibold transition-all ${
                      viewMode === '2d'
                        ? 'bg-[#1e2023] border border-[#f2ca50]/60 text-[#f2ca50] shadow-sm'
                        : 'text-[#99907c] hover:text-[#e2e2e6]'
                    }`}
                  >
                    2D View
                  </button>
                </div>
              </div>

              {/* Dynamic Tactical Move Instruction Strip */}
              <div className="w-full mb-2.5 px-3 py-2 rounded-xl bg-[#141820] border border-[#d4af37]/40 flex items-center justify-between text-xs font-geist shadow-md">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    game.turn() === playerColor
                      ? selectedSquare ? 'bg-[#facc15] animate-ping' : 'bg-[#10b981] animate-pulse'
                      : 'bg-[#94a3b8]'
                  }`} />
                  <span className="font-medium text-[#e2e2e6]">
                    {isGameOver ? (
                      <span className="text-[#facc15] font-bold">{gameOverReason || 'Game Over'}</span>
                    ) : game.turn() === playerColor ? (
                      selectedSquare ? (
                        <>
                          <span className="text-[#facc15] font-bold">
                            {game.get(selectedSquare)?.type === 'p' ? 'Pawn' : game.get(selectedSquare)?.type.toUpperCase()} at {selectedSquare.toUpperCase()} Selected:
                          </span>{' '}
                          Click glowing destination (
                          <span className="text-[#38bdf8] font-mono font-semibold">
                            {validDestinations.join(', ').toUpperCase()}
                          </span>
                          ) to move, or click another piece.
                        </>
                      ) : (
                        <span>
                          <strong className="text-[#10b981]">Your Turn (White)</strong>: Click any White piece (e.g. Pawn at{' '}
                          <span className="text-[#facc15] font-mono font-semibold">e2</span> or Knight at{' '}
                          <span className="text-[#facc15] font-mono font-semibold">g1</span>) to begin.
                        </span>
                      )
                    ) : (
                      <span className="text-[#99907c] italic">
                        {opponentName} is deliberating next move...
                      </span>
                    )}
                  </span>
                </div>

                {selectedSquare && (
                  <button
                    onClick={() => {
                      setSelectedSquare(null);
                      setValidDestinations([]);
                    }}
                    className="text-[11px] text-[#99907c] hover:text-white px-2 py-0.5 rounded bg-[#1e2023] border border-[#4d4635]/40 transition-colors"
                  >
                    Deselect
                  </button>
                )}
              </div>

              {/* Board Viewport Container */}
              <div className="w-full flex justify-center">
                {viewMode === '3d' ? (
                  <Chess3DScene
                    game={game}
                    playerColor={playerColor}
                    selectedSquare={selectedSquare}
                    validDestinations={validDestinations}
                    lastMove={lastMove}
                    isCheck={game.inCheck()}
                    onSquareClick={handleSquareClick}
                    activeTheme={profile.theme}
                  />
                ) : (
                  <Chess2DBoard
                    game={game}
                    playerColor={playerColor}
                    selectedSquare={selectedSquare}
                    validDestinations={validDestinations}
                    lastMove={lastMove}
                    isCheck={game.inCheck()}
                    onSquareClick={handleSquareClick}
                    showThreatVectors={showThreatVectors}
                  />
                )}
              </div>

              {/* Engine Hint Banner */}
              {engineHint && (
                <div className="mt-3 p-2.5 rounded-lg bg-[#14181f] border border-[#38bdf8]/50 text-xs font-geist text-[#38bdf8] flex items-center justify-between w-full max-w-lg shadow-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#38bdf8]" />
                    <span>{engineHint}</span>
                  </div>
                  <button
                    onClick={() => setEngineHint(null)}
                    className="text-xs text-[#99907c] hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Tactical Action Toggles */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={() => {
                    setRelicInitialPiece('knight');
                    setIsRelicForgeOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1c1f] border border-[#f2ca50]/50 hover:border-[#f2ca50] text-[#f2ca50] transition-all text-xs font-geist uppercase tracking-wider flex items-center gap-1.5 shadow"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Relic in 3D</span>
                </button>

                <button
                  onClick={handleGetEngineHint}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1c1f] border border-[#4d4635]/40 hover:border-[#38bdf8] text-[#d0c5af] hover:text-[#38bdf8] transition-all text-xs font-geist uppercase tracking-wider flex items-center gap-1.5 shadow"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Arithmancy Hint</span>
                </button>

                <button
                  onClick={() => {
                    if (game.history().length > 0) {
                      game.undo();
                      if (gameMode === 'vs-bot') game.undo(); // undo bot move too
                      setGame(new Chess(game.fen()));
                      audioEngine.playMove();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1c1f] border border-[#4d4635]/40 hover:border-[#f2ca50] text-[#d0c5af] hover:text-[#f2ca50] transition-all text-xs font-geist uppercase tracking-wider flex items-center gap-1.5 shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Move</span>
                </button>

                <button
                  onClick={() => startNewDuel()}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1c1f] border border-[#4d4635]/40 hover:border-[#10b981] text-[#d0c5af] hover:text-[#10b981] transition-all text-xs font-geist uppercase tracking-wider flex items-center gap-1.5 shadow"
                >
                  <Play className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>New Duel</span>
                </button>
              </div>
            </section>

            {/* ========================================================= */}
            {/* RIGHT CONSOLE (Cols 10-12): BOT SELECTOR & SPELLS         */}
            {/* ========================================================= */}
            <aside className="xl:col-span-3 flex flex-col gap-4">
              {/* Opponent Bot Difficulty Selector */}
              <div className="stone-slab rounded-xl border border-[#4d4635]/40 p-4 shadow-xl">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#4d4635]/30 mb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#f2ca50]" />
                    <h3 className="font-playfair text-sm text-[#f2ca50] font-semibold">Chamber Opponents</h3>
                  </div>
                  <span className="font-geist text-[10px] text-[#99907c] uppercase">5 Difficulties</span>
                </div>

                <div className="space-y-1.5">
                  {BOT_PROFILES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => startNewDuel(b, 'vs-bot')}
                      className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                        selectedBot.id === b.id && gameMode === 'vs-bot'
                          ? 'bg-[#1e2023] border-[#f2ca50] shadow-[0_0_10px_rgba(242,202,80,0.25)]'
                          : 'bg-[#111316]/60 border-[#4d4635]/30 hover:border-[#f2ca50]/50'
                      }`}
                    >
                      <div>
                        <span className="font-headline-sm text-xs font-bold text-[#e2e2e6] block leading-tight">
                          {b.name}
                        </span>
                        <span className="text-[10px] text-[#99907c] font-geist">
                          {b.title} · {b.playstyle}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#f2ca50]">{b.elo}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Spell Invocations Card */}
              <div className="stone-slab rounded-xl border border-[#4d4635]/40 p-4 shadow-xl">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#4d4635]/30 mb-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-[#38bdf8]" />
                    <h3 className="font-playfair text-sm text-[#f2ca50] font-semibold">Spell Invocations</h3>
                  </div>
                  <span className="font-geist text-[10px] text-[#38bdf8] bg-[#0c0e11] px-2 py-0.5 rounded border border-[#38bdf8]/30 uppercase">
                    Deck: 4 Prepared
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {SPELL_DECK.slice(0, 3).map((sp) => (
                    <div
                      key={sp.id}
                      onClick={() => {
                        if (whiteMana >= sp.manaCost) {
                          audioEngine.playSpell();
                          setWhiteMana((m) => m - sp.manaCost);
                          setActiveSpellEffect(sp.name);
                          if (sp.id === 'spell_sight') handleGetEngineHint();
                        }
                      }}
                      className="p-2.5 rounded-lg bg-[#1a1c1f] border border-[#4d4635]/40 hover:border-[#38bdf8] cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-headline-sm text-xs text-[#38bdf8] font-semibold group-hover:text-white">
                          {sp.name}
                        </span>
                        <span className="px-1.5 py-0.2 bg-[#38bdf8]/20 text-[#38bdf8] text-[9px] font-mono font-bold rounded">
                          {sp.manaCost} MP
                        </span>
                      </div>
                      <p className="text-[10px] text-[#99907c] leading-tight">{sp.description}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setIsSpellModalOpen(true)}
                  className="w-full mt-3 py-2 rounded-lg bg-[#14181f] border border-[#38bdf8]/50 text-[#38bdf8] hover:bg-[#38bdf8]/10 text-xs font-geist uppercase tracking-wider font-semibold transition-all"
                >
                  Open Full Grimoire
                </button>
              </div>

              {/* Chamber Atmosphere Box */}
              <div className="stone-slab rounded-xl border border-[#4d4635]/40 p-3.5 shadow-xl text-xs space-y-2">
                <div className="flex items-center justify-between text-[#99907c] pb-2 border-b border-[#4d4635]/20">
                  <span className="font-geist text-[10px] uppercase tracking-wider">Chamber Resonance</span>
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#d0c5af]">Dynamic Stone Shaders</span>
                  <span className="text-[#f2ca50] font-bold font-mono text-[10px]">ACTIVE</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#d0c5af]">Tactical Audio</span>
                  <span className="text-[#10b981] font-bold font-mono text-[10px]">
                    {!audioEngine.isMuted ? 'PLAYING' : 'MUTED'}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* 3. PAWN PROMOTION DIALOG MODAL                           */}
      {/* ========================================================= */}
      {pendingPromotion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="stone-slab rounded-2xl border-2 border-[#f2ca50] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-playfair text-lg text-[#f2ca50] font-bold uppercase tracking-wider">
              Pawn Transfiguration
            </h3>
            <p className="text-xs text-[#d0c5af] font-body-sm">
              Select the ascended construct for this heroic pawn.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as PieceType[]).map((pType) => (
                <button
                  key={pType}
                  onClick={() => confirmPromotion(pType)}
                  className="p-3 rounded-xl bg-[#1e2023] border border-[#f2ca50]/50 hover:border-[#f2ca50] hover:bg-[#f2ca50]/20 text-3xl transition-all"
                >
                  {pType === 'q' ? '♕' : pType === 'r' ? '♖' : pType === 'b' ? '♗' : '♘'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. GAME OVER SUMMARY BANNER & REVIEW TRIGGER             */}
      {/* ========================================================= */}
      {isGameOver && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#111418]/95 border-2 border-[#f2ca50] rounded-2xl p-4 sm:p-5 shadow-[0_16px_50px_rgba(0,0,0,0.95)] backdrop-blur-md flex flex-col sm:flex-row items-center gap-4 max-w-xl w-[92%] animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#f2ca50]/20 border border-[#f2ca50] flex items-center justify-center text-[#f2ca50] text-2xl shadow-inner">
              👑
            </div>
            <div>
              <span className="font-geist text-[10px] text-[#99907c] uppercase tracking-widest block">
                Chamber Resolution
              </span>
              <h4 className="font-playfair text-base font-bold text-[#f2ca50]">{gameOverReason}</h4>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                if (!gameReviewReport) {
                  const rev = chessEngine.generateGameReview(moveHistory);
                  setGameReviewReport(rev);
                }
                setIsGameReviewOpen(true);
              }}
              className="flex-1 sm:flex-none brass-btn py-2 px-4 rounded-lg font-playfair text-xs font-bold text-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Review Game</span>
            </button>
            <button
              onClick={() => startNewDuel()}
              className="flex-1 sm:flex-none py-2 px-3 rounded-lg bg-[#1e2023] border border-[#4d4635] text-[#d0c5af] hover:text-white text-xs font-geist uppercase tracking-wider"
            >
              Rematch
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL OVERLAYS                                        */}
      {/* ========================================================= */}
      <RelicForgeModal
        isOpen={isRelicForgeOpen}
        onClose={() => setIsRelicForgeOpen(false)}
        initialPiece={relicInitialPiece}
      />

      <GameReviewModal
        isOpen={isGameReviewOpen}
        onClose={() => setIsGameReviewOpen(false)}
        report={gameReviewReport}
        moves={moveHistory}
        whiteName={playerColor === 'w' ? profile.name : opponentName}
        blackName={playerColor === 'w' ? opponentName : profile.name}
      />

      <MatchmakingModal
        isOpen={isMatchmakingOpen}
        onClose={() => setIsMatchmakingOpen(false)}
        userElo={stats.rating}
        onMatchFound={handleOnlineMatchFound}
      />

      <SpellGrimoireModal
        isOpen={isSpellModalOpen}
        onClose={() => setIsSpellModalOpen(false)}
        mana={playerColor === 'w' ? whiteMana : blackMana}
        onCastSpell={(spell) => {
          if (playerColor === 'w') setWhiteMana((m) => Math.max(0, m - spell.manaCost));
          else setBlackMana((m) => Math.max(0, m - spell.manaCost));
          setActiveSpellEffect(spell.name);
          if (spell.id === 'spell_sight') handleGetEngineHint();
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onUpdateProfile={(newProfile) => {
          setProfile(newProfile);
          setViewMode(newProfile.viewMode);
          cloudSync.saveProfile(newProfile);
        }}
      />

      {/* Footer */}
      <footer className="w-full border-t border-[#4d4635]/30 bg-[#0c0e11] py-2 px-6 flex flex-col md:flex-row items-center justify-between text-[#99907c] font-geist text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[#f2ca50] font-semibold font-playfair">HOGWARTS DUELING SANCTUM</span>
          <span>·</span>
          <span>Arithmancy Verified Rules</span>
          <span>·</span>
          <span>Basalt Flagstone Integrity: 94%</span>
        </div>
        <div className="flex items-center gap-4 mt-1 md:mt-0 text-[11px]">
          <span>Match Seed: #ARC-9821</span>
          <span>·</span>
          <span>Rating: {stats.rating} Elo ({stats.tier})</span>
        </div>
      </footer>
    </div>
  );
}
