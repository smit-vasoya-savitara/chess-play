/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chess, Move, Square } from 'chess.js';
import { BotProfile, GameReviewReport, MoveAnalysis, MoveClassification } from '../types/chess';

// Piece standard values in centipawns
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-Square Tables (White perspective; flipped for Black)
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MID_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

export const BOT_PROFILES: BotProfile[] = [
  {
    id: 'bot_novice',
    name: 'Neophyte Kenneth',
    title: 'Hufflepuff Initiate',
    house: 'Hufflepuff',
    elo: 750,
    depth: 1,
    blunderRate: 0.35,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    description: 'Learning the sacred geometry of the living flagstones. Occasionally leaves pieces unguarded.',
    playstyle: 'Casual & impulsive'
  },
  {
    id: 'bot_scholar',
    name: 'Scholar Evelyn',
    title: 'Ravenclaw Theorist',
    house: 'Ravenclaw',
    elo: 1250,
    depth: 2,
    blunderRate: 0.15,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    description: 'Disciplined arithmancer who calculates center control and piece development meticulously.',
    playstyle: 'Solid & theoretical'
  },
  {
    id: 'bot_mage',
    name: 'Crypt Mage Vane',
    title: 'Gryffindor Knight-Marshal',
    house: 'Gryffindor',
    elo: 1680,
    depth: 3,
    blunderRate: 0.04,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    description: 'Brave tactical striker. Excels in piece sacrifices, pins, and concussive flank breakthroughs.',
    playstyle: 'Aggressive attacking'
  },
  {
    id: 'bot_archmage',
    name: 'Shadow Archmage Malakor',
    title: 'Slytherin Grandmaster',
    house: 'Slytherin',
    elo: 2180,
    depth: 4,
    blunderRate: 0.01,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    description: 'Master of dark subterranean traps, positional squeezes, and lethal endgame conversions.',
    playstyle: 'Deadly positional & tactical counter-strikes'
  },
  {
    id: 'bot_grandmaster',
    name: 'Archchancellor Alistair',
    title: 'High Keeper of Runic Stones',
    house: 'Gryffindor',
    elo: 2650,
    depth: 5,
    blunderRate: 0.0,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    description: 'Legendary grandmaster whose moves resonate with ancient Hogwarts grandmaster arithmancy.',
    playstyle: 'Flawless grandmaster calculation'
  }
];

export class ChessEngineService {
  // Static evaluation function in centipawns (Positive = White advantage, Negative = Black advantage)
  public evaluateBoard(chess: Chess): number {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -100000 : 100000;
    }
    if (chess.isDraw()) {
      return 0;
    }

    let score = 0;
    const board = chess.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = PIECE_VALUES[piece.type] || 0;
        let pstVal = 0;
        const squareIdx = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;

        switch (piece.type) {
          case 'p': pstVal = PAWN_PST[squareIdx] || 0; break;
          case 'n': pstVal = KNIGHT_PST[squareIdx] || 0; break;
          case 'b': pstVal = BISHOP_PST[squareIdx] || 0; break;
          case 'r': pstVal = ROOK_PST[squareIdx] || 0; break;
          case 'q': pstVal = QUEEN_PST[squareIdx] || 0; break;
          case 'k': pstVal = KING_MID_PST[squareIdx] || 0; break;
        }

