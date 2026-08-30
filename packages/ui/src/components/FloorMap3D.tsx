import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  Grid,
} from 'lucide-react';

export type TableStatus3D = 'available' | 'occupied' | 'reserved' | 'dirty';

export interface FloorTable3DData {
  id: string;
  number: string;
  label: string;
  sectionId: string;
  sectionName: string;
  capacity: number;
  shape: 'square' | 'round' | 'rectangle' | 'booth' | 'bar' | 'oval' | string;
  status: TableStatus3D;
  orderTotal?: number;
  covers?: number;
  serverName?: string;
  elapsedMinutes?: number;
  position?: [number, number]; // [X, Z]
  rotation?: number; // radians or degrees
}

export type FloorMaterialTheme = 'hardwood' | 'marble' | 'slate' | 'deck' | 'minimal';

export interface FloorMap3DProps {
  tables: FloorTable3DData[];
  selectedTableId?: string | null;
  onSelectTable?: (table: FloorTable3DData) => void;
  className?: string;
  height?: number | string;
  editMode?: boolean;
  floorTheme?: FloorMaterialTheme;
  floorDimensions?: { width: number; depth: number };
  customPositions?: Record<string, { x: number; z: number; rotation?: number }>;
  onUpdateTablePosition?: (tableId: string, x: number, z: number, rotation?: number) => void;
}

// Color palette for 3D materials
const STATUS_COLORS: Record<TableStatus3D, { primary: number; glow: number; text: string }> = {
  available: { primary: 0x10b981, glow: 0x34d399, text: '#10b981' },
  occupied:  { primary: 0xf59e0b, glow: 0xfbbf24, text: '#f59e0b' },
  reserved:  { primary: 0x6366f1, glow: 0x818cf8, text: '#6366f1' },
  dirty:     { primary: 0xf43f5e, glow: 0xfb7185, text: '#f43f5e' },
};

// Default spatial layout positions in 3D coordinate space [X, Z]
const DEFAULT_POSITIONS: Record<string, [number, number]> = {
  // Main Dining (Center Area)
  'tbl-1':  [-8, -5],
  'tbl-2':  [-3, -5],
  'tbl-3':  [2, -5],
  'tbl-4':  [-5.5, 0],
  'tbl-5':  [0, 0],
  'tbl-b1': [-9, 5],
  'tbl-b2': [-4, 5],

  // Patio (Right Area)
  'tbl-p1': [8, -6],
  'tbl-p2': [13, -6],
  'tbl-p3': [8, 0],
  'tbl-p4': [13, 0],

  // Bar & Lounge (Left Area)
  'tbl-bar1': [-14, -6],
  'tbl-bar2': [-14, -2],
  'tbl-bar3': [-14, 3],

  // VIP Suite (Top Right)
  'tbl-vip1': [9, 6],
};

const THEME_STYLES: Record<FloorMaterialTheme, { color: number; roughness: number; metalness: number; gridPrimary: number; gridSecondary: number }> = {
  minimal:  { color: 0xf8fafc, roughness: 0.9, metalness: 0.05, gridPrimary: 0xe2e8f0, gridSecondary: 0xf1f5f9 },
  hardwood: { color: 0xdfc5a6, roughness: 0.45, metalness: 0.1,  gridPrimary: 0xc8a984, gridSecondary: 0xe8d7c1 },
  marble:   { color: 0xffffff, roughness: 0.15, metalness: 0.25, gridPrimary: 0xd1d5db, gridSecondary: 0xf3f4f6 },
  slate:    { color: 0x334155, roughness: 0.7,  metalness: 0.15, gridPrimary: 0x475569, gridSecondary: 0x1e293b },
  deck:     { color: 0x9a6b46, roughness: 0.6,  metalness: 0.05, gridPrimary: 0x7c4f2a, gridSecondary: 0xb5855e },
};

