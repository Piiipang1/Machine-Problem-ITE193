/**
 * script.js — ITE193 Student Account System
 * Machine Problem #3
 *
 * ─── HOW IT WORKS ────────────────────────────────────────────
 *
 * DATA LOADING & SAVING
 *   - On startup, users are loaded from localStorage ('ite193_users').
 *   - If localStorage is empty, the app fetches users.json and seeds it.
 *   - Any modification (register, change password) updates localStorage AND
 *     triggers a download of the updated users.json so the file stays current.
 *
 * LOGIN LOGIC
 *   - Credentials are matched against the user array by username + password.
 *   - On success, the logged-in user object is stored in sessionStorage so the
 *     session is cleared when the browser tab closes.
 *   - The dashboard is populated with the user's first name and profile data.
 *
 * CHANGE PASSWORD WORKFLOW
 *   1. Verify the user is currently logged in (sessionStorage check).
 *   2. Confirm the entered current password matches the stored password.
 *   3. Validate the new password strength and match with confirmation.
 *   4. Update the user object in the users array → save to localStorage → download JSON.
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

/* ════════════════════════════════════════════════════════════
   CONSTANTS & STATE
══════════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'ite193_users';
const SESSION_KEY = 'ite193_session';
const USERS_FILE = 'users.json';
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

// In-memory users array (loaded on init)
let users = [];

/* ════════════════════════════════════════════════════════════
   INITIALISATION
══════════════════════════════════════════════════════════════ */

/**
 * loadUsers()
 * Tries to read users from localStorage first (persisted data).
 * Falls back to fetching users.json (initial seed) if localStorage is empty.
 */
async function loadUsers() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    users = JSON.parse(stored);
    return;
  }

  // First-ever run: fetch the seed JSON file
  try {
    const response = await fetch(USERS_FILE);
    if (!response.ok) throw new Error('Could not load users.json');
    const data = await response.json();
    users = data.users || [];
    persistUsers(); // save seed data into localStorage
  } catch (err) {
    console.error('Failed to load users.json:', err);
    users = [];
  }
}

/**
 * persistUsers()
 * Saves the current users array to localStorage.
 */
function persistUsers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

/**
 * exportUsersJSON()
 * Triggers a browser download of the current users array as users.json
 * so the file on disk can be kept up to date.
 */
function exportUsersJSON() {
  const payload = JSON.stringify({ users }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = USERS_FILE;
  anchor.click();
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════════════════
   SESSION HELPERS
══════════════════════════════════════════════════════════════ */

/**
 * getSession()
 * Returns the currently logged-in user object, or null.
 */
function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

/**
 * setSession(userObj)
 * Stores the user object in sessionStorage (tab-scoped).
 */
function setSession(userObj) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
}

/**
 * clearSession()
 * Removes the session (logout).
 */
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/* ════════════════════════════════════════════════════════════
   SECTION / PAGE NAVIGATION
══════════════════════════════════════════════════════════════ */

/**
 * showSection(name)
 * Shows the requested section and hides all others.
 * Also syncs the navbar active state.
 * @param {string} name — 'login' | 'register' | 'dashboard' | 'changepass'
 */
function showSection(name) {
  const sections = ['login', 'register', 'dashboard', 'changepass'];

  sections.forEach(s => {
    const el = document.getElementById(`${s}Section`);
    if (el) el.classList.toggle('hidden', s !== name);
  });

  // Sync hero visibility: hide when logged in or on register page
  const heroSection = document.getElementById('heroSection');
  const session = getSession();
  if (heroSection) {
    heroSection.style.display = (session || name === 'register') ? 'none' : '';
  }

  // Update nav button active states
  const navLogin = document.getElementById('navLogin');
  const navRegister = document.getElementById('navRegister');
  if (navLogin) navLogin.classList.toggle('active', name === 'login');
  if (navRegister) navRegister.classList.toggle('active', name === 'register');

  // If navigating to change password, validate login status
  if (name === 'changepass') {
    renderChangePasswordGate();
  }

  // If navigating to dashboard, populate it
  if (name === 'dashboard' && session) {
    renderDashboard(session);
  }
}

/* ════════════════════════════════════════════════════════════
   AUTHENTICATION — LOGIN
══════════════════════════════════════════════════════════════ */

/**
 * login()
 * Validates username/password against the users array.
 * On success: stores session, updates navbar, shows dashboard.
 */
function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msgEl = document.getElementById('loginMsg');

  // Basic empty-field check
  if (!username || !password) {
    setMsg(msgEl, 'Please enter your username and password.', 'error');
    return;
  }

  const found = users.find(u => u.username === username && u.password === password);

  if (found) {
    setSession(found);
    updateNavbar();
    clearMsg(msgEl);
    showToast(`Welcome back, ${found.firstName}! 👋`);

    // Clear input fields
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';

    showSection('dashboard');
  } else {
    setMsg(msgEl, '✖ Incorrect username or password. Please try again.', 'error');
  }
}

