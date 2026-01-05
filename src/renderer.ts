import type { Vector2, Shape, Transform } from './types';
import { rotate, add } from './math';
import { getTextSegments, getTextWidth } from './font';

// Batched renderer - collects all draw calls and renders them together
// to minimize state changes and improve performance

interface LineBatch {
  segments: { start: Vector2; end: Vector2; alpha: number }[];
  color: string;
  lineWidth: number;
}

interface PointBatch {
  points: { pos: Vector2; alpha: number }[];
  color: string;
  radius: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;

  // Batches keyed by color+lineWidth
  private lineBatches: Map<string, LineBatch> = new Map();
  private pointBatches: Map<string, PointBatch> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;

    this.width = 800;
    this.height = 600;
    canvas.width = this.width;
    canvas.height = this.height;
  }

  clear(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.lineBatches.clear();
    this.pointBatches.clear();
  }

  // Queue a shape for batched rendering
  drawShape(shape: Shape, transform: Transform, color = '#0ff', lineWidth = 2): void {
    if (shape.length < 2) return;

    const { position, rotation, scale } = transform;

    // Transform all points
    const transformed = shape.map((point) => {
      const scaled = { x: point.x * scale, y: point.y * scale };
      const rotated = rotate(scaled, rotation);
      return add(rotated, position);
    });

    // Add line segments to batch
    for (let i = 0; i < transformed.length; i++) {
      const next = (i + 1) % transformed.length;
      this.addLineToBatch(transformed[i], transformed[next], color, lineWidth, 1);
    }
  }

  // Queue a line for batched rendering
  drawLine(start: Vector2, end: Vector2, color = '#0ff', lineWidth = 2, alpha = 1): void {
    this.addLineToBatch(start, end, color, lineWidth, alpha);
  }

  // Queue a point for batched rendering
  drawPoint(position: Vector2, radius = 3, color = '#0ff'): void {
    const key = `${color}-${radius}`;
    let batch = this.pointBatches.get(key);
    if (!batch) {
      batch = { points: [], color, radius };
      this.pointBatches.set(key, batch);
    }
    batch.points.push({ pos: position, alpha: 1 });
  }

  // Queue text for batched rendering
  drawText(text: string, x: number, y: number, scale = 3, color = '#0ff'): void {
    const textWidth = getTextWidth(text, scale);
    const startX = x - textWidth / 2;
    const segments = getTextSegments(text, startX, y, scale);
    const lineWidth = Math.max(1, scale * 0.4);

    for (const segment of segments) {
      this.addLineToBatch(segment.start, segment.end, color, lineWidth, 1);
    }
  }

  private addLineToBatch(
    start: Vector2,
    end: Vector2,
    color: string,
    lineWidth: number,
    alpha: number
  ): void {
    const key = `${color}-${lineWidth}`;
    let batch = this.lineBatches.get(key);
    if (!batch) {
      batch = { segments: [], color, lineWidth };
      this.lineBatches.set(key, batch);
    }
    batch.segments.push({ start, end, alpha });
  }

  // Call this at the end of each frame to actually render everything
  flush(): void {
    // Render all line batches
    for (const batch of this.lineBatches.values()) {
      this.renderLineBatch(batch);
    }

    // Render all point batches
    for (const batch of this.pointBatches.values()) {
      this.renderPointBatch(batch);
    }
  }

  private renderLineBatch(batch: LineBatch): void {
    const { segments, color, lineWidth } = batch;
    if (segments.length === 0) return;

    // Check if all segments have the same alpha
    const allSameAlpha = segments.every((s) => s.alpha === segments[0].alpha);

    if (allSameAlpha) {
      // Fast path: single draw call for all segments
      this.ctx.globalAlpha = segments[0].alpha;

      // Glow pass
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth + 1;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 8;

      this.ctx.beginPath();
      for (const seg of segments) {
        this.ctx.moveTo(seg.start.x, seg.start.y);
        this.ctx.lineTo(seg.end.x, seg.end.y);
      }
      this.ctx.stroke();

      // Solid pass
      this.ctx.shadowBlur = 0;
      this.ctx.lineWidth = lineWidth;

      this.ctx.beginPath();
      for (const seg of segments) {
        this.ctx.moveTo(seg.start.x, seg.start.y);
        this.ctx.lineTo(seg.end.x, seg.end.y);
      }
      this.ctx.stroke();

      this.ctx.globalAlpha = 1;
    } else {
      // Slow path: need to handle different alphas
      this.ctx.strokeStyle = color;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      for (const seg of segments) {
        this.ctx.globalAlpha = seg.alpha;

        // Glow
        this.ctx.lineWidth = lineWidth + 1;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(seg.start.x, seg.start.y);
        this.ctx.lineTo(seg.end.x, seg.end.y);
        this.ctx.stroke();

        // Solid
        this.ctx.shadowBlur = 0;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(seg.start.x, seg.start.y);
        this.ctx.lineTo(seg.end.x, seg.end.y);
        this.ctx.stroke();
      }
      this.ctx.globalAlpha = 1;
    }
  }

  private renderPointBatch(batch: PointBatch): void {
    const { points, color, radius } = batch;
    if (points.length === 0) return;

    // Glow pass
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 8;

    this.ctx.beginPath();
    for (const p of points) {
      this.ctx.moveTo(p.pos.x + radius, p.pos.y);
      this.ctx.arc(p.pos.x, p.pos.y, radius, 0, Math.PI * 2);
    }
    this.ctx.fill();

    // Bright center pass
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#fff';

    this.ctx.beginPath();
    for (const p of points) {
      this.ctx.moveTo(p.pos.x + radius * 0.5, p.pos.y);
      this.ctx.arc(p.pos.x, p.pos.y, radius * 0.5, 0, Math.PI * 2);
    }
    this.ctx.fill();
  }
}
