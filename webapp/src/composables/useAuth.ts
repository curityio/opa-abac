import { ref } from 'vue';
import { UserManager, User } from 'oidc-client-ts';

export const ISSUER = import.meta.env.ISSUER ?? 'https://localhost:8443/oauth/v2/oauth-anonymous';

const userManager = new UserManager({
  authority: ISSUER,
  client_id: 'abac-demo',
  redirect_uri: 'http://localhost:5173/callback',
  scope: 'openid clearance',
  response_type: 'code',
});

const user = ref<User | null>(null);

userManager.getUser().then((u) => {
  user.value = u;
});

export function useAuth() {
  function login() {
    userManager.signinRedirect();
  }

  async function handleCallback() {
    const u = await userManager.signinRedirectCallback();
    user.value = u;
    window.history.replaceState({}, document.title, '/');
  }

  async function logout() {
    await userManager.removeUser();
    user.value = null;
  }

  return { user, login, handleCallback, logout };
}
