// ==================== API CONFIG ====================
const API_BASE = 'http://localhost:3000/api';

// Events now live in the database â€” this starts empty and is filled
// in by fetchEvents() on page load instead of being hardcoded here.
let eventsData = [];

// Global State
let currentEvent = null;
let selectedSeats = [];
let filteredEvents = [];
let adminToken = localStorage.getItem('tixhubAdminToken') || null;
let creatorToken = localStorage.getItem('tixhubCreatorToken') || null;
let creatorName = localStorage.getItem('tixhubCreatorName') || null;
let editingEventId = null;
let pendingBookingEventId = null;
let isBookingAuthMode = false;
let userAuthIntent = null; // null | 'booking' | 'my-bookings' | 'general'

function getStoredToken() {
    return localStorage.getItem('tixhubToken') || localStorage.getItem('tixhubCreatorToken') || localStorage.getItem('tixhubAdminToken');
}

function getClientId() {
    let clientId = localStorage.getItem('tixhubClientId');
    if (!clientId) {
        clientId = 'client_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem('tixhubClientId', clientId);
    }
    return clientId;
}

function getAuthHeaders(includeJson = true) {
    const headers = {};
    const token = getStoredToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    if (includeJson) {
        headers["Content-Type"] = "application/json";
    }
    return headers;
}

async function fetchEvents() {
    try {
        const response = await fetch(`${API_BASE}/events`);
        if (!response.ok) throw new Error('Failed to fetch events');
        eventsData = await response.json();
        filteredEvents = [...eventsData];
    } catch (error) {
        console.error('Unable to load events from server', error);
        showNotification('Could not reach the server. Is the backend running?', 'error');
        eventsData = [];
        filteredEvents = [];
    }
}

function getCategoryIcon(category) {
    if (category === 'movie') return '🎬';
    if (category === 'live') return '🎸';
    if (category === 'college') return '🎓';
    return '🎫';
}

