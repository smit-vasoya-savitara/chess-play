/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Chess, Square } from 'chess.js';
import { PieceColor, PieceType } from '../types/chess';

interface Chess2DBoardProps {
  game: Chess;
  playerColor: PieceColor;
  selectedSquare: Square | null;
  validDestinations: Square[];
  lastMove: { from: Square; to: Square } | null;
  isCheck: boolean;
  onSquareClick: (sq: Square) => void;
  showThreatVectors?: boolean;
}

const PIECE_SYMBOLS: Record<string, string> = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚',
};

export const Chess2DBoard: React.FC<Chess2DBoardProps> = ({
  game,
  playerColor,
  selectedSquare,
  validDestinations,
  lastMove,
  isCheck,
  onSquareClick,
  showThreatVectors = false,
}) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = playerColor === 'w' ? files : [...files].reverse();
  const displayRanks = playerColor === 'w' ? ranks : [...ranks].reverse();

  return (
    <div className="relative p-3 md:p-5 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/60 shadow-[0_24px_64px_rgba(0,0,0,0.95)] max-w-full">
      {/* Engraved Roman Filigree Corner Accents */}
      <div className="absolute top-2 left-2 text-primary/40 font-serif text-[10px] select-none">✠ ARCH I</div>
      <div className="absolute top-2 right-2 text-primary/40 font-serif text-[10px] select-none">ARCH II ✠</div>
      <div className="absolute bottom-2 left-2 text-primary/40 font-serif text-[10px] select-none">✠ CRYPT III</div>
      <div className="absolute bottom-2 right-2 text-primary/40 font-serif text-[10px] select-none">CRYPT IV ✠</div>

      {/* Top File Coordinates */}
      <div className="grid grid-cols-8 text-center text-outline font-label-md text-xs pb-1 select-none">
        {displayFiles.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>

      <div className="flex">
        {/* Left Rank Coordinates */}
        <div className="flex flex-col justify-around pr-2 text-outline font-label-md text-xs select-none">
          {displayRanks.map((r) => (
            <span key={r}>{r}</span>
          ))}
        </div>

        {/* 8x8 Grid */}
        <div className="grid grid-cols-8 grid-rows-8 w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] md:w-[540px] md:h-[540px] border-2 border-outline-variant/70 rounded-lg overflow-hidden relative shadow-2xl bg-[#111418]">
          {displayRanks.map((rank) =>
            displayFiles.map((file) => {
              const sq = `${file}${rank}` as Square;
              const fIdx = file.charCodeAt(0) - 97;
              const rIdx = parseInt(rank, 10) - 1;
              const isDark = (fIdx + rIdx) % 2 === 0;

              const piece = game.get(sq);
              const isSelected = selectedSquare === sq;
              const isValidDest = validDestinations.includes(sq);
              const isLastMoveFrom = lastMove?.from === sq;
              const isLastMoveTo = lastMove?.to === sq;
              const isKingInCheck = isCheck && piece?.type === 'k' && piece?.color === game.turn();

              let bgClass = isDark ? 'bg-[#334155]' : 'bg-[#e2e8f0]';

              if (isSelected) {
                bgClass = 'bg-[#eab308] border-2 border-[#ca8a04] shadow-inner';
              } else if (isLastMoveFrom || isLastMoveTo) {
                bgClass = isDark ? 'bg-[#1e3a5f]' : 'bg-[#93c5fd]';
              } else if (isKingInCheck) {
                bgClass = 'bg-[#ef4444] animate-pulse';
              }

              return (
                <div
                  key={sq}
                  onClick={() => onSquareClick(sq)}
                  className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 select-none ${bgClass} shadow-sm`}
                >
                  {/* Valid move target dot or ring */}
                  {isValidDest && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      {piece ? (
                        <div className="w-full h-full border-4 border-red-500 rounded-sm animate-pulse shadow-md" />
                      ) : (
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] ring-2 ring-white" />
                      )}
                    </div>
                  )}

                  {/* Piece Representation */}
                  {piece && (
                    <div
                      className={`text-3xl sm:text-4xl md:text-5xl font-bold transition-transform duration-100 ${
                        piece.color === 'w'
                          ? 'text-[#fef08a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] filter drop-shadow-[0_0_2px_#b45309]'
                          : 'text-[#0f172a] drop-shadow-[0_2px_4px_rgba(255,255,255,0.7)]'
                      } ${isSelected ? 'scale-115' : 'hover:scale-105'}`}
                    >
                      {PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
                    </div>
                  )}

                  {/* Subdued Square Label for accessibility */}
                  <span className="sr-only">{sq}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Right Rank Coordinates */}
        <div className="flex flex-col justify-around pl-2 text-outline font-label-md text-xs select-none">
          {displayRanks.map((r) => (
            <span key={r}>{r}</span>
          ))}
        </div>
      </div>

      {/* Bottom File Coordinates */}
      <div className="grid grid-cols-8 text-center text-outline font-label-md text-xs pt-1 select-none">
        {displayFiles.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
    </div>
  );
};
