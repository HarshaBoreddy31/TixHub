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

function getStoredToken() {
    return localStorage.getItem('tixhubToken');
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
        'adminPassword'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function isUserLoggedIn() {
    const token = getStoredToken();
    const userId = localStorage.getItem('tixhubUserId');
    return Boolean(token && userId);
}

function hideOverlay() {
    clearAuthInputs();
    const authOverlay = document.getElementById('authOverlay');
    if (authOverlay) {
        authOverlay.style.display = 'none';
    }
}

function openAuthOverlay() {
    clearAuthInputs();
    const authOverlay = document.getElementById('authOverlay');
    const userBox = document.getElementById('userLoginBox');
    const adminBox = document.getElementById('adminLoginBox');
    if (authOverlay) {
        authOverlay.style.display = 'flex';
    }
    if (userBox) userBox.classList.add('hidden');
    if (adminBox) adminBox.classList.add('hidden');
}

function showUser() {
    showUserLogin();
}

function showUserLogin() {
    clearAuthInputs();
    const authOverlay = document.getElementById('authOverlay');
    const userBox = document.getElementById('userLoginBox');
    const adminBox = document.getElementById('adminLoginBox');
    if (authOverlay) authOverlay.style.display = 'flex';
    if (userBox) userBox.classList.remove('hidden');
    if (adminBox) adminBox.classList.add('hidden');
    showLoginForm();
}

function hideUserLogin() {
    clearAuthInputs();
    const authOverlay = document.getElementById('authOverlay');
    const userBox = document.getElementById('userLoginBox');
    if (userBox) userBox.classList.add('hidden');
    if (authOverlay) authOverlay.style.display = 'none';
}

function showRegisterForm() {
    clearAuthInputs();
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
}

function showLoginForm() {
    clearAuthInputs();
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.classList.add('hidden');
    if (loginForm) loginForm.classList.remove('hidden');
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
        setStoredUser(data.userId, data.name, data.email, data.token);
        updateUserUI();
        hideUserLogin();
        showNotification('Registration successful. You are now logged in.', 'success');
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
        // Clear any previous admin session when user logs in
        adminToken = null;
        localStorage.removeItem('tixhubAdminToken');
        localStorage.removeItem('tixhubAdminName');

        setStoredUser(data.userId, data.name, data.email || email, data.token);
        updateUserUI();
        hideUserLogin();
        showNotification(`Welcome back, ${data.name}`, 'success');
    } catch (err) {
        console.error(err);
        showNotification('Could not reach the server.', 'error');
    }
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

    const adminName = localStorage.getItem('tixhubAdminName');
    const adminTok = localStorage.getItem('tixhubAdminToken');
    const isAdmin = Boolean(adminName && adminTok);

    const userName = localStorage.getItem('tixhubUserName');
    const userTok = getStoredToken();
    const isUser = Boolean(userName && userTok);

    if (adminDashboardNav) {
        adminDashboardNav.classList.toggle('hidden', !isAdmin);
    }

    if (adminSection) {
        if (isAdmin) {
            adminSection.classList.remove('hidden');
            renderAdminEventList();
        } else {
            adminSection.classList.add('hidden');
        }
    }

    if (logoutItem) {
        logoutItem.classList.toggle('hidden', !isAdmin && !isUser);
    }

    if (logoutBtn) {
        if (isAdmin) {
            logoutBtn.textContent = 'Logout (Admin)';
            logoutBtn.onclick = logoutAdmin;
            logoutBtn.style.background = '#dc3545';
            logoutBtn.style.color = '#fff';
            logoutBtn.style.borderColor = '#dc3545';
        } else if (isUser) {
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = logoutUser;
            logoutBtn.style.background = '#fff';
            logoutBtn.style.color = '#222';
            logoutBtn.style.borderColor = '#ddd';
        }
    }

    if (nav) {
        if (isAdmin) {
            nav.textContent = `Admin: ${adminName}`;
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
}

async function logoutUser() {
    const token = getStoredToken();
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
    const authOverlay = document.getElementById('authOverlay');
    if (authOverlay) {
        authOverlay.style.display = 'flex';
    }
    if (userBox) {
        userBox.classList.add('hidden');
    }
    if (loginBox) {
        loginBox.classList.remove('hidden');
    }
}

function hideAdminLogin() {
    clearAuthInputs();
    const loginBox = document.getElementById('adminLoginBox');
    if (loginBox) {
        loginBox.classList.add('hidden');
    }
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

        // Clear regular user storage when admin logs in
        localStorage.removeItem('tixhubUserId');
        localStorage.removeItem('tixhubUserName');
        localStorage.removeItem('tixhubUserEmail');
        localStorage.removeItem('tixhubToken');

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

async function addAdminEvent() {
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
        const response = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
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
            showNotification(err.error || 'Failed to add event', 'error');
            return;
        }

        await fetchEvents();
        renderEvents(filteredEvents);
        renderAdminEventList();
        showNotification('Event added successfully', 'success');
        document.getElementById('newEventTitle').value = '';
        document.getElementById('newEventDate').value = '';
        document.getElementById('newEventTime').value = '';
        document.getElementById('newEventLocation').value = '';
        document.getElementById('newEventPrice').value = '';
        document.getElementById('newEventSeats').value = '';
    } catch (error) {
        console.error(error);
        showNotification('Could not reach the server.', 'error');
    }
}

async function deleteAdminEvent(eventId) {
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
        item.innerHTML = `
            <div>
                <strong>${event.title}</strong>
                <small>${event.category.charAt(0).toUpperCase() + event.category.slice(1)} &bull; ${event.date}</small>
            </div>
            <button type="button" onclick="deleteAdminEvent(${event.id})">Delete</button>
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

function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';
    
    const badgeText = event.category === 'movie' ? 'Movie' : 
                      event.category === 'live' ? 'Live Event' : 'College Fest';

    // event.rating is now computed by the backend (AVG over the ratings table)
    const ratingText = event.rating ? `${event.rating} / 5` : 'Not rated yet';

    const categoryImage = event.category === 'movie' ? 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=600&q=80' :
                          event.category === 'live' ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80' :
                          'https://images.unsplash.com/photo-1576618146468-09b7f8b43a07?auto=format&fit=crop&w=600&q=80';

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
            <div class="event-meta">
                <span><i class="fas fa-calendar"></i> ${event.date}</span>
            </div>
            <div class="event-meta">
                <span><i class="fas fa-clock"></i> ${event.time}</span>
            </div>
            <div class="event-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
            </div>
            <div style="margin: 15px 0; padding-top: 15px; border-top: 1px solid #eee;">
                <div class="event-price">₹${event.price}</div>
                <button class="event-book-btn" onclick="openBookingModal(${event.id})">
                    Book Now <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>
                </button>
            </div>
        </div>
    `;

    return card;
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
    if (!isUserLoggedIn()) {
        showNotification('Please log in or register before booking tickets', 'warning');
        showUserLogin();
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
    if (!isUserLoggedIn()) {
        showNotification('Please log in or register before booking tickets', 'warning');
        closeBookingModal();
        showUserLogin();
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
    if (!isUserLoggedIn()) {
        showNotification('Please log in to view your bookings', 'warning');
        showUserLogin();
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
        showNotification('No bookings yet!', 'info');
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