function clearAuthInputs() {
    const ids = [
        'userLoginEmail',
        'userLoginPassword',
        'userRegisterName',
        'userRegisterEmail',
        'userRegisterPassword',
        'adminUsername',
        'adminPassword',
        'creatorLoginEmail',
        'creatorLoginPassword',
        'creatorRegisterName',
        'creatorRegisterEmail',
        'creatorRegisterPassword'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function isRegularUserLoggedIn() {
    const userToken = localStorage.getItem('tixhubToken');
    const userId = localStorage.getItem('tixhubUserId');
    const isCreator = Boolean(localStorage.getItem('tixhubCreatorToken'));
    const isAdmin = Boolean(localStorage.getItem('tixhubAdminToken'));
    return Boolean(userToken && userId && !isCreator && !isAdmin);
}

function isUserLoggedIn() {
    return isRegularUserLoggedIn();
}

function hideOverlay() {
    clearAuthInputs();
    isBookingAuthMode = false;
    userAuthIntent = null;
    pendingBookingEventId = null;
    const authOverlay = document.getElementById('authOverlay');
    if (authOverlay) {
        authOverlay.style.display = 'none';
    }
}

function openAuthOverlay() {
    pendingBookingEventId = null;
    isBookingAuthMode = false;
    userAuthIntent = 'general';
    clearAuthInputs();

    const authOverlay = document.getElementById('authOverlay');
    const roleActions = document.getElementById('authRoleActions');
    const headerTitle = document.getElementById('authHeaderTitle');
    const headerSubtitle = document.getElementById('authHeaderSubtitle');
    const userBox = document.getElementById('userLoginBox');
    const adminBox = document.getElementById('adminLoginBox');
    const creatorBox = document.getElementById('creatorLoginBox');
    const userBoxTitle = document.getElementById('userBoxTitle');
    const userBackBtn = document.getElementById('userBackBtn');

    if (headerTitle) headerTitle.textContent = 'Welcome to TixHub';
    if (headerSubtitle) headerSubtitle.textContent = 'Select your role to continue';
    if (roleActions) roleActions.style.display = 'flex';
    if (userBoxTitle) userBoxTitle.textContent = 'User Login / Register';
    if (userBackBtn) {
        userBackBtn.textContent = 'Back to Roles';
        userBackBtn.onclick = handleUserBack;
    }

    if (authOverlay) authOverlay.style.display = 'flex';
    if (userBox) userBox.classList.add('hidden');
    if (adminBox) adminBox.classList.add('hidden');
    if (creatorBox) creatorBox.classList.add('hidden');
}

// STRICT USER-ONLY AUTH: Exclusively opens user login/register, hides all creator & admin options
function showUserLoginOnly(intent, eventId) {
    userAuthIntent = intent || 'booking';
    isBookingAuthMode = (userAuthIntent === 'booking');
    pendingBookingEventId = eventId || null;
    clearAuthInputs();

    const authOverlay = document.getElementById('authOverlay');
    const roleActions = document.getElementById('authRoleActions');
    const headerTitle = document.getElementById('authHeaderTitle');
    const headerSubtitle = document.getElementById('authHeaderSubtitle');
    const userBox = document.getElementById('userLoginBox');
    const adminBox = document.getElementById('adminLoginBox');
    const creatorBox = document.getElementById('creatorLoginBox');
    const userBoxTitle = document.getElementById('userBoxTitle');
    const userBackBtn = document.getElementById('userBackBtn');

    // Hide role selectors and creator/admin forms completely
    if (roleActions) roleActions.style.display = 'none';
    if (adminBox) adminBox.classList.add('hidden');
    if (creatorBox) creatorBox.classList.add('hidden');

    if (userAuthIntent === 'my-bookings') {
        if (headerTitle) headerTitle.textContent = 'User Login Required';
        if (headerSubtitle) headerSubtitle.textContent = 'Please log in or register with a User account to view your bookings.';
        if (userBoxTitle) userBoxTitle.textContent = 'User Login / Register for Bookings';
    } else {
        if (headerTitle) headerTitle.textContent = 'User Login Required';
        if (headerSubtitle) headerSubtitle.textContent = 'Please log in or register with a User account to book tickets. Creators and admins cannot book events.';
        if (userBoxTitle) userBoxTitle.textContent = 'User Login / Register to Book';
    }

    if (userBackBtn) {
        userBackBtn.textContent = 'Cancel';
        userBackBtn.onclick = hideOverlay;
    }

    if (userBox) userBox.classList.remove('hidden');
    if (authOverlay) authOverlay.style.display = 'flex';
    showLoginForm();
}

function showUserLoginOnlyForBooking(eventId) {
    showUserLoginOnly('booking', eventId);
}

function showUserLoginOnlyForMyBookings() {
    showUserLoginOnly('my-bookings');
}

function showUserLogin() {
    clearAuthInputs();
    const authOverlay = document.getElementById('authOverlay');
    const roleActions = document.getElementById('authRoleActions');
    const headerTitle = document.getElementById('authHeaderTitle');
    const headerSubtitle = document.getElementById('authHeaderSubtitle');
    const userBox = document.getElementById('userLoginBox');
    const adminBox = document.getElementById('adminLoginBox');
    const creatorBox = document.getElementById('creatorLoginBox');
    const userBoxTitle = document.getElementById('userBoxTitle');
    const userBackBtn = document.getElementById('userBackBtn');

    if (roleActions) roleActions.style.display = 'none';
    if (headerTitle) headerTitle.textContent = 'User Login';
    if (headerSubtitle) headerSubtitle.textContent = 'Log in or register with your User account to continue';
    if (userBoxTitle) userBoxTitle.textContent = 'User Login / Register';
    if (userBackBtn) {
        userBackBtn.textContent = 'Back to Roles';
        userBackBtn.onclick = handleUserBack;
    }

    if (authOverlay) authOverlay.style.display = 'flex';
    if (userBox) userBox.classList.remove('hidden');
    if (adminBox) adminBox.classList.add('hidden');
    if (creatorBox) creatorBox.classList.add('hidden');
    showLoginForm();
}

function hideUserLogin() {
    clearAuthInputs();
    if (userAuthIntent === 'booking' || userAuthIntent === 'my-bookings' || isBookingAuthMode) {
        hideOverlay();
        return;
    }
    const userBox = document.getElementById('userLoginBox');
    if (userBox) userBox.classList.add('hidden');
    const headerTitle = document.getElementById('authHeaderTitle');
    const headerSubtitle = document.getElementById('authHeaderSubtitle');
    if (headerTitle) headerTitle.textContent = 'Welcome to TixHub';
    if (headerSubtitle) headerSubtitle.textContent = 'Select your role to continue';
    const roleActions = document.getElementById('authRoleActions');
    if (roleActions) roleActions.style.display = 'flex';
}

function handleUserBack() {
    if (userAuthIntent === 'booking' || userAuthIntent === 'my-bookings' || isBookingAuthMode) {
        hideOverlay();
    } else {
        hideUserLogin();
    }
}

function showRegisterForm() {
    clearAuthInputs();
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const userBoxTitle = document.getElementById('userBoxTitle');
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
    if (userBoxTitle) {
        if (userAuthIntent === 'booking') {
            userBoxTitle.textContent = 'Create User Account to Book';
        } else if (userAuthIntent === 'my-bookings') {
            userBoxTitle.textContent = 'Create User Account for Bookings';
        } else {
            userBoxTitle.textContent = 'Create User Account';
        }
    }
}

function showLoginForm() {
    clearAuthInputs();
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const userBoxTitle = document.getElementById('userBoxTitle');
    if (registerForm) registerForm.classList.add('hidden');
    if (loginForm) loginForm.classList.remove('hidden');
    if (userBoxTitle) {
        if (userAuthIntent === 'booking') {
            userBoxTitle.textContent = 'User Login to Book';
        } else if (userAuthIntent === 'my-bookings') {
            userBoxTitle.textContent = 'User Login for Bookings';
        } else {
            userBoxTitle.textContent = 'User Login';
        }
    }
}

// ==================== CREATOR AUTH MODAL ====================
function showCreatorLogin() {
    clearAuthInputs();
    const authOverlay = document.getElementById('authOverlay');
    const roleActions = document.getElementById('authRoleActions');
    const headerTitle = document.getElementById('authHeaderTitle');
    const headerSubtitle = document.getElementById('authHeaderSubtitle');
    const userBox = document.getElementById('userLoginBox');
    const adminBox = document.getElementById('adminLoginBox');
    const creatorBox = document.getElementById('creatorLoginBox');
    if (roleActions) roleActions.style.display = 'none';
    if (headerTitle) headerTitle.textContent = 'Creator Portal';
    if (headerSubtitle) headerSubtitle.textContent = 'Log in to manage your events or create a new creator account';
    if (authOverlay) authOverlay.style.display = 'flex';
    if (userBox) userBox.classList.add('hidden');
    if (adminBox) adminBox.classList.add('hidden');
    if (creatorBox) creatorBox.classList.remove('hidden');
    showCreatorLoginForm();
}

function hideCreatorLogin() {
    clearAuthInputs();
    const creatorBox = document.getElementById('creatorLoginBox');
    if (creatorBox) creatorBox.classList.add('hidden');
    const headerTitle = document.getElementById('authHeaderTitle');
    const headerSubtitle = document.getElementById('authHeaderSubtitle');
    if (headerTitle) headerTitle.textContent = 'Welcome to TixHub';
    if (headerSubtitle) headerSubtitle.textContent = 'Select your role to continue';
    const roleActions = document.getElementById('authRoleActions');
    if (roleActions) roleActions.style.display = 'flex';
}

function showCreatorRegisterForm() {
    clearAuthInputs();
    const loginForm = document.getElementById('creatorLoginForm');
    const registerForm = document.getElementById('creatorRegisterForm');
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
}

function showCreatorLoginForm() {
    clearAuthInputs();
    const loginForm = document.getElementById('creatorLoginForm');
    const registerForm = document.getElementById('creatorRegisterForm');
    if (registerForm) registerForm.classList.add('hidden');
    if (loginForm) loginForm.classList.remove('hidden');
}

function openCreatorRegisterModal() {
    clearAuthInputs();
    const authOverlay = document.getElementById('authOverlay');
    const roleActions = document.getElementById('authRoleActions');
    const headerTitle = document.getElementById('authHeaderTitle');
    const headerSubtitle = document.getElementById('authHeaderSubtitle');
    const userBox = document.getElementById('userLoginBox');
    const adminBox = document.getElementById('adminLoginBox');
    const creatorBox = document.getElementById('creatorLoginBox');
    if (roleActions) roleActions.style.display = 'none';
    if (headerTitle) headerTitle.textContent = 'Host Events on TixHub';
    if (headerSubtitle) headerSubtitle.textContent = 'Create your creator account to list and manage events';
    if (authOverlay) authOverlay.style.display = 'flex';
    if (userBox) userBox.classList.add('hidden');
    if (adminBox) adminBox.classList.add('hidden');
    if (creatorBox) creatorBox.classList.remove('hidden');
    showCreatorRegisterForm();
}

function handleCreatorNavClick() {
    const isCreator = Boolean(localStorage.getItem('tixhubCreatorToken'));
    if (isCreator) {
        const dashboard = document.getElementById('adminDashboard');
        if (dashboard) smoothScroll(dashboard);
    } else {
        openCreatorRegisterModal();
    }
}

async function registerUser() {
    const name = document.getElementById('userRegisterName').value.trim();
    const email = document.getElementById('userRegisterEmail').value.trim();
    const password = document.getElementById('userRegisterPassword').value;

    if (!name || !email || !password) {
        showNotification('Please fill name, email and password', 'warning');
        return;
    }

    try {
        const resp = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await resp.json();
        if (!resp.ok) {
            showNotification(data.error || 'Registration failed', 'error');
            return;
        }
        clearAuthInputs();
        // Clear other sessions
        adminToken = null;
        localStorage.removeItem('tixhubAdminToken');
        localStorage.removeItem('tixhubAdminName');
        creatorToken = null;
        creatorName = null;
        localStorage.removeItem('tixhubCreatorToken');
        localStorage.removeItem('tixhubCreatorName');
        localStorage.removeItem('tixhubCreatorId');
        localStorage.removeItem('tixhubCreatorEmail');

        setStoredUser(data.userId, data.name, data.email, data.token);
        updateUserUI();
        const currentIntent = userAuthIntent;
        const nextEventId = pendingBookingEventId;
        userAuthIntent = null;
        pendingBookingEventId = null;
        isBookingAuthMode = false;
        hideOverlay();
        showNotification('Registration successful. You are now logged in.', 'success');
        if ((currentIntent === 'booking' || nextEventId) && nextEventId) {
            setTimeout(() => openBookingModal(nextEventId), 350);
        } else if (currentIntent === 'my-bookings') {
            setTimeout(() => viewMyBookings(), 350);
        }
    } catch (err) {
        console.error(err);
        showNotification('Could not reach the server.', 'error');
    }
}

async function userLogin() {
    const email = document.getElementById('userLoginEmail').value.trim();
    const password = document.getElementById('userLoginPassword').value;
    if (!email || !password) {
        showNotification('Please enter email and password', 'warning');
        return;
    }

    try {
        const resp = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await resp.json();
        if (!resp.ok) {
            showNotification(data.error || 'Login failed', 'error');
            return;
        }
        clearAuthInputs();

        // Clear any previous admin & creator session
        adminToken = null;
        localStorage.removeItem('tixhubAdminToken');
        localStorage.removeItem('tixhubAdminName');
        creatorToken = null;
        creatorName = null;
        localStorage.removeItem('tixhubCreatorToken');
        localStorage.removeItem('tixhubCreatorName');
        localStorage.removeItem('tixhubCreatorId');
        localStorage.removeItem('tixhubCreatorEmail');

        if (data.role === 'creator') {
            pendingBookingEventId = null;
            isBookingAuthMode = false;
            userAuthIntent = null;
            creatorToken = data.token;
            creatorName = data.name;
            localStorage.setItem('tixhubCreatorToken', data.token);
            localStorage.setItem('tixhubCreatorName', data.name);
            localStorage.setItem('tixhubCreatorId', String(data.userId));
            localStorage.setItem('tixhubCreatorEmail', data.email || email);
            updateUserUI();
            hideOverlay();
            showNotification(`Welcome back, Creator ${data.name}! Note: Creator accounts cannot book tickets.`, 'info');
            const sec = document.getElementById('adminDashboard');
            if (sec) setTimeout(() => smoothScroll(sec), 300);
            return;
        }

        setStoredUser(data.userId, data.name, data.email || email, data.token);
        updateUserUI();
        const currentIntent = userAuthIntent;
        const nextEventId = pendingBookingEventId;
        userAuthIntent = null;
        pendingBookingEventId = null;
        isBookingAuthMode = false;
        hideOverlay();
        showNotification(`Welcome back, ${data.name}`, 'success');
        if ((currentIntent === 'booking' || nextEventId) && nextEventId) {
            setTimeout(() => openBookingModal(nextEventId), 350);
        } else if (currentIntent === 'my-bookings') {
            setTimeout(() => viewMyBookings(), 350);
        }
    } catch (err) {
        console.error(err);
        showNotification('Could not reach the server.', 'error');
    }
}

async function registerCreator() {
    const name = document.getElementById('creatorRegisterName').value.trim();
    const email = document.getElementById('creatorRegisterEmail').value.trim();
    const password = document.getElementById('creatorRegisterPassword').value;

    if (!name || !email || !password) {
        showNotification('Please fill in creator name, email and password', 'warning');
        return;
    }
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'warning');
        return;
    }

    try {
        const resp = await fetch(`${API_BASE}/auth/register-creator`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await resp.json();
        if (!resp.ok) {
            showNotification(data.error || 'Creator registration failed', 'error');
            return;
        }

        clearAuthInputs();
        // Clear other sessions
        clearStoredUser();
        adminToken = null;
        localStorage.removeItem('tixhubAdminToken');
        localStorage.removeItem('tixhubAdminName');

        // Store creator session
        creatorToken = data.token;
        creatorName = data.name;
        localStorage.setItem('tixhubCreatorToken', data.token);
        localStorage.setItem('tixhubCreatorName', data.name);
        localStorage.setItem('tixhubCreatorId', String(data.userId));
        localStorage.setItem('tixhubCreatorEmail', data.email || email);

        hideOverlay();
        updateUserUI();
        showNotification(`Creator account created! Welcome ${data.name}. You can now create events.`, 'success');

        const sec = document.getElementById('adminDashboard');
        if (sec) setTimeout(() => smoothScroll(sec), 300);
    } catch (err) {
        console.error(err);
        showNotification('Could not reach the server.', 'error');
    }
}

async function creatorLogin() {
    const email = document.getElementById('creatorLoginEmail').value.trim();
    const password = document.getElementById('creatorLoginPassword').value;

    if (!email || !password) {
        showNotification('Please enter creator email and password', 'warning');
        return;
    }

    try {
        const resp = await fetch(`${API_BASE}/auth/creator-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await resp.json();
        if (!resp.ok) {
            showNotification(data.error || 'Invalid creator credentials', 'error');
            return;
        }

        clearAuthInputs();
        // Clear other sessions
        clearStoredUser();
        adminToken = null;
        localStorage.removeItem('tixhubAdminToken');
        localStorage.removeItem('tixhubAdminName');

        // Store creator session
        creatorToken = data.token;
        creatorName = data.name;
        localStorage.setItem('tixhubCreatorToken', data.token);
        localStorage.setItem('tixhubCreatorName', data.name);
        localStorage.setItem('tixhubCreatorId', String(data.userId));
        localStorage.setItem('tixhubCreatorEmail', data.email || email);

        hideOverlay();
        updateUserUI();
        showNotification(`Welcome back, Creator ${data.name}!`, 'success');

        const sec = document.getElementById('adminDashboard');
        if (sec) setTimeout(() => smoothScroll(sec), 300);
    } catch (err) {
        console.error(err);
        showNotification('Could not reach the server.', 'error');
    }
}

async function logoutCreator() {
    if (creatorToken) {
        try {
            await fetch(`${API_BASE}/auth/creator-logout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${creatorToken}` }
            });
        } catch (error) {
            console.warn('Creator logout request failed', error);
        }
    }

    creatorToken = null;
    creatorName = null;
    localStorage.removeItem('tixhubCreatorToken');
    localStorage.removeItem('tixhubCreatorName');
    localStorage.removeItem('tixhubCreatorId');
    localStorage.removeItem('tixhubCreatorEmail');
    clearAuthInputs();

    updateUserUI();
    showNotification('Creator logged out', 'info');
}

function setStoredUser(id, name, email, token) {
    try {
        localStorage.setItem('tixhubUserId', String(id));
        localStorage.setItem('tixhubUserName', name || '');
        localStorage.setItem('tixhubUserEmail', email || '');
        if (token) {
            localStorage.setItem('tixhubToken', token);
        }
    } catch (e) {
        console.warn('Failed to persist user info', e);
    }
}

function clearStoredUser() {
    localStorage.removeItem('tixhubUserId');
    localStorage.removeItem('tixhubUserName');
    localStorage.removeItem('tixhubUserEmail');
    localStorage.removeItem('tixhubToken');
    clearAuthInputs();
    updateUserUI();
}

function updateUserUI() {
    const nav = document.getElementById('userNavLink');
    const logoutItem = document.getElementById('logoutNavItem');
    const logoutBtn = document.getElementById('userLogoutBtn');
    const adminDashboardNav = document.getElementById('adminDashboardNavItem');
    const adminSection = document.getElementById('adminDashboard');
    const creatorNavItem = document.getElementById('creatorNavItem');

    const adminName = localStorage.getItem('tixhubAdminName');
    const adminTok = localStorage.getItem('tixhubAdminToken');
    const isAdmin = Boolean(adminName && adminTok);

    const cName = localStorage.getItem('tixhubCreatorName');
    const cTok = localStorage.getItem('tixhubCreatorToken');
    const isCreator = Boolean(cName && cTok);

    const userName = localStorage.getItem('tixhubUserName');
    const userTok = localStorage.getItem('tixhubToken');
    const isUser = Boolean(userName && userTok);

    // Super Admin Dashboard nav link in header (shown only for super admin)
    if (adminDashboardNav) {
        adminDashboardNav.classList.toggle('hidden', !isAdmin);
        const navText = document.getElementById('dashboardNavLinkText');
        if (navText && isAdmin) {
            navText.textContent = 'Admin Dashboard';
            navText.style.color = '#e50914';
        }
    }

    // Creator nav item in header: displays My Dashboard for creator
    if (creatorNavItem) {
        const link = creatorNavItem.querySelector('a');
        if (link) {
            if (isCreator) {
                link.innerHTML = '<i class="fas fa-columns"></i> My Dashboard';
                link.onclick = () => {
                    const sec = document.getElementById('adminDashboard');
                    if (sec) smoothScroll(sec);
                };
            } else {
                link.innerHTML = '<i class="fas fa-plus-circle"></i> Create Event';
                link.onclick = openCreatorRegisterModal;
            }
        }
    }

    // Dashboard Section configuration
    if (adminSection) {
        if (isAdmin || isCreator) {
            adminSection.classList.remove('hidden');

            const dashTitle = document.getElementById('dashboardTitle');
            const dashSubtitle = document.getElementById('dashboardSubtitle');
            const notice = document.getElementById('creatorNotice');
            const addCardTitle = document.getElementById('addEventCardTitle');
            const currentCardTitle = document.getElementById('currentEventsCardTitle');
            const addBtn = document.getElementById('dashboardAddEventBtn');

            if (isCreator) {
                if (dashTitle) dashTitle.textContent = 'My Dashboard';
                if (dashSubtitle) dashSubtitle.textContent = `Welcome, ${cName}! Manage your events, track tickets booked & left, and publish new events.`;
                if (notice) notice.classList.remove('hidden');
                if (addCardTitle) addCardTitle.textContent = 'Add New Event';
                if (currentCardTitle) currentCardTitle.textContent = 'My Listed Events';
                if (addBtn) addBtn.textContent = 'Publish Event';
                renderCreatorEventList();
            } else if (isAdmin) {
                if (dashTitle) dashTitle.textContent = 'Admin Dashboard (Super Admin)';
                if (dashSubtitle) dashSubtitle.textContent = 'Manage all event listings across TixHub. Add new events or delete any listings.';
                if (notice) notice.classList.add('hidden');
                if (addCardTitle) addCardTitle.textContent = 'Add New Event';
                if (currentCardTitle) currentCardTitle.textContent = 'All Platform Events';
                if (addBtn) addBtn.textContent = 'Add Event';
                renderAdminEventList();
            }
        } else {
            adminSection.classList.add('hidden');
        }
    }

    // Top & Bottom Logout Buttons
    if (logoutItem) {
        logoutItem.classList.toggle('hidden', !isAdmin && !isCreator && !isUser);
    }

    if (logoutBtn) {
        if (isAdmin) {
            logoutBtn.textContent = 'Logout (Admin)';
            logoutBtn.onclick = logoutAdmin;
            logoutBtn.style.background = '#dc3545';
            logoutBtn.style.color = '#fff';
            logoutBtn.style.borderColor = '#dc3545';
        } else if (isCreator) {
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = logoutCreator;
            logoutBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            logoutBtn.style.color = '#fff';
            logoutBtn.style.borderColor = '#667eea';
        } else if (isUser) {
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = logoutUser;
            logoutBtn.style.background = '#fff';
            logoutBtn.style.color = '#222';
            logoutBtn.style.borderColor = '#ddd';
        }
    }

    // Nav Login / Profile text
    if (nav) {
        if (isAdmin) {
            nav.textContent = `Admin: ${adminName}`;
            nav.onclick = () => {
                const sec = document.getElementById('adminDashboard');
                if (sec) smoothScroll(sec);
            };
        } else if (isCreator) {
            nav.textContent = `Hi, ${cName}`;
            nav.onclick = () => {
                const sec = document.getElementById('adminDashboard');
                if (sec) smoothScroll(sec);
            };
        } else if (isUser) {
            nav.textContent = `Hi, ${userName}`;
            nav.onclick = openAuthOverlay;
        } else {
            nav.textContent = 'Login';
            nav.onclick = openAuthOverlay;
        }
    }

    // Toggle creator browse-only banner on Discover Events section
    const creatorBanner = document.getElementById('creatorBrowsingBanner');
    if (creatorBanner) {
        creatorBanner.classList.toggle('hidden', !isCreator);
    }

    // Refresh event cards so booking buttons immediately match the current session role
    if (eventsData && eventsData.length > 0) {
        renderEvents(filteredEvents.length > 0 ? filteredEvents : eventsData);
    }
}

async function logoutUser() {
    const token = localStorage.getItem('tixhubToken');
    if (token) {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.warn('Logout request failed', error);
        }
    }
    clearStoredUser();
    clearAuthInputs();
    showNotification('Logged out', 'info');
}

function showAdminLogin() {
    clearAuthInputs();
    const loginBox = document.getElementById('adminLoginBox');
    const userBox = document.getElementById('userLoginBox');
    const creatorBox = document.getElementById('creatorLoginBox');
    const roleActions = document.getElementById('authRoleActions');
    const headerTitle = document.getElementById('authHeaderTitle');
    const headerSubtitle = document.getElementById('authHeaderSubtitle');
    const authOverlay = document.getElementById('authOverlay');
    if (roleActions) roleActions.style.display = 'none';
    if (headerTitle) headerTitle.textContent = 'Admin Portal';
    if (headerSubtitle) headerSubtitle.textContent = 'Enter administrator credentials to manage platform';
    if (authOverlay) authOverlay.style.display = 'flex';
    if (userBox) userBox.classList.add('hidden');
    if (creatorBox) creatorBox.classList.add('hidden');
    if (loginBox) loginBox.classList.remove('hidden');
}

function hideAdminLogin() {
    clearAuthInputs();
    const loginBox = document.getElementById('adminLoginBox');
    if (loginBox) loginBox.classList.add('hidden');
    const headerTitle = document.getElementById('authHeaderTitle');
    const headerSubtitle = document.getElementById('authHeaderSubtitle');
    if (headerTitle) headerTitle.textContent = 'Welcome to TixHub';
    if (headerSubtitle) headerSubtitle.textContent = 'Select your role to continue';
    const roleActions = document.getElementById('authRoleActions');
    if (roleActions) roleActions.style.display = 'flex';
}

async function adminLogin() {
    const email = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    try {
        const response = await fetch(`${API_BASE}/auth/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            showNotification('Invalid admin credentials', 'error');
            return;
        }

        const data = await response.json();
        adminToken = data.token;
        localStorage.setItem('tixhubAdminToken', data.token);
        localStorage.setItem('tixhubAdminName', data.name || 'Admin');

        // Clear regular user & creator storage when admin logs in
        clearStoredUser();
        creatorToken = null;
        creatorName = null;
        localStorage.removeItem('tixhubCreatorToken');
        localStorage.removeItem('tixhubCreatorName');
        localStorage.removeItem('tixhubCreatorId');
        localStorage.removeItem('tixhubCreatorEmail');

        clearAuthInputs();
        hideOverlay();
        hideAdminLogin();
        updateUserUI();
        showNotification('Welcome back, admin!', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Could not reach the server.', 'error');
    }
}

function openAdminDashboard() {
    const adminSection = document.getElementById('adminDashboard');
    if (adminSection) {
        adminSection.classList.remove('hidden');
    }
    renderAdminEventList();
}

async function logoutAdmin() {
    if (adminToken) {
        try {
            await fetch(`${API_BASE}/auth/admin-logout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            });
        } catch (error) {
            console.warn('Admin logout request failed', error);
        }
    }

    adminToken = null;
    localStorage.removeItem('tixhubAdminToken');
    localStorage.removeItem('tixhubAdminName');
    clearAuthInputs();

    updateUserUI();
    showNotification('Admin logged out', 'info');
}

function handleDashboardLogout() {
    if (localStorage.getItem('tixhubAdminToken')) {
        logoutAdmin();
    } else if (localStorage.getItem('tixhubCreatorToken')) {
        logoutCreator();
    }
}

async function handleDashboardAddEvent() {
    const isCreator = Boolean(localStorage.getItem('tixhubCreatorToken'));
    const token = isCreator ? localStorage.getItem('tixhubCreatorToken') : localStorage.getItem('tixhubAdminToken');

    if (!token) {
        showNotification('Please log in as Creator or Admin to publish events', 'error');
        return;
    }

    const title = document.getElementById('newEventTitle').value.trim();
    const category = document.getElementById('newEventCategory').value;
    const date = document.getElementById('newEventDate').value.trim();
    const time = document.getElementById('newEventTime').value.trim();
    const location = document.getElementById('newEventLocation').value.trim();
    const priceValue = document.getElementById('newEventPrice').value.trim();
    const seatsValue = document.getElementById('newEventSeats').value.trim();

    if (!title || !date || !time || !location || !priceValue || !seatsValue) {
        showNotification('Please fill in all event details', 'warning');
        return;
    }

    try {
        const url = editingEventId ? `${API_BASE}/events/${editingEventId}` : `${API_BASE}/events`;
        const method = editingEventId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                category,
                date,
                time,
                location,
                price: Number(priceValue),
                seats: Number(seatsValue)
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            showNotification(err.error || (editingEventId ? 'Failed to update event' : 'Failed to add event'), 'error');
            return;
        }

        const wasEditing = Boolean(editingEventId);
        cancelEditEvent();

        await fetchEvents();
        renderEvents(filteredEvents);

        if (isCreator) {
            renderCreatorEventList();
        } else {
            renderAdminEventList();
        }

        showNotification(
            wasEditing ? 'Event updated successfully!' : 'Event published successfully! It is now visible to everyone for booking.',
            'success'
        );
    } catch (error) {
        console.error(error);
        showNotification('Could not reach the server.', 'error');
    }
}

// Backward compatibility alias
function addAdminEvent() {
    handleDashboardAddEvent();
}

async function startEditEvent(eventId) {
    let event = eventsData.find(e => e.id === Number(eventId));
    if (!event) {
        try {
            const res = await fetch(`${API_BASE}/events/${eventId}`);
            if (res.ok) event = await res.json();
        } catch (e) {
            console.warn(e);
        }
    }
    if (!event) {
        showNotification('Event details not found', 'error');
        return;
    }

    editingEventId = event.id;

    document.getElementById('newEventTitle').value = event.title || '';
    document.getElementById('newEventCategory').value = event.category || 'movie';
    document.getElementById('newEventDate').value = event.date || '';
    document.getElementById('newEventTime').value = event.time || '';
    document.getElementById('newEventLocation').value = event.location || '';
    document.getElementById('newEventPrice').value = event.price != null ? event.price : '';
    document.getElementById('newEventSeats').value = event.seats != null ? event.seats : '';

    const addCardTitle = document.getElementById('addEventCardTitle');
    if (addCardTitle) {
        addCardTitle.innerHTML = `<i class="fas fa-edit" style="color:#667eea; margin-right:6px;"></i> Edit Event: ${event.title}`;
    }

    const addBtn = document.getElementById('dashboardAddEventBtn');
    if (addBtn) {
        addBtn.textContent = 'Save Changes';
    }

    const cancelBtn = document.getElementById('cancelEditEventBtn');
    if (cancelBtn) {
        cancelBtn.classList.remove('hidden');
    }

    const form = document.querySelector('.admin-form');
    if (form) {
        smoothScroll(form);
    }

    showNotification(`Editing "${event.title}". Update details and click Save Changes.`, 'info');
}

function cancelEditEvent() {
    editingEventId = null;

    document.getElementById('newEventTitle').value = '';
    document.getElementById('newEventDate').value = '';
    document.getElementById('newEventTime').value = '';
    document.getElementById('newEventLocation').value = '';
    document.getElementById('newEventPrice').value = '';
    document.getElementById('newEventSeats').value = '';

    const isCreator = Boolean(localStorage.getItem('tixhubCreatorToken'));
    const addCardTitle = document.getElementById('addEventCardTitle');
    if (addCardTitle) {
        addCardTitle.textContent = isCreator ? 'Add New Event (Creator)' : 'Add New Event';
    }

    const addBtn = document.getElementById('dashboardAddEventBtn');
    if (addBtn) {
        addBtn.textContent = isCreator ? 'Publish Event' : 'Add Event';
    }

    const cancelBtn = document.getElementById('cancelEditEventBtn');
    if (cancelBtn) {
        cancelBtn.classList.add('hidden');
    }
}

async function renderCreatorEventList() {
    const list = document.getElementById('adminEventList');
    if (!list) return;

    const token = localStorage.getItem('tixhubCreatorToken');
    if (!token) {
        list.innerHTML = '<p style="color:#555;">Please log in as creator to view your events.</p>';
        return;
    }

    list.innerHTML = '<p style="color:#666;"><i class="fas fa-spinner fa-spin"></i> Loading your events...</p>';

    try {
        const res = await fetch(`${API_BASE}/events/mine`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            list.innerHTML = '<p style="color:#c00;">Failed to load your events.</p>';
            return;
        }
        const myEvents = await res.json();
        list.innerHTML = '';
        if (myEvents.length === 0) {
            list.innerHTML = '<div style="padding: 24px; text-align: center; color: #666; background: #fff; border-radius: 12px; border: 1px dashed #ccc;"><i class="fas fa-ticket-alt" style="font-size: 2rem; color: #999; margin-bottom: 10px; display: block;"></i>You have not added any events yet. Fill out the form on the left to add your first event!</div>';
            return;
        }

        myEvents.forEach(event => {
            const totalSeats = Number(event.seats || event.totalSeats || 0);
            const bookedCount = Array.isArray(event.bookedSeats) ? event.bookedSeats.length : (Number(event.bookedCount) || 0);
            const seatsLeft = Math.max(0, totalSeats - bookedCount);
            const percentFilled = totalSeats > 0 ? Math.round((bookedCount / totalSeats) * 100) : 0;

            const item = document.createElement('div');
            item.id = `admin-event-${event.id}`;
            item.className = 'admin-event-item';
            item.style.transition = 'all 0.3s ease';
            item.innerHTML = `
                <div style="flex: 1;">
                    <strong style="font-size: 1.05rem; color: #1e293b; display: block; margin-bottom: 2px;">${event.title}</strong>
                    <small style="color: #64748b; font-size: 0.85rem;">${event.category.charAt(0).toUpperCase() + event.category.slice(1)} &bull; ${event.date} &bull; ₹${event.price} / ticket</small>
                    
                    <div style="margin-top: 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <span style="display: inline-flex; align-items: center; gap: 5px; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 600;">
                            <i class="fas fa-ticket-alt"></i> <strong>${bookedCount}</strong> Booked
                        </span>
                        <span style="display: inline-flex; align-items: center; gap: 5px; background: ${seatsLeft > 0 ? '#ecfdf5' : '#fef2f2'}; color: ${seatsLeft > 0 ? '#059669' : '#dc2626'}; padding: 4px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 600;">
                            <i class="fas ${seatsLeft > 0 ? 'fa-chair' : 'fa-times-circle'}"></i> <strong>${seatsLeft}</strong> Left / ${totalSeats} Total
                        </span>
                        <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; color: #4338ca; font-weight: 500;">
                            <i class="fas fa-chart-pie"></i> ${percentFilled}% filled
                        </span>
                    </div>

                    <div style="font-size: 0.78rem; color: #4338ca; margin-top: 6px;">
                        <i class="fas fa-globe"></i> Visible to all users for booking
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button type="button" onclick="startEditEvent(${event.id})" style="background: #4f46e5; color: white; border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-weight: 500;">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button type="button" onclick="deleteCreatorEvent(${event.id})" style="background: #dc3545; color: white; border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-weight: 500;">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p style="color:#c00;">Unable to connect to server.</p>';
    }
}

async function deleteCreatorEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This will remove it from public booking.')) {
        return;
    }
    const token = localStorage.getItem('tixhubCreatorToken');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            showNotification(err.error || 'Failed to delete event. You can only delete your own events.', 'error');
            return;
        }

        showNotification('Event deleted successfully', 'success');
        await fetchEvents();
        renderEvents(filteredEvents);
        renderCreatorEventList();
    } catch (error) {
        console.error(error);
        showNotification('Could not reach the server.', 'error');
    }
}

