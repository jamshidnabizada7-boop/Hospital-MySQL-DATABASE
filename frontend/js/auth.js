/**
 * auth.js — Login / logout / session
 */
const Auth = {
  user: null,

  async init() {
    const token = localStorage.getItem('hms_token');
    if (!token) { this.showLogin(); return; }
    Api.setToken(token);
    const res = await Api.get('/auth/me');
    if (res.success) {
      this.user = res.user;
      this.showApp();
    } else {
      this.showLogin();
    }
  },

  async login(username, password) {
    const res = await Api.post('/auth/login', { username, password });
    if (res.success) {
      Api.setToken(res.token);
      this.user = res.user;
      this.showApp();
      Toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`);
    } else {
      Toast.error(res.message || 'Login failed');
    }
    return res.success;
  },

  logout() {
    Api.setToken(null);
    this.user = null;
    this.showLogin();
  },

  showLogin() {
    show('auth-screen');
    hide('app');
  },

  showApp() {
    hide('auth-screen');
    show('app');
    App.init(this.user);
  },
};

// Login form handler
document.addEventListener('DOMContentLoaded', () => {
  const form = $('login-form');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      const ok = await Auth.login(
        $('login-username').value.trim(),
        $('login-password').value
      );
      if (!ok) {
        btn.disabled  = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  // Boot
  Auth.init();
});
