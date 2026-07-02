/** Shared geometry-constraint math used by both grading and the live exercise UI. */

export type GeoPoint = { id: string; x: number; y: number; fixed?: boolean };

export type GeoConstraint =
  | { type: "distance"; a: string; b: string; value: number; tolerance?: number }
  | {
      type: "angle";
      vertex: string;
      a: string;
      c: string;
      value: number;
      tolerance?: number;
    }
  | { type: "area"; value: number; tolerance?: number }
  | { type: "perimeter"; value: number; tolerance?: number };

export type ConstraintCheck = { ok: boolean; actual: number; label: string };

export function checkGeometryConstraint(
  con: GeoConstraint,
  pts: Map<string, { x: number; y: number }>,
  order: string[]
): ConstraintCheck {
  const p = (id: string) => pts.get(id) ?? { x: 0, y: 0 };
  const dist = (a: string, b: string) =>
    Math.hypot(p(a).x - p(b).x, p(a).y - p(b).y);
  const ring = order.map((id) => p(id));
  switch (con.type) {
    case "distance": {
      const actual = dist(con.a, con.b);
      return {
        ok: Math.abs(actual - con.value) <= (con.tolerance ?? 0.3),
        actual,
        label: `${con.a}${con.b} = ${con.value}`,
      };
    }
    case "angle": {
      const v = p(con.vertex);
      const a1 = Math.atan2(p(con.a).y - v.y, p(con.a).x - v.x);
      const a2 = Math.atan2(p(con.c).y - v.y, p(con.c).x - v.x);
      let deg = Math.abs(((a1 - a2) * 180) / Math.PI);
      if (deg > 180) deg = 360 - deg;
      return {
        ok: Math.abs(deg - con.value) <= (con.tolerance ?? 3),
        actual: deg,
        label: `angle at ${con.vertex} = ${con.value}°`,
      };
    }
    case "area": {
      let sum = 0;
      for (let i = 0; i < ring.length; i++) {
        const q = ring[(i + 1) % ring.length];
        sum += ring[i].x * q.y - q.x * ring[i].y;
      }
      const actual = Math.abs(sum) / 2;
      return {
        ok: Math.abs(actual - con.value) <= (con.tolerance ?? 0.5),
        actual,
        label: `area = ${con.value}`,
      };
    }
    case "perimeter": {
      let actual = 0;
      for (let i = 0; i < ring.length; i++) {
        const q = ring[(i + 1) % ring.length];
        actual += Math.hypot(ring[i].x - q.x, ring[i].y - q.y);
      }
      return {
        ok: Math.abs(actual - con.value) <= (con.tolerance ?? 0.5),
        actual,
        label: `perimeter = ${con.value}`,
      };
    }
  }
}
