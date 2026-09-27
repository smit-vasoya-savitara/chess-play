/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type GameMode = 'vs-bot' | 'local-2p' | 'online-ranked' | 'online-casual';

export type GameRuleset = 'standard' | 'arcane-duel';

export type MoveClassification = 
  | 'brilliant'     // !!
  | 'great'         // !
  | 'best'          // ★
  | 'excellent'     // ✓
  | 'good'          // ○
  | 'inaccuracy'    // ?!
  | 'mistake'       // ?
  | 'blunder'       // ??
  | 'missed-win'    // ✕
  | 'book';         // 📖

export interface MoveAnalysis {
  moveNumber: number;
  san: string;
  from: string;
  to: string;
  color: PieceColor;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number;   // In centipawns (from White's perspective)
  evalAfter: number;    // In centipawns (from White's perspective)
  evalDelta: number;    // Loss of evaluation relative to player's turn
  classification: MoveClassification;
  bestMove: string;     // e.g. "Nf3"
  bestMoveFromTo: { from: string; to: string };
  bestVariation: string[]; // sequence of SAN moves
  coachCommentary: string;
}

export interface GameReviewReport {
  whiteAccuracy: number;      // 0 - 100%
  blackAccuracy: number;      // 0 - 100%
  whitePerformanceElo: number;
  blackPerformanceElo: number;
  moveAnalyses: MoveAnalysis[];
  evalHistory: number[];      // Centipawn values for each half-move
  summary: {
    white: Record<MoveClassification, number>;
    black: Record<MoveClassification, number>;
  };
  keyTurningPoint?: {
    moveIndex: number;
    description: string;
  };
}

export interface BotProfile {
  id: string;
  name: string;
  title: string;
  house: 'Gryffindor' | 'Slytherin' | 'Ravenclaw' | 'Hufflepuff';
  elo: number;
  depth: number;
  blunderRate: number; // 0 to 1
  avatarUrl: string;
  description: string;
  playstyle: string;
}

export type RankedTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster';

export interface UserStats {
  rating: number;
  tier: RankedTier;
  division: number; // 4, 3, 2, 1
  leaguePoints: number; // 0 - 100
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestWinStreak: number;
  peakRating: number;
  ratingHistory: { date: string; rating: number; opponentElo: number; result: 'win' | 'loss' | 'draw' }[];
  whiteStats: { wins: number; losses: number; draws: number };
  blackStats: { wins: number; losses: number; draws: number };
  openings: { name: string; played: number; won: number }[];
}

export interface MatchRecord {
  id: string;
  date: string;
  opponentName: string;
  opponentElo: number;
  opponentHouse: string;
  playerColor: PieceColor;
  result: 'win' | 'loss' | 'draw';
  reason: string; // "Checkmate", "Resignation", "Time out", "Stalemate"
  pgn: string;
  movesCount: number;
  ratingDelta: number;
  accuracy: { player: number; opponent: number };
}

export interface ArcaneSpell {
  id: string;
  name: string;
  manaCost: number;
  icon: string;
  description: string;
  durationRounds?: number;
  cooldownRounds?: number;
}
