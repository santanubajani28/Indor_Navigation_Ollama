

import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// FIX: Add Waypoint to type imports, as it's now used in props.
import type { CampusData, Waypoint } from '../types';
import { DetailType } from '../types';
import { 
    UNIT_TYPE_COLORS_3D, 
    UNIT_HEIGHT, 
    LEVEL_SEPARATION,
    DETAIL_TYPE_COLORS_3D,
    WALL_THICKNESS,
    DOOR_HEIGHT_REDUCTION,
    PATH_ANIMATION_SPEED
} from '../constants';

// --- Type Declaration for External Library ---
declare const proj4: any;

interface MapViewerProps {
  data: CampusData;
  path: string[] | null;
  // FIX: Accept pre-calculated waypoints as a prop.
  waypoints: Waypoint[] | null;
  startUnitId: string | null;
  endUnitId: string | null;
  basemapType: 'satellite' | 'streetmap';
  showProject: boolean;
  mapOrigin: { lat: number; lon: number } | null;
}

// --- Custom Hooks ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// FIX: Add `waypoints` to destructured props.
const MapViewer3D: React.FC<MapViewerProps> = ({ data, path, waypoints, startUnitId, endUnitId, basemapType, showProject, mapOrigin }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const threeRef = useRef<{
        renderer: THREE.WebGLRenderer;
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        controls: OrbitControls;
    } | null>(null);
    const animationRef = useRef<{
        startTime: number;
        duration: number;
        curve: THREE.CatmullRomCurve3 | null;
        navigator: THREE.Object3D | null;
        trail: THREE.Line | null;
        isAnimating: boolean;
    }>({
        startTime: 0,
        duration: 0,
        curve: null,
        navigator: null,
        trail: null,
        isAnimating: false,
    });
    
    const textureLoader = useMemo(() => new THREE.TextureLoader(), []);
    const campusGroupRef = useRef<THREE.Group | null>(null);
    const basemapPlaneRef = useRef<THREE.Mesh | null>(null);
    const clock = useMemo(() => new THREE.Clock(), []);

    const [zoomLevel, setZoomLevel] = useState(12);
    const initialCameraDistance = useRef(400);

    // Prepare reprojection function for converting lat/lon to meters for 3D rendering
    const reprojectToMeters = useMemo(() => {
        try {
            // EPSG:3857 is the Web Mercator projection used by most web maps
            return proj4('EPSG:4326', 'EPSG:3857').forward;
        } catch (e) {
            console.error("Could not create projection for 3D view:", e);
            return (coords: number[]) => coords; // Fallback to no-op
        }
    }, []);

    const centerCamera = useCallback((camera: THREE.PerspectiveCamera, controls: OrbitControls, object: THREE.Object3D) => {
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = boundingBox.getCenter(new THREE.Vector3());
        controls.target.copy(center);

        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.tan(fov / 2));
        cameraZ *= 0.75; // Adjust zoom factor
        
        initialCameraDistance.current = cameraZ;
        setZoomLevel(12);

        camera.position.z = center.z + cameraZ;
        camera.position.x = center.x;
        camera.position.y = center.y + cameraZ;

        camera.lookAt(center);
        controls.update();
    }, []);

    // Effect for one-time setup of the Three.js environment
    useEffect(() => {
        const mountNode = mountRef.current;
        if (!mountNode) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111827); // bg-gray-900

        const camera = new THREE.PerspectiveCamera(75, mountNode.clientWidth / mountNode.clientHeight, 0.1, 500000);
        camera.position.set(400, 400, 400);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
        mountNode.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const handleInteractionEnd = () => {
            if (!threeRef.current) return;
            const { camera: currentCamera, controls: currentControls } = threeRef.current;
            const currentDistance = currentCamera.position.distanceTo(currentControls.target);
            if (currentDistance > 0 && initialCameraDistance.current > 0) {
                const newZoom = 12 + Math.log2(initialCameraDistance.current / currentDistance);
                const clampedZoom = Math.max(10, Math.min(18, Math.round(newZoom)));
                setZoomLevel(clampedZoom);
            }
        };
        controls.addEventListener('end', handleInteractionEnd);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 200, 100);
        scene.add(directionalLight);
        
        const campusGroup = new THREE.Group();
        campusGroupRef.current = campusGroup;
        scene.add(campusGroup);
        
        const planeGeo = new THREE.PlaneGeometry(1, 1);
        const planeMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.1;
        basemapPlaneRef.current = plane;
        scene.add(plane);

        threeRef.current = { renderer, scene, camera, controls };

        const animate = () => {
            requestAnimationFrame(animate);
            const anim = animationRef.current;
            if (anim.isAnimating && anim.curve && anim.navigator) {
                const elapsedTime = clock.getElapsedTime() - anim.startTime;
                let progress = elapsedTime / anim.duration;
                if (progress >= 1) {
                    progress = 1;
                    anim.isAnimating = false;
                }
                const currentPosition = anim.curve.getPointAt(progress);
                anim.navigator.position.copy(currentPosition);

                if (progress < 1) {
                    const tangent = anim.curve.getTangentAt(progress).normalize();
                    const lookAtPosition = new THREE.Vector3().copy(currentPosition).add(tangent);
                    // Prevent gimbal lock by keeping up vector consistent
                    anim.navigator.up.set(0, 1, 0);
                    anim.navigator.lookAt(lookAtPosition);
                }
            }
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
            controls.removeEventListener('end', handleInteractionEnd);
            controls.dispose();
            renderer.dispose();
        };
    }, [clock]);
    
    const debouncedZoomLevel = useDebounce(zoomLevel, 500);

    // Effect to update basemap geometry and texture
    useEffect(() => {
        const plane = basemapPlaneRef.current;
        if (!plane || !data.sites.length) return;

        let basemapUrl: string;
        if (basemapType === 'streetmap' && mapOrigin) {
            basemapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${mapOrigin.lat},${mapOrigin.lon}&zoom=${debouncedZoomLevel}&size=1024x1024&maptype=mapnik`;
        } else if (mapOrigin) {
            basemapUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${debouncedZoomLevel}/{y}/{x}`
            // This URL needs tile numbers, which we don't have. For simplicity, we stick to a generic texture.
            // A full implementation would require a tile loading system.
            basemapUrl = 'https://i.imgur.com/8X5g4p1.jpeg';
        } else {
            return;
        }
        
        const texture = textureLoader.load(basemapUrl, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            if(plane.material) (plane.material as THREE.MeshBasicMaterial).needsUpdate = true;
        });
        (plane.material as THREE.MeshBasicMaterial).map = texture;

        const allPoints = data.sites.flatMap(s => s.polygon);
        if (allPoints.length > 0) {
            plane.visible = true;
            const meterPoints = allPoints.map(p => reprojectToMeters([p.x, p.y]));
            const minX = Math.min(...meterPoints.map(p => p[0]));
            const minY = Math.min(...meterPoints.map(p => p[1]));
            const maxX = Math.max(...meterPoints.map(p => p[0]));
            const maxY = Math.max(...meterPoints.map(p => p[1]));
            const width = maxX - minX;
            const height = maxY - minY;

            plane.geometry.dispose();
            plane.geometry = new THREE.PlaneGeometry(width, height);
            
            const [baseX, baseY] = reprojectToMeters([allPoints[0].x, allPoints[0].y]);
            const [centerX, centerY] = [minX + width / 2, minY + height / 2];

            plane.position.set(centerX - baseX, -0.1, -(centerY - baseY));
        } else {
            plane.visible = false;
        }
    }, [data, basemapType, mapOrigin, textureLoader, debouncedZoomLevel, reprojectToMeters]);

    // Effect for drawing and updating the 3D model
    useEffect(() => {
        const threeInstance = threeRef.current;
        const campusGroup = campusGroupRef.current;
        if (!threeInstance || !campusGroup) return;
        const { camera, controls } = threeInstance;

        // Clear previous campus model
        while(campusGroup.children.length > 0){ 
            const object = campusGroup.children[0];
            campusGroup.remove(object);
            if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
                object.geometry?.dispose();
                const material = object.material as THREE.Material | THREE.Material[];
                 if (Array.isArray(material)) {
                    material.forEach(m => m.dispose());
                } else if (material) {
                    material.dispose();
                }
            }
        }
        animationRef.current.isAnimating = false; // Stop any previous animation
        
        campusGroup.visible = showProject;
        if (!showProject || data.levels.length === 0 || !data.levels[0].polygon[0]) return;

        // Establish a reference point in meters for the whole model
        const basePoint = data.levels[0].polygon[0];
        const [baseX, baseY] = reprojectToMeters([basePoint.x, basePoint.y]);

        // Render unit floors
        data.units.forEach(unit => {
            const level = data.levels.find(l => l.id === unit.levelId);
            const y_pos = level ? level.zIndex * (UNIT_HEIGHT + LEVEL_SEPARATION) : 0;
            
            const shapePoints = unit.polygon.map(p => {
                const [mx, my] = reprojectToMeters([p.x, p.y]);
                return new THREE.Vector2(mx - baseX, my - baseY);
            });
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
            mesh.rotation.x = -Math.PI / 2;
            campusGroup.add(mesh);
        });

        // Render details (walls, doors)
        data.details?.forEach(detail => {
            const level = data.levels.find(l => l.id === detail.levelId);
            const y_pos = level ? level.zIndex * (UNIT_HEIGHT + LEVEL_SEPARATION) : 0;

            const isDoor = detail.type === DetailType.DOOR;
            const objectHeight = detail.height ?? (isDoor ? UNIT_HEIGHT - DOOR_HEIGHT_REDUCTION : UNIT_HEIGHT);
            const y_center = y_pos + objectHeight / 2;

            for (let i = 0; i < detail.line.length - 1; i++) {
                const [p1x, p1y] = reprojectToMeters([detail.line[i].x, detail.line[i].y]);
                const [p2x, p2y] = reprojectToMeters([detail.line[i+1].x, detail.line[i+1].y]);
                const p1 = { x: p1x - baseX, y: p1y - baseY };
                const p2 = { x: p2x - baseX, y: p2y - baseY };

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const length = Math.hypot(dx, dy);
                if (length < 0.1) continue;

                const midpoint = { x: p1.x + dx / 2, z: p1.y + dy / 2 };
                const angle = Math.atan2(dy, dx);

                const geometry = new THREE.BoxGeometry(length, objectHeight, WALL_THICKNESS);
                const material = new THREE.MeshStandardMaterial({ color: DETAIL_TYPE_COLORS_3D[detail.type] });
                const wallSegment = new THREE.Mesh(geometry, material);
                
                wallSegment.position.set(midpoint.x, y_center, -midpoint.z);
                wallSegment.rotation.y = -angle;

                campusGroup.add(wallSegment);
            }
        });
        
        // --- Path Visualization ---
        // FIX: Check for `waypoints` from props instead of just `path`.
        if (path && waypoints) {
            const pathPoints = waypoints.map(wp => {
                const [mx, my] = reprojectToMeters([wp.point.x, wp.point.y]);
                const level = data.levels.find(l => l.id === wp.levelId);
                const y_pos = level ? level.zIndex * (UNIT_HEIGHT + LEVEL_SEPARATION) : 0;
                return new THREE.Vector3(mx - baseX, y_pos + UNIT_HEIGHT / 2, -(my - baseY));
            });
            
            if (pathPoints.length > 1) {
                // Draw path line
                const curve = new THREE.CatmullRomCurve3(pathPoints);
                const tubeGeo = new THREE.TubeGeometry(curve, pathPoints.length * 5, 0.5, 8, false);
                const tubeMat = new THREE.MeshBasicMaterial({ color: 0xEA4335, transparent: true, opacity: 0.8 });
                const pathLine = new THREE.Mesh(tubeGeo, tubeMat);
                campusGroup.add(pathLine);
                
                // Add start/end markers
                const startMarkerGeo = new THREE.SphereGeometry(2, 32, 16);
                const startMarkerMat = new THREE.MeshStandardMaterial({ color: 0x34A853 });
                const startMarker = new THREE.Mesh(startMarkerGeo, startMarkerMat);
                startMarker.position.copy(pathPoints[0]);
                campusGroup.add(startMarker);

                const endMarkerGeo = new THREE.SphereGeometry(2, 32, 16);
                const endMarkerMat = new THREE.MeshStandardMaterial({ color: 0xEA4335 });
                const endMarker = new THREE.Mesh(endMarkerGeo, endMarkerMat);
                endMarker.position.copy(pathPoints[pathPoints.length - 1]);
                campusGroup.add(endMarker);
                
                // Animate navigator
                const anim = animationRef.current;
                anim.curve = curve;
                anim.duration = curve.getLength() / PATH_ANIMATION_SPEED;
                anim.startTime = clock.getElapsedTime();
                
                if (!anim.navigator) {
                    const navGeo = new THREE.ConeGeometry(2, 5, 8);
                    navGeo.rotateX(Math.PI / 2);
                    const navMat = new THREE.MeshStandardMaterial({ color: 0xEA4335, emissive: 0xfc8d83 });
                    anim.navigator = new THREE.Mesh(navGeo, navMat);
                    campusGroup.add(anim.navigator);
                }
                anim.navigator.visible = true;
                anim.isAnimating = true;
            }
        } else {
             if (animationRef.current.navigator) {
                animationRef.current.navigator.visible = false;
             }
        }
        
        if(data.units.length > 0) {
            centerCamera(camera, controls, campusGroup);
        }
    // FIX: Add `waypoints` to the dependency array.
    }, [data, path, waypoints, startUnitId, endUnitId, clock, centerCamera, showProject, reprojectToMeters]);
    
    const zoomIn = useCallback(() => {
        threeRef.current?.controls.dollyIn(1.2);
        threeRef.current?.controls.update();
    }, []);

    const zoomOut = useCallback(() => {
        threeRef.current?.controls.dollyOut(1.2);
        threeRef.current?.controls.update();
    }, []);

    const resetView = useCallback(() => {
        const { camera, controls } = threeRef.current || {};
        if (camera && controls && campusGroupRef.current) {
            centerCamera(camera, controls, campusGroupRef.current);
        }
    }, [centerCamera]);
    
    const buttonClasses = "bg-gray-800/80 backdrop-blur-sm p-2 rounded-full text-white hover:bg-indigo-600 transition-colors w-10 h-10 flex items-center justify-center font-bold text-lg";

    return (
        <div className="w-full h-full relative">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-10">
                <button onClick={zoomIn} className={buttonClasses} aria-label="Zoom in">+</button>
                <button onClick={zoomOut} className={buttonClasses} aria-label="Zoom out">-</button>
                <button onClick={resetView} className={buttonClasses} aria-label="Reset view">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9a9 9 0 0114.13-5.12M20 15a9 9 0 01-14.13 5.12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default MapViewer3D;
