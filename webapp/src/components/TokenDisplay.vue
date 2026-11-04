<template>
  <div class="card" v-if="claims">
    <h3>Attributes on the access token</h3>
    <p class="hint">A claims script in Curity set these values during token issuance and put them
      here. These claims are the only thing the policy engine gets to reason about.</p>
    <table>
      <tbody>
        <tr><td class="k">sub</td><td>{{ claims.sub }}</td></tr>
        <tr><td class="k">department</td><td>{{ claims.department ?? '—' }}</td></tr>
        <tr>
          <td class="k">clearance</td>
          <td><span class="chip">{{ claims.clearance ?? '—' }}</span></td>
        </tr>
        <tr><td class="k">expires</td><td>{{ expiresAt }}</td></tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../composables/useAuth';

interface TokenClaims {
  sub?: string;
  department?: string;
  clearance?: string;
  exp?: number;
  [key: string]: unknown;
}

const { user } = useAuth();

const claims = computed<TokenClaims | null>(() => {
  if (!user.value?.access_token) return null;
  return jwtDecode<TokenClaims>(user.value.access_token);
});

const expiresAt = computed(() => {
  if (!claims.value?.exp) return '—';
  return new Date(claims.value.exp * 1000).toLocaleTimeString();
});
</script>

<style scoped>
table { border-collapse: collapse; width: 100%; font-size: .88rem; margin-top: 1rem; }
td { padding: .5rem .55rem; border-bottom: 1px solid var(--border); }
tr:last-child td { border-bottom: none; }
td.k {
  font-family: var(--mono); width: 10rem;
  color: var(--color-text-muted); font-size: .84rem;
}
.chip {
  padding: .18rem .65rem; border-radius: 999px;
  font-size: .74rem; font-weight: 600;
  background: rgba(192, 132, 252, .13); color: var(--color-spot);
  border: 1px solid rgba(192, 132, 252, .32);
}
</style>