        const totalPieceScore = val + pstVal;
        if (piece.color === 'w') {
          score += totalPieceScore;
        } else {
          score -= totalPieceScore;
        }
      }
    }

    // Mobility bonus
    const currentTurn = chess.turn();
    const movesCount = chess.moves().length;
    score += (currentTurn === 'w' ? movesCount * 4 : -movesCount * 4);

    return score;
  }

  // Alpha-Beta Minimax search
  private minimax(
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): { score: number; bestMove?: Move } {
    if (depth === 0 || chess.isGameOver()) {
      return { score: this.evaluateBoard(chess) };
    }

    const moves = chess.moves({ verbose: true });
    // Sort moves for better alpha-beta pruning (captures first)
    moves.sort((a, b) => {
      const aVal = a.captured ? PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece] : 0;
      const bVal = b.captured ? PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece] : 0;
      return bVal - aVal;
    });

    let bestMove: Move | undefined = moves[0];

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        chess.move(m);
        const { score } = this.minimax(chess, depth - 1, alpha, beta, false);
        chess.undo();

        if (score > maxEval) {
          maxEval = score;
          bestMove = m;
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return { score: maxEval, bestMove };
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        chess.move(m);
        const { score } = this.minimax(chess, depth - 1, alpha, beta, true);
        chess.undo();

        if (score < minEval) {
          minEval = score;
          bestMove = m;
        }
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return { score: minEval, bestMove };
    }
  }

  // Calculate Bot Move
  public getBestMoveForBot(chess: Chess, bot: BotProfile): Move | null {
    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) return null;

    // Check blunder rate
    if (Math.random() < bot.blunderRate && legalMoves.length > 1) {
      // Pick a random move or 2nd/3rd best
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      return legalMoves[randomIndex];
    }

    const isWhite = chess.turn() === 'w';
    const depth = Math.min(bot.depth, 4); // Fast responsive turn on client
    const result = this.minimax(chess, depth, -Infinity, Infinity, isWhite);
    return result.bestMove || legalMoves[0];
  }

  // Find top engine recommendation + short principal variation
  public getEngineRecommendation(chess: Chess, depth: number = 3): {
    bestMove: Move | null;
    evalScore: number;
    variation: string[];
  } {
    const isWhite = chess.turn() === 'w';
    const result = this.minimax(chess, depth, -Infinity, Infinity, isWhite);
    if (!result.bestMove) {
      return { bestMove: null, evalScore: this.evaluateBoard(chess), variation: [] };
    }

    const variation: string[] = [result.bestMove.san];
    const clone = new Chess(chess.fen());
    clone.move(result.bestMove);

    // Follow-up move
    if (!clone.isGameOver()) {
      const followUp = this.minimax(clone, 2, -Infinity, Infinity, clone.turn() === 'w');
      if (followUp.bestMove) {
        variation.push(followUp.bestMove.san);
      }
    }

    return {
      bestMove: result.bestMove,
      evalScore: result.score,
      variation
    };
  }

  // Full Chess.com-style Game Review Generator
  public generateGameReview(moves: { san: string; from: string; to: string }[]): GameReviewReport {
    const game = new Chess();
    const moveAnalyses: MoveAnalysis[] = [];
    const evalHistory: number[] = [];

    let whiteCPLossSum = 0;
    let blackCPLossSum = 0;
    let whiteMovesCount = 0;
    let blackMovesCount = 0;

    const summary = {
      white: {
        brilliant: 0,
        great: 0,
        best: 0,
        excellent: 0,
        good: 0,
        inaccuracy: 0,
        mistake: 0,
        blunder: 0,
        'missed-win': 0,
        book: 0,
      } as Record<MoveClassification, number>,
      black: {
        brilliant: 0,
        great: 0,
        best: 0,
        excellent: 0,
        good: 0,
        inaccuracy: 0,
        mistake: 0,
        blunder: 0,
        'missed-win': 0,
        book: 0,
      } as Record<MoveClassification, number>,
    };

    let keyTurningPoint: { moveIndex: number; description: string } | undefined;
    let maxSwing = 0;

    // Starting eval
    const startEval = this.evaluateBoard(game);
    evalHistory.push(startEval);

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const fenBefore = game.fen();
      const color = game.turn();
      const moveNumber = Math.floor(i / 2) + 1;

      // Evaluate best move before making move
      const { bestMove, evalScore: evalBefore, variation } = this.getEngineRecommendation(game, 2);

      // Make actual move
      let moveObj: Move | null = null;
      try {
        moveObj = game.move({ from: m.from, to: m.to, promotion: 'q' });
      } catch {
        // Fallback via san
        try {
          moveObj = game.move(m.san);
        } catch {
          break;
        }
      }

      if (!moveObj) break;

      const fenAfter = game.fen();
      const evalAfter = this.evaluateBoard(game);
      evalHistory.push(evalAfter);

      // Centipawn loss from moving player's perspective
      let cpLoss = 0;
      if (color === 'w') {
        cpLoss = Math.max(0, evalBefore - evalAfter);
        whiteCPLossSum += Math.min(cpLoss, 500);
        whiteMovesCount++;
      } else {
        cpLoss = Math.max(0, evalAfter - evalBefore);
        blackCPLossSum += Math.min(cpLoss, 500);
        blackMovesCount++;
      }

      // Check for large swing
      const evalSwing = Math.abs(evalAfter - evalBefore);
      if (evalSwing > maxSwing && evalSwing > 250) {
        maxSwing = evalSwing;
        keyTurningPoint = {
          moveIndex: i,
          description: `Turn ${moveNumber} (${color === 'w' ? 'White' : 'Black'}: ${m.san}) created a decisive evaluation shift of ${(evalSwing / 100).toFixed(1)} pawns!`
        };
      }

      // Classification algorithm
      let classification: MoveClassification = 'good';
      let coachCommentary = '';

      const isBestMovePlayed = bestMove && (bestMove.san === m.san || (bestMove.from === m.from && bestMove.to === m.to));

      if (i < 4) {
        // Opening standard / book moves
        classification = 'book';
        coachCommentary = 'Standard theoretical opening development.';
      } else if (isBestMovePlayed) {
        if (moveObj.captured && PIECE_VALUES[moveObj.captured] > 200 && cpLoss === 0) {
          classification = 'brilliant';
          coachCommentary = 'Brilliant tactical precision! Sacrifices and strikes that dismantle the opponent defense.';
        } else if (Math.abs(evalBefore) > 300) {
          classification = 'great';
          coachCommentary = 'Great practical move, maintaining the commanding initiative.';
        } else {
          classification = 'best';
          coachCommentary = 'The best engine move on the board, optimizing piece coordination.';
        }
      } else if (cpLoss < 25) {
        classification = 'excellent';
        coachCommentary = 'Very solid alternative nearly equal to the engine recommendation.';
      } else if (cpLoss < 60) {
        classification = 'good';
        coachCommentary = 'A safe and natural continuation.';
      } else if (cpLoss < 140) {
        classification = 'inaccuracy';
        coachCommentary = `Slight inaccuracy. Better was ${bestMove ? bestMove.san : 'defensive consolidation'}, which preserves faster initiative.`;
      } else if (cpLoss < 280) {
        classification = 'mistake';
        coachCommentary = `Mistake! You missed ${bestMove ? bestMove.san : 'the primary tactical line'}, conceding structural ground.`;
      } else {
        // Check if missed checkmate
        if (color === 'w' && evalBefore > 800 && evalAfter < 200) {
          classification = 'missed-win';
          coachCommentary = `Missed Win! ${bestMove ? bestMove.san : 'The winning line'} had a forced path toward checkmate or overwhelming material advantage.`;
        } else if (color === 'b' && evalBefore < -800 && evalAfter > -200) {
          classification = 'missed-win';
          coachCommentary = `Missed Win! Black held a decisive breakthrough with ${bestMove ? bestMove.san : 'the engine line'}.`;
        } else {
          classification = 'blunder';
          coachCommentary = `Blunder! This leaves key defensive bastions vulnerable. ${bestMove ? bestMove.san : 'Best move'} was essential here.`;
        }
      }

      if (color === 'w') {
        summary.white[classification]++;
      } else {
        summary.black[classification]++;
      }

      moveAnalyses.push({
        moveNumber,
        san: m.san,
        from: m.from,
        to: m.to,
        color,
        fenBefore,
        fenAfter,
        evalBefore,
        evalAfter,
        evalDelta: cpLoss,
        classification,
        bestMove: bestMove ? bestMove.san : m.san,
        bestMoveFromTo: {
          from: bestMove ? bestMove.from : m.from,
          to: bestMove ? bestMove.to : m.to
        },
        bestVariation: variation,
        coachCommentary
      });
    }

    // Accuracy formula (exponential falloff with average centipawn loss)
    const avgWhiteLoss = whiteMovesCount > 0 ? whiteCPLossSum / whiteMovesCount : 30;
    const avgBlackLoss = blackMovesCount > 0 ? blackCPLossSum / blackMovesCount : 30;

    const calcAccuracy = (loss: number) => {
      const acc = 103.1668 * Math.exp(-0.04354 * Math.max(0, loss * 0.15)) - 3.1668;
      return Math.max(12, Math.min(99.4, Math.round(acc * 10) / 10));
    };

    const whiteAccuracy = calcAccuracy(avgWhiteLoss);
    const blackAccuracy = calcAccuracy(avgBlackLoss);

    // Performance ratings
    const whitePerformanceElo = Math.min(2850, Math.max(600, Math.round(1000 + (whiteAccuracy - 50) * 35)));
    const blackPerformanceElo = Math.min(2850, Math.max(600, Math.round(1000 + (blackAccuracy - 50) * 35)));

    return {
      whiteAccuracy,
      blackAccuracy,
      whitePerformanceElo,
      blackPerformanceElo,
      moveAnalyses,
      evalHistory,
      summary,
      keyTurningPoint
    };
  }
}

export const chessEngine = new ChessEngineService();
