/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MatchRecord, RankedTier, UserStats } from '../types/chess';

const STORAGE_KEY_STATS = 'arcane_chess_user_stats_v1';
const STORAGE_KEY_MATCHES = 'arcane_chess_match_history_v1';
const STORAGE_KEY_PROFILE = 'arcane_chess_user_profile_v1';

export interface UserProfile {
  name: string;
  title: string;
  house: 'Gryffindor' | 'Slytherin' | 'Ravenclaw' | 'Hufflepuff';
  avatarSeed: string;
  theme: 'gothic-basalt' | 'celestial-marble' | 'abyssal-emerald';
  boardPerspective: 'white' | 'black';
  viewMode: '3d' | '2d';
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Grandmaster Alistair',
  title: 'High Keeper of Runic Stones',
  house: 'Gryffindor',
  avatarSeed: 'alistair',
  theme: 'gothic-basalt',
  boardPerspective: 'white',
  viewMode: '3d'
};

const DEFAULT_STATS: UserStats = {
  rating: 1740,
  tier: 'Platinum',
  division: 2,
  leaguePoints: 68,
  gamesPlayed: 42,
  wins: 26,
  losses: 12,
  draws: 4,
  winStreak: 3,
  bestWinStreak: 7,
  peakRating: 1815,
  ratingHistory: [
    { date: '2026-09-20', rating: 1620, opponentElo: 1590, result: 'win' },
    { date: '2026-09-21', rating: 1642, opponentElo: 1660, result: 'win' },
    { date: '2026-09-22', rating: 1630, opponentElo: 1710, result: 'loss' },
    { date: '2026-09-23', rating: 1655, opponentElo: 1640, result: 'win' },
    { date: '2026-09-24', rating: 1690, opponentElo: 1720, result: 'win' },
    { date: '2026-09-25', rating: 1715, opponentElo: 1700, result: 'win' },
    { date: '2026-09-26', rating: 1740, opponentElo: 1760, result: 'win' },
  ],
  whiteStats: { wins: 15, losses: 6, draws: 2 },
  blackStats: { wins: 11, losses: 6, draws: 2 },
  openings: [
    { name: "King's Pawn (e4)", played: 22, won: 15 },
    { name: "Queen's Gambit (d4)", played: 12, won: 7 },
    { name: "Sicilian Defense (c5)", played: 8, won: 4 },
  ]
};

const SEED_MATCHES: MatchRecord[] = [
  {
    id: 'match_arc_9821',
    date: '2026-09-26 21:30',
    opponentName: 'Shadow Archmage Malakor',
    opponentElo: 2180,
    opponentHouse: 'Slytherin',
    playerColor: 'w',
    result: 'win',
    reason: 'Checkmate',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. O-O O-O 11. Ne4 Bg4 12. h3 Bh5 13. Re1 Nb6 14. Bb3 Bxf3 15. Qxf3 Nxd4 16. Qg3 Nxb3 17. axb3 c6 18. Rad1 Nd5 19. Nc5 b6 20. Ne4 Re8 21. Nd6 Rxe1+ 22. Rxe1 Qd7 23. Qe5 Rd8 24. Nf5 f6 25. Qe4 g6 26. Nh6+ Kg7 27. Ng4 Qd6 28. Qc4 h5 29. Ne3 Nxe3 30. Rxe3 Rd7 31. Re6 Qd1+ 32. Kh2 c5 33. Qf4 Qd4 34. Qf3 Rf7 35. Re2 Qd6+ 36. g3 h4 37. Qe4 hxg3+ 38. fxg3 Rd7 39. Qe8 Rf7 40. Qe4 Qd4 41. Qe6 f5 42. h4 f4 43. g4 f3 44. Re3 Qf4+ 45. Kh3 f2 46. h5 f1=Q#',
    movesCount: 46,
    ratingDelta: +25,
    accuracy: { player: 89.2, opponent: 78.4 }
  },
  {
    id: 'match_arc_8412',
    date: '2026-09-25 18:15',
    opponentName: 'Crypt Mage Vane',
    opponentElo: 1680,
    opponentHouse: 'Gryffindor',
    playerColor: 'b',
    result: 'win',
    reason: 'Resignation',
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4 Be7 8. Qf3 Qc7 9. O-O-O Nbd7 10. g4 b5 11. Bxf6 Nxf6 12. g5 Nd7 13. f5 O-O 14. h4 b4 15. Nce2 e5 16. f6 exd4 17. fxe7 Re8 18. Nxd4 Ne5 19. Qg3 Bg4 20. Be2 Bxe2 21. Nxe2 Rac8 22. Nd4 Rxe7 23. Rh2 Ree8 24. Nf5 Red8 25. h5 a5 26. g6 fxg6 27. hxg6 h6 28. Qb3+ Qc4 29. Ne7+ Kf8 30. Nxc8 Qxc8 31. Rf2+ Ke7 32. Rf7+ Ke8 33. Rxg7',
    movesCount: 33,
    ratingDelta: +18,
    accuracy: { player: 86.5, opponent: 74.1 }
  }
];

