// ============================================================
// AURORA — PLAYLISTS
// ============================================================

(function () {

    let myPlaylists = [];
    let openPlaylistId = null; // which playlist's tracks are expanded in the panel
    let pickerTrack = null;    // the track currently being added via the picker

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
            alert(message);
        }
    }

    // Failures use a real alert() — a toast is easy to miss, and if
    // something goes wrong here we want it impossible not to notice.
    function notifyError(message) {
        console.error("Aurora playlists error:", message);
        alert(message || "Something went wrong with that playlist action.");
    }

    function requireLogin() {

        if (window.AuroraAuth && window.AuroraAuth.isLoggedIn()) {
            return true;
        }

        notify("Log in to create and save playlists");
        document.getElementById("accountButton")?.click();

        return false;

    }


    // ------------------------------------------------------------
    // LOAD PLAYLISTS FROM THE BACKEND
    // ------------------------------------------------------------

    async function loadPlaylists() {

        if (!(window.AuroraAuth && window.AuroraAuth.isLoggedIn())) {
            myPlaylists = [];
            return myPlaylists;
        }

        try {

            const data = await window.AuroraAuth.apiRequest("/playlists");
            myPlaylists = data?.playlists || [];
            console.log("Aurora: loaded playlists", myPlaylists);

        } catch (error) {

            console.error("Could not load playlists:", error);
            myPlaylists = [];

        }

        return myPlaylists;

    }


    // ------------------------------------------------------------
    // CREATE A NEW PLAYLIST
    // ------------------------------------------------------------

    async function createPlaylist(name) {

        const data = await window.AuroraAuth.apiRequest("/playlists", {
            method: "POST",
            body: JSON.stringify({ name })
        });

        console.log("Aurora: created playlist", data.playlist);

        return data.playlist;

    }


    // ------------------------------------------------------------
    // ADD A TRACK TO A PLAYLIST BY ID
    // ------------------------------------------------------------

    async function addTrackToPlaylist(playlistId, track) {

        console.log("Aurora: adding track to playlist", { playlistId, track });

        const data = await window.AuroraAuth.apiRequest(
            `/playlists/${playlistId}/tracks`,
            {
                method: "POST",
                body: JSON.stringify({
                    trackId: String(track.id),
                    title: track.title,
                    artist: track.artist,
                    artwork: track.artwork,
                    duration: track.duration
                })
            }
        );

        console.log("Aurora: add-track response", data);

        return data;

    }


    // ------------------------------------------------------------
    // RENDER THE PLAYLISTS PANEL (Library > Playlists tab)
    // ------------------------------------------------------------

    async function renderPanel() {

        const container = document.getElementById("playlistsList");

        if (!container) return;

        if (!(window.AuroraAuth && window.AuroraAuth.isLoggedIn())) {

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

                <div class="playlist-card-header" data-action="toggle">
                    <div>
                        <strong>${escapeHTML(playlist.name)}</strong>
                        <span>${playlist.tracks.length} track${playlist.tracks.length === 1 ? "" : "s"}</span>
                    </div>
                    <button class="icon-button" data-action="delete" title="Delete playlist">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>

                ${openPlaylistId === playlist.id ? `
                    <div class="playlist-card-tracks">
                        ${
                            playlist.tracks.length
                                ? playlist.tracks.map(track => `
                                    <div class="library-track" data-row-id="${track.rowId}">
                                        <img src="${escapeHTML(track.artwork || PLACEHOLDER_ARTWORK)}" alt="${escapeHTML(track.title)}" onerror="this.onerror=null;this.src='${PLACEHOLDER_ARTWORK}';">
                                        <div>
                                            <strong>${escapeHTML(track.title)}</strong>
                                            <span>${escapeHTML(track.artist)}</span>
                                        </div>
                                        <button class="library-play" data-action="play-track" title="Play">
                                            <i class="fa-solid fa-play"></i>
                                        </button>
                                        <button class="icon-button" data-action="remove-track" title="Remove">
                                            <i class="fa-solid fa-xmark"></i>
                                        </button>
                                    </div>
                                `).join("")
                                : `<p class="playlist-empty-hint">No tracks yet — use the "+" button on any song to add it here.</p>`
                        }
                    </div>
                ` : ""}

            </div>

        `).join("");

    }


    // ------------------------------------------------------------
    // PANEL EVENTS (create / delete / expand / remove track / play)
    // ------------------------------------------------------------

    function initPanelEvents() {

        document.getElementById("createPlaylistButton")?.addEventListener("click", async () => {

            if (!requireLogin()) return;

            const name = prompt("Playlist name:");

            if (!name || !name.trim()) return;

            try {

                await createPlaylist(name.trim());
                notify("Playlist created");
                renderPanel();

            } catch (error) {
                notifyError(error.message);
            }

        });

        document.getElementById("playlistsList")?.addEventListener("click", async event => {

            const card = event.target.closest("[data-playlist-id]");
            if (!card) return;

            const playlistId = card.dataset.playlistId;
            const actionElement = event.target.closest("[data-action]");
            const action = actionElement?.dataset.action;

            if (action === "toggle") {

                openPlaylistId = openPlaylistId === playlistId ? null : playlistId;
                renderPanel();
                return;

            }

            if (action === "delete") {

                if (!confirm("Delete this playlist?")) return;

                try {
                    await window.AuroraAuth.apiRequest(`/playlists/${playlistId}`, { method: "DELETE" });
                    if (openPlaylistId === playlistId) openPlaylistId = null;
                    renderPanel();
                } catch (error) {
                    notifyError(error.message);
                }

                return;

            }

            if (action === "remove-track") {

                const rowId = event.target.closest("[data-row-id]")?.dataset.rowId;
                if (!rowId) return;

                try {
                    await window.AuroraAuth.apiRequest(`/playlists/${playlistId}/tracks/${rowId}`, { method: "DELETE" });
                    renderPanel();
                } catch (error) {
                    notifyError(error.message);
                }

                return;

            }

            if (action === "play-track") {

                const rowId = event.target.closest("[data-row-id]")?.dataset.rowId;
                const playlist = myPlaylists.find(p => p.id === playlistId);
                const track = playlist?.tracks.find(t => t.rowId === rowId);

                if (track && typeof playTrack === "function") {
                    playTrack(track, playlist.tracks);
                }

            }

        });

    }


    // ------------------------------------------------------------
    // "ADD TO PLAYLIST" POPUP — a real dropdown, not a text prompt
    // ------------------------------------------------------------

    let pickerOverlay = null;

    function buildPickerOverlay() {

        const wrapper = document.createElement("div");
        wrapper.id = "playlistPickerOverlay";
        wrapper.className = "modal-overlay";

        wrapper.innerHTML = `
            <div class="modal-box">
                <button class="modal-close" id="pickerClose" title="Close">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <h3 class="modal-title">Add to Playlist</h3>

                <div class="modal-form">
                    <label id="pickerTrackLabel"></label>

                    <select id="pickerSelect"></select>

                    <button type="button" class="primary-button" id="pickerAddButton">
                        Add
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);

        wrapper.querySelector("#pickerClose").addEventListener("click", () => {
            wrapper.classList.remove("show");
        });

        wrapper.addEventListener("click", event => {
            if (event.target === wrapper) wrapper.classList.remove("show");
        });

        return wrapper;

    }

    async function openPicker(track) {

        if (!requireLogin()) return;

        if (!track || !track.id) {
            notifyError("This track can't be added right now — try refreshing the page.");
            return;
        }

        pickerTrack = track;

        if (!pickerOverlay) {
            pickerOverlay = buildPickerOverlay();
        }

        const select = pickerOverlay.querySelector("#pickerSelect");
        const label = pickerOverlay.querySelector("#pickerTrackLabel");
        const addButton = pickerOverlay.querySelector("#pickerAddButton");

        label.textContent = `Adding: ${track.title} — ${track.artist}`;
        select.innerHTML = `<option>Loading your playlists…</option>`;
        pickerOverlay.classList.add("show");

        await loadPlaylists();

        const options = myPlaylists
            .map(p => `<option value="${p.id}">${escapeHTML(p.name)} (${p.tracks.length})</option>`)
            .join("");

        select.innerHTML = `
            ${options}
            <option value="__new__">+ Create new playlist…</option>
        `;

        addButton.onclick = async () => {

            const chosenId = select.value;

            addButton.disabled = true;
            addButton.textContent = "Adding…";

            try {

                let targetPlaylist;

                if (chosenId === "__new__") {

                    const name = prompt("New playlist name:");

                    if (!name || !name.trim()) {
                        addButton.disabled = false;
                        addButton.textContent = "Add";
                        return;
                    }

                    targetPlaylist = await createPlaylist(name.trim());

                } else {

                    targetPlaylist = myPlaylists.find(p => p.id === chosenId);

                    if (!targetPlaylist) {
                        throw new Error("Please pick a playlist from the list.");
                    }

                }

                await addTrackToPlaylist(targetPlaylist.id, pickerTrack);

                notify(`Added "${pickerTrack.title}" to "${targetPlaylist.name}"`);
                pickerOverlay.classList.remove("show");
                renderPanel();

            } catch (error) {

                notifyError(error.message || "Could not add this track to the playlist.");

            } finally {

                addButton.disabled = false;
                addButton.textContent = "Add";

            }

        };

    }


    // ------------------------------------------------------------
    // INIT
    // ------------------------------------------------------------

    document.addEventListener("DOMContentLoaded", initPanelEvents);

    window.AuroraPlaylists = {
        renderPanel,
        openPicker
    };

})();