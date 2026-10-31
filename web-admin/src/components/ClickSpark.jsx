import React, { useRef, useEffect } from 'react';
import './ClickSpark.css';

/**
 * ClickSpark Component from React Bits (@react-bits/ClickSpark-JS-CSS)
 * Generates an interactive particle burst effect whenever a user clicks anywhere inside.
 */
const ClickSpark = ({
  sparkColor = '#00b14f',
  sparkSize = 10,
  sparkRadius = 18,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1.0,
  children
}) => {
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    let animationId;

    const resizeCanvas = () => {
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleCanvasClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const now = performance.now();
      const newSparks = Array.from({ length: sparkCount }, (_, i) => {
        const angle = (i * 2 * Math.PI) / sparkCount;
        const rot = angle + (Math.random() - 0.5) * 0.4;
        return {
          x,
          y,
          angle: rot,
          startTime: now
        };
      });

      sparksRef.current.push(...newSparks);
      if (!startTimeRef.current) {
        startTimeRef.current = now;
        animationId = requestAnimationFrame(animate);
      }
    };

    parent.addEventListener('click', handleCanvasClick);

    const animate = (timestamp) => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;
      const ctx = currentCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) {
          return false;
        }

        const progress = elapsed / duration;
        let easedProgress;

        switch (easing) {
          case 'linear':
            easedProgress = progress;
            break;
          case 'ease-in':
            easedProgress = progress * progress;
            break;
          case 'ease-in-out':
            easedProgress =
              progress < 0.5
                ? 2 * progress * progress
                : -1 + (4 - 2 * progress) * progress;
            break;
          case 'ease-out':
          default:
            easedProgress = progress * (2 - progress);
            break;
        }

        const distance = easedProgress * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - easedProgress);

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        return true;
      });

      if (sparksRef.current.length > 0) {
        animationId = requestAnimationFrame(animate);
      } else {
        startTimeRef.current = null;
      }
    };

    return () => {
      parent.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('resize', resizeCanvas);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration, easing, extraScale]);

  return (
    <div className="click-spark-wrapper">
      <canvas ref={canvasRef} className="click-spark-canvas" />
      {children}
    </div>
  );
};

export default ClickSpark;
