import { Request } from 'express';

/* The trace is what the demo is actually for: every request carries back the
 * steps the API took to reach its answer, so the browser can show the decision
 * instead of just its outcome. */
export type TraceEvent =
  | { kind: 'step'; label: string; note?: string }
  | { kind: 'jwt'; label: string; verified: boolean; verifyNote?: string; header: unknown; payload: unknown }
  | { kind: 'http'; method: string; url: string; status: number; note?: string; body?: string }
  | { kind: 'decision'; allow: boolean; label: string; note?: string };

declare global {
  namespace Express {
    interface Request {
      trace?: TraceEvent[];
    }
  }
}

export function trace(req: Request, event: TraceEvent): void {
  (req.trace ??= []).push(event);
}