async function deleteAdminEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }
    const item = document.getElementById(`admin-event-${eventId}`);
    if (item) {
        item.style.transition = 'all 0.3s ease';
        item.style.opacity = '0';
        item.style.transform = 'translateX(30px)';
        setTimeout(() => item.remove(), 250);
    }

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            showNotification('Failed to delete event', 'error');
            await fetchEvents();
            renderEvents(filteredEvents);
            renderAdminEventList();
            return;
        }

        showNotification('Event deleted successfully', 'success');
        fetchEvents().then(() => {
            renderEvents(filteredEvents);
            renderAdminEventList();
        });
    } catch (error) {
        console.error(error);
        showNotification('Could not reach the server.', 'error');
    }
}

function renderAdminEventList() {
    const list = document.getElementById('adminEventList');
    if (!list) return;

    list.innerHTML = '';
    if (eventsData.length === 0) {
        list.innerHTML = '<p style="color:#555;">No events available yet.</p>';
        return;
    }

    eventsData.forEach(event => {
        const item = document.createElement('div');
        item.id = `admin-event-${event.id}`;
        item.className = 'admin-event-item';
        item.style.transition = 'all 0.3s ease';
        const hostText = event.creatorName ? `Host: ${event.creatorName}` : 'Official';
        item.innerHTML = `
            <div>
                <strong>${event.title}</strong>
                <small>${event.category.charAt(0).toUpperCase() + event.category.slice(1)} &bull; ${event.date} &bull; ${hostText}</small>
            </div>
            <div style="display: flex; gap: 8px;">
                <button type="button" onclick="startEditEvent(${event.id})" style="background: #4f46e5; color: white; border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-weight: 500;">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button type="button" onclick="deleteAdminEvent(${event.id})" style="background: #dc3545; color: white; border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-weight: 500;">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    addBookingNotifications();
    await fetchEvents();
    initNavigation();
    renderEvents(eventsData);
    setupModalHandlers();
    setupSearchAndFilter();
    setupHamburgerMenu();
    updateUserUI();
});

// ==================== NAVIGATION ====================
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            // Close mobile menu if open
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
            }
            
            // Handle category filtering for Movies, Live Events, and College Fests
            if (targetId === '#movies') {
                filterAndDisplayCategory('movie', 'Movies');
                return;
            } else if (targetId === '#events') {
                filterAndDisplayCategory('live', 'Live Events');
                return;
            } else if (targetId === '#college') {
                filterAndDisplayCategory('college', 'College Fests');
                return;
            }
            
            // Default scroll behavior for Home and other sections
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                smoothScroll(targetSection);
            }
        });
    });
}

function filterAndDisplayCategory(category, categoryName) {
    // Filter events by category
    filteredEvents = eventsData.filter(event => event.category === category);
    
    // Scroll to events section
    const eventsSection = document.querySelector('.events');
    if (eventsSection) {
        smoothScroll(eventsSection);
        
        // Update the section title to show the category
        const sectionTitle = eventsSection.querySelector('.section-title');
        if (sectionTitle) {
            sectionTitle.textContent = `${categoryName}`;
        }
        
        // Render filtered events
        renderEvents(filteredEvents);
    }
}

function smoothScroll(element) {
    const offsetTop = element.offsetTop - 70;
    window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
    });
}

// ==================== HAMBURGER MENU ====================
function setupHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            // Animate hamburger
            const spans = hamburger.querySelectorAll('span');
            spans[0].style.transform = navMenu.classList.contains('active') ? 'rotate(45deg) translateY(10px)' : 'none';
            spans[1].style.opacity = navMenu.classList.contains('active') ? '0' : '1';
            spans[2].style.transform = navMenu.classList.contains('active') ? 'rotate(-45deg) translateY(-10px)' : 'none';
        });
    }
}

// ==================== EVENTS RENDERING ====================
function renderEvents(events) {
    const eventsGrid = document.getElementById('eventsGrid');
    eventsGrid.innerHTML = '';
    
    if (events.length === 0) {
        eventsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 40px; color: #666;">No events found. Try different filters!</p>';
        return;
    }
    
    events.forEach(event => {
        const eventCard = createEventCard(event);
        eventsGrid.appendChild(eventCard);
    });
}

function getEventImage(event) {
    const category = (event.category || '').toLowerCase();
    const title = (event.title || '').toLowerCase();

    // Specific College & Fest images (high-energy, vibrant youth fests)
    if (category === 'college' || title.includes('fest') || title.includes('campus') || title.includes('techmalayan')) {
        if (title.includes('tech') || title.includes('hack') || title.includes('code') || title.includes('robot')) {
            // Tech Fest / Auditorium stage
            return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80';
        }
        if (title.includes('music') || title.includes('dance') || title.includes('dj') || title.includes('concert')) {
            // College Music & DJ Fest
            return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80';
        }
        // Iconic vibrant college cultural fest with stage lights, celebratory crowd
        return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80';
    }

    if (category === 'movie') {
        if (title.includes('salaar') || title.includes('spirit') || title.includes('og') || title.includes('varanasi') || title.includes('action')) {
            return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
        }
        return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80';
    }

    if (category === 'live') {
        return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80';
    }

    return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80';
}

function createEventCard(event) {
    const isCreator = Boolean(localStorage.getItem('tixhubCreatorToken'));
    const card = document.createElement('div');
    card.className = 'event-card';
    
    const badgeText = event.category === 'movie' ? 'Movie' : 
                      event.category === 'live' ? 'Live Event' : 'College Fest';

    // event.rating is now computed by the backend (AVG over the ratings table)
    const ratingText = event.rating ? `${event.rating} / 5` : 'Not rated yet';

    // Dynamically choose relevant picture for fests, movies and live concerts
    const categoryImage = getEventImage(event);

    const totalSeats = Number(event.seats || event.totalSeats || 0);
    const bookedCount = Array.isArray(event.bookedSeats) ? event.bookedSeats.length : (Number(event.bookedCount) || 0);
    const seatsLeft = Math.max(0, totalSeats - bookedCount);

    card.innerHTML = `
        <div class="event-image" style="background-image: url('${categoryImage}'); background-size: cover; background-position: center; position: relative;">
            <div style="position:absolute; inset:0; background: rgba(0,0,0,0.35);"></div>
            <div style="position: absolute; right: 12px; top: 12px; background: rgba(0,0,0,0.5); color:white; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; z-index: 2;">${badgeText}</div>
        </div>
        <div class="event-content">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                <h3 class="event-title">${event.title}</h3>
               <small style="background:#f4f4f4; color:#333; padding:4px 10px; border-radius:12px; font-size:0.8rem;">Rating: ${ratingText}</small>
            </div>
            <div style="margin-bottom: 8px;">
                <span class="creator-badge"><i class="fas fa-bullhorn"></i> Hosted by: ${event.creatorName || 'TixHub Official'}</span>
            </div>
            <div class="event-meta">
                <span><i class="fas fa-calendar"></i> ${event.date}</span>
            </div>
            <div class="event-meta">
                <span><i class="fas fa-clock"></i> ${event.time}</span>
            </div>
            <div class="event-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
            </div>
            <div class="event-meta" style="margin-top: 6px; font-size: 0.82rem; color: ${seatsLeft > 0 ? '#059669' : '#dc2626'}; font-weight: 500;">
                <span><i class="fas ${seatsLeft > 0 ? 'fa-chair' : 'fa-ban'}"></i> ${seatsLeft > 0 ? `${seatsLeft} seats left (${bookedCount} booked)` : 'Sold Out!'}</span>
            </div>
            <div style="margin: 15px 0; padding-top: 15px; border-top: 1px solid #eee;">
                <div class="event-price">₹${event.price}</div>
                ${isCreator ? `
                    <button class="event-book-btn" disabled onclick="showCreatorBlockedNotice()" style="background: #e2e8f0; color: #64748b; cursor: not-allowed; border: 1px solid #cbd5e1; box-shadow: none;" title="Creator accounts cannot book tickets">
                        <i class="fas fa-ban" style="margin-right: 6px;"></i> Booking Disabled (Creator)
                    </button>
                ` : `
                    <button class="event-book-btn" onclick="openBookingModal(${event.id})">
                        Book Now <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>
                    </button>
                `}
            </div>
        </div>
    `;

    return card;
}

function showCreatorBlockedNotice() {
    showNotification('Creator accounts cannot book tickets. Discover events is view-only for creators.', 'warning');
}


// ==================== SEARCH & FILTER ====================
function setupSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
}

function filterEvents() {
    applyFilters();
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    
    filteredEvents = eventsData.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm) ||
                            event.location.toLowerCase().includes(searchTerm);
        const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });
    
    renderEvents(filteredEvents);
}

// ==================== BOOKING MODAL ====================
function setupModalHandlers() {
    const modal = document.getElementById('bookingModal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeBookingModal);
    }
    
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeBookingModal();
        }
    });
}

function openBookingModal(eventId) {
    const isCreator = Boolean(localStorage.getItem('tixhubCreatorToken'));
    if (isCreator) {
        showNotification('Creator accounts cannot book tickets. Discover events is view-only for creators.', 'warning');
        return;
    }

    const isAdmin = Boolean(localStorage.getItem('tixhubAdminToken'));
    if (isAdmin) {
        showNotification('Admin accounts cannot book tickets. Please log in or register with a user account to book.', 'warning');
        showUserLoginOnly('booking', eventId);
        return;
    }

    if (!isRegularUserLoggedIn()) {
        showNotification('Please log in or register with a user account to book tickets', 'warning');
        showUserLoginOnly('booking', eventId);
        return;
    }

    currentEvent = eventsData.find(e => e.id === eventId);
    selectedSeats = [];
    
    if (!currentEvent) return;
    
    const modal = document.getElementById('bookingModal');
    const modalBody = document.getElementById('modalBody');
    
    const seatTab = '<div class="screen-panel" title="Screen"></div>';

    modalBody.innerHTML = `
        <div class="modal-header">
            <h2>${currentEvent.title}</h2>
            <p style="color: #666; margin-bottom: 10px;">${currentEvent.date} ₹ ${currentEvent.time}</p>
            <div class="modal-price">₹${currentEvent.price} per ticket</div>
        </div>
        
        <div class="seat-selector">
            <h3 style="margin-bottom: 20px; color: #333;">Select Your Seats</h3>
            
            <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 30px; font-size: 0.9rem;">
                <div><span style="display: inline-block; width: 20px; height: 20px; background: #e3f2fd; border: 2px solid #ddd; border-radius: 4px; margin-right: 8px;"></span>Available</div>
                <div><span style="display: inline-block; width: 20px; height: 20px; background: #e50914; border: 2px solid #e50914; border-radius: 4px; margin-right: 8px;"></span>Selected</div>
                <div><span style="display: inline-block; width: 20px; height: 20px; background: #ddd; border: 2px solid #ddd; border-radius: 4px; margin-right: 8px;"></span>Booked</div>
            </div>
            
            ${seatTab}
            <div class="seat-grid seat-grid-movie" id="seatGrid"></div>
            
            <div class="total-price">
                Total: <span id="totalPrice">₹0</span> (<span id="selectedCount">0</span> seats)
            </div>
            
            <button class="confirm-btn" onclick="confirmBooking()" style="margin-bottom: 20px;">
                Confirm Booking <i class="fas fa-check" style="margin-left: 8px;"></i>
            </button>
        </div>
    `;
    
    renderSeats();
    modal.style.display = 'block';
}

function renderSeats() {
    const seatGrid = document.getElementById('seatGrid');
    seatGrid.innerHTML = '';

    seatGrid.style.position = 'relative';
    for (let i = 1; i <= currentEvent.seats; i++) {
        const seat = document.createElement('div');
        seat.className = 'seat';
        seat.textContent = i;

        if (currentEvent.bookedSeats.includes(i)) {
            seat.classList.add('booked');
        } else if (selectedSeats.includes(i)) {
            seat.classList.add('selected');
        } else {
            seat.classList.add('available');
        }

        if (!currentEvent.bookedSeats.includes(i)) {
            seat.addEventListener('click', function() {
                toggleSeatSelection(i);
            });
        }

        seatGrid.appendChild(seat);
    }
}

function toggleSeatSelection(seatNumber) {
    if (selectedSeats.includes(seatNumber)) {
        selectedSeats = selectedSeats.filter(s => s !== seatNumber);
    } else {
        selectedSeats.push(seatNumber);
    }
    
    updateSeatDisplay();
    renderSeats();
}

function updateSeatDisplay() {
    const totalPrice = currentEvent.price * selectedSeats.length;
    document.getElementById('totalPrice').textContent = '₹' + totalPrice;
    document.getElementById('selectedCount').textContent = selectedSeats.length;
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.style.display = 'none';
    selectedSeats = [];
    currentEvent = null;
}

// ==================== BOOKING CONFIRMATION ====================
async function confirmBooking() {
    const isCreator = Boolean(localStorage.getItem('tixhubCreatorToken'));
    if (isCreator) {
        showNotification('Creator accounts cannot book tickets.', 'warning');
        closeBookingModal();
        return;
    }

    if (!isRegularUserLoggedIn()) {
        showNotification('Please log in or register with a user account before booking tickets', 'warning');
        closeBookingModal();
        showUserLoginOnly('booking', currentEvent ? currentEvent.id : null);
        return;
    }

    if (selectedSeats.length === 0) {
        showNotification('Please select at least one seat', 'warning');
        return;
    }

    try {
        const storedUserId = localStorage.getItem('tixhubUserId');
        const payload = {
            eventId: currentEvent.id,
            seats: selectedSeats,
            clientId: getClientId()
        };
        if (storedUserId) payload.userId = Number(storedUserId);

        const response = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            showNotification(data.error || 'Booking failed', 'error');
            // Someone else may have taken a seat since we loaded the page â€” refresh.
            await fetchEvents();
            renderEvents(filteredEvents);
            return;
        }

        showNotification(`Booking confirmed! ${selectedSeats.length} seat(s) booked for ₹${data.totalPrice}`, 'success');

        await fetchEvents();
        setTimeout(() => {
            closeBookingModal();
            renderEvents(filteredEvents);
        }, 1500);
    } catch (error) {
        console.error(error);
        showNotification('Could not reach the server.', 'error');
    }
}

// ==================== NOTIFICATIONS ====================
function addBookingNotifications() {
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'notificationContainer';
    notificationContainer.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 3000;
        max-width: 400px;
    `;
    document.body.appendChild(notificationContainer);
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    
    const bgColor = type === 'success' ? '#28a745' : 
                   type === 'warning' ? '#ffc107' : 
                   type === 'error' ? '#dc3545' : '#007bff';
    
    const textColor = type === 'warning' ? '#333' : 'white';
    
    notification.style.cssText = `
        background: ${bgColor};
        color: ${textColor};
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    
    notification.textContent = message;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== ANIMATIONS ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==================== MY BOOKINGS ====================
async function viewMyBookings() {
    if (!isRegularUserLoggedIn()) {
        const isCreator = Boolean(localStorage.getItem('tixhubCreatorToken'));
        if (isCreator) {
            showNotification('Creator accounts cannot book tickets or view user bookings. Please log in or register as a user.', 'info');
        } else {
            showNotification('Please log in or register with a user account to view your bookings', 'warning');
        }
        showUserLoginOnly('my-bookings');
        return;
    }

    let bookings;
    try {
        const storedUserId = localStorage.getItem('tixhubUserId');
        const token = getStoredToken();
        const url = `${API_BASE}/bookings?userId=${encodeURIComponent(storedUserId)}`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch bookings');
        bookings = await response.json();
    } catch (error) {
        console.error(error);
        showNotification('Could not reach the server.', 'error');
        return;
    }

    if (bookings.length === 0) {
        const modal = document.getElementById('bookingModal');
        const modalBody = document.getElementById('modalBody');
        if (modal && modalBody) {
            modalBody.innerHTML = `
                <div class="modal-header" style="text-align: center; padding: 30px 15px;">
                    <i class="fas fa-ticket-alt" style="font-size: 3rem; color: #667eea; margin-bottom: 16px;"></i>
                    <h2>No Bookings Found</h2>
                    <p style="color: #666; margin: 12px 0 24px;">You haven't booked any tickets yet. Explore our events and reserve your seats!</p>
                    <button class="wide-btn" onclick="closeBookingModal(); const el = document.getElementById('events'); if(el) smoothScroll(el);">Discover Events</button>
                </div>
            `;
            modal.style.display = 'block';
        } else {
            showNotification('No bookings yet!', 'info');
        }
        return;
    }
    
    // Create a modal for displaying all bookings
    const modal = document.getElementById('bookingModal');
    const modalBody = document.getElementById('modalBody');
    
    let bookingsHTML = `
        <div class="modal-header">
            <h2>My Bookings</h2>
            <p id="myBookingsCountText" style="color: #666;">You have <strong id="myBookingsCountNum">${bookings.length}</strong> active booking(s)</p>
        </div>
        
        <div class="bookings-container" style="max-height: 600px; overflow-y: auto;">
    `;
    
    bookings.forEach((booking) => {
        // Get event details from eventsData to fill in missing properties
        const eventData = eventsData.find(e => e.title === booking.eventName);
        const time = booking.time || (eventData ? eventData.time : 'Time not specified');
        const location = booking.location || (eventData ? eventData.location : 'Location not specified');
        const pricePerSeat = booking.pricePerSeat || (eventData ? eventData.price : 0);
        const rating = booking.rating != null ? booking.rating : (eventData && eventData.rating != null ? eventData.rating : null);
        const ratingLabel = rating != null ? `Rating: ${rating} / 5 ⭐` : 'Not rated yet';
        
        const badgeText = booking.category === 'movie' ? 'Movie' : 
                         booking.category === 'live' ? 'Live Event' : 'College Fest';
        
        bookingsHTML += `
            <div id="booking-card-${booking.id}" class="booking-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin: 15px 0; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.3em;">${booking.eventName}</h3>
                        <span style="display: inline-block; background: rgba(255,255,255,0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.85em; margin-top: 5px;">${badgeText}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.8em; font-weight: bold; color: #4ade80;">₹${booking.totalPrice}</div>
                        <small style="opacity: 0.9;">Total Cost</small>
                        <div id="booking-rating-badge-${booking.id}" style="margin-top: 4px; font-size: 0.85em; color: #fff; font-weight: 600;">${ratingLabel}</div>
                    </div>
                </div>
                
                <div style="border-top: 2px solid rgba(255,255,255,0.3); padding-top: 15px; margin-top: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <div style="opacity: 0.9; font-size: 0.9em; margin-bottom: 4px;"><i class="fas fa-calendar-alt" style="margin-right: 6px;"></i>Date</div>
                            <div style="font-weight: 600; font-size: 1.1em;">${booking.date}</div>
                        </div>
                        <div>
                            <div style="opacity: 0.9; font-size: 0.9em; margin-bottom: 4px;"><i class="fas fa-clock" style="margin-right: 6px;"></i>Time</div>
                            <div style="font-weight: 600; font-size: 1.1em; color: #fbbf24;">${time}</div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <div style="opacity: 0.9; font-size: 0.9em; margin-bottom: 4px;"><i class="fas fa-map-marker-alt" style="margin-right: 6px;"></i>Location</div>
                        <div style="font-weight: 500;">${location}</div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <div style="opacity: 0.9; font-size: 0.9em; margin-bottom: 4px;"><i class="fas fa-ticket-alt" style="margin-right: 6px;"></i>Seats Booked</div>
                        <div style="font-weight: 500; background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 6px; display: inline-block;">${booking.seats.join(', ')}</div>
                        <div style="margin-top: 8px; opacity: 0.95; font-size: 0.95em; background: rgba(255,255,255,0.15); padding: 8px 12px; border-radius: 6px; display: inline-block; margin-left: 8px;">
                          <strong>${booking.seats.length} seats</strong> &times; <strong>₹${pricePerSeat}</strong>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                        <input id="ratingInput-${booking.id}" type="number" min="1" max="5" placeholder="Rate 1-5" style="flex:1; padding: 8px 12px; border-radius: 6px; border:none; color:#222; font-weight:600;" value="${rating != null ? rating : ''}">
                        <button id="rate-btn-${booking.id}" class="confirm-btn" style="padding: 8px 16px; margin: 0; min-width: 80px;" onclick="rateEvent(${booking.id})">Rate</button>
                        <button id="cancel-btn-${booking.id}" class="confirm-btn" style="background:#dc3545; padding: 8px 16px; margin: 0; min-width: 90px;" onclick="cancelBooking(${booking.id})">Cancel</button>
                    </div>
                    
                    <div style="opacity: 0.8; font-size: 0.85em;">
                        <i class="fas fa-check-circle" style="margin-right: 6px;"></i>Booked on ${booking.bookingDate}
                    </div>
                </div>
            </div>
        `;
    });
    
    bookingsHTML += `
        </div>
        <button class="confirm-btn" onclick="closeBookingModal()" style="width: 100%; margin-top: 15px;">
            Close <i class="fas fa-times" style="margin-left: 8px;"></i>
        </button>
    `;
    
    modalBody.innerHTML = bookingsHTML;
    modal.style.display = 'block';
}

async function cancelBooking(bookingId) {
    const card = document.getElementById(`booking-card-${bookingId}`);
    const cancelBtn = document.getElementById(`cancel-btn-${bookingId}`);
    
    if (cancelBtn) {
        cancelBtn.disabled = true;
        cancelBtn.textContent = 'Cancelling...';
        cancelBtn.style.opacity = '0.7';
    }

    try {
        const storedUserId = localStorage.getItem('tixhubUserId');
        const token = getStoredToken();
        let url = `${API_BASE}/bookings/${bookingId}`;
        if (storedUserId) {
            url += `?userId=${encodeURIComponent(storedUserId)}`;
        } else {
            url += `?clientId=${encodeURIComponent(getClientId())}`;
        }

        const headers = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: 'DELETE',
            headers
        });

        if (!response.ok) {
            if (cancelBtn) {
                cancelBtn.disabled = false;
                cancelBtn.textContent = 'Cancel';
                cancelBtn.style.opacity = '1';
            }
            showNotification('Booking not found or already cancelled.', 'error');
            return;
        }

        // Instant optimistic DOM removal with smooth fade & slide
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px) scale(0.95)';
            setTimeout(() => {
                card.remove();
                
                // Update live count in modal header
                const countElem = document.getElementById('myBookingsCountNum');
                const remainingCards = document.querySelectorAll('.booking-card').length;
                if (countElem) countElem.textContent = String(remainingCards);

                if (remainingCards === 0) {
                    const container = document.querySelector('.bookings-container');
                    if (container) {
                        container.innerHTML = `
                            <div style="text-align: center; padding: 40px 20px; color: #888;">
                                <i class="fas fa-ticket-alt" style="font-size: 3rem; margin-bottom: 12px; display: block; opacity: 0.4;"></i>
                                <p style="font-size: 1.1rem; font-weight: 500;">No active bookings found.</p>
                            </div>
                        `;
                    }
                }
            }, 250);
        }

        showNotification('Ticket cancelled successfully', 'success');

        // Refresh seat map in background without reloading the modal
        fetchEvents().then(() => renderEvents(filteredEvents));

    } catch (error) {
        console.error(error);
        if (cancelBtn) {
            cancelBtn.disabled = false;
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.opacity = '1';
        }
        showNotification('Could not reach the server.', 'error');
    }
}

async function rateEvent(bookingId) {
    const input = document.getElementById(`ratingInput-${bookingId}`);
    const rateBtn = document.getElementById(`rate-btn-${bookingId}`);
    const badge = document.getElementById(`booking-rating-badge-${bookingId}`);
    const ratingValue = Number(input?.value);

    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
        showNotification('Please enter a rating from 1 to 5.', 'warning');
        return;
    }

    if (rateBtn) {
        rateBtn.disabled = true;
        rateBtn.textContent = 'Saving...';
    }

    try {
        const storedUserId = localStorage.getItem('tixhubUserId');
        const token = getStoredToken();
        const payload = {
            bookingId,
            clientId: getClientId(),
            rating: ratingValue
        };
        if (storedUserId) {
            payload.userId = Number(storedUserId);
        }

        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/ratings`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (rateBtn) {
                rateBtn.disabled = false;
                rateBtn.textContent = 'Rate';
            }
            showNotification('Booking not found for rating.', 'error');
            return;
        }

        // Instant UI update
        if (badge) badge.textContent = `Rating: ${ratingValue} / 5 ⭐`;
        if (rateBtn) {
            rateBtn.disabled = false;
            rateBtn.textContent = 'Rated ✓';
            rateBtn.style.background = '#28a745';
        }

        showNotification(`Thank you for rating ${ratingValue}/5!`, 'success');

        // Background update for global event cards
        fetchEvents().then(() => renderEvents(filteredEvents));

    } catch (error) {
        console.error(error);
        if (rateBtn) {
            rateBtn.disabled = false;
            rateBtn.textContent = 'Rate';
        }
        showNotification('Could not reach the server.', 'error');
    }
}

// Make viewMyBookings accessible from HTML if needed
window.viewMyBookings = viewMyBookings;
window.cancelBooking = cancelBooking;
window.rateEvent = rateEvent;

// Dismiss auth overlay if clicking outside the card
document.addEventListener('DOMContentLoaded', () => {
    const authOverlayEl = document.getElementById('authOverlay');
    if (authOverlayEl) {
        authOverlayEl.addEventListener('click', (e) => {
            if (e.target === authOverlayEl) {
                hideOverlay();
            }
        });
    }
});
