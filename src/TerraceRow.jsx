import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Placeholder for the terrace-house preview: the 3D building mesh has been
// removed (to be replaced with an SVG graphic) but the interactive hotspot
// points are kept at their original coordinates so they line up with the
// same 3-house layout once the SVG is dropped in behind/around them.
export default function TerraceRow() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const labelRef = useRef(null);
  const descRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let raf;
    let disposed = false;

    const width = wrap.clientWidth || 560;
    const height = wrap.clientHeight || 380;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(3.75, 1.95, 4.75);
    camera.lookAt(0, 0.95, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);

    const terrace = new THREE.Group();
    scene.add(terrace);

    const HOUSE_SPACING = 1.7; // matches the original house body width, so hotspots stay evenly spaced

    // Hotspot copy — 3 window/wall points + 3 roof points, one pair per house
    const houseCopy = [
      {
        window: { label: 'ROOM COMFORT MAP', desc: 'See which room runs hottest in summer, coldest in winter.' },
        roof: { label: 'EPC INSIGHT', desc: 'Roof and loft insulation is often the single biggest factor in an EPC rating.' },
      },
      {
        window: { label: 'ORIENTATION-AWARE', desc: 'Sun exposure per room — not just a single EPC number.' },
        roof: { label: 'HEAT LOSS ZONES', desc: 'See where a home loses the most heat, roof included.' },
      },
      {
        window: { label: 'JUST PASTE A LINK', desc: 'Paste any Rightmove listing — no manual data entry.' },
        roof: { label: 'REAL BILLS ESTIMATE', desc: 'What it actually costs to stay comfortable, room by room.' },
      },
    ];

    const hotspotMeshes = [];
    const pingMeshes = [];
    const markerGeo = new THREE.SphereGeometry(0.055, 16, 16);
    const ringGeo = new THREE.RingGeometry(0.065, 0.082, 24);

    function addHotspot(x, y, z, data) {
      const m = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xFD4604 }));
      m.position.set(x, y, z);
      m.userData = data;
      terrace.add(m);
      hotspotMeshes.push(m);

      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xFD4604, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      ring.position.copy(m.position);
      ring.userData = { phase: hotspotMeshes.length * 0.5 };
      terrace.add(ring);
      pingMeshes.push(ring);
    }

    houseCopy.forEach((copy, i) => {
      const offsetX = (i - 1) * HOUSE_SPACING;
      // Window/wall hotspot — same position as the bay window front on the original house
      addHotspot(offsetX + 0.35, 0.62, 0.9, copy.window);
      // Roof hotspot — same position as the slate slope surface on the original house
      addHotspot(offsetX + 0.15, 1.63, 0.3, copy.roof);
    });

    // Fixed viewing angle — no rotation, no drag
    terrace.rotation.y = -0.4;
    terrace.updateMatrixWorld(true);
    pingMeshes.forEach((r) => r.lookAt(camera.position));

    const terraceBaseY = terrace.position.y;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hoveredMesh = null;

    function pickHotspot(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(hotspotMeshes);
      return hits.length > 0 ? hits[0].object : null;
    }

    function handleTap(clientX, clientY) {
      const hit = pickHotspot(clientX, clientY);
      const tooltip = tooltipRef.current;
      if (hit) {
        labelRef.current.textContent = hit.userData.label;
        descRef.current.textContent = hit.userData.desc;
        const wrapRect = wrap.getBoundingClientRect();
        tooltip.style.left = (clientX - wrapRect.left) + 'px';
        tooltip.style.top = (clientY - wrapRect.top) + 'px';
        tooltip.classList.add('visible');
      } else {
        tooltip.classList.remove('visible');
      }
    }

    const onClick = (e) => handleTap(e.clientX, e.clientY);
    const onTouchEnd = (e) => { const p = e.changedTouches[0]; handleTap(p.clientX, p.clientY); };
    const onMouseMove = (e) => {
      const hit = pickHotspot(e.clientX, e.clientY);
      if (hit !== hoveredMesh) {
        if (hoveredMesh) hoveredMesh.material.color.setHex(0xFD4604);
        if (hit) hit.material.color.setHex(0xFF8A5C);
        hoveredMesh = hit;
      }
    };

    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('mousemove', onMouseMove);

    const onResize = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', onResize);

    let t = 0;
    function animate() {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      t += 0.02;

      terrace.position.y = terraceBaseY + Math.sin(t * 1.1) * 0.03;

      hotspotMeshes.forEach((m, i) => {
        const boost = m === hoveredMesh ? 0.3 : 0;
        m.scale.setScalar(1 + boost + 0.18 * Math.sin(t * 2.4 + i * 1.3));
      });

      pingMeshes.forEach((r) => {
        const cycle = 1.8;
        const a = ((t + r.userData.phase) % cycle) / cycle;
        r.scale.setScalar(1 + a * 3.2);
        r.material.opacity = 0.55 * (1 - a);
      });

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, []);

  return (
    <div ref={wrapRef} id="terrace-wrap" className="relative overflow-visible" style={{ height: 380 }}>
      <canvas ref={canvasRef} id="terrace-canvas" />
      <div ref={tooltipRef} className="terrace-tooltip">
        <div ref={labelRef} className="terrace-tooltip-label" />
        <div ref={descRef} className="terrace-tooltip-desc" />
      </div>
    </div>
  );
}
