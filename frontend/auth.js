// ============================================================
// AURORA — ACCOUNTS (login / register / session)
// ============================================================

(function () {

    const API_BASE = "/api";

    const TOKEN_KEY = "auroraToken";
    const USER_KEY = "auroraUser";


    // ------------------------------------------------------------
    // SESSION STATE
    // ------------------------------------------------------------

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY) || "null");
        } catch {
            return null;
        }
    }

    function isLoggedIn() {
        return Boolean(getToken());
    }

    function setSession(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        updateAccountButton();
        window.dispatchEvent(new CustomEvent("aurora:auth-changed"));
    }

    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        updateAccountButton();
        window.dispatchEvent(new CustomEvent("aurora:auth-changed"));
    }


    // ------------------------------------------------------------
    // AUTHENTICATED API HELPER
    // ------------------------------------------------------------

    async function apiRequest(endpoint, options = {}) {

        const token = getToken();

        const headers = Object.assign(
            { "Content-Type": "application/json" },
            options.headers || {}
        );

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {

            if (response.status === 401) {
                // Session expired/invalid — clear it so the UI reflects reality.
                logout();
            }

            throw new Error(data?.error || "Something went wrong.");

        }

        return data;

    }


    // ------------------------------------------------------------
    // ACCOUNT BUTTON (SIDEBAR)
    // ------------------------------------------------------------

    function updateAccountButton() {

        const label = document.getElementById("accountButtonLabel");
        const user = getUser();

        if (!label) return;

        label.textContent = user ? user.username : "Log in";

    }


    // ------------------------------------------------------------
    // MODAL MARKUP (built once, injected into the page)
    // ------------------------------------------------------------

    function buildModal() {

        const wrapper = document.createElement("div");

        wrapper.id = "authModalOverlay";
        wrapper.className = "modal-overlay";

        wrapper.innerHTML = `
            <div class="modal-box">

                <button class="modal-close" id="authModalClose" title="Close">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <div class="modal-tabs">
                    <button class="modal-tab active" data-auth-tab="login">Log In</button>
                    <button class="modal-tab" data-auth-tab="register">Sign Up</button>
                </div>

                <div class="modal-error" id="authModalError" style="display:none;"></div>

                <form id="loginForm" class="modal-form">
                    <label>Email or username</label>
                    <input type="text" id="loginIdentifier" autocomplete="username" required>

                    <label>Password</label>
                    <input type="password" id="loginPassword" autocomplete="current-password" required>

                    <button type="submit" class="primary-button">Log In</button>
                </form>

                <form id="registerForm" class="modal-form" style="display:none;">
                    <label>Username</label>
                    <input type="text" id="registerUsername" autocomplete="username" required>

                    <label>Email</label>
                    <input type="email" id="registerEmail" autocomplete="email" required>

                    <label>Password (min 6 characters)</label>
                    <input type="password" id="registerPassword" autocomplete="new-password" required minlength="6">

                    <button type="submit" class="primary-button">Create Account</button>
                </form>

                <button id="logoutButton" class="text-button" style="display:none;">
                    Log Out
                </button>

            </div>
        `;

        document.body.appendChild(wrapper);

        return wrapper;

    }


    // ------------------------------------------------------------
    // MODAL BEHAVIOR
    // ------------------------------------------------------------

    function initModal() {

        const overlay = buildModal();

        const closeButton = overlay.querySelector("#authModalClose");
        const tabs = overlay.querySelectorAll("[data-auth-tab]");
        const loginForm = overlay.querySelector("#loginForm");
        const registerForm = overlay.querySelector("#registerForm");
        const logoutButton = overlay.querySelector("#logoutButton");
        const errorBox = overlay.querySelector("#authModalError");

        function showError(message) {
            errorBox.textContent = message;
            errorBox.style.display = "block";
        }

        function clearError() {
            errorBox.style.display = "none";
            errorBox.textContent = "";
        }

        function openModal() {

            clearError();

            if (isLoggedIn()) {

                loginForm.style.display = "none";
                registerForm.style.display = "none";
                overlay.querySelectorAll(".modal-tab").forEach(t => t.style.display = "none");
                logoutButton.style.display = "block";

            } else {

                overlay.querySelectorAll(".modal-tab").forEach(t => t.style.display = "block");
                logoutButton.style.display = "none";
                setActiveTab("login");

            }

            overlay.classList.add("show");

        }

        function closeModal() {
            overlay.classList.remove("show");
        }

        function setActiveTab(tabName) {

            tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.authTab === tabName));

            loginForm.style.display = tabName === "login" ? "flex" : "none";
            registerForm.style.display = tabName === "register" ? "flex" : "none";

            clearError();

        }

        tabs.forEach(tab => {
            tab.addEventListener("click", () => setActiveTab(tab.dataset.authTab));
        });

        closeButton.addEventListener("click", closeModal);

        overlay.addEventListener("click", event => {
            if (event.target === overlay) closeModal();
        });

        loginForm.addEventListener("submit", async event => {

            event.preventDefault();
            clearError();

            const emailOrUsername = document.getElementById("loginIdentifier").value.trim();
            const password = document.getElementById("loginPassword").value;

            try {

                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ emailOrUsername, password })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || "Unable to log in.");
                }

                setSession(data.token, data.user);
                closeModal();

            } catch (error) {
                showError(error.message);
            }

        });

        registerForm.addEventListener("submit", async event => {

            event.preventDefault();
            clearError();

            const username = document.getElementById("registerUsername").value.trim();
            const email = document.getElementById("registerEmail").value.trim();
            const password = document.getElementById("registerPassword").value;

            try {

                const response = await fetch(`${API_BASE}/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || "Unable to create account.");
                }

                setSession(data.token, data.user);
                closeModal();

            } catch (error) {
                showError(error.message);
            }

        });

        logoutButton.addEventListener("click", () => {
            logout();
            closeModal();
        });

        const accountButton = document.getElementById("accountButton");

        if (accountButton) {

            accountButton.addEventListener("click", () => {

                if (isLoggedIn() && typeof window.goToProfile === "function") {
                    window.goToProfile();
                    return;
                }

                openModal();

            });

        }

    }


    // ------------------------------------------------------------
    // INIT
    // ------------------------------------------------------------

    document.addEventListener("DOMContentLoaded", () => {
        initModal();
        updateAccountButton();
    });

    // Expose a small public API for script.js / playlists.js to use.
    window.AuroraAuth = {
        getToken,
        getUser,
        isLoggedIn,
        apiRequest,
        logout
    };

})();
