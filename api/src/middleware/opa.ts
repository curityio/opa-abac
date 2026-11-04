import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

import { trace } from '../trace';

const OPA_URL = 'http://localhost:8181/v1/data/authz/allow';

export function authorizeWithOpa(req: Request, res: Response, next: NextFunction): void {
  const claims = req.user ?? {};
  const input = {
    claims,
    path: req.baseUrl + req.path,
    method: req.method,
  };

  trace(req, {
    kind: 'step',
    label: 'Ask the policy engine',
    note: 'The API states the facts and asks a question. It does not know the rules — OPA does.',
  });

  axios.post(OPA_URL, { input })
    .then(({ data, status }) => {
      const allow = data.result === true;

      trace(req, {
        kind: 'http',
        method: 'POST',
        url: OPA_URL,
        status,
        note: 'Policy input',
        body: JSON.stringify({ input }, null, 2),
      });

      trace(req, {
        kind: 'decision',
        allow,
        label: allow ? 'allow = true' : 'allow = false',
        note: allow
          ? `Clearance "${claims.clearance ?? '—'}" satisfies this endpoint, and the request is inside its permitted hours.`
          : `Clearance "${claims.clearance ?? '—'}" is not enough for this endpoint, or the request is outside its permitted hours.`,
      });

      if (!allow) {
        res.status(403).json({ error: 'forbidden', opa_input: input, trace: req.trace });
        return;
      }
      next();
    })
    .catch((err) => {
      trace(req, {
        kind: 'decision',
        allow: false,
        label: 'no decision',
        note: `OPA could not be reached: ${err.message}`,
      });
      res.status(502).json({ error: 'OPA unreachable', detail: err.message, trace: req.trace });
    });
}
