/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PieceColor } from '../types/chess';

export interface MatchmakingPlayer {
  id: string;
  name: string;
  title: string;
  house: 'Gryffindor' | 'Slytherin' | 'Ravenclaw' | 'Hufflepuff';
  elo: number;
  avatarSeed: string;
  winRate: string;
}

const PEER_POOL: MatchmakingPlayer[] = [
  { id: 'peer_1', name: 'Cedric_Valiant', title: 'Hufflepuff Seeker', house: 'Hufflepuff', elo: 1690, avatarSeed: 'cedric', winRate: '62%' },
  { id: 'peer_2', name: 'Bellatrix_Hex', title: 'Slytherin Inquisitor', house: 'Slytherin', elo: 1785, avatarSeed: 'bella', winRate: '58%' },
  { id: 'peer_3', name: 'Rowena_Mind', title: 'Ravenclaw Scholar', house: 'Ravenclaw', elo: 1720, avatarSeed: 'rowena', winRate: '65%' },
  { id: 'peer_4', name: 'Godric_Strike', title: 'Gryffindor Sentinel', house: 'Gryffindor', elo: 1760, avatarSeed: 'godric', winRate: '61%' },
  { id: 'peer_5', name: 'Draco_Viper', title: 'Chamber Tactician', house: 'Slytherin', elo: 1745, avatarSeed: 'draco', winRate: '54%' },
  { id: 'peer_6', name: 'Luna_Astral', title: 'Celestial Sage', house: 'Ravenclaw', elo: 1680, avatarSeed: 'luna', winRate: '59%' },
  { id: 'peer_7', name: 'Viktor_Crush', title: 'Durmstrang Grandmaster', house: 'Slytherin', elo: 1840, avatarSeed: 'viktor', winRate: '71%' },
  { id: 'peer_8', name: 'Minerva_Transfigure', title: 'Deputy Headmaster', house: 'Gryffindor', elo: 2150, avatarSeed: 'minerva', winRate: '76%' },
];

export interface FoundMatch {
  opponent: MatchmakingPlayer;
  assignedColor: PieceColor;
  timeControl: string;
  potentialGain: number;
  potentialLoss: number;
}

export class MatchmakingService {
  public findOpponent(userElo: number, timeControl: string = '10 min Rapid'): Promise<FoundMatch> {
    return new Promise((resolve) => {
      // Find someone closest in Elo
      const eligible = [...PEER_POOL].sort((a, b) => Math.abs(a.elo - userElo) - Math.abs(b.elo - userElo));
      const opponent = eligible[Math.floor(Math.random() * Math.min(3, eligible.length))] || eligible[0];

      const assignedColor: PieceColor = Math.random() > 0.5 ? 'w' : 'b';

      // Elo stakes
      const eloDiff = opponent.elo - userElo;
      const expectedScore = 1 / (1 + Math.pow(10, eloDiff / 400));
      const potentialGain = Math.round(32 * (1 - expectedScore));
      const potentialLoss = Math.round(32 * expectedScore);

      // Simulate network search latency 1.5s - 3s
      const latency = 1500 + Math.random() * 1500;
      setTimeout(() => {
        resolve({
          opponent,
          assignedColor,
          timeControl,
          potentialGain: Math.max(12, potentialGain),
          potentialLoss: Math.max(10, potentialLoss)
        });
      }, latency);
    });
  }
}

export const matchmakingService = new MatchmakingService();
