<template>
  <div class="login-flow">
    <template v-if="user">
      <span class="who">{{ user.profile.sub }}</span>
      <button class="ghost" @click="logout">Log out</button>
    </template>
    <template v-else>
      <button @click="login">Log in</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '../composables/useAuth';

const { user, login, logout } = useAuth();
</script>

<style scoped>
.login-flow {
  display: flex;
  align-items: center;
  gap: .85rem;
  flex: none;
}
.who {
  font-size: .82rem;
  color: var(--color-text-muted);
}
</style>
