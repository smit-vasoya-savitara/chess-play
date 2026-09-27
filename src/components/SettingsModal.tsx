/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Volume2, VolumeX, Eye, Shield, Palette } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { UserProfile } from '../services/cloudSync';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="stone-slab rounded-2xl border-2 border-primary/50 w-full max-w-lg shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Header */}
        <div className="bg-surface-container-lowest px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div>
            <h2 className="font-headline-sm text-base text-primary font-bold tracking-wider uppercase">
              Sanctum Dueling Settings
            </h2>
            <p className="text-outline font-label-sm text-xs">Aesthetics, Audio & Board Orientation</p>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-primary transition-colors p-1.5 rounded active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-5">
          {/* Audio Controls */}
          <div>
            <label className="text-outline font-label-sm text-xs uppercase tracking-widest block mb-2">
              Chamber Resonance (Audio)
            </label>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30">
              <span className="text-xs font-semibold text-on-surface">Stone & Concussion Sound Effects</span>
              <button
                onClick={() => {
                  audioEngine.isMuted = !audioEngine.isMuted;
                  onUpdateProfile({ ...profile });
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-label-md flex items-center gap-1.5 transition-all ${
                  !audioEngine.isMuted
                    ? 'bg-surface-container border-primary/60 text-primary'
                    : 'bg-surface-container-lowest border-outline-variant/40 text-outline'
                }`}
              >
                {!audioEngine.isMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{!audioEngine.isMuted ? 'Active' : 'Muted'}</span>
              </button>
            </div>
          </div>

          {/* Board View Mode (3D vs 2D) */}
          <div>
            <label className="text-outline font-label-sm text-xs uppercase tracking-widest block mb-2">
              Default Viewport Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['3d', '2d'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdateProfile({ ...profile, viewMode: mode })}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    profile.viewMode === mode
                      ? 'bg-surface-container border-primary text-primary shadow-[0_0_12px_rgba(242,202,80,0.25)]'
                      : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="font-headline-sm text-xs font-bold block uppercase">
                    {mode === '3d' ? '3D Realistic Chamber' : '2D Classical Tactical'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Perspective Orientation */}
          <div>
            <label className="text-outline font-label-sm text-xs uppercase tracking-widest block mb-2">
              Board Perspective
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['white', 'black'] as const).map((color) => (
                <button
                  key={color}
                  onClick={() => onUpdateProfile({ ...profile, boardPerspective: color })}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    profile.boardPerspective === color
                      ? 'bg-surface-container border-primary text-primary shadow-[0_0_12px_rgba(242,202,80,0.25)]'
                      : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="font-headline-sm text-xs font-bold block uppercase">
                    {color === 'white' ? '♔ White (Ranks 1→8)' : '♚ Black (Ranks 8→1)'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* House Affiliation */}
          <div>
            <label className="text-outline font-label-sm text-xs uppercase tracking-widest block mb-2">
              Dueling House Crest
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              {(['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'] as const).map((house) => (
                <button
                  key={house}
                  onClick={() => onUpdateProfile({ ...profile, house })}
                  className={`p-2.5 rounded-lg border transition-all ${
                    profile.house === house
                      ? 'bg-surface-container border-primary text-primary font-bold'
                      : 'bg-surface-container-lowest border-outline-variant/30 text-outline'
                  }`}
                >
                  <span>{house}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full brass-btn py-3 rounded-xl font-headline-sm text-xs font-bold text-on-primary tracking-widest uppercase active:scale-95 transition-transform"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
