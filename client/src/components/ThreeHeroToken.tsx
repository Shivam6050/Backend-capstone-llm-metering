import React, { useEffect, useRef } from 'react';

export const ThreeHeroToken: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 450);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    // 3D Icosahedron Vertices
    const phi = (1 + Math.sqrt(5)) / 2;
    const rawVertices: [number, number, number][] = [
      [-1, phi, 0],
      [1, phi, 0],
      [-1, -phi, 0],
      [1, -phi, 0],
      [0, -1, phi],
      [0, 1, phi],
      [0, -1, -phi],
      [0, 1, -phi],
      [phi, 0, -1],
      [phi, 0, 1],
      [-phi, 0, -1],
      [-phi, 0, 1],
    ];

    // Normalize and scale vertices
    const scale = Math.min(width, height) * 0.28;
    const vertices = rawVertices.map(([x, y, z]) => {
      const len = Math.sqrt(x * x + y * y + z * z);
      return [x / len * scale, y / len * scale, z / len * scale];
    });

    // Outer Icosahedron Edges
    const edges: [number, number][] = [];
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const dx = rawVertices[i][0] - rawVertices[j][0];
        const dy = rawVertices[i][1] - rawVertices[j][1];
        const dz = rawVertices[i][2] - rawVertices[j][2];
        const distSq = dx * dx + dy * dy + dz * dz;
        // Vertices are connected if distance is 2
        if (Math.abs(distSq - 4) < 0.1) {
          edges.push([i, j]);
        }
      }
    }

    // Floating Particles
    const particles = Array.from({ length: 45 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: scale * (1.3 + Math.random() * 0.4),
      y: (Math.random() - 0.5) * scale * 1.2,
      speed: 0.005 + Math.random() * 0.008,
      size: 1 + Math.random() * 2,
    }));

    let rotX = 0;
    let rotY = 0;
    let time = 0;

    const render = () => {
      time += 0.02;
      rotX += 0.005;
      rotY += 0.008;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 + Math.sin(time) * 12;

      // Project 3D points
      const projected = vertices.map(([x, y, z]) => {
        // Rotate Y
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Rotate X
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Perspective projection
        const fov = 400;
        const pScale = fov / (fov + z2);
        return {
          x: cx + x1 * pScale,
          y: cy + y2 * pScale,
          z: z2,
          pScale,
        };
      });

      // Draw Orbiting Particles
      particles.forEach((p) => {
        p.angle += p.speed;
        const px = Math.cos(p.angle) * p.radius;
        const pz = Math.sin(p.angle) * p.radius;

        const cosY = Math.cos(rotY * 0.5);
        const sinY = Math.sin(rotY * 0.5);
        const x1 = px * cosY - pz * sinY;
        const z1 = px * sinY + pz * cosY;

        const fov = 400;
        const pScale = fov / (fov + z1);
        const sx = cx + x1 * pScale;
        const sy = cy + p.y * pScale;

        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + (z1 / scale) * 0.4})`;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * pScale, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Glowing Edges (Monochrome Titanium Silver)
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
      ctx.strokeStyle = 'rgba(228, 228, 231, 0.65)';
      ctx.lineWidth = 1.2;

      edges.forEach(([i, j]) => {
        const p1 = projected[i];
        const p2 = projected[j];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Draw Glowing Nodes / Vertices (Crisp White)
      projected.forEach((p) => {
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 * p.pScale, 0, Math.PI * 2);
        ctx.fill();
      });

      // Inner Core Glow Dot
      ctx.shadowBlur = 25;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="w-full h-full min-h-[380px] lg:min-h-[520px] flex items-center justify-center relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