/* ════════════════════════════════════════════════════════════
   AUTHENTICATION — LOGOUT
══════════════════════════════════════════════════════════════ */

/**
 * logout()
 * Clears the session and redirects back to the login screen.
 */
function logout() {
  clearSession();
  updateNavbar();
  showToast('You have been logged out. See you! 👋');
  showSection('login');
}

/* ════════════════════════════════════════════════════════════
   USER REGISTRATION — CREATE ACCOUNT
══════════════════════════════════════════════════════════════ */

/**
 * register()
 * Collects form values, validates them, and creates a new user profile.
 * Saves to localStorage and downloads updated users.json.
 */
function register() {
  const firstName = document.getElementById('regFirst').value.trim();
  const middleName = document.getElementById('regMiddle').value.trim();
  const lastName = document.getElementById('regLast').value.trim();
  const address = document.getElementById('regAddress').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  const msgEl = document.getElementById('registerMsg');

  // ── Validate required fields ──────────────────────────────
  if (!firstName || !lastName || !address || !email || !username || !password || !confirm) {
    setMsg(msgEl, '✖ All fields marked with * are required.', 'error');
    return;
  }

  // ── Validate email format ─────────────────────────────────
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setMsg(msgEl, '✖ Please enter a valid email address.', 'error');
    return;
  }

  // ── Check username uniqueness ─────────────────────────────
  if (users.some(u => u.username === username)) {
    setMsg(msgEl, `✖ Username "${username}" is already taken.`, 'error');
    return;
  }

  // ── Validate password strength ────────────────────────────
  if (!PASSWORD_REGEX.test(password)) {
    setMsg(msgEl, '✖ Password must be 8+ characters with uppercase, lowercase, and a special character.', 'error');
    return;
  }

  // ── Confirm passwords match ───────────────────────────────
  if (password !== confirm) {
    setMsg(msgEl, '✖ Passwords do not match.', 'error');
    return;
  }

  // ── Build new user profile ────────────────────────────────
  const newUser = { firstName, middleName, lastName, address, email, username, password };
  users.push(newUser);

  // ── Persist: localStorage + download JSON ─────────────────
  persistUsers();
  exportUsersJSON();

  // ── UI feedback ───────────────────────────────────────────
  setMsg(msgEl, '✔ Account created! You can now log in.', 'success');
  showToast('Account created successfully! 🎉');

  // Clear registration form
  clearRegisterForm();

  // Switch to login after a short delay
  setTimeout(() => {
    clearMsg(msgEl);
    showSection('login');
  }, 1800);
}

/**
 * clearRegisterForm()
 * Resets all registration input fields and strength bar.
 */
function clearRegisterForm() {
  ['regFirst', 'regMiddle', 'regLast', 'regAddress', 'regEmail', 'regUsername', 'regPassword', 'regConfirm']
    .forEach(id => { document.getElementById(id).value = ''; });

  const bar = document.getElementById('strengthBar');
  const label = document.getElementById('strengthLabel');
  if (bar) { bar.className = 'strength-bar'; bar.style.width = '0'; }
  if (label) { label.textContent = ''; }
}

/* ════════════════════════════════════════════════════════════
   CHANGE PASSWORD
══════════════════════════════════════════════════════════════ */

/**
 * renderChangePasswordGate()
 * Shows the change-password form only if the user is logged in.
 * Otherwise shows a login-required banner.
 */
function renderChangePasswordGate() {
  const session = getSession();
  const banner = document.getElementById('loginRequiredBanner');
  const formWrapper = document.getElementById('changePassForm');

  if (session) {
    banner.classList.add('hidden');
    formWrapper.style.display = '';
  } else {
    banner.classList.remove('hidden');
    formWrapper.style.display = 'none';
  }
}

