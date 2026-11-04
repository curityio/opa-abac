import { Router, Request, Response } from 'express';
import { verifyJwt } from './middleware/jwt';
import { authorizeWithOpa } from './middleware/opa';
import { trace } from './trace';

const router = Router();

router.use(verifyJwt, authorizeWithOpa);

function serve(data: string) {
  return (req: Request, res: Response) => {
    trace(req, { kind: 'step', label: 'Serve the resource', note: 'The route handler only ever runs on an allowed request.' });
    res.json({ data, trace: req.trace });
  };
}

router.get('/public',       serve('Public information — no clearance required'));
router.get('/internal',     serve('Internal metrics — restricted to staff'));
router.get('/confidential', serve('Confidential report — limited access hours'));
router.get('/top-secret',   serve('Top-secret data — business hours only'));

export default router;
