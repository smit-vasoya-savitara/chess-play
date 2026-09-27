/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, Eye, RotateCw, Wand2, Shield, Zap, Sparkles } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

interface RelicForgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPiece?: 'knight' | 'rook' | 'queen';
}

interface PieceDossier {
  name: string;
  subtitle: string;
  badge: string;
  category: string;
  viewportLabel: string;
  lore: string;
  maxHp: number;
  hpFractured: number;
  hpCrumbling: number;
  force: string;
  forceDesc: string;
  enchant: string;
  enchantDesc: string;
  archetype: string;
  archetypeDesc: string;
  spellTitle: string;
  spellCost: string;
  spellDesc: string;
}

const DOSSIER_DATA: Record<string, PieceDossier> = {
  knight: {
    name: 'Gryffindor Crusader Steed',
    subtitle: 'Obsidian Basalt Knight of the Outer Crypt',
    badge: 'TIER IV LIVING GOLEM',
    category: 'Gryffindor Vanguard Armor',
    viewportLabel: 'LIVING BASALT STEED #K-03',
    lore: 'Forged in the subterranean kilns beneath the Chamber of Runic Stones. When awakened by Piertotum Locomotor, its chiseled basalt joints groan with ancestral magic, cleaving through enemy pawn ranks with concussive celestial wrath.',
    maxHp: 480,
    hpFractured: 312,
    hpCrumbling: 96,
    force: '120 kN',
    forceDesc: 'Shatters granite on impact',
    enchant: 'Mana Ward',
    enchantDesc: '+45% Magic Resistance',
    archetype: 'L-Shape Leap',
    archetypeDesc: 'Bypasses stone barriers',
    spellTitle: 'Active Spell: "Galloping Shockwave"',
    spellCost: '35 MP',
    spellDesc: 'Upon landing on the target tile, unleashes a 360° seismic shockwave pulverizing surrounding enemy pawns into chalk dust.'
  },
  rook: {
    name: 'Gargoyle Bastion of the Crypt',
    subtitle: 'Ancient Castle Citadel & Winged Sentinel',
    badge: 'TIER V FORTIFIED COLOSSUS',
    category: 'Outer Crypt Citadel Ward',
    viewportLabel: 'GARGOYLE BASTION #R-01',
    lore: 'Chiseled from bedrock quarried beneath Hogwarts Castle. Towering crenellations house a petrified gargoyle warden with obsidian claws, capable of locking orthogonal corridors in perpetual arcane lockdown.',
    maxHp: 720,
    hpFractured: 468,
    hpCrumbling: 144,
    force: '250 kN',
    forceDesc: 'Pulverizes cathedral pillars',
    enchant: 'Granite Aegis',
    enchantDesc: '+60% Armor against spells',
    archetype: 'Orthogonal Crush',
    archetypeDesc: 'Infinite straight siege',
    spellTitle: 'Active Spell: "Fortress Rampart"',
    spellCost: '45 MP',
    spellDesc: 'Reinforces orthogonal avenues with impassable mystic stone barricades, reducing all incoming spell damage to zero for 2 turns.'
  },
  queen: {
    name: 'Archchancellor Sovereignty',
    subtitle: 'Supreme Living Stone Monarch of the High Chamber',
    badge: 'TIER VII SUPREME ARTIFACT',
    category: 'Grand Sanctum Royal Regalia',
    viewportLabel: 'ARCHCHANCELLOR QUEEN #Q-01',
    lore: 'The pinnacle of Hogwarts dueling transfiguration. Crowned with eight gilded spires and an unstable levitating celestial mana core, she commands the living flagstones with absolute multi-directional devastation.',
    maxHp: 950,
    hpFractured: 615,
    hpCrumbling: 190,
    force: '380 kN',
    forceDesc: 'Unbounded lethal kinetic impact',
    enchant: 'Arcane Dominance',
    enchantDesc: '+80% Spell Amplification',
    archetype: 'Omnidirectional Wrath',
    archetypeDesc: 'Any direction unbounded',
    spellTitle: 'Active Spell: "Cataclysmic Cleave"',
    spellCost: '60 MP',
    spellDesc: 'Unleashes multi-directional celestial mana beams along all cardinal and diagonal vectors, instantly shattering unprotected pieces.'
  }
};

