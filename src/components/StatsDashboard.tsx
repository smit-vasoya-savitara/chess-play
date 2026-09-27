/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserStats, MatchRecord } from '../types/chess';
import { cloudSync } from '../services/cloudSync';
import {
  TrendingUp,
  Award,
  Swords,
  Shield,
  Cloud,
  CheckCircle,
  Clock,
  BookOpen,
  Eye,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

interface StatsDashboardProps {
  stats: UserStats;
  matches: MatchRecord[];
  onReviewMatch: (match: MatchRecord) => void;
  onRefreshStats: () => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  stats,
  matches,
  onReviewMatch,
  onRefreshStats,
}) => {
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('Synchronized');
  const [importNotice, setImportNotice] = useState<string>('');

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  const handleCloudSync = async () => {
    setSyncing(true);
    audioEngine.playSpell();
    const result = await cloudSync.syncCloud();
    setSyncing(false);
    setSyncStatus(`Synced at ${result.timestamp}`);
    onRefreshStats();
  };

  const handleExport = () => {
    const jsonStr = cloudSync.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcane_chess_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const ok = cloudSync.importBackupJSON(text);
      if (ok) {
        setImportNotice('Backup successfully restored!');
        onRefreshStats();
        setTimeout(() => setImportNotice(''), 3000);
      } else {
        setImportNotice('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  // Sparkline rating curve points
  const history = stats.ratingHistory || [];
  const minRating = Math.min(...history.map((h) => h.rating), stats.rating - 100);
  const maxRating = Math.max(...history.map((h) => h.rating), stats.rating + 100);

  const getPoints = () => {
    if (history.length === 0) return '';
    const w = 480;
    const h = 100;
    return history
      .map((entry, idx) => {
        const x = (idx / (history.length - 1 || 1)) * w;
        const y = h - ((entry.rating - minRating) / (maxRating - minRating || 1)) * (h - 20) - 10;
        return `${x},${y}`;
      })
      .join(' ');
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Cloud Sync Status Header */}
      <div className="stone-slab rounded-xl p-4 border border-outline-variant/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container border border-primary/40 flex items-center justify-center text-primary">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <span className="font-headline-sm text-sm text-primary font-bold">Cross-Platform Cloud Sync</span>
            <p className="text-outline font-label-sm text-xs">{syncStatus}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {importNotice && <span className="text-xs text-primary font-semibold">{importNotice}</span>}
          <button
            onClick={handleCloudSync}
            disabled={syncing}
            className="px-3 py-1.5 rounded-lg bg-surface-container border border-primary/50 text-primary hover:bg-primary/10 text-xs font-label-md uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync to Cloud'}</span>
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:border-tertiary text-on-surface-variant hover:text-tertiary text-xs font-label-md uppercase tracking-wider flex items-center gap-1.5 transition-all"
            title="Export Profile JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <label className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:border-tertiary text-on-surface-variant hover:text-tertiary text-xs font-label-md uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* KPI Stats Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stone-slab rounded-xl p-4 border border-outline-variant/30">
          <span className="text-[10px] text-outline font-label-sm uppercase tracking-wider block">Rating (Elo)</span>
          <span className="font-headline-sm text-2xl font-bold text-primary">{stats.rating}</span>
          <p className="text-[10px] text-outline mt-1">Peak: {stats.peakRating} Elo</p>
        </div>

        <div className="stone-slab rounded-xl p-4 border border-outline-variant/30">
          <span className="text-[10px] text-outline font-label-sm uppercase tracking-wider block">Win Ratio</span>
          <span className="font-headline-sm text-2xl font-bold text-emerald-400">{winRate}%</span>
          <p className="text-[10px] text-outline mt-1">
            {stats.wins}W · {stats.losses}L · {stats.draws}D
          </p>
        </div>

        <div className="stone-slab rounded-xl p-4 border border-outline-variant/30">
          <span className="text-[10px] text-outline font-label-sm uppercase tracking-wider block">Games Played</span>
          <span className="font-headline-sm text-2xl font-bold text-on-surface">{stats.gamesPlayed}</span>
          <p className="text-[10px] text-outline mt-1">Tier: {stats.tier} {stats.division}</p>
        </div>

        <div className="stone-slab rounded-xl p-4 border border-outline-variant/30">
          <span className="text-[10px] text-outline font-label-sm uppercase tracking-wider block">Win Streak</span>
          <span className="font-headline-sm text-2xl font-bold text-amber-400">{stats.winStreak}</span>
          <p className="text-[10px] text-outline mt-1">Best: {stats.bestWinStreak} consecutive</p>
        </div>
      </div>

      {/* Rating Curve & Color Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rating Trend Chart (8 cols) */}
        <div className="lg:col-span-8 stone-slab rounded-xl p-5 border border-outline-variant/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-headline-sm text-sm text-primary font-semibold uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Rating Progression Over Time
            </h3>
            <span className="text-outline text-xs font-mono">Last {history.length} Matches</span>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full h-36 bg-surface-container-lowest rounded-lg border border-outline-variant/20 p-2 flex items-center justify-center">
            {history.length > 1 ? (
              <svg viewBox="0 0 480 100" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f2ca50" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f2ca50" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline
                  fill="none"
                  stroke="#f2ca50"
                  strokeWidth="2.5"
                  points={getPoints()}
                />
              </svg>
            ) : (
              <span className="text-xs text-outline">Play more matches to view rating curve.</span>
            )}
          </div>
        </div>

        {/* Color Performance (4 cols) */}
        <div className="lg:col-span-4 stone-slab rounded-xl p-5 border border-outline-variant/30 flex flex-col justify-between">
          <h3 className="font-headline-sm text-sm text-on-surface font-semibold uppercase tracking-wider mb-3">
            Performance by Color
          </h3>

          <div className="space-y-4">
            {/* White */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-primary flex items-center gap-1">♔ White</span>
                <span className="text-outline">
                  {stats.whiteStats.wins}W / {stats.whiteStats.losses}L / {stats.whiteStats.draws}D
                </span>
              </div>
              <div className="w-full bg-surface-container-lowest h-2 rounded overflow-hidden flex">
                <div
                  className="bg-primary h-full"
                  style={{
                    width: `${
                      (stats.whiteStats.wins / (stats.whiteStats.wins + stats.whiteStats.losses + stats.whiteStats.draws || 1)) * 100
                    }%`
                  }}
                />
                <div
                  className="bg-red-500 h-full"
                  style={{
                    width: `${
                      (stats.whiteStats.losses / (stats.whiteStats.wins + stats.whiteStats.losses + stats.whiteStats.draws || 1)) * 100
                    }%`
                  }}
                />
              </div>
            </div>

            {/* Black */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-secondary flex items-center gap-1">♚ Black</span>
                <span className="text-outline">
                  {stats.blackStats.wins}W / {stats.blackStats.losses}L / {stats.blackStats.draws}D
                </span>
              </div>
              <div className="w-full bg-surface-container-lowest h-2 rounded overflow-hidden flex">
                <div
                  className="bg-secondary h-full"
                  style={{
                    width: `${
                      (stats.blackStats.wins / (stats.blackStats.wins + stats.blackStats.losses + stats.blackStats.draws || 1)) * 100
                    }%`
                  }}
                />
                <div
                  className="bg-red-500 h-full"
                  style={{
                    width: `${
                      (stats.blackStats.losses / (stats.blackStats.wins + stats.blackStats.losses + stats.blackStats.draws || 1)) * 100
                    }%`
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant/20">
            <span className="text-[10px] text-outline font-label-sm uppercase tracking-wider block mb-1">
              Top Opening Repertoire
            </span>
            <div className="space-y-1 text-xs">
              {stats.openings.slice(0, 2).map((op, i) => (
                <div key={i} className="flex justify-between text-on-surface-variant">
                  <span>{op.name}</span>
                  <span className="font-mono text-primary font-semibold">
                    {Math.round((op.won / (op.played || 1)) * 100)}% Win
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Match History Table */}
      <div className="stone-slab rounded-xl border border-outline-variant/30 overflow-hidden shadow-2xl">
        <div className="p-4 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            <h3 className="font-headline-sm text-sm text-primary font-bold uppercase tracking-wider">
              Recent Match History & Game Analysis
            </h3>
          </div>
          <span className="text-outline font-label-sm text-xs">Click match to analyze</span>
        </div>

        <div className="divide-y divide-outline-variant/20">
          {matches.map((match) => {
            const isWin = match.result === 'win';
            const isLoss = match.result === 'loss';

            return (
              <div
                key={match.id}
                className="p-4 hover:bg-surface-container/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                      isWin
                        ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-400'
                        : isLoss
                        ? 'bg-red-950/60 border border-red-500/50 text-red-400'
                        : 'bg-slate-800 border border-slate-600 text-slate-300'
                    }`}
                  >
                    {match.result}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-headline-sm text-sm font-semibold text-on-surface">
                        vs {match.opponentName}
                      </span>
                      <span className="text-outline text-xs font-mono">({match.opponentElo} Elo)</span>
                      <span className="text-[10px] px-1.5 rounded bg-surface-container text-outline">
                        {match.playerColor === 'w' ? '♔ White' : '♚ Black'}
                      </span>
                    </div>
                    <p className="text-[11px] text-outline font-label-sm">
                      {match.date} · {match.reason} · {match.movesCount} moves · Acc: {match.accuracy.player}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span
                    className={`font-mono text-xs font-bold ${
                      match.ratingDelta > 0 ? 'text-emerald-400' : match.ratingDelta < 0 ? 'text-red-400' : 'text-outline'
                    }`}
                  >
                    {match.ratingDelta > 0 ? `+${match.ratingDelta}` : match.ratingDelta}
                  </span>

                  <button
                    onClick={() => {
                      audioEngine.playMove();
                      onReviewMatch(match);
                    }}
                    className="px-3 py-1.5 rounded bg-surface-container border border-primary/50 text-primary hover:bg-primary/10 text-xs font-label-md uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Review Game</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
