// ============================================================
// AURORA — PLAYLISTS
// Create / edit modal, add-to-playlist sheet, confirm dialog,
// and the Library > Playlists panel.
// ============================================================

(function () {

    let myPlaylists = [];

    // Same placeholder used in script.js — duplicated here so this file
    // doesn't depend on script.js having loaded first.
    const PLACEHOLDER_ARTWORK =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23262636'/%3E%3Ctext x='50' y='58' font-size='40' text-anchor='middle' fill='%23a855f7'%3E%E2%99%AB%3C/text%3E%3C/svg%3E";


    // ------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------

    function escapeHTML(value) {
        const div = document.createElement("div");
        div.textContent = value ?? "";
        return div.innerHTML;
    }

    function notify(message) {
        if (typeof showToast === "function") {
            showToast(message);
        } else {
            console.log("Aurora:", message);
        }
    }

    function isLoggedIn() {
        return Boolean(window.AuroraAuth && window.AuroraAuth.isLoggedIn());
    }

    function requireLogin() {

        if (isLoggedIn()) {
            return true;
        }

        notify("Log in to create and save playlists");
        document.getElementById("accountButton")?.click();

        return false;

    }

    function coverArtworkFor(playlist) {
        return playlist.tracks.find(t => t.artwork)?.artwork || PLACEHOLDER_ARTWORK;
    }

    function trackCountLabel(playlist) {
        const n = playlist.tracks.length;
        return `${n} track${n === 1 ? "" : "s"}`;
    }


    // ------------------------------------------------------------
    // API
    // ------------------------------------------------------------

    async function loadPlaylists() {

        if (!isLoggedIn()) {
            myPlaylists = [];
            return myPlaylists;
        }

        try {

            const data = await window.AuroraAuth.apiRequest("/playlists");
            myPlaylists = data?.playlists || [];

        } catch (error) {

            console.error("Could not load playlists:", error);
            myPlaylists = [];

        }

        return myPlaylists;

    }

    async function createPlaylist(name, description) {

        const data = await window.AuroraAuth.apiRequest("/playlists", {
            method: "POST",
            body: JSON.stringify({ name, description })
        });

        return data.playlist;

    }

    async function updatePlaylist(playlistId, name, description) {

        const data = await window.AuroraAuth.apiRequest(`/playlists/${playlistId}`, {
            method: "PATCH",
            body: JSON.stringify({ name, description })
        });

        return data.playlist;

    }

    async function addTrackToPlaylist(playlistId, track) {

        return window.AuroraAuth.apiRequest(
            `/playlists/${playlistId}/tracks`,
            {
                method: "POST",
                body: JSON.stringify({
                    trackId: String(track.id),
                    title: track.title,
                    artist: track.artist,
                    artistId: track.artistId,
                    artwork: track.artwork,
                    duration: track.duration
                })
            }
        );

    }


    // ------------------------------------------------------------
    // GENERIC MODAL (fresh overlay each time, removed on close)
    // ------------------------------------------------------------

    function openModal(extraClass, innerHtml, onClose) {

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

            if (typeof onClose === "function") onClose();

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
    // CREATE / EDIT PLAYLIST MODAL
    // ------------------------------------------------------------

    function openPlaylistFormModal({ mode, playlist, onSaved }) {

        if (!requireLogin()) return;

        const isEdit = mode === "edit";

        const { overlay, close } = openModal("", `

            <div class="pl-modal-head">
                <div class="pl-modal-icon">
                    <i class="fa-solid ${isEdit ? "fa-pen" : "fa-layer-group"}"></i>
                </div>
                <div>
                    <h3 class="pl-modal-title">${isEdit ? "Edit playlist" : "Create playlist"}</h3>
                    <p class="pl-modal-sub">
                        ${isEdit
                            ? "Update the name or description."
                            : "Give your playlist a name and make it yours."}
                    </p>
                </div>
            </div>

            <form class="pl-form" id="plForm" novalidate>

                <label for="plName">Name</label>
                <input
                    id="plName"
                    type="text"
                    maxlength="60"
                    placeholder="e.g. Late night drive"
                    autocomplete="off"
                >

                <label for="plDesc">
                    Description <span class="pl-optional">(optional)</span>
                </label>
                <textarea
                    id="plDesc"
                    rows="3"
                    maxlength="160"
                    placeholder="What's this playlist about?"
                ></textarea>

                <div class="pl-char-count"><span id="plDescCount">0</span>/160</div>

                <div class="pl-form-error" id="plFormError" hidden></div>

                <div class="pl-modal-actions">
                    <button type="button" class="pl-btn pl-btn-ghost" data-modal-close>Cancel</button>
                    <button type="submit" class="pl-btn pl-btn-primary" id="plSubmit">
                        ${isEdit ? "Save changes" : "Create playlist"}
                    </button>
                </div>

            </form>

        `);

        const form = overlay.querySelector("#plForm");
        const nameInput = overlay.querySelector("#plName");
        const descInput = overlay.querySelector("#plDesc");
        const countEl = overlay.querySelector("#plDescCount");
        const errorEl = overlay.querySelector("#plFormError");
        const submitBtn = overlay.querySelector("#plSubmit");

        nameInput.value = playlist?.name || "";
        descInput.value = playlist?.description || "";
        countEl.textContent = descInput.value.length;

        descInput.addEventListener("input", () => {
            countEl.textContent = descInput.value.length;
        });

        setTimeout(() => {
            nameInput.focus();
            nameInput.select();
        }, 60);

        function showError(message) {
            errorEl.textContent = message;
            errorEl.hidden = false;
        }

        form.addEventListener("submit", async event => {

            event.preventDefault();
            errorEl.hidden = true;

            const name = nameInput.value.trim();
            const description = descInput.value.trim();

            if (!name) {
                showError("Please give your playlist a name.");
                nameInput.focus();
                return;
            }

            const originalLabel = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = isEdit ? "Saving…" : "Creating…";

            try {

                const result = isEdit
                    ? await updatePlaylist(playlist.id, name, description)
                    : await createPlaylist(name, description);

                close();

                if (typeof onSaved === "function") onSaved(result);

            } catch (error) {

                showError(error.message || "Something went wrong. Please try again.");
                submitBtn.disabled = false;
                submitBtn.textContent = originalLabel;

            }

        });

    }


    // ------------------------------------------------------------
    // CONFIRM DIALOG (replaces the ugly browser confirm())
    // ------------------------------------------------------------

    function confirmDialog({ title, message, confirmText, danger }) {

        return new Promise(resolve => {

            let answered = false;

            const { overlay, close } = openModal("pl-confirm", `

                <div class="pl-confirm-icon ${danger ? "is-danger" : ""}">
                    <i class="fa-solid ${danger ? "fa-trash" : "fa-circle-question"}"></i>
                </div>

                <h3 class="pl-modal-title pl-center">${escapeHTML(title || "Are you sure?")}</h3>
                <p class="pl-modal-sub pl-center">${escapeHTML(message || "")}</p>

                <div class="pl-modal-actions">
                    <button type="button" class="pl-btn pl-btn-ghost" data-modal-close>Cancel</button>
                    <button type="button" class="pl-btn ${danger ? "pl-btn-danger" : "pl-btn-primary"}" id="plConfirmYes">
                        ${escapeHTML(confirmText || "Confirm")}
                    </button>
                </div>

            `, () => {
                if (!answered) resolve(false);
            });

            overlay.querySelector("#plConfirmYes").addEventListener("click", () => {
                answered = true;
                resolve(true);
                close();
            });

        });

    }


    // ------------------------------------------------------------
    // ADD-TO-PLAYLIST SHEET
    // ------------------------------------------------------------

    async function openPicker(track) {

        if (!requireLogin()) return;

        if (!track || !track.id) {
            notify("This track can't be added right now — try refreshing the page.");
            return;
        }

        const { overlay, close } = openModal("pl-picker", `

            <h3 class="pl-modal-title">Add to playlist</h3>

            <div class="pl-track-preview">
                <img
                    src="${escapeHTML(track.artwork || PLACEHOLDER_ARTWORK)}"
                    alt=""
                    onerror="this.onerror=null;this.src='${PLACEHOLDER_ARTWORK}';"
                >
                <div>
                    <strong>${escapeHTML(track.title)}</strong>
                    <span>${escapeHTML(track.artist)}</span>
                </div>
            </div>

            <button type="button" class="pl-row pl-row-new" id="plNewRow">
                <span class="pl-row-icon"><i class="fa-solid fa-plus"></i></span>
                <span class="pl-row-text">
                    <strong>New playlist</strong>
                    <span>Create one and add this song</span>
                </span>
            </button>

            <div class="pl-row-list" id="plRowList">
                <div class="pl-loading">
                    <i class="fa-solid fa-spinner fa-spin"></i> Loading your playlists…
                </div>
            </div>

            <div class="pl-modal-actions">
                <button type="button" class="pl-btn pl-btn-primary" data-modal-close>Done</button>
            </div>

        `, () => {
            renderPanel();
        });

        const list = overlay.querySelector("#plRowList");

        function isInPlaylist(playlist) {
            return playlist.tracks.some(t => String(t.id) === String(track.id));
        }

        function renderRows() {

            if (!myPlaylists.length) {

                list.innerHTML = `
                    <p class="pl-empty">
                        You don't have any playlists yet — create your first one above.
                    </p>
                `;

                return;

            }

            list.innerHTML = myPlaylists.map(playlist => {

                const added = isInPlaylist(playlist);

                return `
                    <button type="button" class="pl-row ${added ? "is-added" : ""}" data-pid="${playlist.id}">
                        <img
                            class="pl-row-cover"
                            src="${escapeHTML(coverArtworkFor(playlist))}"
                            alt=""
                            onerror="this.onerror=null;this.src='${PLACEHOLDER_ARTWORK}';"
                        >
                        <span class="pl-row-text">
                            <strong>${escapeHTML(playlist.name)}</strong>
                            <span>${trackCountLabel(playlist)}</span>
                        </span>
                        <span class="pl-row-state">
                            ${added
                                ? '<i class="fa-solid fa-circle-check"></i> Added'
                                : '<i class="fa-solid fa-plus"></i>'}
                        </span>
                    </button>
                `;

            }).join("");

        }

        await loadPlaylists();
        renderRows();

        list.addEventListener("click", async event => {

            const row = event.target.closest("[data-pid]");
            if (!row || row.classList.contains("is-busy")) return;

            const playlist = myPlaylists.find(p => p.id === row.dataset.pid);
            if (!playlist) return;

            if (isInPlaylist(playlist)) {
                notify(`Already in "${playlist.name}"`);
                return;
            }

            row.classList.add("is-busy");

            try {

                await addTrackToPlaylist(playlist.id, track);

                playlist.tracks = [
                    ...playlist.tracks,
                    {
                        id: String(track.id),
                        title: track.title,
                        artist: track.artist,
                        artistId: track.artistId,
                        artwork: track.artwork
                    }
                ];

                renderRows();
                notify(`Added to "${playlist.name}"`);

            } catch (error) {

                row.classList.remove("is-busy");
                notify(error.message || "Could not add this track.");

            }

        });

        overlay.querySelector("#plNewRow").addEventListener("click", () => {

            openPlaylistFormModal({

                mode: "create",

                onSaved: async newPlaylist => {

                    try {

                        await addTrackToPlaylist(newPlaylist.id, track);
                        notify(`Added to "${newPlaylist.name}"`);

                    } catch (error) {

                        notify(`Playlist created, but the song couldn't be added: ${error.message}`);

                    }

                    close();

                }

            });

        });

    }


    // ------------------------------------------------------------
    // PLAYLISTS PANEL (Library > Playlists tab)
    // ------------------------------------------------------------

    async function renderPanel() {

        const container = document.getElementById("playlistsList");

        if (!container) return;

        if (!isLoggedIn()) {

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-layer-group"></i></div>
                    <h3>Log in to see your playlists</h3>
                    <p>Create an account to build and save playlists.</p>
                </div>
            `;

            return;

        }

        await loadPlaylists();

        if (!myPlaylists.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-layer-group"></i></div>
                    <h3>No playlists yet</h3>
                    <p>Click "New Playlist" to create your first one.</p>
                </div>
            `;

            return;

        }

        container.innerHTML = myPlaylists.map(playlist => `

            <div class="playlist-card" data-playlist-id="${playlist.id}">

                <div class="playlist-card-header" data-action="open">

                    <img
                        class="playlist-card-cover"
                        src="${escapeHTML(coverArtworkFor(playlist))}"
                        alt="${escapeHTML(playlist.name)}"
                        onerror="this.onerror=null;this.src='${PLACEHOLDER_ARTWORK}';"
                    >

                    <div class="playlist-card-text">
                        <strong>${escapeHTML(playlist.name)}</strong>
                        <span>${trackCountLabel(playlist)}</span>
                    </div>

                </div>

                <button class="icon-button" data-action="delete" title="Delete playlist">
                    <i class="fa-solid fa-trash"></i>
                </button>

            </div>

        `).join("");

    }

    function initPanelEvents() {

        document.getElementById("createPlaylistButton")?.addEventListener("click", () => {

            openPlaylistFormModal({
                mode: "create",
                onSaved: () => {
                    notify("Playlist created");
                    renderPanel();
                }
            });

        });

        document.getElementById("playlistsList")?.addEventListener("click", async event => {

            const card = event.target.closest("[data-playlist-id]");
            if (!card) return;

            const playlistId = card.dataset.playlistId;
            const action = event.target.closest("[data-action]")?.dataset.action;

            if (action === "open") {

                if (typeof window.openPlaylistDetail === "function") {
                    window.openPlaylistDetail(playlistId);
                }

                return;

            }

            if (action === "delete") {

                const playlist = myPlaylists.find(p => p.id === playlistId);

                const ok = await confirmDialog({
                    title: "Delete playlist?",
                    message: `"${playlist?.name || "This playlist"}" will be permanently deleted. This can't be undone.`,
                    confirmText: "Delete",
                    danger: true
                });

                if (!ok) return;

                try {

                    await window.AuroraAuth.apiRequest(`/playlists/${playlistId}`, { method: "DELETE" });
                    notify("Playlist deleted");
                    renderPanel();

                } catch (error) {
                    notify(error.message || "Could not delete this playlist.");
                }

            }

        });

    }


    // ------------------------------------------------------------
    // INIT
    // ------------------------------------------------------------

    document.addEventListener("DOMContentLoaded", initPanelEvents);

    window.AuroraPlaylists = {
        renderPanel,
        openPicker,
        openCreateModal: opts => openPlaylistFormModal({ mode: "create", ...opts }),
        openEditModal: (playlist, onSaved) => openPlaylistFormModal({ mode: "edit", playlist, onSaved }),
        confirmDialog
    };

})();