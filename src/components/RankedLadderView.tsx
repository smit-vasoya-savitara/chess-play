/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserStats, RankedTier } from '../types/chess';
import { Trophy, Award, Zap, Shield, Swords, Flame, Crown } from 'lucide-react';

interface RankedLadderViewProps {
  stats: UserStats;
  onStartRankedMatch: () => void;
}

const TIER_ORDER: RankedTier[] = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Master',
  'Grandmaster',
];

const TIER_COLORS: Record<RankedTier, { text: string; bg: string; border: string }> = {
  Bronze: { text: 'text-amber-700', bg: 'bg-amber-950/30', border: 'border-amber-800/40' },
  Silver: { text: 'text-slate-300', bg: 'bg-slate-800/30', border: 'border-slate-500/40' },
  Gold: { text: 'text-yellow-400', bg: 'bg-yellow-950/30', border: 'border-yellow-600/40' },
  Platinum: { text: 'text-cyan-400', bg: 'bg-cyan-950/30', border: 'border-cyan-600/40' },
  Diamond: { text: 'text-sky-300', bg: 'bg-sky-950/30', border: 'border-sky-500/40' },
  Master: { text: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-600/40' },
  Grandmaster: { text: 'text-primary', bg: 'bg-primary/20', border: 'border-primary/60' },
};

const LEADERBOARD_ENTRIES = [
  { rank: 1, name: 'Archchancellor Alistair', house: 'Gryffindor', elo: 2650, tier: 'Grandmaster', winRate: '88%', streak: 14 },
  { rank: 2, name: 'Shadow Archmage Malakor', house: 'Slytherin', elo: 2480, tier: 'Master', winRate: '82%', streak: 8 },
  { rank: 3, name: 'Minerva_Transfigure', house: 'Gryffindor', elo: 2210, tier: 'Diamond', winRate: '76%', streak: 5 },
  { rank: 4, name: 'Rowena_Mind', house: 'Ravenclaw', elo: 2150, tier: 'Diamond', winRate: '74%', streak: 4 },
  { rank: 5, name: 'Viktor_Crush', house: 'Slytherin', elo: 2040, tier: 'Diamond', winRate: '70%', streak: 3 },
  { rank: 6, name: 'You (Player)', house: 'Gryffindor', elo: 1740, tier: 'Platinum', winRate: '68%', streak: 3, isUser: true },
  { rank: 7, name: 'Cedric_Valiant', house: 'Hufflepuff', elo: 1690, tier: 'Platinum', winRate: '62%', streak: 2 },
  { rank: 8, name: 'Luna_Astral', house: 'Ravenclaw', elo: 1640, tier: 'Gold', winRate: '59%', streak: 1 },
];

export const RankedLadderView: React.FC<RankedLadderViewProps> = ({
  stats,
  onStartRankedMatch,
}) => {
  const currentTierConfig = TIER_COLORS[stats.tier] || TIER_COLORS.Platinum;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner: Current Tier & Promotion Bar */}
      <div className="stone-slab rounded-2xl p-6 border-2 border-primary/40 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className={`w-20 h-20 rounded-2xl ${currentTierConfig.bg} border-2 ${currentTierConfig.border} flex flex-col items-center justify-center shadow-lg relative`}>
              <Trophy className={`w-10 h-10 ${currentTierConfig.text}`} />
              <span className={`text-[10px] font-label-sm font-bold uppercase tracking-wider ${currentTierConfig.text}`}>
                Div {stats.division}
              </span>
            </div>

            <div>
              <span className="font-label-sm text-xs text-outline uppercase tracking-widest block mb-1">
                Current Season Ranking
              </span>
              <h2 className="font-headline-sm text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                {stats.tier} Division {stats.division}
              </h2>
              <p className="text-on-surface-variant font-body-sm text-xs mt-1">
                Rating: <strong className="text-primary font-mono text-sm">{stats.rating} Elo</strong> · Peak: {stats.peakRating} Elo
              </p>
            </div>
          </div>

          {/* Quick Matchmaking CTA */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-outline font-label-sm uppercase tracking-wider block">Win Streak</span>
              <span className="font-headline-sm text-xl font-bold text-emerald-400 flex items-center justify-end gap-1">
                <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                {stats.winStreak} Wins
              </span>
            </div>

            <button
              onClick={onStartRankedMatch}
              className="brass-btn py-3 px-6 rounded-xl font-headline-sm text-sm font-bold text-on-primary tracking-widest uppercase flex items-center gap-2 active:scale-95 transition-transform shadow-xl"
            >
              <Swords className="w-5 h-5" />
              <span>Queue Ranked Match</span>
            </button>
          </div>
        </div>

        {/* Promotion LP Bar */}
        <div className="mt-6 pt-5 border-t border-outline-variant/30">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-outline font-label-sm uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Division Milestone Progress: {stats.leaguePoints} / 100 LP
            </span>
            <span className="text-primary font-label-sm text-xs font-semibold">
              Next Rank: {stats.tier} {stats.division > 1 ? `Division ${stats.division - 1}` : 'Promotion Series'}
            </span>
          </div>
          <div className="w-full bg-surface-container-lowest h-2.5 rounded-full border border-outline-variant/30 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary-container via-primary to-primary-fixed h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(242,202,80,0.5)]"
              style={{ width: `${stats.leaguePoints}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tier Road Progression Bar */}
      <div className="stone-slab rounded-xl p-5 border border-outline-variant/30">
        <h3 className="font-headline-sm text-sm text-on-surface font-semibold mb-4 uppercase tracking-wider">
          Chamber Ladder Ranks
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
          {TIER_ORDER.map((tier) => {
            const isCurrent = stats.tier === tier;
            const cfg = TIER_COLORS[tier];

            return (
              <div
                key={tier}
                className={`p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? `${cfg.bg} border-primary shadow-[0_0_12px_rgba(242,202,80,0.3)]`
                    : 'bg-surface-container-lowest/60 border-outline-variant/20 opacity-75'
                }`}
              >
                <span className={`font-headline-sm text-xs font-bold block ${cfg.text}`}>{tier}</span>
                <span className="text-[10px] text-outline font-mono block mt-1">
                  {tier === 'Bronze' ? '< 1000' : tier === 'Silver' ? '1000+' : tier === 'Gold' ? '1300+' : tier === 'Platinum' ? '1600+' : tier === 'Diamond' ? '1900+' : tier === 'Master' ? '2200+' : '2500+'}
                </span>
                {isCurrent && (
                  <span className="inline-block mt-1 px-1.5 py-0.2 bg-primary/20 text-primary text-[8px] font-label-sm uppercase rounded">
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="stone-slab rounded-xl border border-outline-variant/30 overflow-hidden shadow-2xl">
        <div className="p-4 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <h3 className="font-headline-sm text-base text-primary font-bold tracking-wider uppercase">
              Global Chamber Leaderboard
            </h3>
          </div>
          <span className="font-label-sm text-xs text-outline uppercase tracking-wider">
            Season II · Live Synchronized
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low text-outline font-label-sm text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Grandmaster</th>
                <th className="py-3 px-4">House</th>
                <th className="py-3 px-4 text-center">Tier</th>
                <th className="py-3 px-4 text-right">Rating</th>
                <th className="py-3 px-4 text-right">Win Rate</th>
                <th className="py-3 px-4 text-center">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-sm">
              {LEADERBOARD_ENTRIES.map((entry) => {
                const tierCfg = TIER_COLORS[entry.tier as RankedTier] || TIER_COLORS.Gold;
                return (
                  <tr
                    key={entry.rank}
                    className={`transition-colors ${
                      entry.isUser
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-surface-container/40'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-xs">
                      {entry.rank === 1 ? '🥇 1' : entry.rank === 2 ? '🥈 2' : entry.rank === 3 ? '🥉 3' : `#${entry.rank}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-semibold ${entry.isUser ? 'text-primary' : 'text-on-surface'}`}>
                        {entry.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-outline font-body-sm text-xs">{entry.house}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-label-sm uppercase font-semibold ${tierCfg.text} ${tierCfg.bg}`}>
                        {entry.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">{entry.elo}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400">{entry.winRate}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs">
                      <span className="px-2 py-0.5 rounded bg-orange-950/40 text-orange-400 border border-orange-600/30">
                        {entry.streak} W
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
