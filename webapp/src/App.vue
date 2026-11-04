<template>
  <div class="app">
    <div class="topbar">
      <div class="mark"><span class="glyph"></span>CURITY<sup>®</sup></div>
      <LoginFlow />
    </div>

    <header>
      <h1>Attribute-based access control<br /><span class="accent">with Curity and OPA</span></h1>
      <p class="sub">Curity issues an access token carrying <strong>attributes</strong> about the user —
        department and clearance, set by a script in Curity at token issuance. The API never looks the
        user up and never decides anything: it verifies the token, hands the claims to
        <strong>Open Policy Agent</strong>, and does what the policy says. Every call below shows
        <em>the whole decision</em>, not just its outcome.</p>
      <ul class="caps">
        <li :class="opa === null ? '' : opa ? 'ok' : 'bad'">
          <b>policy engine</b>{{ opa === null ? 'checking…' : opa ? 'OPA reachable on :8181' : 'OPA unreachable' }}
        </li>
        <li class="ok"><b>issuer</b>{{ issuerHost }}</li>
        <li :class="user ? 'ok' : ''"><b>session</b>{{ user ? user.profile.sub : 'not signed in' }}</li>
      </ul>
    </header>

    <main v-if="isCallback">
      <div class="card"><p class="hint">Completing login…</p></div>
    </main>

    <main v-else-if="user">
      <TokenDisplay />
      <ApiTester :endpoints="endpoints" />
    </main>

    <main v-else>
      <div class="card">
        <h2>What this demo shows</h2>
        <div class="prose">
          <p>Access is not granted by <strong>who you are</strong> but by <strong>what is true about
            you at this moment</strong>. Two people with the same role can get different answers if
            their clearance differs — and the same person gets different answers at 10:00 and at
            22:00.</p>
          <p>Three moving parts: Curity mints the token and enriches it with attributes from a
            claims script; the API verifies the signature against the issuer's JWKS; OPA holds
            the rules in <code>authz.rego</code> and the endpoint requirements in
            <code>data.json</code>. Changing who may see what means editing policy, not the API.</p>
        </div>
        <p class="hint">Sign in to walk through it.</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import LoginFlow from './components/LoginFlow.vue';
import TokenDisplay from './components/TokenDisplay.vue';
import ApiTester from './components/ApiTester.vue';
import { useAuth, ISSUER } from './composables/useAuth';
import type { EndpointPolicy } from './types';

const { user, handleCallback } = useAuth();

const issuerHost = new URL(ISSUER).host;
const isCallback = ref(window.location.search.includes('code='));
const opa = ref<boolean | null>(null);
const endpoints = ref<Record<string, EndpointPolicy>>({});

onMounted(async () => {
  if (isCallback.value) {
    await handleCallback();
    isCallback.value = false;
  }

  try {
    const res = await fetch('http://localhost:3002/status');
    const body = await res.json();
    opa.value = body.opa;
    endpoints.value = body.endpoints;
  } catch {
    opa.value = false;
  }
});
</script>

