import express from 'express';
import axios from 'axios';
import router from './routes';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  next();
});

app.options('*', (_req, res) => res.sendStatus(204));

app.use('/api', router);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/* The webapp draws its endpoint list from here, so the UI describes the policy
 * that is actually loaded in OPA rather than a copy of it. */
app.get('/status', async (_req, res) => {
  try {
    const { data } = await axios.get('http://localhost:8181/v1/data/endpoints');
    res.json({ opa: true, endpoints: data.result ?? {} });
  } catch (err) {
    res.json({ opa: false, error: (err as Error).message, endpoints: {} });
  }
});

app.listen(PORT, () => {
  console.log(`Protected API running on port ${PORT}`);
});