export class CloudSyncService {
  private lastSyncTime: number = Date.now();

  public getProfile(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback
    }
    return DEFAULT_PROFILE;
  }

  public saveProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
      this.lastSyncTime = Date.now();
    } catch {
      // Ignore
    }
  }

  public getStats(): UserStats {
    try {
      const data = localStorage.getItem(STORAGE_KEY_STATS);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback
    }
    return DEFAULT_STATS;
  }

  public saveStats(stats: UserStats): void {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
      this.lastSyncTime = Date.now();
    } catch {
      // Ignore
    }
  }

  public getMatchHistory(): MatchRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_MATCHES);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback
    }
    return SEED_MATCHES;
  }

  public recordMatch(record: MatchRecord): void {
    const list = this.getMatchHistory();
    list.unshift(record);
    try {
      localStorage.setItem(STORAGE_KEY_MATCHES, JSON.stringify(list.slice(0, 30)));
    } catch {
      // Ignore
    }

    // Update stats automatically
    const stats = this.getStats();
    stats.gamesPlayed++;
    if (record.result === 'win') {
      stats.wins++;
      stats.winStreak++;
      if (stats.winStreak > stats.bestWinStreak) stats.bestWinStreak = stats.winStreak;
      stats.rating += record.ratingDelta;
      if (record.playerColor === 'w') stats.whiteStats.wins++;
      else stats.blackStats.wins++;
    } else if (record.result === 'loss') {
      stats.losses++;
      stats.winStreak = 0;
      stats.rating = Math.max(400, stats.rating + record.ratingDelta);
      if (record.playerColor === 'w') stats.whiteStats.losses++;
      else stats.blackStats.losses++;
    } else {
      stats.draws++;
      stats.rating += record.ratingDelta;
      if (record.playerColor === 'w') stats.whiteStats.draws++;
      else stats.blackStats.draws++;
    }

    if (stats.rating > stats.peakRating) stats.peakRating = stats.rating;

    // Recalculate Tier & Division
    const { tier, division } = this.calculateTier(stats.rating);
    stats.tier = tier;
    stats.division = division;

    stats.ratingHistory.push({
      date: new Date().toISOString().split('T')[0],
      rating: stats.rating,
      opponentElo: record.opponentElo,
      result: record.result
    });

    this.saveStats(stats);
  }

  public calculateTier(rating: number): { tier: RankedTier; division: number } {
    if (rating < 1000) return { tier: 'Bronze', division: Math.max(1, 4 - Math.floor(rating / 250)) };
    if (rating < 1300) return { tier: 'Silver', division: Math.max(1, 4 - Math.floor((rating - 1000) / 75)) };
    if (rating < 1600) return { tier: 'Gold', division: Math.max(1, 4 - Math.floor((rating - 1300) / 75)) };
    if (rating < 1900) return { tier: 'Platinum', division: Math.max(1, 4 - Math.floor((rating - 1600) / 75)) };
    if (rating < 2200) return { tier: 'Diamond', division: Math.max(1, 4 - Math.floor((rating - 1900) / 75)) };
    if (rating < 2500) return { tier: 'Master', division: Math.max(1, 4 - Math.floor((rating - 2200) / 75)) };
    return { tier: 'Grandmaster', division: 1 };
  }

  public syncCloud(): Promise<{ success: boolean; timestamp: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.lastSyncTime = Date.now();
        resolve({
          success: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      }, 700);
    });
  }

  public exportBackupJSON(): string {
    const data = {
      profile: this.getProfile(),
      stats: this.getStats(),
      matches: this.getMatchHistory(),
      version: '1.0',
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  public importBackupJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.profile) this.saveProfile(parsed.profile);
      if (parsed.stats) this.saveStats(parsed.stats);
      if (parsed.matches) localStorage.setItem(STORAGE_KEY_MATCHES, JSON.stringify(parsed.matches));
      return true;
    } catch {
      return false;
    }
  }
}

export const cloudSync = new CloudSyncService();
