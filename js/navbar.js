import { auth } from './firebase.js';

const updateAuthNav = (user) => {
  const login = document.getElementById('loginBtn');
  const dashboard = document.getElementById('dashboardBtn');
  if (login) login.style.display = user ? 'none' : 'inline-flex';
  if (dashboard) dashboard.style.display = user ? 'inline-flex' : 'none';
};

auth.onAuthStateChanged(updateAuthNav);
