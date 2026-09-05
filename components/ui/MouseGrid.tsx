"use client";

import { useEffect, useRef } from "react";

interface Cell {
  col: number;
  row: number;
  strength: number;
}

const CELL_SIZE = 56;
const FADE_PER_FRAME = 0.035;

export function MouseGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    if (reducedMotion.matches || !finePointer.matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const gridCanvas = canvas;
    const gridContext = context;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let lastCell = "";
    let cells: Cell[] = [];
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim();

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      gridCanvas.width = width * ratio;
      gridCanvas.height = height * ratio;
      gridCanvas.style.width = `${width}px`;
      gridCanvas.style.height = `${height}px`;
      gridContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function addCells(col: number, row: number) {
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          const nextCol = col + colOffset;
          const nextRow = row + rowOffset;
          const existing = cells.find(
            (cell) => cell.col === nextCol && cell.row === nextRow,
          );
          if (existing) {
            existing.strength = Math.max(existing.strength, colOffset === 0 && rowOffset === 0 ? 1 : 0.55);
          } else {
            cells.push({
              col: nextCol,
              row: nextRow,
              strength: colOffset === 0 && rowOffset === 0 ? 1 : 0.55,
            });
          }
        }
      }
    }

    function draw() {
      gridContext.clearRect(0, 0, width, height);
      gridContext.lineWidth = 1;
      gridContext.strokeStyle = accent;

      for (const cell of cells) {
        gridContext.globalAlpha = cell.strength * 0.16;
        gridContext.strokeRect(cell.col * CELL_SIZE + 0.5, cell.row * CELL_SIZE + 0.5, CELL_SIZE, CELL_SIZE);
        cell.strength -= FADE_PER_FRAME;
      }

      gridContext.globalAlpha = 1;
      cells = cells.filter((cell) => cell.strength > 0);
      animationFrame = window.requestAnimationFrame(draw);
    }

    function onPointerMove(event: PointerEvent) {
      const col = Math.floor(event.clientX / CELL_SIZE);
      const row = Math.floor(event.clientY / CELL_SIZE);
      const key = `${col}:${row}`;
      if (key === lastCell) return;
      lastCell = key;
      addCells(col, row);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-70"
    />
  );
}