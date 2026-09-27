/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { matchmakingService, FoundMatch } from '../services/rankedMatchmaking';
import { X, Globe, Swords, User, Shield, Sparkles, Check, Clock } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userElo: number;
  onMatchFound: (match: FoundMatch) => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  isOpen,
  onClose,
  userElo,
  onMatchFound,
}) => {
  const [timeControl, setTimeControl] = useState<'10 min Rapid' | '5 min Blitz' | '3 min Blitz'>('10 min Rapid');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [foundMatch, setFoundMatch] = useState<FoundMatch | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isSearching) {
      timer = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSearching]);

  const startQueue = async () => {
    setIsSearching(true);
    setFoundMatch(null);
    audioEngine.playSpell();

    const match = await matchmakingService.findOpponent(userElo, timeControl);
    setFoundMatch(match);
    setIsSearching(false);
    audioEngine.playCheck();
  };

  const cancelQueue = () => {
    setIsSearching(false);
    setFoundMatch(null);
    onClose();
  };

  const acceptMatch = () => {
    if (foundMatch) {
      audioEngine.playVictory();
      onMatchFound(foundMatch);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="stone-slab rounded-2xl border-2 border-primary/50 w-full max-w-lg shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Header */}
        <div className="bg-surface-container-lowest px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-surface-container border border-primary/50 flex items-center justify-center text-primary">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline-sm text-base text-primary font-bold tracking-wider uppercase">
                Chamber Matchmaking Sanctum
              </h2>
              <p className="text-outline font-label-sm text-xs">Global Peer Dueling Queue</p>
            </div>
          </div>
          <button
            onClick={cancelQueue}
            className="text-outline hover:text-primary transition-colors p-1.5 rounded active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {!foundMatch ? (
            <>
              {/* Time Control Selector */}
              <div>
                <label className="text-outline font-label-sm text-xs uppercase tracking-widest block mb-2">
                  Select Time Control
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['10 min Rapid', '5 min Blitz', '3 min Blitz'] as const).map((tc) => (
                    <button
                      key={tc}
                      disabled={isSearching}
                      onClick={() => setTimeControl(tc)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        timeControl === tc
                          ? 'bg-surface-container border-primary text-primary shadow-[0_0_12px_rgba(242,202,80,0.3)]'
                          : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="font-headline-sm text-xs font-bold block">{tc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status or Search Radar */}
              <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col items-center justify-center text-center space-y-3">
                {isSearching ? (
                  <>
                    <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full border-2 border-tertiary border-b-transparent animate-spin" />
                    </div>
                    <span className="font-headline-sm text-sm text-primary font-bold animate-pulse">
                      Searching Opponent in the Chamber...
                    </span>
                    <span className="font-mono text-xs text-outline">
                      Elapsed: 00:{elapsedSeconds < 10 ? `0${elapsedSeconds}` : elapsedSeconds}
                    </span>
                  </>
                ) : (
                  <>
                    <Swords className="w-12 h-12 text-primary/60" />
                    <span className="font-headline-sm text-sm text-on-surface font-semibold">
                      Ready to Battle Real Grandmasters
                    </span>
                    <p className="text-xs text-outline font-body-sm max-w-xs">
                      Match against worldwide players based on your rating of {userElo} Elo.
                    </p>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {isSearching ? (
                  <button
                    onClick={() => setIsSearching(false)}
                    className="w-full py-3 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-950/20 font-headline-sm text-xs uppercase tracking-wider transition-all"
                  >
                    Cancel Search
                  </button>
                ) : (
                  <button
                    onClick={startQueue}
                    className="w-full brass-btn py-3 rounded-xl font-headline-sm text-xs font-bold text-on-primary tracking-widest uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <Swords className="w-4 h-4" />
                    <span>Find Opponent Now</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Match Found Card */
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-center space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-label-sm font-bold flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Match Found!
                </span>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                  {foundMatch.opponent.name}
                </h3>
                <p className="text-xs text-outline">
                  {foundMatch.opponent.title} · {foundMatch.opponent.house} ({foundMatch.opponent.elo} Elo)
                </p>
              </div>

              {/* Stakes & Details */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/30">
                  <span className="text-outline text-[10px] block uppercase">Your Color</span>
                  <span className="font-bold text-primary text-sm mt-0.5 block">
                    {foundMatch.assignedColor === 'w' ? '♔ White' : '♚ Black'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/30">
                  <span className="text-outline text-[10px] block uppercase">Win Stakes</span>
                  <span className="font-bold text-emerald-400 text-sm mt-0.5 block">
                    +{foundMatch.potentialGain} Elo
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/30">
                  <span className="text-outline text-[10px] block uppercase">Loss Stakes</span>
                  <span className="font-bold text-red-400 text-sm mt-0.5 block">
                    -{foundMatch.potentialLoss} Elo
                  </span>
                </div>
              </div>

              {/* Accept Button */}
              <button
                onClick={acceptMatch}
                className="w-full brass-btn py-3.5 rounded-xl font-headline-sm text-sm font-bold text-on-primary tracking-widest uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-2xl"
              >
                <span>Enter Match Arena</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
