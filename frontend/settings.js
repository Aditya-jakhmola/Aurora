// ============================================================
// AURORA — SETTINGS PAGE
// Change password, clear listening history, delete account.
// Loaded after script.js. Builds its own page section, so
// index.html doesn't need any extra markup.
// ============================================================

(function () {

    // ------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------

    function escapeHTML(value) {
        const div = document.createElement("div");
        div.textContent = value ?? "";
        return div.innerHTML;
    }

    function toast(message) {
        if (typeof showToast === "function") {
            showToast(message);
        }
    }

    function isLoggedIn() {
        return Boolean(window.AuroraAuth && window.AuroraAuth.isLoggedIn());
    }

    function clearLocalCaches({ likes, history }) {

        if (history) {
            localStorage.removeItem("auroraRecentlyPlayed");
            if (typeof recentlyPlayed !== "undefined") recentlyPlayed = [];
        }

        if (likes) {
            localStorage.removeItem("auroraLikedTracks");
            if (typeof likedTracks !== "undefined") likedTracks = [];
        }

        if (typeof renderLibrary === "function") renderLibrary();

    }

    async function askConfirm(options) {

        if (window.AuroraPlaylists && window.AuroraPlaylists.confirmDialog) {
            return window.AuroraPlaylists.confirmDialog(options);
        }

        return window.confirm(options.message || "Are you sure?");

    }


    // ------------------------------------------------------------
    // SMALL MODAL (same look as the playlist dialogs)
    // ------------------------------------------------------------

    function openModal(extraClass, innerHtml) {

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";

        overlay.innerHTML = `
            <div class="modal-box pl-modal ${extraClass || ""}" role="dialog" aria-modal="true">
                <button class="modal-close" data-modal-close type="button" title="Close">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                ${innerHtml}
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add("show"));

        let closed = false;

        function close() {

            if (closed) return;
            closed = true;

            overlay.classList.remove("show");
            document.removeEventListener("keydown", onKeydown);

            setTimeout(() => overlay.remove(), 220);

        }

        function onKeydown(event) {
            if (event.key === "Escape") close();
        }

        document.addEventListener("keydown", onKeydown);

        overlay.addEventListener("click", event => {
            if (event.target === overlay || event.target.closest("[data-modal-close]")) {
                close();
            }
        });

        return { overlay, close };

    }


    // ------------------------------------------------------------
    // DELETE ACCOUNT DIALOG
    // ------------------------------------------------------------

    function openDeleteAccountModal() {

        const { overlay, close } = openModal("pl-confirm", `

            <div class="pl-confirm-icon is-danger">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h3 class="pl-modal-title pl-center">Delete your account?</h3>
            <p class="pl-modal-sub pl-center">
                This permanently deletes your account, liked songs, playlists and
                listening history. This can't be undone.
            </p>

            <form class="pl-form settings-delete-form" id="deleteAccountForm" novalidate>

                <label for="deleteAccountPassword">Enter your password to confirm</label>
                <input
                    id="deleteAccountPassword"
                    type="password"
                    autocomplete="current-password"
                    placeholder="Your password"
                >

                <div class="pl-form-error" id="deleteAccountError" hidden></div>

                <div class="pl-modal-actions">
                    <button type="button" class="pl-btn pl-btn-ghost" data-modal-close>Cancel</button>
                    <button type="submit" class="pl-btn pl-btn-danger" id="deleteAccountSubmit">
                        Delete account
                    </button>
                </div>

            </form>

        `);

        const form = overlay.querySelector("#deleteAccountForm");
        const input = overlay.querySelector("#deleteAccountPassword");
        const errorEl = overlay.querySelector("#deleteAccountError");
        const submitBtn = overlay.querySelector("#deleteAccountSubmit");

        setTimeout(() => input.focus(), 60);

        form.addEventListener("submit", async event => {

            event.preventDefault();
            errorEl.hidden = true;

            const password = input.value;

            if (!password) {
                errorEl.textContent = "Please enter your password.";
                errorEl.hidden = false;
                input.focus();
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Deleting…";

            try {

                await window.AuroraAuth.apiRequest("/auth/account", {
                    method: "DELETE",
                    body: JSON.stringify({ password })
                });

                close();

                clearLocalCaches({ likes: true, history: true });

                window.AuroraAuth.logout();

                if (typeof goToHome === "function") goToHome();

                toast("Your account has been deleted");

            } catch (error) {

                errorEl.textContent = error.message || "Could not delete your account.";
                errorEl.hidden = false;

                submitBtn.disabled = false;
                submitBtn.textContent = "Delete account";

            }

        });

    }


    // ------------------------------------------------------------
    // PAGE
    // ------------------------------------------------------------

    function ensureSection() {

        let section = document.getElementById("settingsSection");

        if (!section) {

            section = document.createElement("section");
            section.className = "page-section";
            section.id = "settingsSection";
            section.innerHTML = `<div id="settingsContent"></div>`;

            document.querySelector(".main-content")?.appendChild(section);

        }

        return section;

    }

    function render() {

        const content = document.getElementById("settingsContent");

        if (!content) return;

        if (!isLoggedIn()) {

            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-gear"></i></div>
                    <h3>Log in to open settings</h3>
                    <p>Use the Log in button in the sidebar.</p>
                </div>
            `;

            return;

        }

        const user = window.AuroraAuth.getUser() || {};

        content.innerHTML = `

            <div class="settings-page">

                <div class="library-header">
                    <p class="section-kicker">ACCOUNT</p>
                    <h1>Settings</h1>
                    <p>
                        Signed in as <strong>${escapeHTML(user.username || "you")}</strong>
                        ${user.email ? `(${escapeHTML(user.email)})` : ""}
                    </p>
                </div>


                <!-- CHANGE PASSWORD -->

                <div class="settings-card">

                    <div class="settings-card-head">
                        <div class="settings-icon"><i class="fa-solid fa-lock"></i></div>
                        <div>
                            <h3>Change password</h3>
                            <p>Use at least 6 characters.</p>
                        </div>
                    </div>

                    <form class="pl-form" id="settingsPasswordForm" novalidate>

                        <label for="settingsCurrentPassword">Current password</label>
                        <input id="settingsCurrentPassword" type="password" autocomplete="current-password">

                        <label for="settingsNewPassword">New password</label>
                        <input id="settingsNewPassword" type="password" autocomplete="new-password">

                        <label for="settingsConfirmPassword">Confirm new password</label>
                        <input id="settingsConfirmPassword" type="password" autocomplete="new-password">

                        <div class="pl-form-error" id="settingsPasswordError" hidden></div>
                        <div class="settings-success" id="settingsPasswordSuccess" hidden></div>

                        <button type="submit" class="pl-btn pl-btn-primary" id="settingsPasswordSubmit">
                            Update password
                        </button>

                    </form>

                </div>


                <!-- LISTENING HISTORY -->

                <div class="settings-card">

                    <div class="settings-card-head">
                        <div class="settings-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
                        <div>
                            <h3>Listening history</h3>
                            <p>Remove everything in your Recently Played list.</p>
                        </div>
                    </div>

                    <button type="button" class="pl-btn pl-btn-ghost" id="settingsClearHistory">
                        Clear listening history
                    </button>

                </div>


                <!-- DANGER ZONE -->

                <div class="settings-card settings-danger">

                    <div class="settings-card-head">
                        <div class="settings-icon is-danger"><i class="fa-solid fa-triangle-exclamation"></i></div>
                        <div>
                            <h3>Delete account</h3>
                            <p>Permanently remove your account and everything saved in it.</p>
                        </div>
                    </div>

                    <button type="button" class="pl-btn pl-btn-danger" id="settingsDeleteAccount">
                        Delete my account
                    </button>

                </div>

            </div>

        `;

        bindPasswordForm();
        bindHistoryButton();
        bindDeleteButton();

    }

    function bindPasswordForm() {

        const form = document.getElementById("settingsPasswordForm");

        if (!form) return;

        const currentInput = document.getElementById("settingsCurrentPassword");
        const newInput = document.getElementById("settingsNewPassword");
        const confirmInput = document.getElementById("settingsConfirmPassword");
        const errorEl = document.getElementById("settingsPasswordError");
        const successEl = document.getElementById("settingsPasswordSuccess");
        const submitBtn = document.getElementById("settingsPasswordSubmit");

        function showError(message) {
            successEl.hidden = true;
            errorEl.textContent = message;
            errorEl.hidden = false;
        }

        form.addEventListener("submit", async event => {

            event.preventDefault();

            errorEl.hidden = true;
            successEl.hidden = true;

            const currentPassword = currentInput.value;
            const newPassword = newInput.value;
            const confirmPassword = confirmInput.value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                showError("Please fill in all three fields.");
                return;
            }

            if (newPassword.length < 6) {
                showError("Your new password must be at least 6 characters.");
                return;
            }

            if (newPassword !== confirmPassword) {
                showError("The new passwords don't match.");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Updating…";

            try {

                await window.AuroraAuth.apiRequest("/auth/password", {
                    method: "PATCH",
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                form.reset();

                successEl.textContent = "Password updated. Use your new password next time you log in.";
                successEl.hidden = false;

                toast("Password updated");

            } catch (error) {

                showError(error.message || "Could not update your password.");

            } finally {

                submitBtn.disabled = false;
                submitBtn.textContent = "Update password";

            }

        });

    }

    function bindHistoryButton() {

        document.getElementById("settingsClearHistory")?.addEventListener("click", async () => {

            const ok = await askConfirm({
                title: "Clear listening history?",
                message: "Everything in Recently Played will be removed.",
                confirmText: "Clear history",
                danger: true
            });

            if (!ok) return;

            try {

                await window.AuroraAuth.apiRequest("/history", { method: "DELETE" });

                clearLocalCaches({ history: true });

                toast("Listening history cleared");

            } catch (error) {

                toast(error.message || "Could not clear your history.");

            }

        });

    }

    function bindDeleteButton() {

        document.getElementById("settingsDeleteAccount")?.addEventListener("click", openDeleteAccountModal);

    }


    // ------------------------------------------------------------
    // OPEN
    // ------------------------------------------------------------

    function openSettings() {

        ensureSection();

        if (typeof showSection === "function") {
            showSection("settingsSection");
        }

        render();

    }

    // The "Settings" button on the Profile page is created by script.js,
    // so we listen for it at the document level.
    document.addEventListener("click", event => {

        if (event.target.closest("#profileSettingsButton")) {
            openSettings();
        }

    });

    // If the user logs out while Settings is open, show the login message.
    window.addEventListener("aurora:auth-changed", () => {

        const section = document.getElementById("settingsSection");

        if (section && section.classList.contains("active-section")) {
            render();
        }

    });

    window.openSettings = openSettings;

})();