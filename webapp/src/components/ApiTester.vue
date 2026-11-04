<template>
  <div class="card">
    <h3>Call the protected API</h3>
    <p class="hint">Each endpoint declares what it needs in <code>data.json</code>. Nothing below is
      hardcoded in the app — the requirements are read back from the policy OPA has loaded.</p>

    <ul class="runs">
      <li v-for="ep in endpoints" :key="ep.path" :class="{ chosen: ep.path === chosen }">
        <button class="route" :disabled="busy" @click="call(ep)">GET {{ ep.path }}</button>
        <span class="expect">
          Needs clearance <b>{{ ep.clearance }}</b><template v-if="ep.hours">, between
          <b>{{ ep.hours }}</b></template>.
          <span :class="ep.openNow ? 'open' : 'closed'">{{ ep.openNow ? 'open now' : 'closed now' }}</span>
        </span>
      </li>
    </ul>
  </div>

  <div v-if="rows.length" class="card">
    <h3>Decision trace <span class="live">live</span></h3>
    <p class="hint">{{ label }} — reported by the API itself, in the order it happened.</p>

    <ol class="trace">
      <li v-for="(row, i) in rows" :key="i" :class="rowClass(row.e)">
        <template v-if="row.e.kind === 'step'">
          <span class="n">{{ row.n }}</span>
          <span class="label">{{ row.e.label }}</span>
          <span v-if="row.e.note" class="note indented">{{ row.e.note }}</span>
        </template>

        <template v-else-if="row.e.kind === 'jwt'">
          <span class="badge">{{ row.e.verified ? 'JWT' : 'rejected' }}</span>
          <span class="label">{{ row.e.label }}</span>
          <span v-if="row.e.verifyNote" class="note">{{ row.e.verifyNote }}</span>
          <pre>{{ JSON.stringify(row.e.header) }}