export function FloorMap3D({
  tables,
  selectedTableId,
  onSelectTable,
  className = '',
  height = '580px',
  editMode = false,
  floorTheme = 'minimal',
  floorDimensions = { width: 50, depth: 40 },
  customPositions = {},
  onUpdateTablePosition,
}: FloorMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hoveredTable, setHoveredTable] = useState<FloorTable3DData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingTable, setIsDraggingTable] = useState(false);
  const [activeCoords, setActiveCoords] = useState<{ x: number; z: number } | null>(null);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const tableMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const haloMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const animFrameIdRef = useRef<number | null>(null);
  const groundPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  // Camera Orbit Controls state
  const isOrbitingRef = useRef(false);
  const isDraggingTableRef = useRef(false);
  const activeDragIdRef = useRef<string | null>(null);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraAnglesRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 36 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAnglesRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(
      x + cameraTargetRef.current.x,
      y + cameraTargetRef.current.y,
      z + cameraTargetRef.current.z
    );
    cameraRef.current.lookAt(cameraTargetRef.current);
  }, []);

  const resetCamera = useCallback(() => {
    cameraAnglesRef.current = { theta: 0.45, phi: 0.85, radius: 36 };
    cameraTargetRef.current.set(0, 0, 0);
    updateCameraPosition();
  }, [updateCameraPosition]);

  const setTopDownView = useCallback(() => {
    cameraAnglesRef.current = { theta: 0, phi: 0.05, radius: 42 };
    cameraTargetRef.current.set(0, 0, 0);
    updateCameraPosition();
  }, [updateCameraPosition]);

  const setIsometricView = useCallback(() => {
    cameraAnglesRef.current = { theta: Math.PI / 4, phi: Math.PI / 3.2, radius: 36 };
    cameraTargetRef.current.set(0, 0, 0);
    updateCameraPosition();
  }, [updateCameraPosition]);

  const zoomIn = () => {
    cameraAnglesRef.current.radius = Math.max(14, cameraAnglesRef.current.radius - 4);
    updateCameraPosition();
  };

  const zoomOut = () => {
    cameraAnglesRef.current.radius = Math.min(65, cameraAnglesRef.current.radius + 4);
    updateCameraPosition();
  };

  // Build / Update Three.js Scene Environment
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // 1. Scene & Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(floorTheme === 'slate' ? 0x0f172a : 0xf8f9fa);
    scene.fog = new THREE.FogExp2(floorTheme === 'slate' ? 0x0f172a : 0xf8f9fa, 0.015);
    sceneRef.current = scene;

    const width = container.clientWidth;
    const heightPx = typeof height === 'number' ? height : container.clientHeight || 580;

    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    cameraRef.current = camera;
    resetCamera();

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 2. Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, floorTheme === 'slate' ? 0.95 : 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 1.3);
    dirLight1.position.set(22, 38, 22);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.camera.near = 0.5;
    dirLight1.shadow.camera.far = 120;
    dirLight1.shadow.camera.left = -30;
    dirLight1.shadow.camera.right = 30;
    dirLight1.shadow.camera.top = 30;
    dirLight1.shadow.camera.bottom = -30;
    dirLight1.shadow.bias = -0.0005;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xdbeafe, 0.45);
    dirLight2.position.set(-22, 22, -22);
    scene.add(dirLight2);

    // 3. Architectural Floor Grid & Room Base
    const themeStyle = THEME_STYLES[floorTheme] || THEME_STYLES.minimal;
    const floorGeo = new THREE.PlaneGeometry(floorDimensions.width, floorDimensions.depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: themeStyle.color,
      roughness: themeStyle.roughness,
      metalness: themeStyle.metalness,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.01;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    floorMeshRef.current = floorMesh;

    // Architectural room grid
    const gridHelper = new THREE.GridHelper(
      Math.max(floorDimensions.width, floorDimensions.depth),
      Math.floor(Math.max(floorDimensions.width, floorDimensions.depth) / 2),
      themeStyle.gridPrimary,
      themeStyle.gridSecondary
    );
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Section dividers (aesthetic architectural glass/wood partition markers)
    const partitionGeo = new THREE.BoxGeometry(0.2, 1.3, Math.min(28, floorDimensions.depth * 0.7));
    const partitionMat = new THREE.MeshStandardMaterial({
      color: floorTheme === 'slate' ? 0x64748b : 0xcbd5e1,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const partition = new THREE.Mesh(partitionGeo, partitionMat);
    partition.position.set(4.5, 0.65, 0);
    partition.receiveShadow = true;
    partition.castShadow = true;
    scene.add(partition);

    // 4. Animation loop for status pulse halos
    let clock = new THREE.Clock();
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      haloMeshesRef.current.forEach((halo) => {
        const pulse = 1 + Math.sin(elapsedTime * 3) * 0.08;
        halo.scale.set(pulse, 1, pulse);
      });

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };
    animFrameIdRef.current = requestAnimationFrame(animate);

    // 5. Window Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newWidth = container.clientWidth;
      const newHeight = typeof height === 'number' ? height : container.clientHeight || 580;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
    };
  }, [height, resetCamera, floorTheme, floorDimensions.width, floorDimensions.depth]);

  // Create or Update 3D Table Meshes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear existing table meshes
    tableMeshesRef.current.forEach((group) => scene.remove(group));
    tableMeshesRef.current.clear();
    haloMeshesRef.current.clear();

    tables.forEach((table, index) => {
      const group = new THREE.Group();
      
      // Determine position from customPositions, table.position, or DEFAULT_POSITIONS fallback
      const custom = customPositions[table.id];
      const posX = custom?.x ?? (table.position ? table.position[0] : (DEFAULT_POSITIONS[table.id]?.[0] ?? ((index % 4) * 6 - 9)));
      const posZ = custom?.z ?? (table.position ? table.position[1] : (DEFAULT_POSITIONS[table.id]?.[1] ?? (Math.floor(index / 4) * 6 - 9)));
      const rotY = (custom?.rotation ?? (typeof table.rotation === 'number' ? table.rotation : 0)) * (Math.PI / 180);

      group.position.set(posX, 0, posZ);
      group.rotation.y = rotY;
      (group as any).userData = { tableId: table.id, tableData: table, posX, posZ, rotY };

      const statusColor = STATUS_COLORS[table.status] || STATUS_COLORS.available;
      const isSelected = selectedTableId === table.id;

      // Halo base status ring (Floor Glow)
      const haloGeo = new THREE.RingGeometry(1.6, editMode ? 2.3 : 2.0, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: isSelected && editMode ? 0x38bdf8 : statusColor.glow,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.45,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = -Math.PI / 2;
      haloMesh.position.y = 0.02;
      group.add(haloMesh);
      haloMeshesRef.current.set(table.id, haloMesh);

      // Table geometry based on shape
      let topGeo: THREE.BufferGeometry;
      const tableHeight = 1.4;

      if (table.shape === 'round') {
        topGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.15, 32);
      } else if (table.shape === 'rectangle') {
        topGeo = new THREE.BoxGeometry(3.2, 0.15, 1.8);
      } else if (table.shape === 'booth') {
        topGeo = new THREE.BoxGeometry(2.6, 0.15, 2.2);
      } else if (table.shape === 'oval') {
        topGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.15, 32);
        topGeo.scale(1.6, 1, 1);
      } else if (table.shape === 'bar') {
        topGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.15, 24);
      } else {
        // default square
        topGeo = new THREE.BoxGeometry(2.0, 0.15, 2.0);
      }

      // Top Material
      const topMat = new THREE.MeshStandardMaterial({
        color: isSelected ? (editMode ? 0x0369a1 : 0x0f172a) : 0x1e293b,
        roughness: 0.3,
        metalness: 0.2,
      });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.position.y = tableHeight;
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      group.add(topMesh);

      // Base Legs
      if (table.shape === 'round' || table.shape === 'bar') {
        const legGeo = new THREE.CylinderGeometry(0.12, 0.12, tableHeight, 16);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.y = tableHeight / 2;
        leg.castShadow = true;
        group.add(leg);

        const baseGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.05, 24);
        const base = new THREE.Mesh(baseGeo, legMat);
        base.position.y = 0.025;
        group.add(base);
      } else {
        const legGeo = new THREE.BoxGeometry(0.1, tableHeight, 0.1);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
        const w = table.shape === 'rectangle' ? 1.4 : 0.8;
        const d = table.shape === 'rectangle' ? 0.7 : 0.8;

        const legOffsets: [number, number][] = [[-w, -d], [w, -d], [-w, d], [w, d]];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(lx, tableHeight / 2, lz);
          leg.castShadow = true;
          group.add(leg);
        });
      }

      // Status Pill Indicator on Top of Table
      const pillGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16);
      const pillMat = new THREE.MeshStandardMaterial({
        color: editMode ? 0x0ea5e9 : statusColor.primary,
        emissive: editMode ? 0x0ea5e9 : statusColor.primary,
        emissiveIntensity: 0.4,
        roughness: 0.1,
      });
      const pill = new THREE.Mesh(pillGeo, pillMat);
      pill.position.y = tableHeight + 0.1;
      group.add(pill);

      scene.add(group);
      tableMeshesRef.current.set(table.id, group);
    });
  }, [tables, selectedTableId, customPositions, editMode]);

  // Raycasting helper to find table at mouse position
  const raycastTable = (clientX: number, clientY: number): { tableData: FloorTable3DData; object: THREE.Object3D } | null => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container || !camera) return null;

    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const meshes: THREE.Object3D[] = [];
    tableMeshesRef.current.forEach((group) => {
      group.children.forEach((child) => meshes.push(child));
    });

    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0 && intersects[0]?.object) {
      let currentObj: THREE.Object3D | null = intersects[0].object;
      while (currentObj && !(currentObj as any).userData?.tableData) {
        currentObj = currentObj.parent;
      }
      if (currentObj && (currentObj as any).userData?.tableData) {
        return {
          tableData: (currentObj as any).userData.tableData,
          object: currentObj,
        };
      }
    }
    return null;
  };

  // Raycasting helper for 3D ground plane intersection (Drag-to-move tables)
  const raycastGroundPosition = (clientX: number, clientY: number): THREE.Vector3 | null => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container || !camera) return null;

    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const target = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(groundPlaneRef.current, target);
    return hit ? target : null;
  };

  // Mouse Interaction (Orbiting & Drag-to-Position)
  const handleMouseDown = (e: React.MouseEvent) => {
    const hit = raycastTable(e.clientX, e.clientY);
    
    if (editMode && hit) {
      // Begin Dragging Table on Ground Plane
      isDraggingTableRef.current = true;
      activeDragIdRef.current = hit.tableData.id;
      setIsDraggingTable(true);
      if (onSelectTable) onSelectTable(hit.tableData);
      return;
    }

    // Otherwise Orbit Camera
    isOrbitingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container || !camera) return;

    // 1. Table Dragging in Edit Mode
    if (isDraggingTableRef.current && activeDragIdRef.current) {
      const groundPos = raycastGroundPosition(e.clientX, e.clientY);
      if (groundPos) {
        // Snap to 0.5m grid step
        const snapX = Math.round(groundPos.x * 2) / 2;
        const snapZ = Math.round(groundPos.z * 2) / 2;
        
        // Clamp inside room boundaries
        const halfW = floorDimensions.width / 2 - 2;
        const halfD = floorDimensions.depth / 2 - 2;
        const clampedX = Math.max(-halfW, Math.min(halfW, snapX));
        const clampedZ = Math.max(-halfD, Math.min(halfD, snapZ));

        setActiveCoords({ x: clampedX, z: clampedZ });

        const meshGroup = tableMeshesRef.current.get(activeDragIdRef.current);
        if (meshGroup) {
          meshGroup.position.x = clampedX;
          meshGroup.position.z = clampedZ;
        }

        if (onUpdateTablePosition) {
          onUpdateTablePosition(activeDragIdRef.current, clampedX, clampedZ);
        }
      }
      return;
    }

    // 2. Camera Orbit Movement
    if (isOrbitingRef.current) {
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      cameraAnglesRef.current.theta -= deltaX * 0.007;
      cameraAnglesRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.05, cameraAnglesRef.current.phi - deltaY * 0.007)
      );

      updateCameraPosition();
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 3. Hover Tooltip
    const hit = raycastTable(e.clientX, e.clientY);
    if (hit) {
      const rect = container.getBoundingClientRect();
      setHoveredTable(hit.tableData);
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      container.style.cursor = editMode ? 'grab' : 'pointer';
    } else {
      setHoveredTable(null);
      container.style.cursor = 'default';
    }
  };

  const handleMouseUp = () => {
    isOrbitingRef.current = false;
    isDraggingTableRef.current = false;
    activeDragIdRef.current = null;
    setIsDraggingTable(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDraggingTable) return;
    const hit = raycastTable(e.clientX, e.clientY);
    if (hit && onSelectTable) {
      onSelectTable(hit.tableData);
    }
  };

  const handleRotateSelected = () => {
    if (!selectedTableId || !onUpdateTablePosition) return;
    const currentPos = customPositions[selectedTableId];
    const currentRot = currentPos?.rotation ?? 0;
    const newRot = (currentRot + 45) % 360;
    const currentX = currentPos?.x ?? 0;
    const currentZ = currentPos?.z ?? 0;
    onUpdateTablePosition(selectedTableId, currentX, currentZ, newRot);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-2xl border border-border bg-slate-50 select-none shadow-inner ${className}`}
      style={{ height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Mode Indicator & Header Banner */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        {editMode ? (
          <div className="bg-sky-950/95 text-sky-200 backdrop-blur-md border border-sky-500/40 rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-2.5 text-xs font-black tracking-wider uppercase">
            <Move className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>3D Floor Editor Active</span>
            <span className="bg-sky-500/30 text-sky-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
              Drag Tables to Position
            </span>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-xs border border-border rounded-xl p-2.5 shadow-sm flex items-center gap-3 text-[10px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
              <span className="text-muted-foreground uppercase">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
              <span className="text-muted-foreground uppercase">Occupied</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs" />
              <span className="text-muted-foreground uppercase">Reserved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs animate-pulse" />
              <span className="text-muted-foreground uppercase">Dirty</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Coordinate Badge during Drag */}
      {isDraggingTable && activeCoords && (
        <div className="absolute top-4 right-4 bg-slate-900/90 text-white font-mono text-xs px-3 py-1.5 rounded-xl border border-sky-400 shadow-lg flex items-center gap-2 z-20 animate-fadeIn">
          <Grid className="w-3.5 h-3.5 text-sky-400" />
          <span>X: {activeCoords.x.toFixed(1)}m</span>
          <span>•</span>
          <span>Z: {activeCoords.z.toFixed(1)}m</span>
        </div>
      )}

      {/* Floating Camera & Editor Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
        {editMode && selectedTableId && (
          <button
            onClick={handleRotateSelected}
            title="Rotate Selected Table 45°"
            className="w-9 h-9 rounded-xl bg-sky-600 text-white shadow-md flex items-center justify-center hover:bg-sky-500 active:scale-95 transition-all mb-1 border border-sky-400"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={setIsometricView}
          title="Isometric View"
          className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-xs border border-border shadow-xs text-foreground flex items-center justify-center hover:bg-white active:scale-95 transition-all text-[11px] font-black"
        >
          3D
        </button>
        <button
          onClick={setTopDownView}
          title="Top-Down Blueprint View"
          className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-xs border border-border shadow-xs text-foreground flex items-center justify-center hover:bg-white active:scale-95 transition-all text-[11px] font-black"
        >
          2D
        </button>
        <button
          onClick={zoomIn}
          title="Zoom In"
          className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-xs border border-border shadow-xs text-foreground flex items-center justify-center hover:bg-white active:scale-95 transition-all"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out"
          className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-xs border border-border shadow-xs text-foreground flex items-center justify-center hover:bg-white active:scale-95 transition-all"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetCamera}
          title="Reset Perspective"
          className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-xs border border-border shadow-xs text-foreground flex items-center justify-center hover:bg-white active:scale-95 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3D Raycasted Interactive Hover Tooltip (When Not Dragging) */}
      {!isDraggingTable && hoveredTable && tooltipPos && (
        <div
          className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700/50 backdrop-blur-sm text-xs min-w-[160px] animate-scaleUp"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex justify-between items-center border-b border-slate-700 pb-1.5 mb-1.5">
            <span className="font-black text-sm">{hoveredTable.label || `Table ${hoveredTable.number}`}</span>
            <span
              className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${STATUS_COLORS[hoveredTable.status]?.text}25`,
                color: STATUS_COLORS[hoveredTable.status]?.text,
              }}
            >
              {hoveredTable.status}
            </span>
          </div>
          <div className="space-y-1 text-[10px] text-slate-300">
            <p>Section: <span className="font-bold text-white">{hoveredTable.sectionName}</span></p>
            <p>Shape: <span className="font-bold text-white uppercase">{hoveredTable.shape}</span></p>
            <p>Capacity: <span className="font-bold text-white">{hoveredTable.capacity} Guests</span></p>
            {hoveredTable.orderTotal != null && (
              <p>Active Check: <span className="font-black text-emerald-400">${(hoveredTable.orderTotal / 100).toFixed(2)}</span></p>
            )}
            {hoveredTable.serverName && (
              <p>Server: <span className="font-bold text-white">{hoveredTable.serverName}</span></p>
            )}
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-800 text-[9px] text-slate-400 text-center font-bold">
            {editMode ? 'Drag to move • Click to configure' : 'Click table to open check'}
          </div>
        </div>
      )}
    </div>
  );
}
