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
    const shopMoreSearch = document.getElementById('shopMoreSearch');
    const categoryButtons = document.querySelectorAll('.category-button');
    const shopCategorySections = document.querySelectorAll('.shop-category-section');
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');

    const THEME_KEY = 'kennys_theme';
    const CART_KEY = 'kennys_cart';
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

    /** @type {{name:string, price:number, img:string, qty:number, currency:string}[]} */
    let cart = [];

    const currencyFormatters = {
        NGN: (n) => '₦' + n.toLocaleString('en-NG'),
        USD: (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    };
    const PROMO_CODE = 'KENNY10';
    let promoActive = false;
    let selectedCurrency = 'NGN';

    const PAYMENT_OPTIONS = {
        NGN: {
            accountLine: '9057 951 109 • Opay transfer',
            description: 'Local Naira payment',
            exchangeRate: 1,
        },
        USD: {
            accountLine: '001-234-567 • SWIFT: TOPPUS33',
            description: 'International USD transfer',
            exchangeRate: 1 / 430,
        },
    };

    function getFormatter(currency) {
        return currencyFormatters[currency] || currencyFormatters.NGN;
    }

    function isValidCartItem(item) {
        return (
            item &&
            typeof item.name === 'string' &&
            item.name.trim().length > 0 &&
            !Number.isNaN(Number(item.price)) &&
            Number(item.price) >= 0 &&
            Number(item.qty) > 0
        );
    }

    function loadCart() {
        try {
            const stored = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
            cart = Array.isArray(stored)
                ? stored
                      .filter(isValidCartItem)
                      .map((item) => ({
                          name: String(item.name).trim(),
                          price: Number(item.price),
                          qty: Number(item.qty),
                          img: item.img || '',
                          currency: item.currency || 'USD',
                      }))
                : [];
        } catch (error) {
            cart = [];
        }
    }

    function saveCart() {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }

    function updateCartUI() {
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.hidden = totalItems === 0;
        }

        if (!cartDropdown) {
            saveCart();
            return;
        }

        if (cart.length === 0) {
            cartDropdown.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
            saveCart();
            return;
        }

        let subtotal = 0;
        let html = '';
        cart.forEach((item, idx) => {
            const lineTotal = item.price * item.qty;
            subtotal += lineTotal;
            const format = getFormatter(item.currency);
            const cartImage = item.img || 'https://via.placeholder.com/80?text=No+Image';
            html += `
                <div class="cart-item">
                    <img src="${cartImage}" alt="${item.name}">
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
        html += `<div class="cart-actions"><a href="checkout.html" class="checkout-button">Proceed to Checkout</a></div>`;
        cartDropdown.innerHTML = html;
        saveCart();
    }

    function renderCheckoutPage() {
        const checkoutList = document.getElementById('checkoutItems');
        const subtotalCost = document.getElementById('checkoutSubtotalCost');
        const shippingCost = document.getElementById('checkoutShippingCost');
        const discountCost = document.getElementById('checkoutDiscountCost');
        const totalCost = document.getElementById('checkoutTotalCost');
        const itemCountBadge = document.getElementById('checkoutItemCount');
        const emptyCartMessage = document.getElementById('emptyCartMessage');
        const orderSection = document.getElementById('checkoutContent');
        const confirmation = document.getElementById('checkoutConfirmation');
        const shippingSpeed = document.getElementById('shippingSpeed');
        const shippingNote = document.getElementById('shippingNote');
        const deliveryEstimate = document.getElementById('deliveryEstimate');

        if (!checkoutList || !subtotalCost || !shippingCost || !discountCost || !totalCost) return;

        if (cart.length === 0) {
            if (itemCountBadge) itemCountBadge.textContent = '0';
            if (emptyCartMessage) emptyCartMessage.style.display = 'block';
            if (orderSection) orderSection.style.display = 'none';
            if (confirmation) confirmation.style.display = 'none';
            return;
        }

        if (itemCountBadge) itemCountBadge.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
        if (emptyCartMessage) emptyCartMessage.style.display = 'none';
        if (orderSection) orderSection.style.display = 'grid';

        let subtotal = 0;
        checkoutList.innerHTML = cart
            .map((item, idx) => {
                const lineTotal = item.price * item.qty;
                subtotal += lineTotal;
                const format = getFormatter(item.currency);
                return `
                    <div class="order-item">
                        <img src="${item.img || 'https://via.placeholder.com/84?text=Item'}" alt="${item.name}">
                        <div class="order-item-meta">
                            <div class="order-item-name">${item.name}</div>
                            <div class="order-item-details">${item.qty} × ${format(item.price)}</div>
                            <div class="order-item-qty">
                                Qty:
                                <button type="button" class="qty-btn" data-action="dec" data-idx="${idx}" aria-label="Decrease quantity">−</button>
                                <span>${item.qty}</span>
                                <button type="button" class="qty-btn" data-action="inc" data-idx="${idx}" aria-label="Increase quantity">+</button>
                            </div>
                        </div>
                        <div class="order-item-price">${format(lineTotal)}</div>
                    </div>`;
            })
            .join('');

        const shippingOption = shippingSpeed?.value || 'standard';
        const shippingCosts = {
            standard: 12,
            express: 24,
            priority: 39,
        };
        const shippingLabels = {
            standard: '4–7 business days',
            express: '2–3 business days',
            priority: '1–2 business days',
        };
        const shipping = subtotal >= 2000 ? 0 : shippingCosts[shippingOption] || 12;
        const discount = promoActive && subtotal >= 150 ? Math.round(subtotal * 0.1) : 0;
        const total = subtotal + shipping - discount;

        subtotalCost.textContent = getFormatter(cart[0]?.currency)(subtotal);
        shippingCost.textContent = getFormatter(cart[0]?.currency)(shipping);
        discountCost.textContent = getFormatter(cart[0]?.currency)(discount);
        totalCost.textContent = getFormatter(cart[0]?.currency)(total);

        if (shippingNote) {
            shippingNote.textContent = subtotal >= 2000
                ? 'Congratulations — shipping is free for premium orders.'
                : 'Orders over $2,000 qualify for free shipping.';
        }
        if (deliveryEstimate) {
            deliveryEstimate.textContent = `Estimated delivery: ${shippingLabels[shippingOption]}`;
        }

        if (confirmation) confirmation.style.display = 'none';
    }

    function attachCheckoutEvents() {
        const checkoutList = document.getElementById('checkoutItems');
        const checkoutForm = document.getElementById('checkoutForm');
        const confirmation = document.getElementById('checkoutConfirmation');
        const orderSection = document.getElementById('checkoutContent');
        const promoApply = document.getElementById('promoApply');
        const promoCode = document.getElementById('promoCode');
        const promoMessage = document.getElementById('promoMessage');
        const shippingSpeed = document.getElementById('shippingSpeed');

        if (checkoutList) {
            checkoutList.addEventListener('click', function (e) {
                const button = e.target.closest('button[data-action]');
                if (!button) return;
                const idx = Number(button.dataset.idx);
                const action = button.dataset.action;
                if (action === 'inc') cart[idx].qty += 1;
                if (action === 'dec') {
                    cart[idx].qty -= 1;
                    if (cart[idx].qty <= 0) cart.splice(idx, 1);
                }
                saveCart();
                updateCartUI();
                renderCheckoutPage();
            });
        }

        const paymentInstructions = document.getElementById('paymentInstructions');
        const nairaCard = document.getElementById('nairaCard');
        const usdCard = document.getElementById('usdCard');
        const paymentAmount = document.getElementById('paymentAmount');
        const bankAccount = document.getElementById('bankAccount');
        const paymentReference = document.getElementById('paymentReference');
        const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
        const paymentModal = document.getElementById('paymentModal');
        const closeModalBtn = document.getElementById('closeModalBtn');

        if (promoApply && promoCode && promoMessage) {
            promoApply.addEventListener('click', function () {
                const code = promoCode.value.trim().toUpperCase();
                const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
                const valid = code === PROMO_CODE;
                const meetsThreshold = subtotal >= 150;

                if (valid && meetsThreshold) {
                    promoActive = true;
                    promoMessage.textContent = 'Promo code applied. You saved 10% on your order.';
                    promoMessage.style.color = '#1d6a47';
                } else if (valid) {
                    promoActive = false;
                    promoMessage.textContent = 'Spend $150 or more to activate KENNY10.';
                    promoMessage.style.color = '#c77d5e';
                } else {
                    promoActive = false;
                    promoMessage.textContent = 'Invalid promo code. Try KENNY10 for 10% off orders over $150.';
                    promoMessage.style.color = '#b23b3b';
                }
                renderCheckoutPage();
                if (paymentInstructions && paymentInstructions.style.display !== 'none') {
                    updatePaymentCards();
                }
            });
        }

        if (shippingSpeed) {
            shippingSpeed.addEventListener('change', function () {
                renderCheckoutPage();
                if (paymentInstructions && paymentInstructions.style.display !== 'none') {
                    updatePaymentCards();
                }
            });
        }

        function calculateOrderSummary() {
            const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
            const shippingOption = shippingSpeed?.value || 'standard';
            const shippingCosts = {
                standard: 12,
                express: 24,
                priority: 39,
            };
            const shipping = subtotal >= 2000 ? 0 : shippingCosts[shippingOption] || 12;
            const discount = promoActive && subtotal >= 150 ? Math.round(subtotal * 0.1) : 0;
            const total = subtotal + shipping - discount;
            return {
                subtotal,
                shipping,
                discount,
                total,
                baseCurrency: cart[0]?.currency || 'NGN',
            };
        }

        function getPaymentReference() {
            return `TOPPICK-${selectedCurrency}-${Math.floor(Date.now() / 1000)}`;
        }

        function updatePaymentCards() {
            if (!paymentAmount || !bankAccount || !paymentReference) return;
            const { total, baseCurrency } = calculateOrderSummary();
            const details = PAYMENT_OPTIONS[selectedCurrency] || PAYMENT_OPTIONS.NGN;
            let convertedAmount = total;
            if (selectedCurrency !== baseCurrency) {
                convertedAmount = selectedCurrency === 'USD'
                    ? Number((total * details.exchangeRate).toFixed(2))
                    : Math.round(total / PAYMENT_OPTIONS.USD.exchangeRate);
            }
            paymentAmount.textContent = getFormatter(selectedCurrency)(convertedAmount);
            bankAccount.textContent = details.accountLine;
            paymentReference.textContent = getPaymentReference();
        }

        function refreshCurrencySelection() {
            [nairaCard, usdCard].forEach((button) => {
                if (!button) return;
                button.classList.toggle('selected', button.dataset.currency === selectedCurrency);
            });
        }

        if (checkoutForm) {
            checkoutForm.addEventListener('submit', function (e) {
                e.preventDefault();
                if (cart.length === 0) return;
                promoActive = false;
                if (checkoutForm) checkoutForm.style.display = 'none';
                if (paymentInstructions) {
                    paymentInstructions.style.display = 'grid';
                    refreshCurrencySelection();
                    updatePaymentCards();
                }
                if (promoMessage) {
                    promoMessage.textContent = 'Review payment details below to complete your order.';
                    promoMessage.style.color = 'var(--muted-text)';
                }
                if (confirmation) confirmation.style.display = 'none';
                window.scrollTo({ top: paymentInstructions?.offsetTop ? paymentInstructions.offsetTop - 20 : 0, behavior: 'smooth' });
            });
        }

        [nairaCard, usdCard].forEach((button) => {
            button?.addEventListener('click', function () {
                selectedCurrency = button.dataset.currency || 'NGN';
                refreshCurrencySelection();
                updatePaymentCards();
            });
        });

        if (confirmPaymentBtn) {
            confirmPaymentBtn.addEventListener('click', function () {
                if (cart.length === 0) return;
                cart = [];
                saveCart();
                updateCartUI();
                if (paymentInstructions) paymentInstructions.style.display = 'none';
                if (confirmation) {
                    confirmation.innerHTML = `
                        <h2>Your payment is verified</h2>
                        <p>We have received confirmation of your transfer. Your order is being processed and will be shipped according to your selected delivery option.</p>
                        <a href="index.html" class="btn">Return to Shop</a>`;
                    confirmation.style.display = 'block';
                }
                if (paymentModal) paymentModal.style.display = 'grid';
            });
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function () {
                if (paymentModal) paymentModal.style.display = 'none';
                window.location.href = 'index.html';
            });
        }

        if (paymentModal) {
            paymentModal.addEventListener('click', function (event) {
                if (event.target === paymentModal) {
                    paymentModal.style.display = 'none';
                }
            });
        }
    }

    loadCart();
    updateCartUI();
    renderCheckoutPage();
    attachCheckoutEvents();

    window.addEventListener('pageshow', function () {
        loadCart();
        updateCartUI();
        renderCheckoutPage();
    });

    addToCartButtons.forEach((btn) => {
        btn.addEventListener('click', function () {
            const name = btn.dataset.name;
            const price = Number(btn.dataset.price);
            const cardImage = btn.closest('.product-card')?.querySelector('img')?.src;
            const img = cardImage || btn.dataset.img || '';
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

    // ---------- WhatsApp integration ----------
    // IMPORTANT: replace this with the store's real WhatsApp Business number,
    // in international format, digits only (no "+", no leading 0).
    // Example: a Nigerian number 080-XXX-XXXX becomes "234XXXXXXXXXX".
    const WHATSAPP_NUMBER = '2349049357967';

    function buildWhatsAppLink(message) {
        return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    }

    function formatPriceForMessage(price, currency) {
        return getFormatter(currency)(Number(price));
    }

    function generateProductDescription(name, price, currency) {
        const lower = name.toLowerCase();
        let opener;
        if (/(bag|backpack|wallet|belt|clutch|holder)/.test(lower)) {
            opener = `Crafted for everyday carry, the ${name} pairs clean lines with materials built to last.`;
        } else if (/(sneaker|shoe|boot|sandal|pump|mule)/.test(lower)) {
            opener = `Step out in the ${name} — a silhouette that moves comfortably from daytime errands to nights out.`;
        } else if (/(jacket|coat|blazer|vest|cardigan|windrunner)/.test(lower)) {
            opener = `Layer up with the ${name}, a versatile piece that adds structure and warmth to any fit.`;
        } else if (/(hoodie|sweatshirt|sweater|crewneck|fleece)/.test(lower)) {
            opener = `The ${name} is soft, easy to wear, and built for cozy everyday rotation.`;
        } else if (/(jean|trouser|pant|chino|jogger|short|legging)/.test(lower)) {
            opener = `The ${name} offers a comfortable, tailored fit that moves with you through the day.`;
        } else if (/(sunglasses|glasses)/.test(lower)) {
            opener = `Finish your look with the ${name}, a statement accessory with everyday wearability.`;
        } else if (/(bracelet|necklace|ring|pen|cap|hat|beanie|scarf)/.test(lower)) {
            opener = `The ${name} is a small detail with a big impact, perfect for adding polish to any outfit.`;
        } else if (/(tee|shirt|polo|dress|skirt)/.test(lower)) {
            opener = `The ${name} is a wardrobe staple made from quality fabric, designed to fit effortlessly into your rotation.`;
        } else {
            opener = `The ${name} is a carefully selected piece made for everyday style and lasting quality.`;
        }
        const priceText = formatPriceForMessage(price, currency);
        return `${opener} Priced at ${priceText}, and ready to ship as soon as you check out.`;
    }

    function ensureProductModal() {
        let overlay = document.getElementById('productModalOverlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'productModalOverlay';
        overlay.className = 'modal-overlay product-modal-overlay';
        overlay.style.display = 'none';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'productModalTitle');
        overlay.innerHTML = `
            <div class="modal-panel product-modal-panel">
                <button type="button" class="product-modal-close" id="productModalClose" aria-label="Close product details">&times;</button>
                <img id="productModalImg" src="" alt="" class="product-modal-img">
                <div class="product-modal-info">
                    <h2 id="productModalTitle"></h2>
                    <p class="product-modal-price" id="productModalPrice"></p>
                    <p class="product-modal-desc" id="productModalDesc"></p>
                    <div class="product-modal-actions">
                        <button type="button" class="btn" id="productModalAddToCart">Add to Cart</button>
                        <a href="#" target="_blank" rel="noopener noreferrer" class="btn whatsapp-btn" id="productModalWhatsapp">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.4-5.7c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.6-.3-1.3-.6-1.8-1.2-.5-.5-.8-1-.9-1.2s0-.4.1-.5c.1-.1.2-.3.4-.4.1-.1.2-.3.2-.4.1-.2 0-.4 0-.5s-.5-1.2-.7-1.7c-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s.9 2.5 1.1 2.6c.1.2 1.8 2.8 4.5 3.8.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3Z" fill="currentColor"/></svg>
                            Chat on WhatsApp
                        </a>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeProductModal();
        });
        document.getElementById('productModalClose').addEventListener('click', closeProductModal);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.style.display !== 'none') closeProductModal();
        });

        return overlay;
    }

    function closeProductModal() {
        const overlay = document.getElementById('productModalOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    function openProductModal(card) {
        const cardAddBtn = card.querySelector('.add-to-cart');
        if (!cardAddBtn) return;

        const overlay = ensureProductModal();
        const name = cardAddBtn.dataset.name || card.querySelector('h3')?.textContent || 'This item';
        const price = Number(cardAddBtn.dataset.price) || 0;
        const currency = cardAddBtn.dataset.currency || 'USD';
        const imgSrc = card.querySelector('img')?.src || cardAddBtn.dataset.img || '';
        const priceText = card.querySelector('.price')?.textContent.trim() || formatPriceForMessage(price, currency);

        document.getElementById('productModalImg').src = imgSrc;
        document.getElementById('productModalImg').alt = name;
        document.getElementById('productModalTitle').textContent = name;
        document.getElementById('productModalPrice').textContent = priceText;
        document.getElementById('productModalDesc').textContent = generateProductDescription(name, price, currency);

        const modalAddBtn = document.getElementById('productModalAddToCart');
        modalAddBtn.onclick = function () {
            cardAddBtn.click();
            closeProductModal();
        };

        const whatsappBtn = document.getElementById('productModalWhatsapp');
        const message = `Hi, I'm interested in purchasing the ${priceText} ${name}`;
        whatsappBtn.href = buildWhatsAppLink(message);

        overlay.style.display = 'grid';
    }

    function setupProductModals() {
        document.querySelectorAll('.product-card').forEach((card) => {
            if (card.dataset.modalBound) return;
            card.dataset.modalBound = 'true';
            card.classList.add('has-product-modal');
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            const name = card.querySelector('.add-to-cart')?.dataset.name || card.querySelector('h3')?.textContent || 'product';
            card.setAttribute('aria-label', `View details for ${name}`);

            // Visible trigger so people notice the card opens a details view,
            // instead of relying on them discovering it's clickable.
            const cardBody = card.querySelector('.card-body');
            if (cardBody && !cardBody.querySelector('.view-details-link')) {
                const viewDetailsBtn = document.createElement('button');
                viewDetailsBtn.type = 'button';
                viewDetailsBtn.className = 'view-details-link';
                viewDetailsBtn.textContent = 'View Details';
                viewDetailsBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    openProductModal(card);
                });
                const addBtn = cardBody.querySelector('.add-to-cart');
                if (addBtn) {
                    addBtn.insertAdjacentElement('beforebegin', viewDetailsBtn);
                } else {
                    cardBody.appendChild(viewDetailsBtn);
                }
            }

            card.addEventListener('click', function (e) {
                if (e.target.closest('.add-to-cart')) return;
                openProductModal(card);
            });
            card.addEventListener('keydown', function (e) {
                if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.add-to-cart')) {
                    e.preventDefault();
                    openProductModal(card);
                }
            });
        });
    }

    function injectWhatsappFloatButton() {
        if (document.getElementById('whatsappFloatBtn')) return;
        const link = document.createElement('a');
        link.id = 'whatsappFloatBtn';
        link.className = 'whatsapp-float';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', 'Chat with us on WhatsApp');
        link.href = buildWhatsAppLink("Hi, I'd like some help with an order from Top Picks For You.");
        link.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.4-5.7c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.6-.3-1.3-.6-1.8-1.2-.5-.5-.8-1-.9-1.2s0-.4.1-.5c.1-.1.2-.3.4-.4.1-.1.2-.3.2-.4.1-.2 0-.4 0-.5s-.5-1.2-.7-1.7c-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s.9 2.5 1.1 2.6c.1.2 1.8 2.8 4.5 3.8.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3Z" fill="currentColor"/></svg>
            <span>Chat with us</span>`;
        document.body.appendChild(link);
    }

    setupProductModals();
    injectWhatsappFloatButton();

    function updateShopPreview() {
        const query = shopMoreSearch?.value.trim().toLowerCase() || '';
        const activeCategory = document.querySelector('.category-button.active')?.dataset.filter || 'all';

        document.querySelectorAll('.shop-more-card').forEach((card) => {
            const label = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const category = card.dataset.category || '';
            const matchesCategory = activeCategory === 'all' || category === activeCategory;
            const matchesQuery = query === '' || label.includes(query) || category.includes(query);
            card.style.display = matchesCategory && matchesQuery ? 'block' : 'none';
        });

        document.querySelectorAll('.shop-category-section').forEach((section) => {
            const category = section.dataset.category;
            section.classList.toggle('active', activeCategory === 'all' || category === activeCategory);
        });
    }

    if (shopMoreSearch) {
        shopMoreSearch.addEventListener('input', updateShopPreview);
    }

    categoryButtons.forEach((button) => {
        button.addEventListener('click', function () {
            categoryButtons.forEach((btn) => {
                btn.classList.toggle('active', btn === button);
                btn.setAttribute('aria-selected', String(btn === button));
            });
            updateShopPreview();
        });
    });

    updateShopPreview();

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