{{ JSON.stringify(row.e.payload, null, 2) }}</pre>
        </template>

        <template v-else-if="row.e.kind === 'http'">
          <span class="badge">{{ row.e.status }}</span>
          <span class="url">{{ row.e.method }} {{ row.e.url }}</span>
          <span v-if="row.e.note" class="note">{{ row.e.note }}</span>
          <pre v-if="row.e.body">{{ row.e.body }}</pre>
        </template>

        <template v-else-if="row.e.kind === 'decision'">
          <span class="badge">{{ row.e.label }}</span>
          <span class="url">policy decision</span>
          <span v-if="row.e.note" class="note">{{ row.e.note }}</span>
        </template>
      </li>
    </ol>

    <div v-if="result" class="verdict" :class="result.ok ? 'good' : 'bad'">
      <b>{{ result.status }}</b> {{ result.ok ? 'resource returned' : 'request refused' }}
    </div>
  </div>

  <div v-if="result" class="card">
    <h3>Response</h3>
    <pre>{{ JSON.stringify(result.body, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuth } from '../composables/useAuth';
import type { EndpointPolicy, TraceEvent } from '../types';

const props = defineProps<{ endpoints: Record<string, EndpointPolicy> }>();

const { user } = useAuth();

const PATHS = ['/api/public', '/api/internal', '/api/confidential', '/api/top-secret'];

const hour = new Date().getHours();

const endpoints = computed(() =>
  PATHS.map((path) => {
    const policy = props.endpoints[path];
    const hours = policy?.restricted_hours;
    return {
      path,
      clearance: policy?.required_clearance ?? '…',
      hours: hours ? `${pad(hours[0])}–${pad(hours[1])}` : '',
      openNow: !hours || (hour >= hours[0] && hour < hours[1]),
    };
  }),
);

function pad(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

interface Result {
  ok: boolean;
  status: number;
  body: unknown;
}

const events = ref<TraceEvent[]>([]);
const result = ref<Result | null>(null);
const label = ref('');
const chosen = ref('');
const busy = ref(false);

/* The step markers are numbered in the order the API reported them. */
const rows = computed(() => {
  let n = 0;
  return events.value.map((e) => ({ e, n: e.kind === 'step' ? ++n : 0 }));
});

async function call(ep: { path: string }) {
  busy.value = true;
  chosen.value = ep.path;
  label.value = `GET ${ep.path}`;
  events.value = [];
  result.value = null;

  try {
    const res = await fetch(`http://localhost:3002${ep.path}`, {
      headers: { Authorization: `Bearer ${user.value!.access_token}` },
    });
    const body = await res.json();
    events.value = body.trace ?? [];
    result.value = { ok: res.ok, status: res.status, body };
  } catch (err) {
    result.value = { ok: false, status: 0, body: { error: String(err) } };
  } finally {
    busy.value = false;
  }
}

/* A row is green when the step succeeded, red when it stopped the request. */
function rowClass(e: TraceEvent) {
  if (e.kind === 'decision') return e.allow ? 'good' : 'bad';
  if (e.kind === 'jwt') return e.verified ? 'good' : 'bad';
  if (e.kind === 'step') return 'step';
  return '';
}
</script>

<style scoped>
ul, ol { list-style: none; margin: 1rem 0 0; padding: 0; }

/* --- endpoint list ------------------------------------------------------- */
.runs li {
  display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
  padding: .65rem .25rem; border-bottom: 1px solid var(--border);
}
.runs li:last-child { border-bottom: none; }
.runs li.chosen {
  background: rgba(192, 132, 252, .045);
  border-radius: 8px; padding-left: .6rem;
}
.runs .expect { color: var(--color-text-muted); font-size: .83rem; flex: 1 1 22rem; }
.runs .expect b { color: #fff; font-weight: 500; }
.open   { color: var(--color-success); }
.closed { color: var(--color-spot-amber); }

button.route {
  background: rgba(192, 132, 252, .07); color: var(--color-spot);
  border-color: rgba(192, 132, 252, .28);
  font-family: var(--mono); font-size: .82rem; font-weight: 500;
}
button.route:hover:not(:disabled) { background: rgba(192, 132, 252, .14); }

/* --- decision trace ----------------------------------------------------- */
.trace li {
  display: flex; align-items: flex-start; gap: .65rem; flex-wrap: wrap;
  padding: .55rem .25rem; border-bottom: 1px solid var(--border);
}
.trace li:last-child { border-bottom: none; }

.trace li.step {
  border-bottom: none; padding-top: 1.15rem;
  font-weight: 600; color: var(--color-spot); font-size: .94rem;
}
.trace li.step:first-child { padding-top: .35rem; }
.trace .n {
  display: inline-grid; place-items: center; flex: none;
  width: 1.35rem; height: 1.35rem; border-radius: 50%;
  background: rgba(192, 132, 252, .13); border: 1px solid rgba(192, 132, 252, .35);
  font-size: .7rem; font-variant-numeric: tabular-nums;
}
.trace li.step .label { flex: 1 1 auto; font-weight: 600; }

.badge {
  font-size: .7rem; font-weight: 700; font-family: var(--mono);
  padding: .18rem .5rem; border-radius: 6px; white-space: nowrap; flex: none;
  background: rgba(150, 111, 241, .16); color: var(--color-link);
  border: 1px solid rgba(150, 111, 241, .3);
}
.good .badge {
  background: rgba(87, 199, 92, .14); color: var(--color-success);
  border-color: rgba(87, 199, 92, .32);
}
.bad .badge {
  background: rgba(242, 99, 95, .14); color: var(--danger);
  border-color: rgba(242, 99, 95, .32);
}

.trace .url { flex: 1 1 20rem; font-size: .84rem; font-family: var(--mono); word-break: break-all; }
.trace .label { flex: 1 1 12rem; font-size: .88rem; font-weight: 500; }
.trace .note {
  flex-basis: 100%; padding-left: .3rem; font-size: .82rem; color: var(--color-text-muted);
}
.trace .note.indented { padding-left: 2rem; font-weight: 400; }
.trace pre { flex-basis: 100%; margin: .5rem 0 .15rem; }

.verdict {
  margin-top: 1rem; padding: .7rem .9rem; border-radius: 8px; font-size: .88rem;
  display: flex; align-items: center; gap: .6rem;
}
.verdict b { font-family: var(--mono); font-weight: 700; }
.verdict.good {
  background: rgba(87, 199, 92, .09); color: var(--color-success);
  border: 1px solid rgba(87, 199, 92, .24);
}
.verdict.bad {
  background: rgba(242, 99, 95, .09); color: var(--danger);
  border: 1px solid rgba(242, 99, 95, .24);
}
</style>
