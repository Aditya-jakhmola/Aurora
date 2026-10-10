// ============================================================
// AURORA — LIBRARY TOOLS
//   1. "Play all" + "Shuffle" bar on Liked Songs / Recently Played
//   2. Recent searches under the Search box
//
// Loaded after script.js — it only uses things script.js already has.
// ============================================================

(function () {

    const SEARCH_KEY = "auroraRecentSearches";
    const MAX_SEARCHES = 8;

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    // ============================================================
    // 1. PLAY ALL / SHUFFLE BAR
    // ============================================================

    let toolbar = null;
    let toolbarCount = null;

    function currentLibraryList() {

        const tab = typeof activeLibraryTab !== "undefined" ? activeLibraryTab : "liked";

        if (tab === "liked" && typeof likedTracks !== "undefined") return likedTracks;
        if (tab === "recent" && typeof recentlyPlayed !== "undefined") return recentlyPlayed;

        return null;

    }

    function shuffledCopy(list) {

        const copy = [...list];

        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }

        return copy;

    }

    function updateToolbar() {

        const list = document.getElementById("libraryTrackList");

        if (!list || !toolbar) return;

        const tracks = currentLibraryList();
        const listIsVisible = list.style.display !== "none";

        if (!tracks || !tracks.length || !listIsVisible) {
            toolbar.hidden = true;
            return;
        }

        toolbarCount.textContent = `${tracks.length} song${tracks.length === 1 ? "" : "s"}`;
        toolbar.hidden = false;

    }

    function initToolbar() {

        const list = document.getElementById("libraryTrackList");

        if (!list || !list.parentNode) return;

        toolbar = document.createElement("div");
        toolbar.className = "library-toolbar";
        toolbar.id = "libraryToolbar";
        toolbar.hidden = true;

        toolbar.innerHTML = `
            <button type="button" class="pl-btn pl-btn-primary" id="libraryPlayAll">
                <i class="fa-solid fa-play"></i> Play all
            </button>
            <button type="button" class="pl-btn pl-btn-ghost" id="libraryShuffleAll">
                <i class="fa-solid fa-shuffle"></i> Shuffle
            </button>
            <span class="library-count" id="libraryCount"></span>
        `;

        list.parentNode.insertBefore(toolbar, list);

        toolbarCount = toolbar.querySelector("#libraryCount");

        toolbar.querySelector("#libraryPlayAll").addEventListener("click", () => {

            const tracks = currentLibraryList();

            if (tracks && tracks.length && typeof playTrack === "function") {
                playTrack(tracks[0], tracks);
            }

        });

        toolbar.querySelector("#libraryShuffleAll").addEventListener("click", () => {

            const tracks = currentLibraryList();

            if (tracks && tracks.length && typeof playTrack === "function") {
                const mixed = shuffledCopy(tracks);
                playTrack(mixed[0], mixed);
            }

        });

        updateToolbar();

        // The library re-renders itself whenever you switch tabs, like or
        // unlike a song, or log in/out — watching it keeps the bar in sync.
        new MutationObserver(updateToolbar).observe(list, {
            childList: true,
            attributes: true,
            attributeFilter: ["style"]
        });

    }


    // ============================================================
    // 2. RECENT SEARCHES
    // ============================================================

    let searchBox = null;

    function loadSearches() {

        try {

            const parsed = JSON.parse(localStorage.getItem(SEARCH_KEY) || "[]");

            return Array.isArray(parsed)
                ? parsed.filter(item => typeof item === "string" && item.trim())
                : [];

        } catch {
            return [];
        }

    }

    function storeSearches(list) {

        try {
            localStorage.setItem(SEARCH_KEY, JSON.stringify(list));
        } catch {
            // Storage unavailable — recent searches just won't persist.
        }

    }

    function renderSearches() {

        if (!searchBox) return;

        const list = loadSearches();

        searchBox.hidden = list.length === 0;

        if (!list.length) {
            searchBox.innerHTML = "";
            return;
        }

        searchBox.innerHTML = `
            <div class="recent-searches-head">
                <span>Recent searches</span>
                <button type="button" class="recent-clear" data-clear>Clear all</button>
            </div>
            <div class="recent-chips">
                ${list.map((query, index) => `
                    <span class="recent-chip">
                        <button type="button" class="recent-chip-text" data-search data-i="${index}">
                            ${escapeHTML(query)}
                        </button>
                        <button
                            type="button"
                            class="recent-chip-remove"
                            data-remove
                            data-i="${index}"
                            aria-label="Remove ${escapeHTML(query)}"
                        >×</button>
                    </span>
                `).join("")}
            </div>
        `;

    }

    function rememberSearch(query) {

        const clean = String(query || "").trim();

        if (!clean) return;

        const list = [
            clean,
            ...loadSearches().filter(item => item.toLowerCase() !== clean.toLowerCase())
        ].slice(0, MAX_SEARCHES);

        storeSearches(list);
        renderSearches();

    }

    function runSearch(query) {

        const input = document.getElementById("searchInput");

        if (!input) return;

        input.value = query;

        rememberSearch(query);

        if (typeof searchMusic === "function") {
            searchMusic();
        }

    }

    function initRecentSearches() {

        const status = document.getElementById("searchStatus");
        const input = document.getElementById("searchInput");

        if (!status || !input || !status.parentNode) return;

        searchBox = document.createElement("div");
        searchBox.className = "recent-searches";
        searchBox.id = "recentSearches";
        searchBox.hidden = true;

        status.parentNode.insertBefore(searchBox, status);

        searchBox.addEventListener("click", event => {

            const target = event.target;

            if (target.closest("[data-clear]")) {
                storeSearches([]);
                renderSearches();
                return;
            }

            const removeButton = target.closest("[data-remove]");

            if (removeButton) {

                const list = loadSearches();
                list.splice(Number(removeButton.dataset.i), 1);
                storeSearches(list);
                renderSearches();
                return;

            }

            const searchButton = target.closest("[data-search]");

            if (searchButton) {

                const query = loadSearches()[Number(searchButton.dataset.i)];

                if (query) runSearch(query);

            }

        });

        // Remember what you search for — the app's own search code is left alone.
        input.addEventListener("keydown", event => {

            if (event.key === "Enter") {
                rememberSearch(input.value);
            }

        });

        document.getElementById("searchButton")?.addEventListener("click", () => {
            rememberSearch(input.value);
        });

        renderSearches();

    }

    // Recent searches are personal — forget them on logout.
    window.addEventListener("aurora:auth-changed", () => {

        const loggedIn = Boolean(window.AuroraAuth && window.AuroraAuth.isLoggedIn());

        if (!loggedIn) {
            storeSearches([]);
            renderSearches();
        }

    });


    // ============================================================
    // START
    // ============================================================

    function init() {
        initToolbar();
        initRecentSearches();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();