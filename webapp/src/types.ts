/* Mirrors the policy data OPA loads from opa/policies/data.json. */
export interface EndpointPolicy {
  required_clearance: string;
  restricted_hours?: [number, number];
}

/* Mirrors api/src/trace.ts. */
export type TraceEvent =
  | { kind: 'step'; label: string; note?: string }
  | { kind: 'jwt'; label: string; verified: boolean; verifyNote?: string; header: unknown; payload: unknown }
  | { kind: 'http'; method: string; url: string; status: number; note?: string; body?: string }
  | { kind: 'decision'; allow: boolean; label: string; note?: string };