/**
 * changePassword()
 * Verifies current password, validates the new one, updates the record,
 * persists to localStorage, and downloads the updated users.json.
 */
function changePassword() {
  const session = getSession();
  const msgEl = document.getElementById('cpMsg');

  // ── Guard: must be logged in ──────────────────────────────
  if (!session) {
    setMsg(msgEl, '✖ You must be logged in to change your password.', 'error');
    return;
  }

  const current = document.getElementById('cpCurrent').value;
  const newPass = document.getElementById('cpNew').value;
  const confirm = document.getElementById('cpConfirm').value;

  // ── Verify current password ───────────────────────────────
  const userRecord = users.find(u => u.username === session.username);
  if (!userRecord || userRecord.password !== current) {
    setMsg(msgEl, '✖ Current password is incorrect.', 'error');
    return;
  }

  // ── New password must differ ──────────────────────────────
  if (newPass === current) {
    setMsg(msgEl, '✖ New password must be different from the current one.', 'error');
    return;
  }

  // ── Validate new password strength ────────────────────────
  if (!PASSWORD_REGEX.test(newPass)) {
    setMsg(msgEl, '✖ Password must be 8+ characters with uppercase, lowercase, and a special character.', 'error');
    return;
  }

  // ── Confirm match ─────────────────────────────────────────
  if (newPass !== confirm) {
    setMsg(msgEl, '✖ New password and confirmation do not match.', 'error');
    return;
  }

  // ── Update record ─────────────────────────────────────────
  userRecord.password = newPass;

  // Refresh session with updated user object
  setSession(userRecord);

  // ── Persist: localStorage + download JSON ─────────────────
  persistUsers();
  exportUsersJSON();

  // ── UI feedback ───────────────────────────────────────────
  setMsg(msgEl, '✔ Password updated successfully!', 'success');
  showToast('Password changed! 🔐');

  // Clear fields
  ['cpCurrent', 'cpNew', 'cpConfirm'].forEach(id => { document.getElementById(id).value = ''; });
  const bar = document.getElementById('cpStrengthBar');
  const label = document.getElementById('cpStrengthLabel');
  if (bar) { bar.className = 'strength-bar'; }
  if (label) { label.textContent = ''; }

  setTimeout(() => clearMsg(msgEl), 3000);
}

/* ════════════════════════════════════════════════════════════
   DASHBOARD RENDERING
══════════════════════════════════════════════════════════════ */

/**
 * renderDashboard(user)
 * Populates all dashboard fields with the logged-in user's profile data.
 * @param {object} user — the session user object
 */
function renderDashboard(user) {
  // Avatar initials
  const avatar = document.getElementById('welcomeAvatar');
  if (avatar) avatar.textContent = user.firstName.charAt(0).toUpperCase() + user.lastName.charAt(0).toUpperCase();

  setText('welcomeName', `${user.firstName} ${user.lastName}`);
  setText('welcomeUsername', `@${user.username}`);
  setText('profileEmail', user.email);
  setText('profileAddress', user.address);
  setText('infoFullName', `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`);
  setText('infoEmail', user.email);
  setText('infoAddress', user.address);
  setText('infoUsername', user.username);
}

/* ════════════════════════════════════════════════════════════
   NAVBAR MANAGEMENT
══════════════════════════════════════════════════════════════ */

/**
 * updateNavbar()
 * Toggles between the guest nav (Login/Register) and the
 * authenticated nav (Welcome / Change Password / Logout).
 */
function updateNavbar() {
  const session = getSession();
  const navActions = document.getElementById('navActions');
  const navUser = document.getElementById('navUser');
  const navWelcome = document.getElementById('navWelcomeText');

  if (session) {
    navActions.style.display = 'none';
    navUser.style.display = 'flex';
    if (navWelcome) navWelcome.textContent = `Hello, ${session.firstName}!`;
  } else {
    navActions.style.display = 'flex';
    navUser.style.display = 'none';
  }
}

/* ════════════════════════════════════════════════════════════
   PASSWORD STRENGTH CHECKER
══════════════════════════════════════════════════════════════ */