export const RelicForgeModal: React.FC<RelicForgeModalProps> = ({
  isOpen,
  onClose,
  initialPiece = 'knight'
}) => {
  const [selectedPiece, setSelectedPiece] = useState<'knight' | 'rook' | 'queen'>(initialPiece);
  const [damageState, setDamageState] = useState<0 | 1 | 2>(0); // 0: Pristine, 1: Fractured, 2: Crumbling
  const [manaEyesActive, setManaEyesActive] = useState(true);
  const [isPolishing, setIsPolishing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const piecePivotRef = useRef<THREE.Group | null>(null);
  const piecesMapRef = useRef<Record<string, THREE.Group>>({});
  const damageGroupRef = useRef<THREE.Group | null>(null);
  const eyeLightRef = useRef<THREE.PointLight | null>(null);
  const orbitRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    rotY: 0.5,
    rotX: 0.15,
    zoom: 5.2
  });
  const animFrameRef = useRef<number | null>(null);

  const dossier = DOSSIER_DATA[selectedPiece];

  useEffect(() => {
    if (initialPiece) setSelectedPiece(initialPiece);
  }, [initialPiece]);

  // Three.js 3D Viewer inside Modal
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.replaceChildren(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x2a333d, 1.5);
    scene.add(ambientLight);

    const manaKeyLight = new THREE.DirectionalLight(0x38bdf8, 2.3);
    manaKeyLight.position.set(4, 7, 5);
    manaKeyLight.castShadow = true;
    scene.add(manaKeyLight);

    const goldRimLight = new THREE.DirectionalLight(0xd4af37, 1.9);
    goldRimLight.position.set(-4, 3, -4);
    scene.add(goldRimLight);

    const emeraldFill = new THREE.PointLight(0x10b981, 0.8, 10);
    emeraldFill.position.set(0, -2, 2);
    scene.add(emeraldFill);

    // Materials
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x3d434d,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true
    });
    const darkBasaltMat = new THREE.MeshStandardMaterial({
      color: 0x1f242b,
      roughness: 0.75,
      metalness: 0.2,
      flatShading: true
    });
    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.35,
      metalness: 0.85,
      flatShading: true
    });
    const manaCoreMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x252a32, roughness: 0.95 });
    const fissureGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });

    const piecePivot = new THREE.Group();
    scene.add(piecePivot);
    piecePivotRef.current = piecePivot;

    // --- 1. Knight Model ---
    const knightGroup = new THREE.Group();
    piecePivot.add(knightGroup);

    const kBase = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.25, 16), darkBasaltMat);
    kBase.position.y = -1.6;
    knightGroup.add(kBase);

    const kBaseRing = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.25, 0.08, 16), goldAccentMat);
    kBaseRing.position.y = -1.45;
    knightGroup.add(kBaseRing);

    const kBaseTop = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.45, 12), stoneMat);
    kBaseTop.position.y = -1.2;
    knightGroup.add(kBaseTop);

    const kChest = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.9, 8), stoneMat);
    kChest.position.set(0, -0.6, 0);
    knightGroup.add(kChest);

    const kNeck = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.9), stoneMat);
    kNeck.position.set(0, -0.05, 0.2);
    kNeck.rotation.x = -0.35;
    knightGroup.add(kNeck);

    const kHead = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.7, 0.85), stoneMat);
    kHead.position.set(0, 0.95, 0.85);
    knightGroup.add(kHead);

    const kMuzzle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.75), stoneMat);
    kMuzzle.position.set(0, 0.72, 1.4);
    knightGroup.add(kMuzzle);

    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.48, 4), darkBasaltMat);
    earL.position.set(0.24, 1.45, 0.65);
    knightGroup.add(earL);

    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.48, 4), darkBasaltMat);
    earR.position.set(-0.24, 1.45, 0.65);
    knightGroup.add(earR);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), manaCoreMat);
    eyeL.position.set(0.32, 0.98, 1.12);
    knightGroup.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), manaCoreMat);
    eyeR.position.set(-0.32, 0.98, 1.12);
    knightGroup.add(eyeR);

    // --- 2. Rook Model ---
    const rookGroup = new THREE.Group();
    piecePivot.add(rookGroup);
    rookGroup.visible = false;

    const rBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 2.4), darkBasaltMat);
    rBase.position.y = -1.55;
    rookGroup.add(rBase);

    const rTower = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.05, 1.6, 8), stoneMat);
    rTower.position.y = -0.25;
    rookGroup.add(rTower);

    const rCorbel = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 0.95, 0.4, 8), darkBasaltMat);
    rCorbel.position.y = 0.65;
    rookGroup.add(rCorbel);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const battlement = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.3), darkBasaltMat);
      battlement.position.set(Math.cos(angle) * 1.05, 1.1, Math.sin(angle) * 1.05);
      rookGroup.add(battlement);
    }

    // Perched gargoyle
    const gHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.45), stoneMat);
    gHead.position.set(0, 1.5, 0.15);
    rookGroup.add(gHead);

    const gEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), manaCoreMat);
    gEyeL.position.set(0.12, 1.54, 0.38);
    rookGroup.add(gEyeL);
    const gEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), manaCoreMat);
    gEyeR.position.set(-0.12, 1.54, 0.38);
    rookGroup.add(gEyeR);

    // --- 3. Queen Model ---
    const queenGroup = new THREE.Group();
    piecePivot.add(queenGroup);
    queenGroup.visible = false;

    const qRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 1.15, 1.3, 12), stoneMat);
    qRobe.position.y = -0.8;
    queenGroup.add(qRobe);

    const qTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.9, 10), stoneMat);
    qTorso.position.y = 0.2;
    queenGroup.add(qTorso);

    const qHead = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.46), stoneMat);
    qHead.position.set(0, 1.15, 0.05);
    queenGroup.add(qHead);

    const qCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.45, 0.25, 8), goldAccentMat);
    qCrown.position.y = 1.45;
    queenGroup.add(qCrown);

    const qOrb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), manaCoreMat);
    qOrb.position.set(0, 1.88, 0);
    queenGroup.add(qOrb);

    piecesMapRef.current = { knight: knightGroup, rook: rookGroup, queen: queenGroup };

    // Damage & Rubble Debris
    const damageGroup = new THREE.Group();
    piecePivot.add(damageGroup);
    damageGroup.visible = false;
    damageGroupRef.current = damageGroup;

    for (let r = 0; r < 18; r++) {
      const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.08), rubbleMat);
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.9 + Math.random() * 1.2;
      chunk.position.set(Math.cos(ang) * rad, -1.55 + Math.random() * 0.3, Math.sin(ang) * rad);
      damageGroup.add(chunk);
    }

    for (let f = 0; f < 8; f++) {
      const fissure = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.05), fissureGlowMat);
      fissure.position.set((Math.random() - 0.5) * 1.2, -0.6 + Math.random() * 1.4, (Math.random() - 0.5) * 1.2);
      damageGroup.add(fissure);
    }

    // Dynamic Eye Point Light
    const eyeLight = new THREE.PointLight(0x22d3ee, 1.8, 3.5);
    eyeLight.position.set(0, 1.1, 1.3);
    piecePivot.add(eyeLight);
    eyeLightRef.current = eyeLight;

    // Runic Orbit Ring
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.02, 6, 32), goldAccentMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -1.45;
    piecePivot.add(ringMesh);

    // Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      if (!orbitRef.current.isDragging) {
        orbitRef.current.rotY += 0.005;
      }

      piecePivot.rotation.y = orbitRef.current.rotY;
      piecePivot.rotation.x = orbitRef.current.rotX;
      camera.position.z = orbitRef.current.zoom;

      // Levitation
      piecePivot.position.y = Math.sin(time * 1.5) * 0.06;

      if (qOrb && queenGroup.visible) {
        qOrb.position.y = 1.88 + Math.sin(time * 3.0) * 0.08;
      }

      renderer.render(scene, camera);
    };

    animate();

    const dom = renderer.domElement;
    const onMouseDown = (e: MouseEvent) => {
      orbitRef.current.isDragging = true;
      orbitRef.current.prevX = e.clientX;
      orbitRef.current.prevY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!orbitRef.current.isDragging) return;
      const dx = e.clientX - orbitRef.current.prevX;
      const dy = e.clientY - orbitRef.current.prevY;
      orbitRef.current.rotY += dx * 0.012;
      orbitRef.current.rotX = Math.max(-0.5, Math.min(0.6, orbitRef.current.rotX + dy * 0.01));
      orbitRef.current.prevX = e.clientX;
      orbitRef.current.prevY = e.clientY;
    };
    const onMouseUp = () => {
      orbitRef.current.isDragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRef.current.zoom = Math.max(3.2, Math.min(7.5, orbitRef.current.zoom + e.deltaY * 0.003));
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [isOpen]);

  // Sync piece visibility
  useEffect(() => {
    Object.keys(piecesMapRef.current).forEach((k) => {
      if (piecesMapRef.current[k]) {
        piecesMapRef.current[k].visible = k === selectedPiece;
      }
    });
  }, [selectedPiece]);

  // Sync damage state
  useEffect(() => {
    if (damageGroupRef.current) {
      damageGroupRef.current.visible = damageState > 0;
    }
  }, [damageState]);

  // Sync mana eyes
  useEffect(() => {
    if (eyeLightRef.current) {
      eyeLightRef.current.intensity = manaEyesActive ? 1.8 : 0.0;
    }
  }, [manaEyesActive]);

  const handlePolish = () => {
    setIsPolishing(true);
    audioEngine.playSpell();
    setDamageState(0);
    setTimeout(() => {
      setIsPolishing(false);
    }, 900);
  };

  if (!isOpen) return null;

  const currentHp =
    damageState === 0
      ? dossier.maxHp
      : damageState === 1
      ? dossier.hpFractured
      : dossier.hpCrumbling;
  const hpPct = Math.round((currentHp / dossier.maxHp) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="stone-slab rounded-2xl border-2 border-primary/50 w-full max-w-5xl shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col my-auto relative">
        {/* Header Bar */}
        <div className="bg-surface-container-lowest px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border border-primary/60 bg-surface-container flex items-center justify-center text-primary shadow-[0_0_12px_rgba(212,175,55,0.2)]">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-headline-sm text-lg text-primary font-bold tracking-wider uppercase flex items-center gap-2">
                Enchanted Relic Forge · Piece Inspector
                <span className="px-2 py-0.5 bg-tertiary/20 text-tertiary text-[10px] font-label-sm border border-tertiary/40 rounded uppercase font-semibold">
                  {dossier.badge}
                </span>
              </h2>
              <p className="text-outline font-label-sm text-xs tracking-widest uppercase">
                Chamber of Runic Stones · Living Basalt Artifact
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-primary transition-colors p-2 rounded hover:bg-surface-container active:scale-95"
            title="Close Inspector"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Piece Selector Bar */}
        <div className="bg-surface-container-low px-4 sm:px-6 py-2.5 border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-xs text-outline uppercase tracking-widest hidden sm:inline-block">
              Select Relic:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedPiece('knight');
                  audioEngine.playMove();
                }}
                className={`px-3 py-1.5 rounded text-xs font-label-md font-semibold uppercase tracking-wider flex items-center gap-2 transition-all ${
                  selectedPiece === 'knight'
                    ? 'bg-surface-container border border-primary text-primary shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                    : 'bg-surface-container-lowest/80 border border-outline-variant/40 text-on-surface-variant hover:text-primary'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedPiece === 'knight' ? 'bg-primary animate-pulse' : 'bg-outline'
                  }`}
                />
                <span>Knight · Basalt Steed</span>
              </button>

              <button
                onClick={() => {
                  setSelectedPiece('rook');
                  audioEngine.playMove();
                }}
                className={`px-3 py-1.5 rounded text-xs font-label-md font-semibold uppercase tracking-wider flex items-center gap-2 transition-all ${
                  selectedPiece === 'rook'
                    ? 'bg-surface-container border border-primary text-primary shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                    : 'bg-surface-container-lowest/80 border border-outline-variant/40 text-on-surface-variant hover:text-primary'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedPiece === 'rook' ? 'bg-primary animate-pulse' : 'bg-outline'
                  }`}
                />
                <span>Rook · Gargoyle Bastion</span>
              </button>

              <button
                onClick={() => {
                  setSelectedPiece('queen');
                  audioEngine.playMove();
                }}
                className={`px-3 py-1.5 rounded text-xs font-label-md font-semibold uppercase tracking-wider flex items-center gap-2 transition-all ${
                  selectedPiece === 'queen'
                    ? 'bg-surface-container border border-primary text-primary shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                    : 'bg-surface-container-lowest/80 border border-outline-variant/40 text-on-surface-variant hover:text-primary'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedPiece === 'queen' ? 'bg-primary animate-pulse' : 'bg-outline'
                  }`}
                />
                <span>Queen · Archchancellor</span>
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-outline font-label-sm text-xs">
            <Wand2 className="w-3.5 h-3.5 text-tertiary" />
            <span>Arcane Transfiguration Synced</span>
          </div>
        </div>

        {/* Modal 2-Column Bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-outline-variant/30 bg-surface-container-lowest/80">
          {/* Left: 3D Viewport */}
          <div className="lg:col-span-7 flex flex-col relative min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] p-3 bg-gradient-to-b from-[#0e1217] via-[#141920] to-[#0e1217]">
            {/* Viewport Top Label */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest/90 border border-primary/40 backdrop-blur-sm shadow-md">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                <span className="text-primary font-headline-sm text-xs font-semibold tracking-wider">
                  {dossier.viewportLabel}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded bg-surface-container-lowest/90 border border-outline-variant/40 text-[10px] text-tertiary font-label-sm tracking-wider uppercase backdrop-blur-sm">
                Mana Resonance: 100%
              </div>
            </div>

            {/* Wear & Damage Selector */}
            <div className="absolute top-14 left-4 z-20 flex flex-col gap-1 pointer-events-auto">
              <span className="text-[9px] uppercase tracking-widest font-label-sm text-outline bg-surface-container-lowest/85 px-2 py-0.5 rounded border border-outline-variant/30 w-fit backdrop-blur-sm">
                Relic Wear State
              </span>
              <div className="flex items-center gap-1 bg-surface-container-lowest/90 backdrop-blur-md p-1 rounded-lg border border-outline-variant/40 shadow-xl">
                <button
                  onClick={() => setDamageState(0)}
                  className={`px-2 py-1 rounded text-[11px] font-label-sm tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                    damageState === 0
                      ? 'bg-surface-container border border-primary text-primary shadow-[0_0_8px_rgba(242,202,80,0.35)]'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Pristine (100%)</span>
                </button>
                <button
                  onClick={() => setDamageState(1)}
                  className={`px-2 py-1 rounded text-[11px] font-label-sm tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                    damageState === 1
                      ? 'bg-surface-container border border-tertiary text-tertiary shadow-[0_0_8px_rgba(56,189,248,0.35)]'
                      : 'text-on-surface-variant hover:text-tertiary'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                  <span>Fractured (65%)</span>
                </button>
                <button
                  onClick={() => setDamageState(2)}
                  className={`px-2 py-1 rounded text-[11px] font-label-sm tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                    damageState === 2
                      ? 'bg-surface-container border border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.35)]'
                      : 'text-on-surface-variant hover:text-red-400'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span>Crumbling (20%)</span>
                </button>
              </div>
            </div>

            {/* Canvas Container */}
            <div
              ref={containerRef}
              className="relative w-full flex-1 rounded-xl overflow-hidden border border-outline-variant/20 bg-surface-container-lowest/60 cursor-grab active:cursor-grabbing"
            />

            {/* Bottom Viewport Controls */}
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 px-2">
              <span className="text-xs text-outline font-label-sm flex items-center gap-1.5 italic">
                Drag to rotate · Scroll to zoom · Carved Living Basalt
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    orbitRef.current.rotY += Math.PI * 2;
                  }}
                  className="px-2.5 py-1 bg-surface-container border border-outline-variant/40 hover:border-tertiary text-tertiary rounded text-xs font-label-sm tracking-wider transition-all flex items-center gap-1 active:scale-95"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 360°</span>
                </button>
                <button
                  onClick={() => setManaEyesActive(!manaEyesActive)}
                  className="px-2.5 py-1 bg-surface-container border border-primary/40 hover:border-primary text-primary rounded text-xs font-label-sm tracking-wider transition-all flex items-center gap-1 active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{manaEyesActive ? 'Eyes Lit' : 'Eyes Dim'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Tactical Lore & Dossier */}
          <div className="lg:col-span-5 p-5 md:p-6 flex flex-col justify-between space-y-4">
            <div>
              {/* Title Header */}
              <div className="pb-3 border-b border-outline-variant/30 mb-4">
                <span className="font-label-sm text-xs text-primary tracking-widest uppercase block mb-1">
                  {dossier.category}
                </span>
                <h3 className="font-headline-sm text-xl text-on-surface font-bold">{dossier.name}</h3>
                <p className="text-tertiary font-body-sm text-xs mt-0.5">{dossier.subtitle}</p>
              </div>

              {/* Lore */}
              <p className="font-body-sm text-on-surface-variant leading-relaxed text-xs mb-4">
                {dossier.lore}
              </p>

              {/* Stats Grid Bento */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/30">
                  <span className="text-outline font-label-sm text-[10px] uppercase block tracking-wider">
                    Durability (HP)
                  </span>
                  <span
                    className={`font-headline-sm text-base font-bold ${
                      damageState === 0 ? 'text-primary' : damageState === 1 ? 'text-tertiary' : 'text-red-400'
                    }`}
                  >
                    {currentHp} / {dossier.maxHp}
                  </span>
                  <div className="w-full bg-surface-container-lowest h-1.5 rounded mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded transition-all duration-500 ${
                        damageState === 0 ? 'bg-primary' : damageState === 1 ? 'bg-tertiary' : 'bg-red-500'
                      }`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/30">
                  <span className="text-outline font-label-sm text-[10px] uppercase block tracking-wider">
                    Concussion Force
                  </span>
                  <span className="font-headline-sm text-base text-tertiary font-bold">{dossier.force}</span>
                  <p className="text-[9px] text-on-surface-variant font-label-sm mt-0.5">{dossier.forceDesc}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/30">
                  <span className="text-outline font-label-sm text-[10px] uppercase block tracking-wider">
                    Enchantment
                  </span>
                  <span className="font-headline-sm text-xs text-[#afcdbe] font-bold flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#10b981]" />
                    {dossier.enchant}
                  </span>
                  <p className="text-[9px] text-[#afcdbe] font-label-sm mt-0.5">{dossier.enchantDesc}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/30">
                  <span className="text-outline font-label-sm text-[10px] uppercase block tracking-wider">
                    Move Archetype
                  </span>
                  <span className="font-headline-sm text-xs text-on-surface font-bold">{dossier.archetype}</span>
                  <p className="text-[9px] text-tertiary font-label-sm mt-0.5">{dossier.archetypeDesc}</p>
                </div>
              </div>

              {/* Spell Card */}
              <div className="p-3 rounded-lg bg-surface-container border border-tertiary/40 relative overflow-hidden mb-4 shadow-[0_0_12px_rgba(56,189,248,0.15)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-headline-sm text-xs text-tertiary font-semibold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-tertiary" />
                    {dossier.spellTitle}
                  </span>
                  <span className="px-2 py-0.5 bg-tertiary/20 text-tertiary rounded text-[10px] font-label-sm font-bold border border-tertiary/40">
                    {dossier.spellCost}
                  </span>
                </div>
                <p className="text-on-surface-variant text-[11px] font-body-sm leading-normal">
                  {dossier.spellDesc}
                </p>
              </div>
            </div>

            {/* Actions Button Bar */}
            <div className="pt-3 border-t border-outline-variant/30 flex items-center gap-2">
              <button
                onClick={handlePolish}
                disabled={isPolishing}
                className="flex-1 py-2.5 px-3 rounded-lg bg-surface-container border border-primary/50 text-primary hover:bg-primary/10 hover:border-primary font-label-md text-xs uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isPolishing ? 'animate-spin' : ''}`} />
                <span>{isPolishing ? 'Channelling Polish...' : 'Channel Runic Polish'}</span>
              </button>
              <button
                onClick={onClose}
                className="brass-btn py-2.5 px-4 rounded-lg font-headline-sm text-xs font-bold text-on-primary tracking-widest uppercase flex items-center justify-center gap-1 active:scale-95"
              >
                Confirm Relic
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