<style>
/* Tokens taken from curity.io's own stylesheet, with two departures noted below. */
:root {
  --color-bg:         #05050d;
  --surface-darker:   #0a041f;
  --surface-dark:     #201a32;
  --color-spot:       #c084fc;
  --color-spot-light: #e8d2ff;
  --color-spot-dark:  #552a8d;
  --color-spot-amber: #f59e3a;
  --color-link:       #966ff1;
  --color-success:    #57c75c;
  --color-text:       #fff;
  --color-text-muted: hsla(0, 0%, 100%, .7);
  --intro-grid-line:  hsla(0, 0%, 100%, .08);
  --intro-grid-dot:   hsla(0, 0%, 100%, .35);
  --border-radius:    8px;

  /* Brand --color-danger #ca2e2b fails contrast on #05050d, so it is lifted here;
     and cards sit between --surface-darker and --surface-dark, which are further
     apart than a card-on-page relationship wants. */
  --danger: #f2635f;
  --card:   #0e0a1d;
  --border: #241d3a;
  --ink:    #060411;

  --font: "Google Sans", GoogleSans-Regular, -apple-system, BlinkMacSystemFont,
          "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.app { max-width: 1140px; margin: 0 auto; }

/* --- top bar -------------------------------------------------------------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.15rem 2.25rem;
  border-bottom: 1px solid var(--border);
}
.mark {
  display: flex; align-items: center; gap: .6rem;
  font-weight: 700; letter-spacing: .14em; font-size: 1.02rem;
}
/* Stand-in for the Curity logotype — swap in the real asset when it is to hand. */
.mark .glyph { width: 34px; height: 22px; position: relative; flex: none; }
.mark .glyph::before {
  content: ""; position: absolute; inset: 0 0 0 9px;
  border: 3.5px solid #fff; border-radius: 50%;
  clip-path: polygon(0 0, 62% 0, 62% 100%, 0 100%);
}
.mark .glyph::after {
  content: ""; position: absolute; left: 0; top: 5px; width: 11px; height: 12px;
  background:
    linear-gradient(#fff 0 0) 0 0    / 100% 3px no-repeat,
    linear-gradient(#fff 0 0) 0 4.5px /  72% 3px no-repeat,
    linear-gradient(#fff 0 0) 0 9px  / 100% 3px no-repeat;
}
.mark sup { font-size: .55em; letter-spacing: 0; opacity: .8; }

/* --- header, carrying the site's grid-and-dots motif ---------------------- */
header {
  position: relative; overflow: hidden;
  padding: 3rem 2.25rem 1.75rem;
  background:
    radial-gradient(120% 90% at 22% -10%, rgba(85, 42, 141, .55), transparent 62%),
    linear-gradient(#0a0820, #06050f 60%, #050410);
  border-bottom: 1px solid var(--border);
}
header::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(to right,  var(--intro-grid-line) 1px, transparent 1px) 0 0 / 150px 150px,
    linear-gradient(to bottom, var(--intro-grid-line) 1px, transparent 1px) 0 0 / 150px 150px,
    radial-gradient(var(--intro-grid-dot) 1.6px, transparent 1.7px) 0 0 / 150px 150px;
  mask-image: linear-gradient(#000 20%, transparent 95%);
}
header > * { position: relative; }

h1 {
  margin: 0 0 .55rem;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 500; letter-spacing: -.015em; line-height: 1.15;
}
h1 .accent { color: var(--color-spot); }
.sub { margin: 0; color: var(--color-text-muted); max-width: 70ch; font-size: 1.02rem; }
.sub strong { color: var(--color-spot-light); font-weight: 500; }
.sub em { color: #fff; font-style: normal; }

/* Capability pills read straight off the running services */
.caps { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1.5rem 0 0; padding: 0; list-style: none; }
.caps li {
  display: flex; align-items: center; gap: .5rem;
  border: 1px solid var(--border); border-radius: 999px;
  padding: .28rem .8rem; font-size: .78rem; color: var(--color-text-muted);
  background: rgba(32, 26, 50, .55); backdrop-filter: blur(4px);
}
.caps li::before {
  content: ""; width: .45rem; height: .45rem; border-radius: 50%;
  background: var(--color-text-muted); flex: none;
}
.caps li.ok::before  { background: var(--color-success); box-shadow: 0 0 0 3px rgba(87, 199, 92, .16); }
.caps li.bad::before { background: var(--danger);        box-shadow: 0 0 0 3px rgba(242, 99, 95, .16); }
.caps li b { color: #fff; font-weight: 500; }

/* --- cards ---------------------------------------------------------------- */
main { padding: 1.75rem 2.25rem 3.5rem; display: flex; flex-direction: column; gap: 1.1rem; }

.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.4rem 1.5rem;
}
.card h2, .card h3 {
  margin: 0; font-size: 1.06rem; font-weight: 500; letter-spacing: -.005em;
  display: flex; align-items: center; gap: .6rem;
}
.hint { color: var(--color-text-muted); font-size: .85rem; margin: .5rem 0 0; max-width: 82ch; }
.prose { color: var(--color-text-muted); font-size: .92rem; max-width: 78ch; margin: .6rem 0 0; }
.prose p { margin: 0 0 .6rem; }
.prose p:last-child { margin-bottom: 0; }
.prose strong { color: #fff; font-weight: 500; }

code {
  font-family: var(--mono); font-size: .84em;
  background: var(--ink); border: 1px solid var(--border);
  padding: .08rem .35rem; border-radius: 5px; color: var(--color-spot-light);
}

pre {
  background: var(--ink); border: 1px solid var(--border);
  padding: .85rem 1rem; border-radius: 8px; margin: 0;
  font-family: var(--mono); font-size: .78rem; line-height: 1.5;
  color: #cfc7e6; overflow-x: auto;
}

button {
  font: inherit; font-size: .87rem; font-weight: 500;
  border-radius: var(--border-radius); padding: .5rem 1.05rem;
  cursor: pointer; border: 1px solid transparent; white-space: nowrap;
  background: var(--color-spot); color: #1b0a2e; font-weight: 600;
}
button:disabled { opacity: .5; cursor: default; }
button.ghost {
  background: transparent; color: var(--color-spot-light);
  border-color: var(--border); font-weight: 500;
}
button.ghost:hover:not(:disabled) { border-color: var(--color-spot-dark); }

.live {
  font-size: .62rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase;
  color: var(--color-success); background: rgba(87, 199, 92, .14);
  border: 1px solid rgba(87, 199, 92, .3);
  padding: .16rem .5rem; border-radius: 999px;
}

@media (max-width: 820px) {
  .topbar, main, header { padding-left: 1rem; padding-right: 1rem; }
}
</style>
