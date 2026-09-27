/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Chess, Square } from 'chess.js';
import { PieceColor, PieceType } from '../types/chess';
import { Camera, Eye, ZoomIn, ZoomOut, Sparkles, RotateCcw } from 'lucide-react';

interface Chess3DSceneProps {
  game: Chess;
  playerColor: PieceColor;
  selectedSquare: Square | null;
  validDestinations: Square[];
  lastMove: { from: Square; to: Square } | null;
  isCheck: boolean;
  onSquareClick: (sq: Square) => void;
  activeTheme?: 'gothic-basalt' | 'celestial-marble' | 'abyssal-emerald';
}

export const Chess3DScene: React.FC<Chess3DSceneProps> = ({
  game,
  playerColor,
  selectedSquare,
  validDestinations,
  lastMove,
  isCheck,
  onSquareClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pieceMeshesRef = useRef<Map<Square, THREE.Group>>(new Map());
  const tileMeshesRef = useRef<Map<Square, THREE.Mesh>>(new Map());
  const markerMeshesRef = useRef<THREE.Mesh[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const selectedHaloRef = useRef<THREE.Mesh | null>(null);

  // Fresh ref for onSquareClick to avoid stale closures in Three.js event listeners
  const onSquareClickRef = useRef(onSquareClick);
  useEffect(() => {
    onSquareClickRef.current = onSquareClick;
  }, [onSquareClick]);

  const [cameraView, setCameraView] = useState<'perspective' | 'top-down' | 'side'>('perspective');

  // Materials Cache
  const materialsRef = useRef<{
    whitePiece: THREE.MeshStandardMaterial;
    blackPiece: THREE.MeshStandardMaterial;
    goldTrim: THREE.MeshStandardMaterial;
    silverTrim: THREE.MeshStandardMaterial;
    manaCyan: THREE.MeshBasicMaterial;
    manaRuby: THREE.MeshBasicMaterial;
    tileLight: THREE.MeshStandardMaterial;
    tileDark: THREE.MeshStandardMaterial;
    tileSelected: THREE.MeshStandardMaterial;
    tileDest: THREE.MeshStandardMaterial;
    tileLastMove: THREE.MeshStandardMaterial;
    tileCheck: THREE.MeshStandardMaterial;
    woodBorder: THREE.MeshStandardMaterial;
  } | null>(null);

  // Camera Orbit State
  const orbitRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    rotY: playerColor === 'w' ? 0 : Math.PI,
    rotX: 0.65, // ~37 degrees elevation: clear view of piece tops and board
    zoom: 18.0
  });

  // Convert board coordinate (file 0-7, rank 0-7) to 3D world (x, z)
  const tileSize = 1.6;
  const coordToWorld = (file: number, rank: number) => {
    const x = (file - 3.5) * tileSize;
    const z = (3.5 - rank) * tileSize;
    return { x, z };
  };

  const squareToCoords = (sq: Square) => {
    const file = sq.charCodeAt(0) - 97; // a=0, h=7
    const rank = parseInt(sq[1], 10) - 1; // 1=0, 8=7
    return { file, rank };
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // --- High-Resolution Procedural Textures ---
    const createIvoryTexture = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (ctx) {
        // Base bright warm ivory
        ctx.fillStyle = '#faf8f2';
        ctx.fillRect(0, 0, 512, 512);

        // Soft subtle marble grain
        const img = ctx.getImageData(0, 0, 512, 512);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const n = (Math.random() - 0.5) * 12;
          d[i] = Math.min(255, Math.max(235, d[i] + n));
          d[i + 1] = Math.min(255, Math.max(230, d[i + 1] + n));
          d[i + 2] = Math.min(255, Math.max(220, d[i + 2] + n));
        }
        ctx.putImageData(img, 0, 0);

        // Very faint golden veins
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
        ctx.lineWidth = 3;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          let x = Math.random() * 512;
          let y = 0;
          ctx.moveTo(x, y);
          while (y < 512) {
            x += (Math.random() - 0.5) * 40;
            y += 40;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    const createObsidianTexture = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (ctx) {
        // Rich deep obsidian / charcoal black
        ctx.fillStyle = '#1c1b20';
        ctx.fillRect(0, 0, 512, 512);

        const img = ctx.getImageData(0, 0, 512, 512);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const n = (Math.random() - 0.5) * 16;
          d[i] = Math.min(255, Math.max(16, d[i] + n));
          d[i + 1] = Math.min(255, Math.max(15, d[i + 1] + n));
          d[i + 2] = Math.min(255, Math.max(22, d[i + 2] + n));
        }
        ctx.putImageData(img, 0, 0);

        // Faint silver striations
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
        ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          let x = Math.random() * 512;
          let y = 0;
          ctx.moveTo(x, y);
          while (y < 512) {
            x += (Math.random() - 0.5) * 30;
            y += 35;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    // Realistic Materials:
    // White pieces: Radiant, gleaming Polished Ivory Marble with warm luster
    const ivoryTex = createIvoryTexture();
    const obsidianTex = createObsidianTexture();

    materialsRef.current = {
      whitePiece: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: ivoryTex,
        roughness: 0.18,
        metalness: 0.08,
      }),
      blackPiece: new THREE.MeshStandardMaterial({
        color: 0x1e1e24,
        map: obsidianTex,
        roughness: 0.28,
        metalness: 0.22,
      }),
      goldTrim: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.22,
        metalness: 0.85,
      }),
      silverTrim: new THREE.MeshStandardMaterial({
        color: 0xc4cbd4,
        roughness: 0.25,
        metalness: 0.8,
      }),
      manaCyan: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      manaRuby: new THREE.MeshBasicMaterial({ color: 0xf43f5e }),
      tileLight: new THREE.MeshStandardMaterial({
        color: 0xf8fafc, // Bright, distinct light square
        roughness: 0.4,
        metalness: 0.04,
      }),
      tileDark: new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Rich deep dark slate square (high contrast!)
        roughness: 0.55,
        metalness: 0.12,
      }),
      tileSelected: new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.2,
        metalness: 0.6,
        emissive: 0xd97706,
        emissiveIntensity: 0.8,
      }),
      tileDest: new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.25,
        metalness: 0.5,
        emissive: 0x0284c7,
        emissiveIntensity: 0.7,
      }),
      tileLastMove: new THREE.MeshStandardMaterial({
        color: 0x818cf8,
        roughness: 0.35,
        metalness: 0.3,
        emissive: 0x4f46e5,
        emissiveIntensity: 0.4,
      }),
      tileCheck: new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.3,
        metalness: 0.4,
        emissive: 0xb91c1c,
        emissiveIntensity: 0.8,
      }),
      woodBorder: new THREE.MeshStandardMaterial({
        color: 0x181410,
        roughness: 0.6,
        metalness: 0.15,
      })
    };

    // --- BRIGHT, CRISP, MULTI-POINT ILLUMINATION (NO DARK OR MUDDY SHADOWS) ---
    // Ambient light: 2.8 intensity illuminates all sides clearly
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.8);
    scene.add(ambientLight);

    // Warm Sun Key Light
    const sunKeyLight = new THREE.DirectionalLight(0xfffae8, 3.8);
    sunKeyLight.position.set(6, 26, 14);
    sunKeyLight.castShadow = true;
    sunKeyLight.shadow.mapSize.width = 2048;
    sunKeyLight.shadow.mapSize.height = 2048;
    sunKeyLight.shadow.bias = -0.0003;
    scene.add(sunKeyLight);

    // Cool Sky Fill Light
    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 2.4);
    fillLight.position.set(-10, 20, -10);
    scene.add(fillLight);

    // Warm Golden Rim Light
    const goldRimLight = new THREE.DirectionalLight(0xfef08a, 2.2);
    goldRimLight.position.set(0, 16, -14);
    scene.add(goldRimLight);

    // Soft overhead center spot
    const centerSpot = new THREE.SpotLight(0xffffff, 2.0, 30, Math.PI / 3, 0.4, 1);
    centerSpot.position.set(0, 18, 0);
    scene.add(centerSpot);

    // Build the 8x8 Board & Plinth
    buildBoardMesh(scene);

    // Selection floating ground rune ring
    const haloGeom = new THREE.RingGeometry(0.55, 0.72, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(0, -999, 0); // hidden initially
    scene.add(halo);
    selectedHaloRef.current = halo;

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Camera positioning based on orbit state
      const { rotY, rotX, zoom } = orbitRef.current;
      const camY = Math.sin(rotX) * zoom;
      const camXZ = Math.cos(rotX) * zoom;
      const camX = Math.sin(rotY) * camXZ;
      const camZ = Math.cos(rotY) * camXZ;

      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, 0.3, 0);

      // Pulse the selection halo
      if (selectedHaloRef.current && selectedHaloRef.current.position.y > -100) {
        selectedHaloRef.current.rotation.z += 0.02;
        const scale = 1 + Math.sin(elapsedTime * 4) * 0.05;
        selectedHaloRef.current.scale.set(scale, scale, scale);
      }

      // Pulse destination markers
      markerMeshesRef.current.forEach((m, idx) => {
        const bounce = Math.sin(elapsedTime * 5 + idx * 0.4) * 0.04;
        m.position.y = 0.22 + bounce;
      });

      renderer.render(scene, camera);
    };

    animate();

    // =====================================================================
    // ROBUST CLICK & DRAG EVENT SYSTEM (POINTER EVENTS - MOUSE & TOUCH SAFE)
    // =====================================================================
    let pointerDownPos = { x: 0, y: 0 };
    let pointerDownTime = 0;
    let isPointerDown = false;

    const onPointerDown = (e: PointerEvent) => {
      // Allow only primary button or touch
      if (e.button !== 0 && e.button !== 2) return;
      isPointerDown = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      pointerDownTime = Date.now();
      orbitRef.current.prevX = e.clientX;
      orbitRef.current.prevY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const dx = e.clientX - orbitRef.current.prevX;
      const dy = e.clientY - orbitRef.current.prevY;
      const distFromStart = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);

      // Only enter dragging mode if user has clearly moved beyond click threshold (10px)
      if (distFromStart > 10) {
        orbitRef.current.isDragging = true;
        orbitRef.current.rotY += dx * 0.007;
        orbitRef.current.rotX = Math.max(0.2, Math.min(1.4, orbitRef.current.rotX + dy * 0.007));
      }

      orbitRef.current.prevX = e.clientX;
      orbitRef.current.prevY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isPointerDown) return;
      isPointerDown = false;

      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      const elapsed = Date.now() - pointerDownTime;
      orbitRef.current.isDragging = false;

      // IF USER CLICKED (distance < 14px and time < 700ms), HANDLE SQUARE COMMAND!
      if (dist < 14 && elapsed < 700) {
        handlePointerRaycast(e.clientX, e.clientY);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRef.current.zoom = Math.max(10, Math.min(28, orbitRef.current.zoom + e.deltaY * 0.015));
    };

    // Central Raycast Handler: Hits 3D pieces, markers, tiles, OR mathematically calculates square from plane!
    const handlePointerRaycast = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Layer 1: Collect piece child meshes and active destination markers
      const meshTargets: THREE.Object3D[] = [];
      markerMeshesRef.current.forEach((m) => meshTargets.push(m));
      tileMeshesRef.current.forEach((t) => meshTargets.push(t));
      pieceMeshesRef.current.forEach((group) => {
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            meshTargets.push(child);
          }
        });
      });

      const intersects = raycaster.intersectObjects(meshTargets, false);
      let detectedSquare: Square | null = null;

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData && hit.userData.square) {
          detectedSquare = hit.userData.square as Square;
        } else {
          // Traverse up hierarchy
          let curr: THREE.Object3D | null = hit.parent;
          while (curr && !detectedSquare) {
            if (curr.userData && curr.userData.square) {
              detectedSquare = curr.userData.square as Square;
            }
            curr = curr.parent;
          }
        }
      }

      // Layer 2: If ray missed piece mesh or clicked near square edge, calculate exact square from board plane!
      if (!detectedSquare) {
        const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);
        const hitPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(boardPlane, hitPoint)) {
          const file = Math.round(hitPoint.x / tileSize + 3.5);
          const rank = Math.round(3.5 - hitPoint.z / tileSize);
          if (file >= 0 && file <= 7 && rank >= 0 && rank <= 7) {
            detectedSquare = `${String.fromCharCode(97 + file)}${rank + 1}` as Square;
          }
        }
      }

      if (detectedSquare) {
        onSquareClickRef.current(detectedSquare);
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, []);

  // Board construction helper
  const buildBoardMesh = (scene: THREE.Scene) => {
    const mats = materialsRef.current!;

    // Outer Wooden / Basalt plinth base
    const baseGeom = new THREE.BoxGeometry(14.8, 0.8, 14.8);
    const baseMesh = new THREE.Mesh(baseGeom, mats.woodBorder);
    baseMesh.position.y = -0.45;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    // Gilded beveled trim ring
    const goldTrimGeom = new THREE.BoxGeometry(13.8, 0.16, 13.8);
    const goldTrim = new THREE.Mesh(goldTrimGeom, mats.goldTrim);
    goldTrim.position.y = -0.04;
    scene.add(goldTrim);

    // 64 Individual Tiles with high contrast
    tileMeshesRef.current.clear();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const sq = `${files[f]}${r + 1}` as Square;
        const isDark = (f + r) % 2 === 0;

        const tileGeom = new THREE.BoxGeometry(tileSize * 0.985, 0.22, tileSize * 0.985);
        const tileMesh = new THREE.Mesh(tileGeom, isDark ? mats.tileDark : mats.tileLight);

        const { x, z } = coordToWorld(f, r);
        tileMesh.position.set(x, 0, z);
        tileMesh.receiveShadow = true;
        tileMesh.userData = { square: sq, isDark };

        scene.add(tileMesh);
        tileMeshesRef.current.set(sq, tileMesh);
      }
    }
  };

  // Update Tile Highlights, Selected Halo & 3D Destination Markers
  useEffect(() => {
    const mats = materialsRef.current;
    if (!mats) return;

    // Update tile colors
    tileMeshesRef.current.forEach((tile, sq) => {
      const isDark = tile.userData.isDark;
      let targetMat = isDark ? mats.tileDark : mats.tileLight;

      if (sq === selectedSquare) {
        targetMat = mats.tileSelected;
      } else if (validDestinations.includes(sq)) {
        targetMat = mats.tileDest;
      } else if (lastMove && (sq === lastMove.from || sq === lastMove.to)) {
        targetMat = mats.tileLastMove;
      } else if (isCheck) {
        const piece = game.get(sq);
        if (piece && piece.type === 'k' && piece.color === game.turn()) {
          targetMat = mats.tileCheck;
        }
      }

      tile.material = targetMat;
    });

    // Update floating selection halo under selected piece
    if (selectedHaloRef.current) {
      if (selectedSquare) {
        const coords = squareToCoords(selectedSquare);
        const { x, z } = coordToWorld(coords.file, coords.rank);
        selectedHaloRef.current.position.set(x, 0.12, z);
      } else {
        selectedHaloRef.current.position.set(0, -999, 0);
      }
    }

    // Render prominent glowing destination markers in 3D
    const scene = sceneRef.current;
    if (scene) {
      markerMeshesRef.current.forEach((m) => scene.remove(m));
      markerMeshesRef.current = [];

      validDestinations.forEach((destSq) => {
        const coords = squareToCoords(destSq);
        const { x, z } = coordToWorld(coords.file, coords.rank);
        const targetPiece = game.get(destSq);

        const markerGroup = new THREE.Group();

        if (targetPiece) {
          // Capture target: Radiant Red Ring & pulsing core
          const ringGeom = new THREE.TorusGeometry(0.68, 0.08, 16, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.95,
          });
          const ring = new THREE.Mesh(ringGeom, ringMat);
          ring.rotation.x = Math.PI / 2;
          markerGroup.add(ring);
        } else {
          // Free destination: Luminous Cyan Target Disc & Ring
          const discGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 24);
          const discMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.9,
          });
          const disc = new THREE.Mesh(discGeom, discMat);
          markerGroup.add(disc);

          const ringGeom = new THREE.TorusGeometry(0.55, 0.035, 12, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0x7dd3fc,
            transparent: true,
            opacity: 0.8,
          });
          const ring = new THREE.Mesh(ringGeom, ringMat);
          ring.rotation.x = Math.PI / 2;
          markerGroup.add(ring);
        }

        markerGroup.position.set(x, 0.22, z);
        markerGroup.userData = { square: destSq };

        // Tag children
        markerGroup.traverse((child) => {
          child.userData = { square: destSq };
        });

        scene.add(markerGroup as unknown as THREE.Mesh);
        markerMeshesRef.current.push(markerGroup as unknown as THREE.Mesh);
      });
    }

    // Elevate selected piece gently into the air to make selection unmistakable
    pieceMeshesRef.current.forEach((group, sq) => {
      const isSelected = sq === selectedSquare;
      const targetY = isSelected ? 0.38 : 0.1;
      group.position.y = targetY;
    });
  }, [selectedSquare, validDestinations, lastMove, isCheck, game]);

  // Synchronize 3D Pieces on Board
  useEffect(() => {
    const scene = sceneRef.current;
    const mats = materialsRef.current;
    if (!scene || !mats) return;

    // Remove existing pieces
    pieceMeshesRef.current.forEach((group) => {
      scene.remove(group);
    });
    pieceMeshesRef.current.clear();

    const board = game.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        // In chess.js, board[0] is rank 8, board[7] is rank 1
        const fileIdx = c;
        const rankIdx = 7 - r;
        const fileChar = String.fromCharCode(97 + fileIdx);
        const rankChar = (rankIdx + 1).toString();
        const sq = `${fileChar}${rankChar}` as Square;

        const pieceGroup = createMasterpiece3DPiece(piece.type, piece.color, mats);
        const { x, z } = coordToWorld(fileIdx, rankIdx);

        pieceGroup.position.set(x, 0.1, z);
        pieceGroup.userData = { square: sq, type: piece.type, color: piece.color };

        // Tag every child mesh so clicking ANY part of the piece immediately selects its square
        pieceGroup.traverse((child) => {
          child.userData.square = sq;
          child.userData.pieceColor = piece.color;
          child.userData.pieceType = piece.type;
        });

        scene.add(pieceGroup);
        pieceMeshesRef.current.set(sq, pieceGroup);
      }
    }
  }, [game.fen()]);

  // =========================================================================
  // LUXURY REALISTIC STAUNTON & GRANDMASTER 3D PIECES (SMOOTH, POLISHED, HIGH-DETAIL)
  // =========================================================================
  const createMasterpiece3DPiece = (
    type: PieceType,
    color: PieceColor,
    mats: NonNullable<typeof materialsRef.current>
  ): THREE.Group => {
    const group = new THREE.Group();
    const isWhite = color === 'w';
    const mainMat = isWhite ? mats.whitePiece : mats.blackPiece;
    const trimMat = isWhite ? mats.goldTrim : mats.silverTrim;
    const manaMat = isWhite ? mats.manaCyan : mats.manaRuby;

    // 1. Classical Weighted Lathe-Style Pedestal Base (Common to all pieces, scaled by rank)
    const baseRadius = type === 'p' ? 0.52 : type === 'k' || type === 'q' ? 0.65 : 0.58;

    // Bottom chamfer foot disc
    const baseFoot = new THREE.Mesh(
      new THREE.CylinderGeometry(baseRadius * 0.95, baseRadius, 0.14, 32),
      mainMat
    );
    baseFoot.position.y = 0.07;
    baseFoot.castShadow = true;
    baseFoot.receiveShadow = true;
    group.add(baseFoot);

    // Gilded filigree accent ring
    const baseGildedRing = new THREE.Mesh(
      new THREE.TorusGeometry(baseRadius * 0.92, 0.04, 16, 32),
      trimMat
    );
    baseGildedRing.rotation.x = Math.PI / 2;
    baseGildedRing.position.y = 0.14;
    group.add(baseGildedRing);

    // Stepped pedestal collar
    const baseCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(baseRadius * 0.72, baseRadius * 0.9, 0.18, 32),
      mainMat
    );
    baseCollar.position.y = 0.23;
    baseCollar.castShadow = true;
    group.add(baseCollar);

    switch (type) {
      case 'p': {
        // --- AUTHENTIC REALISTIC TOURNAMENT PAWN ---
        // Smooth flared waist column
        const waist = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, baseRadius * 0.68, 0.52, 32),
          mainMat
        );
        waist.position.y = 0.58;
        waist.castShadow = true;
        group.add(waist);

        // Lower neck ring
        const neckRing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.28, 0.07, 32),
          trimMat
        );
        neckRing.position.y = 0.86;
        neckRing.castShadow = true;
        group.add(neckRing);

        // Pristine, smooth spherical pawn head
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 32, 24),
          mainMat
        );
        head.position.y = 1.18;
        head.castShadow = true;
        group.add(head);

        // Elegant golden finial pip atop the pawn head
        const crownPip = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 16, 16),
          trimMat
        );
        crownPip.position.y = 1.5;
        crownPip.castShadow = true;
        group.add(crownPip);
        break;
      }

      case 'n': {
        // --- REALISTIC SCULPTED WARHORSE KNIGHT ---
        // Lower flared body
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, baseRadius * 0.72, 0.52, 32),
          mainMat
        );
        body.position.y = 0.55;
        body.castShadow = true;
        group.add(body);

        // Arched muscular horse neck
        const neckLower = new THREE.Mesh(
          new THREE.BoxGeometry(0.36, 0.44, 0.42),
          mainMat
        );
        neckLower.position.set(0, 0.88, isWhite ? 0.08 : -0.08);
        neckLower.rotation.x = isWhite ? -0.32 : 0.32;
        neckLower.castShadow = true;
        group.add(neckLower);

        const neckUpper = new THREE.Mesh(
          new THREE.BoxGeometry(0.33, 0.48, 0.38),
          mainMat
        );
        neckUpper.position.set(0, 1.2, isWhite ? 0.2 : -0.2);
        neckUpper.rotation.x = isWhite ? -0.58 : 0.58;
        neckUpper.castShadow = true;
        group.add(neckUpper);

        // Head and Muzzle
        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.36, 0.44),
          mainMat
        );
        head.position.set(0, 1.42, isWhite ? 0.4 : -0.4);
        head.rotation.x = isWhite ? 0.22 : -0.22;
        head.castShadow = true;
        group.add(head);

        const muzzle = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.24, 0.36),
          mainMat
        );
        muzzle.position.set(0, 1.3, isWhite ? 0.65 : -0.65);
        muzzle.rotation.x = isWhite ? 0.45 : -0.45;
        muzzle.castShadow = true;
        group.add(muzzle);

        // Steed pointed ears
        const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26, 12), mainMat);
        leftEar.position.set(0.12, 1.68, isWhite ? 0.28 : -0.28);
        leftEar.rotation.set(isWhite ? -0.2 : 0.2, 0, 0.2);
        group.add(leftEar);

        const rightEar = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26, 12), mainMat);
        rightEar.position.set(-0.12, 1.68, isWhite ? 0.28 : -0.28);
        rightEar.rotation.set(isWhite ? -0.2 : 0.2, 0, -0.2);
        group.add(rightEar);

        // Gilded Mane Crest
        for (let i = 0; i < 4; i++) {
          const manePlume = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 12), trimMat);
          manePlume.position.set(0, 1.05 + i * 0.15, isWhite ? 0.05 - i * 0.06 : -0.05 + i * 0.06);
          manePlume.rotation.x = isWhite ? -0.8 : 0.8;
          group.add(manePlume);
        }

        // Glowing Steed Eyes
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), manaMat);
        eyeL.position.set(0.16, 1.44, isWhite ? 0.52 : -0.52);
        group.add(eyeL);

        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), manaMat);
        eyeR.position.set(-0.16, 1.44, isWhite ? 0.52 : -0.52);
        group.add(eyeR);
        break;
      }

      case 'b': {
        // --- REALISTIC CATHEDRAL INQUISITOR BISHOP ---
        // Slender flared column
        const column = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, baseRadius * 0.72, 0.85, 32),
          mainMat
        );
        column.position.y = 0.72;
        column.castShadow = true;
        group.add(column);

        // Gilded clerical sash ring
        const sash = new THREE.Mesh(
          new THREE.CylinderGeometry(0.34, 0.32, 0.08, 32),
          trimMat
        );
        sash.position.y = 1.15;
        group.add(sash);

        // Miter headdress with authentic diagonal cleft cut
        const miter = new THREE.Mesh(
          new THREE.ConeGeometry(0.36, 0.75, 32),
          mainMat
        );
        miter.position.y = 1.55;
        miter.castShadow = true;
        group.add(miter);

        // Cross-cleft with mana illumination
        const cleftLine = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.42, 0.38),
          manaMat
        );
        cleftLine.position.set(0, 1.55, 0);
        cleftLine.rotation.y = Math.PI / 4;
        group.add(cleftLine);

        // Gilded Cross finial sphere
        const crossSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 16, 16),
          trimMat
        );
        crossSphere.position.y = 1.96;
        crossSphere.castShadow = true;
        group.add(crossSphere);
        break;
      }

      case 'r': {
        // --- REALISTIC FORTIFIED BASTION ROOK ---
        // Fluted tower body
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.48, baseRadius * 0.78, 1.0, 32),
          mainMat
        );
        tower.position.y = 0.78;
        tower.castShadow = true;
        group.add(tower);

        // Overhanging corbelled parapet ring
        const corbel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.66, 0.48, 0.22, 32),
          mainMat
        );
        corbel.position.y = 1.34;
        corbel.castShadow = true;
        group.add(corbel);

        const corbelRim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.68, 0.68, 0.06, 32),
          trimMat
        );
        corbelRim.position.y = 1.45;
        group.add(corbelRim);

        // 4 Battlements (Crenellations)
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2 + Math.PI / 4;
          const battlement = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.22, 0.16),
            mainMat
          );
          battlement.position.set(Math.cos(angle) * 0.54, 1.58, Math.sin(angle) * 0.54);
          battlement.rotation.y = angle;
          battlement.castShadow = true;
          group.add(battlement);
        }

        // Inner crown jewel
        const innerJewel = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 16, 16),
          manaMat
        );
        innerJewel.position.y = 1.56;
        group.add(innerJewel);
        break;
      }

      case 'q': {
        // --- REALISTIC ROYAL ARCHCHANCELLOR QUEEN ---
        // Flared cathedral royal gown
        const gown = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, baseRadius * 0.8, 1.15, 32),
          mainMat
        );
        gown.position.y = 0.86;
        gown.castShadow = true;
        group.add(gown);

        // Royal waist sash ring
        const sash = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.38, 0.08, 32),
          trimMat
        );
        sash.position.y = 1.44;
        group.add(sash);

        // Queen's Coronet Crown with 8 Spires
        const coronet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.34, 0.28, 32),
          trimMat
        );
        coronet.position.y = 1.62;
        coronet.castShadow = true;
        group.add(coronet);

        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          const spire = new THREE.Mesh(
            new THREE.ConeGeometry(0.06, 0.26, 12),
            trimMat
          );
          spire.position.set(Math.cos(angle) * 0.42, 1.88, Math.sin(angle) * 0.42);
          spire.castShadow = true;
          group.add(spire);
        }

        // Sovereignty mana jewel orb at the center
        const manaOrb = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 24, 24),
          manaMat
        );
        manaOrb.position.y = 1.95;
        group.add(manaOrb);
        break;
      }

      case 'k': {
        // --- REALISTIC CROWNED MONARCH KING ---
        // Stately royal robe column
        const mantle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, baseRadius * 0.82, 1.25, 32),
          mainMat
        );
        mantle.position.y = 0.92;
        mantle.castShadow = true;
        group.add(mantle);

        // Double gilded mantle trim
        const mantleTrim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.44, 0.44, 0.09, 32),
          trimMat
        );
        mantleTrim.position.y = 1.54;
        group.add(mantleTrim);

        // Imperial Crown base
        const crownBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.38, 0.32, 32),
          trimMat
        );
        crownBase.position.y = 1.74;
        crownBase.castShadow = true;
        group.add(crownBase);

        // Imperial Cross Finial atop Crown
        const crossV = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.34, 0.08),
          trimMat
        );
        crossV.position.y = 2.05;
        crossV.castShadow = true;
        group.add(crossV);

        const crossH = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.08, 0.08),
          trimMat
        );
        crossH.position.y = 2.08;
        crossH.castShadow = true;
        group.add(crossH);
        break;
      }
    }

    return group;
  };

  const handleResetCamera = (view: 'perspective' | 'top-down' | 'side') => {
    setCameraView(view);
    if (view === 'perspective') {
      orbitRef.current.rotY = playerColor === 'w' ? 0 : Math.PI;
      orbitRef.current.rotX = 0.65;
      orbitRef.current.zoom = 18.0;
    } else if (view === 'top-down') {
      orbitRef.current.rotY = playerColor === 'w' ? 0 : Math.PI;
      orbitRef.current.rotX = 1.42;
      orbitRef.current.zoom = 15.5;
    } else {
      orbitRef.current.rotY = Math.PI / 2;
      orbitRef.current.rotX = 0.55;
      orbitRef.current.zoom = 18.5;
    }
  };

  return (
    <div className="relative w-full h-[520px] sm:h-[600px] md:h-[680px] rounded-2xl overflow-hidden border-2 border-[#d4af37]/40 shadow-[0_24px_64px_rgba(0,0,0,0.95)] bg-[#12161f]">
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-pointer active:cursor-grabbing select-none"
        title="Click piece & square to command"
      />

      {/* Floating Tactical Overlay Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-3 py-1.5 rounded-lg bg-[#0c0e11]/90 backdrop-blur-md border border-[#d4af37]/50 text-xs font-geist uppercase tracking-wider text-[#e2e2e6] flex items-center gap-2 shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-pulse" />
            <span className="font-semibold text-[#facc15]">Grandmaster 3D Arena</span>
          </div>

          {selectedSquare && (
            <div className="px-3 py-1.5 rounded-lg bg-[#f59e0b]/20 border border-[#f59e0b]/70 backdrop-blur-md text-xs font-geist font-bold text-[#fef08a] flex items-center gap-1.5 shadow-lg animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>Piece {selectedSquare.toUpperCase()} Ready</span>
            </div>
          )}
        </div>

        {/* View Angles & Reset Button */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#0c0e11]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#d4af37]/40 shadow-2xl">
          <button
            onClick={() => handleResetCamera('perspective')}
            className={`px-3 py-1 rounded-lg text-xs font-geist font-medium transition-all flex items-center gap-1.5 ${
              cameraView === 'perspective'
                ? 'bg-[#f59e0b]/20 border border-[#f59e0b] text-[#fef08a]'
                : 'text-[#d0c5af] hover:text-white'
            }`}
            title="Player Perspective"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Player</span>
          </button>
          <button
            onClick={() => handleResetCamera('top-down')}
            className={`px-3 py-1 rounded-lg text-xs font-geist font-medium transition-all flex items-center gap-1.5 ${
              cameraView === 'top-down'
                ? 'bg-[#f59e0b]/20 border border-[#f59e0b] text-[#fef08a]'
                : 'text-[#d0c5af] hover:text-white'
            }`}
            title="Top-down Strategic View"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Top</span>
          </button>
          <button
            onClick={() => {
              orbitRef.current.zoom = Math.max(10, orbitRef.current.zoom - 2);
            }}
            className="p-1.5 text-[#d0c5af] hover:text-[#f59e0b] transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              orbitRef.current.zoom = Math.min(26, orbitRef.current.zoom + 2);
            }}
            className="p-1.5 text-[#d0c5af] hover:text-[#f59e0b] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Hint HUD */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-[#d0c5af] font-geist pointer-events-none bg-[#0c0e11]/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-[#4d4635]/40">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span>Click any piece to select &bull; Click highlighted square to move &bull; Drag to rotate</span>
        </span>
        <span className="hidden sm:inline-block uppercase tracking-wider text-[#f59e0b] font-semibold">
          High-Contrast Ivory &amp; Obsidian &bull; Studio Lighting
        </span>
      </div>
    </div>
  );
};
