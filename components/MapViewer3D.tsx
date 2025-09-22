import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CampusData, Point, Polygon, Unit } from '../types';
import { DetailType } from '../types';
import { 
    UNIT_TYPE_COLORS_3D, 
    UNIT_HEIGHT, 
    LEVEL_SEPARATION,
    DETAIL_TYPE_COLORS_3D,
    WALL_THICKNESS,
    DOOR_HEIGHT_REDUCTION
} from '../constants';

interface MapViewerProps {
  data: CampusData;
  path: string[] | null;
  startUnitId: string | null;
  endUnitId: string | null;
}

const getPolygonCenter = (polygon: Polygon): Point => {
    if (!polygon || polygon.length === 0) return { x: 0, y: 0 };
    const center = polygon.reduce(
        (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
        { x: 0, y: 0 }
    );
    center.x /= polygon.length;
    center.y /= polygon.length;
    return center;
};

const MapViewer3D: React.FC<MapViewerProps> = ({ data, path, startUnitId, endUnitId }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const threeRef = useRef<{
        renderer: THREE.WebGLRenderer;
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        controls: OrbitControls;
    } | null>(null);
    const campusGroupRef = useRef<THREE.Group | null>(null);

    const levelOffsets = useMemo(() => {
        const offsets = new Map<string, { x: number; y: number }>();
        if (data.levels.length === 0) return offsets;

        const baseLevel = data.levels.find(l => l.zIndex === 0) || data.levels[0];
        const baseX = baseLevel?.polygon?.[0]?.x ?? 0;
        const baseY = baseLevel?.polygon?.[0]?.y ?? 0;

        data.levels.forEach(level => {
            const levelX = level.polygon?.[0]?.x ?? 0;
            const levelY = level.polygon?.[0]?.y ?? 0;
            offsets.set(level.id, {
                x: levelX - baseX,
                y: levelY - baseY,
            });
        });

        return offsets;
    }, [data.levels]);

    // Effect for one-time setup of the Three.js environment
    useEffect(() => {
        const mountNode = mountRef.current;
        if (!mountNode) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111827); // bg-gray-900

        const camera = new THREE.PerspectiveCamera(75, mountNode.clientWidth / mountNode.clientHeight, 0.1, 5000);
        camera.position.set(400, 400, 400);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
        mountNode.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 200, 100);
        scene.add(directionalLight);
        
        threeRef.current = { renderer, scene, camera, controls };

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (mountNode.contains(renderer.domElement)) {
                mountNode.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    // Effect for drawing and updating the 3D model
    useEffect(() => {
        const threeInstance = threeRef.current;
        if (!threeInstance) return;
        const { scene, camera, controls } = threeInstance;

        // Clean up previous model
        if (campusGroupRef.current) {
            scene.remove(campusGroupRef.current);
            campusGroupRef.current.traverse(object => {
                if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
                    object.geometry?.dispose();
                     if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else if (object.material) {
                        object.material.dispose();
                    }
                }
            });
        }

        const campusGroup = new THREE.Group();
        campusGroupRef.current = campusGroup;

        // Render unit floors
        data.units.forEach(unit => {
            const level = data.levels.find(l => l.id === unit.levelId);
            const y_pos = level ? level.zIndex * (UNIT_HEIGHT + LEVEL_SEPARATION) : 0;
            const offset = levelOffsets.get(unit.levelId) || { x: 0, y: 0 };
            
            const shapePoints = unit.polygon.map(p => new THREE.Vector2(p.x - offset.x, p.y - offset.y));
            const shape = new THREE.Shape(shapePoints);
            const geometry = new THREE.ShapeGeometry(shape);

            const isSelected = unit.id === startUnitId || unit.id === endUnitId;
            const color = isSelected ? 0xffff00 : UNIT_TYPE_COLORS_3D[unit.type];
            const material = new THREE.MeshStandardMaterial({
                color,
                transparent: true,
                opacity: isSelected ? 0.7 : 0.3,
                side: THREE.DoubleSide,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = y_pos;
            mesh.rotation.x = -Math.PI / 2; // Lay flat on the XZ plane
            campusGroup.add(mesh);
        });

        // Render details (walls, doors)
        data.details?.forEach(detail => {
            const level = data.levels.find(l => l.id === detail.levelId);
            const y_pos = level ? level.zIndex * (UNIT_HEIGHT + LEVEL_SEPARATION) : 0;
            const offset = levelOffsets.get(detail.levelId) || { x: 0, y: 0 };

            const isDoor = detail.type === DetailType.DOOR;
            const objectHeight = UNIT_HEIGHT - (isDoor ? DOOR_HEIGHT_REDUCTION : 0);
            const y_center = y_pos + objectHeight / 2;

            for (let i = 0; i < detail.line.length - 1; i++) {
                const p1Raw = detail.line[i];
                const p2Raw = detail.line[i + 1];

                const p1 = { x: p1Raw.x - offset.x, y: p1Raw.y - offset.y };
                const p2 = { x: p2Raw.x - offset.x, y: p2Raw.y - offset.y };

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y; // Corresponds to Z axis in 3D
                const length = Math.hypot(dx, dy);
                if (length < 0.1) continue;

                const midpoint = { x: p1.x + dx / 2, z: p1.y + dy / 2 };
                const angle = Math.atan2(dy, dx);

                const geometry = new THREE.BoxGeometry(length, objectHeight, WALL_THICKNESS);
                const material = new THREE.MeshStandardMaterial({ color: DETAIL_TYPE_COLORS_3D[detail.type] });
                const wallSegment = new THREE.Mesh(geometry, material);
                
                wallSegment.position.set(midpoint.x, y_center, midpoint.z);
                wallSegment.rotation.y = -angle;

                campusGroup.add(wallSegment);
            }
        });
        
        // Render path
        if (path && path.length > 1) {
            const pathPoints = path.map(unitId => {
                const unit = data.units.find(u => u.id === unitId);
                if (!unit) return null;
                const level = data.levels.find(l => l.id === unit.levelId);
                const center = getPolygonCenter(unit.polygon);
                const offset = levelOffsets.get(unit.levelId) || { x: 0, y: 0 };
                const y_pos = (level ? level.zIndex * (UNIT_HEIGHT + LEVEL_SEPARATION) : 0) + 0.2; // Slightly above floor
                return new THREE.Vector3(center.x - offset.x, y_pos, center.y - offset.y);
            }).filter((p): p is THREE.Vector3 => p !== null);

            const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
            const pathMaterial = new THREE.LineBasicMaterial({ color: 0x0ea5e9, linewidth: 5 });
            const pathLine = new THREE.Line(pathGeometry, pathMaterial);
            
             // Create a glowing effect for the path
            const glowMaterial = new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.4, linewidth: 15 });
            const pathGlow = new THREE.Line(pathGeometry.clone(), glowMaterial);

            campusGroup.add(pathLine);
            campusGroup.add(pathGlow);
        }

        scene.add(campusGroup);
        
        // Center camera on the new model
        if(data.units.length > 0) {
            const boundingBox = new THREE.Box3().setFromObject(campusGroup);
            const center = boundingBox.getCenter(new THREE.Vector3());
            controls.target.copy(center);
            
            const size = boundingBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / Math.tan(fov / 2));
            cameraZ *= 0.75; // Adjust zoom factor
            
            camera.position.z = center.z + cameraZ;
            camera.position.x = center.x;
            camera.position.y = center.y + cameraZ;
            
            camera.lookAt(center);
            controls.update();
        }

    }, [data, path, startUnitId, endUnitId, levelOffsets]);

    return <div ref={mountRef} className="w-full h-full" />;
};

export default MapViewer3D;