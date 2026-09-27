/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArcaneSpell } from '../types/chess';
import { X, Sparkles, Shield, Zap, Wand2, Eye, Compass } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

interface SpellGrimoireModalProps {
  isOpen: boolean;
  onClose: () => void;
  mana: number;
  onCastSpell: (spell: ArcaneSpell) => void;
}

export const SPELL_DECK: ArcaneSpell[] = [
  {
    id: 'spell_transfig',
    name: 'Transfiguration Gambit',
    manaCost: 40,
    icon: 'wand',
    description: "Transforms a targeted friendly Pawn into a fortified Queen's Guard construct with extended reach for 3 turns."
  },
  {
    id: 'spell_shield',
    name: 'Runic Shield',
    manaCost: 25,
    icon: 'shield',
    description: 'Enchants selected living stone piece with impenetrable blue warding; prevents capture for 1 full ply.'
  },
  {
    id: 'spell_locomotor',
    name: 'Locomotor Command',
    manaCost: 30,
    icon: 'zap',
    description: 'Forces any asleep stone statue to immediately charge two tiles forward across the flagstones.'
  },
  {
    id: 'spell_sight',
    name: 'Arcane Sight',
    manaCost: 15,
    icon: 'eye',
    description: 'Reveals all hidden ambush vectors, pinning lines, and future 3-move branches of your opponent.'
  }
];

export const SpellGrimoireModal: React.FC<SpellGrimoireModalProps> = ({
  isOpen,
  onClose,
  mana,
  onCastSpell,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="stone-slab rounded-2xl border-2 border-primary/50 w-full max-w-xl shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Header */}
        <div className="bg-surface-container-lowest px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border border-tertiary/50 bg-surface-container flex items-center justify-center text-tertiary shadow-[0_0_12px_rgba(56,189,248,0.25)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline-sm text-base text-primary font-bold tracking-wider uppercase">
                Spell Invocations Grimoire
              </h2>
              <p className="text-outline font-label-sm text-xs">
                Chamber of Runic Stones · Hogwarts Ancient Charms
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-surface-container border border-primary/40 text-primary font-mono text-xs font-bold">
              {mana} / 100 MP
            </span>
            <button
              onClick={onClose}
              className="text-outline hover:text-primary transition-colors p-1.5 rounded active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Spells Grid */}
        <div className="p-6 space-y-3 max-h-[460px] overflow-y-auto">
          {SPELL_DECK.map((spell) => {
            const canAfford = mana >= spell.manaCost;

            return (
              <div
                key={spell.id}
                className={`p-4 rounded-xl border transition-all ${
                  canAfford
                    ? 'bg-surface-container-low border-outline-variant/40 hover:border-primary/80 hover:bg-surface-container'
                    : 'bg-surface-container-lowest/50 border-outline-variant/20 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {spell.icon === 'wand' && <Wand2 className="w-4 h-4 text-primary" />}
                    {spell.icon === 'shield' && <Shield className="w-4 h-4 text-tertiary" />}
                    {spell.icon === 'zap' && <Zap className="w-4 h-4 text-secondary" />}
                    {spell.icon === 'eye' && <Eye className="w-4 h-4 text-cyan-400" />}
                    <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                      {spell.name}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      canAfford
                        ? 'bg-primary/20 text-primary border-primary/40'
                        : 'bg-surface-container text-outline border-outline-variant/30'
                    }`}
                  >
                    {spell.manaCost} MP
                  </span>
                </div>

                <p className="text-on-surface-variant font-body-sm text-xs leading-normal mb-3">
                  {spell.description}
                </p>

                <button
                  disabled={!canAfford}
                  onClick={() => {
                    audioEngine.playSpell();
                    onCastSpell(spell);
                    onClose();
                  }}
                  className={`w-full py-2 rounded-lg font-headline-sm text-xs uppercase tracking-widest font-semibold transition-all ${
                    canAfford
                      ? 'brass-btn text-on-primary active:scale-95'
                      : 'bg-surface-container-lowest text-outline border border-outline-variant/20 cursor-not-allowed'
                  }`}
                >
                  {canAfford ? 'Channel Spell Incantation' : 'Insufficient Mana'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