/**
 * checkStrength(value, barId, labelId)
 * Updates a strength bar and label as the user types.
 * @param {string} value    — current password input value
 * @param {string} barId    — element ID of the strength bar div
 * @param {string} labelId  — element ID of the strength label span
 */
function checkStrength(value, barId = 'strengthBar', labelId = 'strengthLabel') {
  const bar = document.getElementById(barId);
  const label = document.getElementById(labelId);
  if (!bar || !label) return;

  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[a-z]/.test(value)) score++;
  if (/[\W_]/.test(value)) score++;
  if (value.length >= 12) score++;

  bar.className = 'strength-bar';
  if (!value) {
    label.textContent = '';
    return;
  }

  if (score <= 2) {
    bar.classList.add('weak');
    label.textContent = '⚠ Weak';
    label.style.color = 'var(--accent-3)';
  } else if (score <= 3) {
    bar.classList.add('medium');
    label.textContent = '~ Fair';
    label.style.color = 'var(--accent-yellow)';
  } else {
    bar.classList.add('strong');
    label.textContent = '✔ Strong';
    label.style.color = 'var(--accent-green)';
  }
}

/* ════════════════════════════════════════════════════════════
   PASSWORD VISIBILITY TOGGLE
══════════════════════════════════════════════════════════════ */

/**
 * togglePassword(inputId, btn)
 * Switches a password input between visible and masked.
 */
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁';
}

/* ════════════════════════════════════════════════════════════
   UI HELPERS
══════════════════════════════════════════════════════════════ */

/**
 * setMsg(el, text, type)
 * Displays a styled status message.
 * @param {HTMLElement} el   — target message container
 * @param {string} text      — message text
 * @param {string} type      — 'error' | 'success'
 */
function setMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = `msg-box ${type}`;
}

/**
 * clearMsg(el)
 * Removes all message text and styling.
 */
function clearMsg(el) {
  if (!el) return;
  el.textContent = '';
  el.className = 'msg-box';
}

/**
 * setText(id, value)
 * Safely sets the textContent of an element by ID.
 */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '—';
}

/* ════════════════════════════════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════════════════════════════════ */

let _toastTimer = null;

/**
 * showToast(message)
 * Briefly displays a pop-up notification at the bottom of the screen.
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ════════════════════════════════════════════════════════════
   PARTICLE ANIMATION
══════════════════════════════════════════════════════════════ */

/**
 * spawnParticles()
 * Creates floating background particles for visual depth.
 */
function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const colors = ['#6c63ff', '#00d4ff', '#ff6b6b', '#00e676', '#ffca28'];
  const COUNT = 22;

  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('div');
    p.className = 'particle';

    const size = Math.random() * 6 + 3;
    const left = Math.random() * 100;
    const delay = Math.random() * 18;
    const dur = Math.random() * 14 + 12;
    const color = colors[Math.floor(Math.random() * colors.length)];

    p.style.cssText = `
      width:  ${size}px;
      height: ${size}px;
      left:   ${left}%;
      background: ${color};
      animation-duration:  ${dur}s;
      animation-delay:    -${delay}s;
    `;

    container.appendChild(p);
  }
}

/* ════════════════════════════════════════════════════════════
   KEYBOARD SUPPORT — ENTER KEY SUBMISSION
══════════════════════════════════════════════════════════════ */

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;

  const loginSection = document.getElementById('loginSection');
  const regSection = document.getElementById('registerSection');
  const cpSection = document.getElementById('changepassSection');

  if (!loginSection.classList.contains('hidden')) login();
  else if (!regSection.classList.contains('hidden')) register();
  else if (!cpSection.classList.contains('hidden')) changePassword();
});

/* ════════════════════════════════════════════════════════════
   APP BOOTSTRAP
══════════════════════════════════════════════════════════════ */

/**
 * init()
 * Entry point — runs on DOMContentLoaded.
 * Loads users, checks for existing session, sets the correct view.
 */
async function init() {
  spawnParticles();
  await loadUsers();

  const session = getSession();

  if (session) {
    // Refresh session from latest users array (in case password changed)
    const fresh = users.find(u => u.username === session.username);
    if (fresh) setSession(fresh);

    updateNavbar();
    showSection('dashboard');
  } else {
    updateNavbar();
    showSection('login');
  }
}

document.addEventListener('DOMContentLoaded', init);