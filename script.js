// ---------- Honest countdown timer ----------
// Old version reset to 1 hour on every page reload, which is a fake-urgency
// dark pattern. This version anchors to a real end time stored once per day,
// so refreshing the page does not extend the "deadline".
(function () {
    const timerDisplay = document.getElementById('limited-offer-timer');
    if (!timerDisplay) return;

    const STORAGE_KEY = 'kennys_offer_end';
    const OFFER_LENGTH_MS = 60 * 60 * 1000; // 1 hour

    function getOrCreateEndTime() {
        const today = new Date().toDateString();
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (stored && stored.day === today && stored.end > Date.now()) {
            return stored.end;
        }
        const end = Date.now() + OFFER_LENGTH_MS;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ day: today, end }));
        return end;
    }

    const endTime = getOrCreateEndTime();

    function render() {
        const remaining = Math.max(0, endTime - Date.now());
        if (remaining <= 0) {
            timerDisplay.textContent = 'Offer ended';
            clearInterval(interval);
            return;
        }
        const totalSeconds = Math.floor(remaining / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        timerDisplay.textContent =
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    render();
    const interval = setInterval(render, 1000);
})();

// ---------- Cart ----------
document.addEventListener('DOMContentLoaded', function () {
    // Mobile nav toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function () {
            const isOpen = navLinks.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', String(isOpen));
        });
        navLinks.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    const cartIcon = document.getElementById('cartIcon');
    const cartDropdown = document.getElementById('cartDropdown');
    const cartCount = document.getElementById('cartCount');
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');

    const THEME_KEY = 'kennys_theme';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme(theme) {
        document.body.classList.toggle('dark', theme === 'dark');
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
            themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
        }
        if (themeToggleMobile) {
            themeToggleMobile.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
            themeToggleMobile.setAttribute('aria-pressed', String(theme === 'dark'));
        }
    }

    function getSavedTheme() {
        return localStorage.getItem(THEME_KEY);
    }

    function detectPreferredTheme() {
        if (prefersDark.matches) return 'dark';
        return 'light';
    }

    function saveTheme(theme) {
        localStorage.setItem(THEME_KEY, theme);
    }

    function initTheme() {
        const saved = getSavedTheme();
        applyTheme(saved === 'dark' || (!saved && detectPreferredTheme() === 'dark') ? 'dark' : 'light');
    }

    function toggleThemeHandler() {
        const isDark = document.body.classList.toggle('dark');
        const theme = isDark ? 'dark' : 'light';
        applyTheme(theme);
        saveTheme(theme);
    }

    if (themeToggle) themeToggle.addEventListener('click', toggleThemeHandler);
    if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleThemeHandler);

    prefersDark.addEventListener('change', function () {
        if (!getSavedTheme()) {
            applyTheme(detectPreferredTheme());
        }
    });

    initTheme();

    /** @type {{name:string, price:number, img:string, qty:number}[]} */
    let cart = [];

    const currencyFormatters = {
        NGN: (n) => '₦' + n.toLocaleString('en-NG'),
        USD: (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    };

    function getFormatter(currency) {
        return currencyFormatters[currency] || currencyFormatters.NGN;
    }

    function updateCartUI() {
        // Badge
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        if (totalItems > 0) {
            cartCount.hidden = false;
            cartCount.textContent = totalItems;
        } else {
            cartCount.hidden = true;
        }

        // Dropdown content
        if (cart.length === 0) {
            cartDropdown.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
            return;
        }

        let subtotal = 0;
        let html = '';
        cart.forEach((item, idx) => {
            const lineTotal = item.price * item.qty;
            subtotal += lineTotal;
            const format = getFormatter(item.currency);
            html += `
                <div class="cart-item">
                    <img src="${item.img}" alt="">
                    <div class="cart-item-info">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-price">${format(lineTotal)}</span>
                        <div class="cart-qty-controls">
                            <button type="button" data-action="dec" data-idx="${idx}" aria-label="Decrease quantity">−</button>
                            <span>${item.qty}</span>
                            <button type="button" data-action="inc" data-idx="${idx}" aria-label="Increase quantity">+</button>
                        </div>
                        <button type="button" class="cart-remove" data-action="remove" data-idx="${idx}">Remove</button>
                    </div>
                </div>`;
        });
        const subtotalFormat = getFormatter(cart[0]?.currency);
        html += `<div class="cart-total-row"><span>Subtotal</span><span>${subtotalFormat(subtotal)}</span></div>`;
        cartDropdown.innerHTML = html;
    }

    addToCartButtons.forEach((btn) => {
        btn.addEventListener('click', function () {
            const name = btn.dataset.name;
            const price = Number(btn.dataset.price);
            const img = btn.dataset.img;
            const currency = btn.dataset.currency || 'NGN';

            const existing = cart.find((item) => item.name === name && item.currency === currency);
            if (existing) {
                existing.qty += 1;
            } else {
                cart.push({ name, price, img, currency, qty: 1 });
            }

            updateCartUI();

            // Inline confirmation instead of a blocking alert()
            const originalText = btn.textContent;
            btn.textContent = 'Added ✓';
            btn.classList.add('added');
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('added');
                btn.disabled = false;
            }, 1200);
        });
    });

    cartDropdown.addEventListener('click', function (e) {
        const target = e.target.closest('button[data-action]');
        if (!target) return;
        const idx = Number(target.dataset.idx);
        const action = target.dataset.action;

        if (action === 'inc') cart[idx].qty += 1;
        if (action === 'dec') {
            cart[idx].qty -= 1;
            if (cart[idx].qty <= 0) cart.splice(idx, 1);
        }
        if (action === 'remove') cart.splice(idx, 1);

        updateCartUI();
    });

    if (cartIcon && cartDropdown) {
        cartIcon.addEventListener('click', function (e) {
            e.stopPropagation();
            const isActive = cartDropdown.classList.toggle('active');
            cartIcon.setAttribute('aria-expanded', String(isActive));
        });

        document.addEventListener('click', function (e) {
            if (!cartDropdown.contains(e.target) && !cartIcon.contains(e.target)) {
                cartDropdown.classList.remove('active');
                cartIcon.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                cartDropdown.classList.remove('active');
                cartIcon.setAttribute('aria-expanded', 'false');
            }
        });
    }

    updateCartUI();
});
