// ============================================================
// AURORA — REAL MUSIC STREAMING APP
// Audius API + Real-Time Streaming
// ============================================================

console.log("🎵 Aurora frontend loaded");


// ============================================================
// CONFIG
// ============================================================

const API_BASE = "/api";

// Used whenever a track has no artwork, or its artwork URL fails to load.
// An empty src="" makes some browsers try to load the current page as an
// image, which shows up as a giant broken-image icon — this avoids that.
const PLACEHOLDER_ARTWORK =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23262636'/%3E%3Ctext x='50' y='58' font-size='40' text-anchor='middle' fill='%23a855f7'%3E%E2%99%AB%3C/text%3E%3C/svg%3E";

function safeArtwork(track) {
    return track?.artwork || PLACEHOLDER_ARTWORK;
}


// ============================================================
// APP STATE
// ============================================================

let currentTrack = null;

let queue = [];

let currentIndex = -1;

let isShuffle = false;

let isRepeat = false;

let likedTracks =
    JSON.parse(
        localStorage.getItem("auroraLikedTracks") || "[]"
    );

let recentlyPlayed =
    JSON.parse(
        localStorage.getItem("auroraRecentlyPlayed") || "[]"
    );


// ============================================================
// AUDIO
// ============================================================

const audio =
    document.getElementById("audioPlayer");

if (audio) {
    audio.preload = "metadata";
    audio.volume = 1;
}


// ============================================================
// DOM
// ============================================================

const trendingGrid =
    document.getElementById("trendingGrid");

const latestGrid =
    document.getElementById("latestGrid");

const searchGrid =
    document.getElementById("searchGrid");

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const searchStatus =
    document.getElementById("searchStatus");

const playerTitle =
    document.getElementById("playerTitle");

const playerArtist =
    document.getElementById("playerArtist");

const playerCover =
    document.getElementById("playerCover");

const playerCoverPlaceholder =
    document.getElementById(
        "playerCoverPlaceholder"
    );

const playButton =
    document.getElementById("playButton");

const previousButton =
    document.getElementById("previousButton");

const nextButton =
    document.getElementById("nextButton");

const shuffleButton =
    document.getElementById("shuffleButton");

const repeatButton =
    document.getElementById("repeatButton");

const progressBar =
    document.getElementById("progressBar");

const currentTime =
    document.getElementById("currentTime");

const duration =
    document.getElementById("duration");

const volumeBar =
    document.getElementById("volumeBar");

const playerLikeButton =
    document.getElementById(
        "playerLikeButton"
    );

const libraryTrackList =
    document.getElementById(
        "libraryTrackList"
    );

const queueNowPlaying =
    document.getElementById("queueNowPlaying");

const queueUpNextHeading =
    document.getElementById("queueUpNextHeading");

const queueList =
    document.getElementById("queueList");

const toast =
    document.getElementById("toast");

const toastMessage =
    document.getElementById(
        "toastMessage"
    );


// ============================================================
// UTILITY
// ============================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(seconds) {

    seconds =
        Number(seconds);

    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        Math.floor(seconds % 60);

    return (
        minutes +
        ":" +
        String(secs).padStart(2, "0")
    );
}


// ============================================================
// API REQUEST
// ============================================================

async function apiRequest(
    endpoint
) {

    const response =
        await fetch(
            `${API_BASE}${endpoint}`
        );

    let data = null;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "Aurora received an invalid server response."
        );

    }

    if (!response.ok) {

        throw new Error(
            data?.error ||
            `API error ${response.status}`
        );

    }

    if (
        data &&
        data.success === false
    ) {

        throw new Error(
            data.error ||
            "Aurora API request failed."
        );

    }

    return data;
}


// ============================================================
// TOAST
// ============================================================

function showToast(message) {

    if (
        !toast ||
        !toastMessage
    ) {
        return;
    }

    toastMessage.textContent =
        message;

    toast.classList.add("show");

    clearTimeout(
        showToast.timeout
    );

    showToast.timeout =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2200);
}


// ============================================================
// ARTWORK
// ============================================================

function getArtwork(track) {

    return (
        track?.artwork ||
        ""
    );
}


// ============================================================
// TRACK CARD
// ============================================================

function createTrackCard(
    track,
    index,
    source
) {

    const liked =
        isTrackLiked(track);

    const artwork =
        getArtwork(track);

    return `

        <article
            class="track-card"
            data-track-index="${index}"
            data-source="${escapeHTML(source)}"
        >

            <div class="track-cover">

                ${
                    artwork
                        ? `
                            <img
                                src="${escapeHTML(artwork)}"
                                alt="${escapeHTML(track.title)}"
                                loading="lazy"
                                onerror="this.onerror=null;this.src='${PLACEHOLDER_ARTWORK}';"
                            >
                        `
                        : `
                            <div class="track-cover-placeholder">
                                <i class="fa-solid fa-music"></i>
                            </div>
                        `
                }

                <button
                    class="track-play"
                    data-action="play"
                    title="Play"
                >
                    <i class="fa-solid fa-play"></i>
                </button>

                <button
                    class="track-like ${
                        liked ? "liked" : ""
                    }"
                    data-action="like"
                    title="Like"
                >
                    <i class="${
                        liked
                            ? "fa-solid"
                            : "fa-regular"
                    } fa-heart"></i>
                </button>

                <button
                    class="track-add-playlist"
                    data-action="playlist"
                    title="Add to playlist"
                >
                    <i class="fa-solid fa-plus"></i>
                </button>

            </div>

            <div class="track-info">

                <div class="track-title">
                    ${escapeHTML(track.title)}
                </div>

                <div
                    class="track-artist"
                    data-action="artist"
                    data-artist-id="${escapeHTML(track.artistId || "")}"
                >
                    ${escapeHTML(track.artist)}
                </div>

                <div class="track-meta">

                    <span>
                        ${escapeHTML(track.genre || "Music")}
                    </span>

                    <span>
                        ${formatTime(track.duration)}
                    </span>

                </div>

            </div>

        </article>

    `;
}


// ============================================================
// RENDER TRACK GRID
// ============================================================

function renderGrid(
    container,
    trackList,
    source
) {

    if (!container) {
        return;
    }

    if (!trackList.length) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    <i class="fa-solid fa-music"></i>
                </div>

                <h3>
                    No music found
                </h3>

                <p>
                    Aurora couldn't find playable
                    tracks right now.
                </p>

            </div>

        `;

        return;
    }

    container.innerHTML =
        trackList
            .map(
                (track, index) =>
                    createTrackCard(
                        track,
                        index,
                        source
                    )
            )
            .join("");

}


// ============================================================
// TRACK CLICK HANDLER
// ============================================================

function attachGridEvents(
    container,
    trackList
) {

    if (!container) {
        return;
    }

    container.onclick =
        event => {

            const card =
                event.target.closest(
                    ".track-card"
                );

            if (!card) {
                return;
            }

            const index =
                Number(
                    card.dataset.trackIndex
                );

            const actionElement =
                event.target.closest(
                    "[data-action]"
                );

            const action =
                actionElement?.dataset.action;

            const track =
                trackList[index];

            if (!track) {
                return;
            }

            if (action === "like") {

                toggleLike(track);

                return;
            }

            if (action === "playlist") {

                if (window.AuroraPlaylists) {
                    window.AuroraPlaylists.openPicker(track);
                }

                return;
            }

            if (action === "artist") {

                openArtistForTrack(track);

                return;
            }

            playTrack(
                track,
                trackList
            );

        };

}


// ============================================================
// LOAD TRENDING
// ============================================================

let currentGenre = "";
let currentMood = "";

async function loadTrending() {

    if (!trendingGrid) {
        return [];
    }

    trendingGrid.innerHTML =
        createLoadingCards();

    try {

        console.log(
            `🔥 Loading Audius trending music... (genre: ${currentGenre || "All"}, mood: ${currentMood || "Any"})`
        );

        const genreParam =
            currentGenre
                ? `&genre=${encodeURIComponent(currentGenre)}`
                : "";

        // Audius's API can't filter by mood itself, so when a mood is
        // selected we pull a much bigger batch and filter it ourselves.
        const limit = currentMood ? 100 : 20;

        const data =
            await apiRequest(
                `/trending?limit=${limit}&time=week${genreParam}`
            );

        let result =
            Array.isArray(data.tracks)
                ? data.tracks
                : [];

        if (currentMood) {
            result = result.filter(track => track.mood === currentMood);
        }

        renderGrid(
            trendingGrid,
            result,
            "trending"
        );

        attachGridEvents(
            trendingGrid,
            result
        );

        console.log(
            `🔥 Trending tracks: ${result.length}`
        );

        return result;

    } catch (error) {

        console.error(
            "Trending error:",
            error
        );

        showGridError(
            trendingGrid,
            error.message
        );

        return [];

    }

}


// ============================================================
// LOAD LATEST
// ============================================================

async function loadLatest() {

    if (!latestGrid) {
        return [];
    }

    latestGrid.innerHTML =
        createLoadingCards();

    try {

        console.log(
            "🆕 Loading latest Audius music..."
        );

        const data =
            await apiRequest(
                "/latest?limit=20"
            );

        const result =
            Array.isArray(data.tracks)
                ? data.tracks
                : [];

        renderGrid(
            latestGrid,
            result,
            "latest"
        );

        attachGridEvents(
            latestGrid,
            result
        );

        console.log(
            `🆕 Latest tracks: ${result.length}`
        );

        return result;

    } catch (error) {

        console.error(
            "Latest error:",
            error
        );

        showGridError(
            latestGrid,
            error.message
        );

        return [];

    }

}


// ============================================================
// SEARCH
// ============================================================

async function searchMusic(queryOverride) {

    if (!searchInput) {
        return;
    }

    // If called from the top search bar, copy its value into the
    // Search page's input too, so both stay in sync.
    if (typeof queryOverride === "string") {
        searchInput.value = queryOverride;
    }

    const query =
        searchInput.value.trim();

    // Switch to the Search page so results are actually visible.
    activateNavItem("navSearchButton");
    showSection("searchSection");

    if (!query) {

        if (searchStatus) {

            searchStatus.textContent =
                "Search for something to get started.";

        }

        if (searchGrid) {

            searchGrid.innerHTML = "";

        }

        return;
    }

    if (searchStatus) {

        searchStatus.textContent =
            `Searching Audius for "${query}"...`;

    }

    if (searchGrid) {

        searchGrid.innerHTML =
            createLoadingCards();

    }

    try {

        const genre =
            document.getElementById("searchGenreFilter")?.value || "";

        console.log(
            `🔎 Searching Audius: ${query}${genre ? ` (genre: ${genre})` : ""}`
        );

        const genreParam =
            genre
                ? `&genre=${encodeURIComponent(genre)}`
                : "";

        const data =
            await apiRequest(
                `/search?q=${encodeURIComponent(query)}&limit=30${genreParam}`
            );

        const result =
            Array.isArray(data.tracks)
                ? data.tracks
                : [];

        renderGrid(
            searchGrid,
            result,
            "search"
        );

        attachGridEvents(
            searchGrid,
            result
        );

        if (searchStatus) {

            searchStatus.textContent =
                result.length
                    ? `${result.length} tracks found for "${query}".`
                    : `No independent-artist tracks matched "${query}" on Audius. Aurora doesn't carry major-label/chart music — try an artist name, a genre, or browse by genre on the Home page instead.`;

        }

        console.log(
            `🔎 Search results: ${result.length}`
        );

        return result;

    } catch (error) {

        console.error(
            "Search error:",
            error
        );

        if (searchStatus) {

            searchStatus.textContent =
                "Search failed. Please try again.";

        }

        showGridError(
            searchGrid,
            error.message
        );

        return [];

    }

}


// ============================================================
// PLAY TRACK
// ============================================================

async function playTrack(
    track,
    trackList = []
) {

    if (!track) {
        return;
    }

    if (!track.streamUrl) {

        showToast(
            "This track cannot be streamed."
        );

        return;
    }

    try {

        currentTrack =
            track;

        queue =
            Array.isArray(trackList) &&
            trackList.length
                ? [...trackList]
                : [track];

        currentIndex =
            queue.findIndex(
                item =>
                    String(item.id) ===
                    String(track.id)
            );

        if (currentIndex < 0) {

            currentIndex = 0;

        }

        updatePlayerUI(
            track
        );

        audio.pause();

        audio.src =
            track.streamUrl;

        audio.load();

        await audio.play();

        updatePlayButton();

        saveRecentlyPlayed(
            track
        );

        console.log(
            `▶ Playing: ${track.title}`
        );

    } catch (error) {

        console.error(
            "Playback error:",
            error
        );

        showToast(
            "Unable to play this track."
        );

        updatePlayButton();

    }

}


// ============================================================
// PLAYER UI
// ============================================================

function updatePlayerUI(
    track
) {

    if (!track) {
        return;
    }

    if (playerTitle) {

        playerTitle.textContent =
            track.title ||
            "Unknown Track";

    }

    if (playerArtist) {

        playerArtist.textContent =
            track.artist ||
            "Unknown Artist";

    }

    if (playerCover) {

        if (track.artwork) {

            playerCover.src =
                track.artwork;

            playerCover.classList.add(
                "visible"
            );

            if (
                playerCoverPlaceholder
            ) {

                playerCoverPlaceholder.style.display =
                    "none";

            }

        } else {

            playerCover.removeAttribute(
                "src"
            );

            playerCover.classList.remove(
                "visible"
            );

            if (
                playerCoverPlaceholder
            ) {

                playerCoverPlaceholder.style.display =
                    "grid";

            }

        }

    }

    updateLikeButton();

    renderQueue();

}


// ============================================================
// PLAY BUTTON
// ============================================================

function updatePlayButton() {

    if (!playButton) {
        return;
    }

    const icon =
        playButton.querySelector(
            "i"
        );

    if (!icon) {
        return;
    }

    icon.className =
        audio &&
        !audio.paused
            ? "fa-solid fa-pause"
            : "fa-solid fa-play";

}


// ============================================================
// NEXT
// ============================================================

function playNext() {

    if (!queue.length) {

        showToast(
            "Nothing in the queue."
        );

        return;
    }

    let nextIndex;

    if (isShuffle) {

        if (queue.length === 1) {

            nextIndex = 0;

        } else {

            do {

                nextIndex =
                    Math.floor(
                        Math.random() *
                        queue.length
                    );

            } while (
                nextIndex ===
                currentIndex
            );

        }

    } else {

        nextIndex =
            currentIndex + 1;

        if (
            nextIndex >=
            queue.length
        ) {

            nextIndex = 0;

        }

    }

    playTrack(
        queue[nextIndex],
        queue
    );

}


// ============================================================
// PREVIOUS
// ============================================================

function playPrevious() {

    if (!queue.length) {
        return;
    }

    if (
        audio.currentTime >
        3
    ) {

        audio.currentTime = 0;

        return;
    }

    let previousIndex =
        currentIndex - 1;

    if (
        previousIndex < 0
    ) {

        previousIndex =
            queue.length - 1;

    }

    playTrack(
        queue[previousIndex],
        queue
    );

}


// ============================================================
// PLAY / PAUSE
// ============================================================

async function togglePlay() {

    if (!currentTrack) {

        if (queue.length) {

            await playTrack(
                queue[0],
                queue
            );

        } else {

            const tracks =
                await loadTrending();

            if (tracks.length) {

                await playTrack(
                    tracks[0],
                    tracks
                );

            }

        }

        return;
    }

    try {

        if (audio.paused) {

            await audio.play();

        } else {

            audio.pause();

        }

        updatePlayButton();

    } catch (error) {

        console.error(
            "Play/pause error:",
            error
        );

    }

}


// ============================================================
// SHUFFLE
// ============================================================

function toggleShuffle() {

    isShuffle =
        !isShuffle;

    if (shuffleButton) {

        shuffleButton.classList.toggle(
            "active",
            isShuffle
        );

    }

    showToast(
        isShuffle
            ? "Shuffle on"
            : "Shuffle off"
    );

}


// ============================================================
// REPEAT
// ============================================================

function toggleRepeat() {

    isRepeat =
        !isRepeat;

    if (repeatButton) {

        repeatButton.classList.toggle(
            "active",
            isRepeat
        );

    }

    showToast(
        isRepeat
            ? "Repeat on"
            : "Repeat off"
    );

}


// ============================================================
// AUDIO EVENTS
// ============================================================

if (audio) {

    audio.addEventListener(
        "play",
        updatePlayButton
    );

    audio.addEventListener(
        "pause",
        updatePlayButton
    );

    audio.addEventListener(
        "loadedmetadata",
        () => {

            if (duration) {

                duration.textContent =
                    formatTime(
                        audio.duration
                    );

            }

        }
    );

    audio.addEventListener(
        "timeupdate",
        () => {

            if (!audio.duration) {
                return;
            }

            if (currentTime) {

                currentTime.textContent =
                    formatTime(
                        audio.currentTime
                    );

            }

            if (progressBar) {

                progressBar.max =
                    audio.duration;

                progressBar.value =
                    audio.currentTime;

            }

        }
    );

    audio.addEventListener(
        "ended",
        () => {

            if (isRepeat) {

                audio.currentTime = 0;

                audio.play();

                return;
            }

            playNext();

        }
    );

    audio.addEventListener(
        "error",
        event => {

            console.error(
                "Audio error:",
                event
            );

            showToast(
                "The audio stream could not be loaded."
            );

            updatePlayButton();

        }
    );

}


// ============================================================
// PROGRESS BAR
// ============================================================

if (progressBar) {

    progressBar.addEventListener(
        "input",
        () => {

            if (!audio.duration) {
                return;
            }

            audio.currentTime =
                Number(
                    progressBar.value
                );

        }
    );

}


// ============================================================
// VOLUME
// ============================================================

if (volumeBar) {

    volumeBar.addEventListener(
        "input",
        () => {

            audio.volume =
                Number(
                    volumeBar.value
                );

        }
    );

}


// ============================================================
// PLAYER BUTTONS
// ============================================================

if (playButton) {

    playButton.addEventListener(
        "click",
        togglePlay
    );

}

if (nextButton) {

    nextButton.addEventListener(
        "click",
        playNext
    );

}

if (previousButton) {

    previousButton.addEventListener(
        "click",
        playPrevious
    );

}

if (shuffleButton) {

    shuffleButton.addEventListener(
        "click",
        toggleShuffle
    );

}

if (repeatButton) {

    repeatButton.addEventListener(
        "click",
        toggleRepeat
    );

}


// ============================================================
// LIKE SYSTEM
// ============================================================

function isTrackLiked(
    track
) {

    return likedTracks.some(
        item =>
            String(item.id) ===
            String(track.id)
    );

}


function toggleLike(
    track
) {

    const index =
        likedTracks.findIndex(
            item =>
                String(item.id) ===
                String(track.id)
        );

    const wasLiked = index >= 0;

    if (wasLiked) {

        likedTracks.splice(
            index,
            1
        );

        showToast(
            "Removed from Liked Songs"
        );

    } else {

        likedTracks.unshift(
            track
        );

        showToast(
            "Added to Liked Songs"
        );

    }

    localStorage.setItem(
        "auroraLikedTracks",
        JSON.stringify(
            likedTracks
        )
    );

    updateLikeButton();

    renderLibrary();

    // Persist to the account, if logged in, so likes survive
    // across devices/browsers instead of living only in this browser.
    if (window.AuroraAuth && window.AuroraAuth.isLoggedIn()) {

        const request = wasLiked
            ? window.AuroraAuth.apiRequest(
                  `/likes/${encodeURIComponent(track.id)}`,
                  { method: "DELETE" }
              )
            : window.AuroraAuth.apiRequest(
                  `/likes/${encodeURIComponent(track.id)}`,
                  {
                      method: "POST",
                      body: JSON.stringify({
                          title: track.title,
                          artist: track.artist,
                          artistId: track.artistId,
                          artwork: track.artwork,
                          duration: track.duration
                      })
                  }
              );

        request.catch(error => {
            console.error("Could not sync like with account:", error);
        });

    }

}


// ============================================================
// PLAYER LIKE BUTTON
// ============================================================

function updateLikeButton() {

    if (!playerLikeButton) {
        return;
    }

    const icon =
        playerLikeButton.querySelector(
            "i"
        );

    if (!icon) {
        return;
    }

    const liked =
        currentTrack &&
        isTrackLiked(
            currentTrack
        );

    icon.className =
        liked
            ? "fa-solid fa-heart"
            : "fa-regular fa-heart";

    playerLikeButton.classList.toggle(
        "liked",
        Boolean(liked)
    );

}


if (playerLikeButton) {

    playerLikeButton.addEventListener(
        "click",
        () => {

            if (currentTrack) {

                toggleLike(
                    currentTrack
                );

            }

        }
    );

}


if (playerArtist) {

    playerArtist.addEventListener("click", () => {

        openArtistForTrack(currentTrack);

    });

}




// ============================================================
// RECENTLY PLAYED
// ============================================================

function saveRecentlyPlayed(
    track
) {

    recentlyPlayed =
        recentlyPlayed.filter(
            item =>
                String(item.id) !==
                String(track.id)
        );

    recentlyPlayed.unshift(
        track
    );

    recentlyPlayed =
        recentlyPlayed.slice(
            0,
            50
        );

    localStorage.setItem(
        "auroraRecentlyPlayed",
        JSON.stringify(
            recentlyPlayed
        )
    );

    if (window.AuroraAuth && window.AuroraAuth.isLoggedIn()) {

        window.AuroraAuth.apiRequest("/history", {
            method: "POST",
            body: JSON.stringify({
                trackId: track.id,
                title: track.title,
                artist: track.artist,
                artistId: track.artistId,
                artwork: track.artwork,
                duration: track.duration
            })
        }).catch(error => {
            console.error("Could not sync play history with account:", error);
        });

    }

}


// ============================================================
// LIBRARY
// ============================================================

let activeLibraryTab = "liked";
let activeLibraryTrackSet = likedTracks;

function getLibraryEmptyState(tab) {

    if (tab === "recent") {
        return {
            icon: "fa-regular fa-clock",
            title: "Nothing played yet",
            body: "Tracks you play will show up here."
        };
    }

    return {
        icon: "fa-regular fa-heart",
        title: "Your library is empty",
        body: "Like songs while exploring Aurora and they'll appear here."
    };

}

function renderLibrary() {

    if (!libraryTrackList) {
        return;
    }

    // The Playlists tab is a completely separate panel.
    const playlistsPanel = document.getElementById("playlistsPanel");

    if (activeLibraryTab === "playlists") {

        libraryTrackList.style.display = "none";

        if (playlistsPanel) {
            playlistsPanel.style.display = "";
        }

        if (window.AuroraPlaylists) {
            window.AuroraPlaylists.renderPanel();
        }

        return;

    }

    libraryTrackList.style.display = "";

    if (playlistsPanel) {
        playlistsPanel.style.display = "none";
    }

    const trackList =
        activeLibraryTab === "recent" ? recentlyPlayed : likedTracks;

    activeLibraryTrackSet = trackList;

    if (!trackList.length) {

        const empty = getLibraryEmptyState(activeLibraryTab);

        libraryTrackList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    <i class="${empty.icon}"></i>
                </div>

                <h3>
                    ${empty.title}
                </h3>

                <p>
                    ${empty.body}
                </p>

            </div>

        `;

        return;
    }

    // Same card grid used on the Home page (trending/latest) — same
    // look, same image handling, same play/like/add-to-playlist buttons.
    renderGrid(libraryTrackList, trackList, "library");
    attachGridEvents(libraryTrackList, trackList);

}


// ============================================================
// LIBRARY TABS
// ============================================================

document.querySelectorAll(".library-tab").forEach(tab => {

    tab.addEventListener("click", () => {

        document
            .querySelectorAll(".library-tab")
            .forEach(item => item.classList.remove("active"));

        tab.classList.add("active");

        activeLibraryTab = tab.dataset.library || "liked";

        renderLibrary();

    });

});


// ============================================================
// LIBRARY CLICK
// ============================================================
// (Handled automatically by attachGridEvents() inside renderLibrary()
// now that Liked Songs / Recently Played use the same card grid as
// the Home page — nothing extra needed here.)


// ============================================================
// SEARCH BUTTON
// ============================================================

if (searchButton) {

    searchButton.addEventListener(
        "click",
        searchMusic
    );

}


if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                searchMusic();

            }

        }
    );

}


// ============================================================
// SEARCH GENRE FILTER
// ============================================================

const searchGenreFilter =
    document.getElementById("searchGenreFilter");

if (searchGenreFilter) {

    searchGenreFilter.addEventListener("change", () => {

        if (searchInput && searchInput.value.trim()) {
            searchMusic();
        }

    });

}


// ============================================================
// NAVIGATION
// ============================================================

function showSection(
    sectionId
) {

    document
        .querySelectorAll(
            ".page-section"
        )
        .forEach(
            section => {

                section.classList.remove(
                    "active-section"
                );

                section.style.display =
                    "none";

            }
        );

    const section =
        document.getElementById(
            sectionId
        );

    if (!section) {
        return;
    }

    section.classList.add(
        "active-section"
    );

    section.style.display =
        "block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ============================================================
// NAV LINKS (explicit, direct bindings — no clever parsing)
// ============================================================

function activateNavItem(activeId) {

    document
        .querySelectorAll(".nav-item")
        .forEach(item => item.classList.remove("active"));

    document.getElementById(activeId)?.classList.add("active");

}

function goToHome() {
    activateNavItem("navHomeButton");
    showSection("homeSection");
}

function goToSearch() {
    activateNavItem("navSearchButton");
    showSection("searchSection");
}

function goToLibrary() {
    activateNavItem("navLibraryButton");
    showSection("librarySection");
}

function goToQueue() {
    showSection("queueSection");
    renderQueue();
}

function goToProfile() {
    showSection("profileSection");
    loadProfile();
}

function openArtist(artistId) {
    showSection("artistSection");
    loadArtist(artistId);
}

// Opens a track's artist page. Older saved songs (liked / played / in
// playlists before artist IDs were stored) don't have an artistId, so we
// look it up from the track itself the first time they're clicked.
async function openArtistForTrack(track) {

    if (!track) {
        return;
    }

    let artistId = track.artistId;

    if (!artistId && track.id) {

        try {

            const data = await apiRequest(`/tracks/${encodeURIComponent(track.id)}`);

            artistId = data?.track?.artistId || null;

            if (artistId) {
                track.artistId = artistId;
            }

        } catch (error) {
            console.error("Could not look up artist:", error);
        }

    }

    if (artistId) {
        openArtist(artistId);
    } else {
        showToast("Artist page isn't available for this track.");
    }

}

async function loadArtist(artistId) {

    const artistContent = document.getElementById("artistContent");

    if (!artistContent) {
        return;
    }

    artistContent.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
            <h3>Loading artist…</h3>
        </div>
    `;

    try {

        const [artistData, tracksData] = await Promise.all([
            apiRequest(`/artists/${encodeURIComponent(artistId)}`),
            apiRequest(`/artists/${encodeURIComponent(artistId)}/tracks?limit=24`)
        ]);

        const artist = artistData.artist;
        const tracks = Array.isArray(tracksData.tracks) ? tracksData.tracks : [];

        const avatarHtml =
            artist.avatar
                ? `<img class="artist-avatar" src="${escapeHTML(artist.avatar)}" alt="${escapeHTML(artist.name)}" onerror="this.onerror=null;this.src='${PLACEHOLDER_ARTWORK}';">`
                : `<div class="artist-avatar-placeholder">${escapeHTML((artist.name || "?").charAt(0).toUpperCase())}</div>`;

        artistContent.innerHTML = `

            <div class="artist-header">

                ${avatarHtml}

                <div>
                    <h1>
                        ${escapeHTML(artist.name)}
                        ${artist.isVerified ? '<i class="fa-solid fa-circle-check" title="Verified artist"></i>' : ""}
                    </h1>

                    <div class="artist-meta-row">
                        @${escapeHTML(artist.handle)} ·
                        ${artist.followerCount.toLocaleString()} followers ·
                        ${artist.trackCount.toLocaleString()} tracks
                    </div>

                    ${artist.bio ? `<p class="artist-bio">${escapeHTML(artist.bio)}</p>` : ""}
                </div>

            </div>

            <h2 class="artist-tracks-heading">Tracks</h2>

            <div class="track-grid" id="artistTrackGrid"></div>

        `;

        const artistTrackGrid = document.getElementById("artistTrackGrid");

        renderGrid(artistTrackGrid, tracks, "artist");
        attachGridEvents(artistTrackGrid, tracks);

    } catch (error) {

        console.error("Load artist error:", error);

        artistContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h3>Couldn't load this artist</h3>
                <p>${escapeHTML(error.message || "Please try again.")}</p>
            </div>
        `;

    }

}


// ============================================================
// PLAYLIST DETAIL PAGE
// ============================================================

function openPlaylistDetail(playlistId) {
    showSection("playlistDetailSection");
    loadPlaylistDetail(playlistId);
}

async function loadPlaylistDetail(playlistId) {

    const content = document.getElementById("playlistDetailContent");

    if (!content) {
        return;
    }

    if (!(window.AuroraAuth && window.AuroraAuth.isLoggedIn())) {
        goToLibrary();
        return;
    }

    content.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
            <h3>Loading playlist…</h3>
        </div>
    `;

    try {

        const data = await window.AuroraAuth.apiRequest("/playlists");
        const playlist = (data.playlists || []).find(p => p.id === playlistId);

        if (!playlist) {

            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <h3>Playlist not found</h3>
                    <p>It may have been deleted.</p>
                </div>
            `;

            return;

        }

        renderPlaylistDetail(playlist);

    } catch (error) {

        console.error("Load playlist detail error:", error);

        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h3>Couldn't load this playlist</h3>
                <p>${escapeHTML(error.message || "Please try again.")}</p>
            </div>
        `;

    }

}

function renderPlaylistDetail(playlist) {

    const content = document.getElementById("playlistDetailContent");

    if (!content) {
        return;
    }

    const tracks = playlist.tracks || [];

    const coverArtwork =
        tracks.find(t => t.artwork)?.artwork || PLACEHOLDER_ARTWORK;

    content.innerHTML = `

        <div class="playlist-detail-header">

            <img
                class="playlist-detail-cover"
                src="${escapeHTML(coverArtwork)}"
                alt="${escapeHTML(playlist.name)}"
                onerror="this.onerror=null;this.src='${PLACEHOLDER_ARTWORK}';"
            >

            <div>
                <p class="section-kicker">PLAYLIST</p>
                <h1>${escapeHTML(playlist.name)}</h1>
                ${playlist.description ? `<p class="playlist-detail-desc">${escapeHTML(playlist.description)}</p>` : ""}
                <div class="artist-meta-row">
                    ${tracks.length} track${tracks.length === 1 ? "" : "s"}
                </div>

                <div class="playlist-detail-actions">
                    <button class="primary-button" id="playlistPlayAllButton">
                        <i class="fa-solid fa-play"></i> Play All
                    </button>
                    <button class="text-button" id="playlistShuffleButton">
                        <i class="fa-solid fa-shuffle"></i> Shuffle
                    </button>
                    <button class="text-button" id="playlistRenameButton">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="text-button" id="playlistDeleteButton">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </div>

        </div>

        <div class="track-list" id="playlistDetailTrackList">
            ${
                tracks.length
                    ? tracks.map((track, index) => `
                        <div class="library-track" data-row-id="${track.rowId}" data-track-index="${index}">
                            <img
                                src="${escapeHTML(track.artwork || PLACEHOLDER_ARTWORK)}"
                                alt="${escapeHTML(track.title)}"
                                onerror="this.onerror=null;this.src='${PLACEHOLDER_ARTWORK}';"
                            >
                            <div>
                                <strong>${escapeHTML(track.title)}</strong>
                                <span class="playlist-track-artist" data-action="artist">${escapeHTML(track.artist)}</span>
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

    `;

    document.getElementById("playlistPlayAllButton")?.addEventListener("click", () => {
        if (tracks.length) playTrack(tracks[0], tracks);
    });

    document.getElementById("playlistShuffleButton")?.addEventListener("click", () => {

        if (!tracks.length) return;

        const shuffled = [...tracks];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        playTrack(shuffled[0], shuffled);

    });

    document.getElementById("playlistRenameButton")?.addEventListener("click", () => {

        window.AuroraPlaylists.openEditModal(playlist, () => {
            if (typeof showToast === "function") showToast("Playlist updated");
            loadPlaylistDetail(playlist.id);
        });

    });

    document.getElementById("playlistDeleteButton")?.addEventListener("click", async () => {

        const confirmed = await window.AuroraPlaylists.confirmDialog({
            title: "Delete playlist?",
            message: `"${playlist.name}" will be permanently deleted. This can't be undone.`,
            confirmText: "Delete",
            danger: true
        });

        if (!confirmed) return;

        try {

            await window.AuroraAuth.apiRequest(`/playlists/${playlist.id}`, { method: "DELETE" });
            if (typeof showToast === "function") showToast("Playlist deleted");
            goToLibrary();
            openLibraryTab("playlists");

        } catch (error) {
            alert(error.message || "Could not delete this playlist.");
        }

    });

    const trackListEl = document.getElementById("playlistDetailTrackList");

    trackListEl?.addEventListener("click", async event => {

        const rowId = event.target.closest("[data-row-id]")?.dataset.rowId;
        const index = Number(event.target.closest("[data-track-index]")?.dataset.trackIndex);
        const action = event.target.closest("[data-action]")?.dataset.action;

        if (!rowId) return;

        if (action === "artist" && !Number.isNaN(index)) {
            openArtistForTrack(tracks[index]);
            return;
        }

        if (action === "remove-track") {

            try {
                await window.AuroraAuth.apiRequest(`/playlists/${playlist.id}/tracks/${rowId}`, { method: "DELETE" });
                loadPlaylistDetail(playlist.id);
            } catch (error) {
                alert(error.message || "Could not remove this track.");
            }

            return;

        }

        if (action === "play-track" && !Number.isNaN(index)) {
            playTrack(tracks[index], tracks);
        }

    });

}

async function loadProfile() {

    const profileContent = document.getElementById("profileContent");

    if (!profileContent) {
        return;
    }

    if (!(window.AuroraAuth && window.AuroraAuth.isLoggedIn())) {

        profileContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-circle-user"></i></div>
                <h3>You're not logged in</h3>
                <p>Log in from the sidebar to see your profile and stats.</p>
            </div>
        `;

        return;

    }

    try {

        const data = await window.AuroraAuth.apiRequest("/auth/me");

        const user = data.user;
        const stats = data.stats || {};

        const joined =
            user.createdAt
                ? new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                })
                : "";

        const initial =
            (user.username || "?").charAt(0).toUpperCase();

        profileContent.innerHTML = `

            <div class="profile-header">

                <div class="profile-avatar">${escapeHTML(initial)}</div>

                <div>
                    <h2>${escapeHTML(user.username)}</h2>
                    <p>${escapeHTML(user.email)}</p>
                    <span class="profile-joined">Member since ${escapeHTML(joined)}</span>
                </div>

            </div>

            <div class="profile-stats">

                <div class="stat-card">
                    <strong>${stats.likes ?? 0}</strong>
                    <span>Liked Songs</span>
                </div>

                <div class="stat-card">
                    <strong>${stats.playlists ?? 0}</strong>
                    <span>Playlists</span>
                </div>

                <div class="stat-card">
                    <strong>${stats.played ?? 0}</strong>
                    <span>Tracks Played</span>
                </div>

            </div>

            <button class="text-button" id="profileLogoutButton">
                <i class="fa-solid fa-right-from-bracket"></i>
                Log Out
            </button>

        `;

        document.getElementById("profileLogoutButton")?.addEventListener("click", () => {
            window.AuroraAuth.logout();
            goToHome();
        });

    } catch (error) {

        console.error("Load profile error:", error);

        profileContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h3>Couldn't load your profile</h3>
                <p>${escapeHTML(error.message || "Please try again.")}</p>
            </div>
        `;

    }

}

document.getElementById("navHomeButton")?.addEventListener("click", goToHome);
document.getElementById("navSearchButton")?.addEventListener("click", goToSearch);
document.getElementById("navLibraryButton")?.addEventListener("click", goToLibrary);
document.getElementById("queueButton")?.addEventListener("click", goToQueue);

document.getElementById("brandLogo")?.addEventListener("click", goToHome);
document.getElementById("mobileBrandLogo")?.addEventListener("click", goToHome);

// Belt-and-suspenders: also catch brand clicks via delegation on the
// whole document, in case the direct bindings above ever miss (e.g.
// if this script ran before those elements existed).
document.addEventListener("click", event => {

    if (event.target.closest("#brandLogo, #mobileBrandLogo, .brand")) {
        goToHome();
    }

});


// ============================================================
// SIDEBAR SHORTCUTS (LIKED SONGS / PLAYLISTS)
// ============================================================

function openLibraryTab(tabName) {

    goToLibrary();

    document
        .querySelectorAll(".library-tab")
        .forEach(tab => {
            tab.classList.toggle("active", tab.dataset.library === tabName);
        });

    activeLibraryTab = tabName;

    renderLibrary();

}

document
    .getElementById("likedSongsButton")
    ?.addEventListener("click", () => openLibraryTab("liked"));

document
    .getElementById("playlistsNavButton")
    ?.addEventListener("click", () => openLibraryTab("playlists"));


// ============================================================
// QUEUE
// ============================================================

function renderQueue() {

    if (!queueNowPlaying || !queueList) {
        return;
    }

    if (!currentTrack) {

        queueNowPlaying.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-list"></i></div>
                <h3>Nothing playing</h3>
                <p>Play a song and it'll show up here, along with what's next.</p>
            </div>
        `;

        if (queueUpNextHeading) queueUpNextHeading.style.display = "none";

        queueList.innerHTML = "";

        return;

    }

    queueNowPlaying.innerHTML = `
        <div class="queue-now-playing-card">
            <img
                src="${escapeHTML(safeArtwork(currentTrack))}"
                alt="${escapeHTML(currentTrack.title)}"
                onerror="this.onerror=null;this.src='${PLACEHOLDER_ARTWORK}';"
            >
            <div class="queue-now-playing-info">
                <div class="queue-now-playing-label">Now Playing</div>
                <strong>${escapeHTML(currentTrack.title)}</strong>
                <span>${escapeHTML(currentTrack.artist)}</span>
            </div>
        </div>
    `;

    const upNext = queue.slice(currentIndex + 1);

    if (!upNext.length) {

        if (queueUpNextHeading) queueUpNextHeading.style.display = "none";

        queueList.innerHTML = `
            <p class="playlist-empty-hint">Nothing queued up next.</p>
        `;

        return;

    }

    if (queueUpNextHeading) queueUpNextHeading.style.display = "block";

    queueList.innerHTML = upNext
        .map((track, i) => `
            <div class="queue-item" data-queue-index="${currentIndex + 1 + i}">
                <span class="queue-item-position">${i + 1}</span>
                <img
                    src="${escapeHTML(safeArtwork(track))}"
                    alt="${escapeHTML(track.title)}"
                    onerror="this.onerror=null;this.src='${PLACEHOLDER_ARTWORK}';"
                >
                <div class="queue-item-info">
                    <strong>${escapeHTML(track.title)}</strong>
                    <span>${escapeHTML(track.artist)}</span>
                </div>
                <button class="queue-item-remove" data-queue-remove="${currentIndex + 1 + i}" title="Remove from queue">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `)
        .join("");

}

if (queueList) {

    queueList.addEventListener("click", event => {

        const removeButton = event.target.closest("[data-queue-remove]");

        if (removeButton) {

            const removeIndex = Number(removeButton.dataset.queueRemove);

            queue.splice(removeIndex, 1);

            renderQueue();

            return;

        }

        const item = event.target.closest("[data-queue-index]");

        if (item) {

            const jumpIndex = Number(item.dataset.queueIndex);
            const track = queue[jumpIndex];

            if (track) {
                playTrack(track, queue);
            }

        }

    });

}


// ============================================================
// EXPLORE BUTTON
// ============================================================

const exploreButton =
    document.getElementById(
        "exploreButton"
    );

if (exploreButton) {

    exploreButton.addEventListener(
        "click",
        () => {

            document
                .getElementById(
                    "trendingGrid"
                )
                ?.scrollIntoView({
                    behavior: "smooth"
                });

        }
    );

}


// ============================================================
// SEE ALL TRENDING
// ============================================================

const seeAllTrending =
    document.getElementById(
        "seeAllTrending"
    );

if (seeAllTrending) {

    seeAllTrending.addEventListener(
        "click",
        () => {

            document
                .getElementById(
                    "trendingGrid"
                )
                ?.scrollIntoView({
                    behavior: "smooth"
                });

        }
    );

}


// ============================================================
// BROWSE BY GENRE / MOOD (Home page)
// ============================================================

const trendingHeading =
    document.getElementById("trendingHeading");

function updateTrendingHeading() {

    if (!trendingHeading) {
        return;
    }

    if (!currentGenre && !currentMood) {
        trendingHeading.textContent = "Trending on Audius";
        return;
    }

    const parts = [currentGenre, currentMood].filter(Boolean);

    trendingHeading.textContent = `Trending: ${parts.join(" • ")}`;

}

document.querySelectorAll("#genreChips .genre-chip").forEach(chip => {

    chip.addEventListener("click", () => {

        document
            .querySelectorAll("#genreChips .genre-chip")
            .forEach(item => item.classList.remove("active"));

        chip.classList.add("active");

        currentGenre = chip.dataset.genre || "";

        updateTrendingHeading();
        loadTrending();

    });

});

document.querySelectorAll("#moodChips .genre-chip").forEach(chip => {

    chip.addEventListener("click", () => {

        document
            .querySelectorAll("#moodChips .genre-chip")
            .forEach(item => item.classList.remove("active"));

        chip.classList.add("active");

        currentMood = chip.dataset.mood || "";

        updateTrendingHeading();
        loadTrending();

    });

});


// ============================================================
// LOADING CARDS
// ============================================================

function createLoadingCards() {

    return Array.from(
        { length: 6 }
    )
        .map(
            () =>
                `
                <div class="loading-card"></div>
                `
        )
        .join("");

}


// ============================================================
// ERROR
// ============================================================

function showGridError(
    container,
    message
) {

    if (!container) {
        return;
    }

    container.innerHTML = `

        <div class="empty-state">

            <div class="empty-icon">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h3>
                Couldn't load music
            </h3>

            <p>
                ${escapeHTML(
                    message ||
                    "Please try again."
                )}
            </p>

            <button
                class="primary-button"
                onclick="location.reload()"
            >
                Try Again
            </button>

        </div>

    `;

}


// ============================================================
// ACCOUNT SYNC (liked songs + history, pulled from the backend)
// ============================================================

async function syncAccountData() {

    if (!(window.AuroraAuth && window.AuroraAuth.isLoggedIn())) {
        return;
    }

    try {

        const [likesResponse, historyResponse] = await Promise.all([
            window.AuroraAuth.apiRequest("/likes"),
            window.AuroraAuth.apiRequest("/history")
        ]);

        if (likesResponse?.success) {
            likedTracks = likesResponse.tracks;
            localStorage.setItem("auroraLikedTracks", JSON.stringify(likedTracks));
        }

        if (historyResponse?.success) {
            recentlyPlayed = historyResponse.tracks;
            localStorage.setItem("auroraRecentlyPlayed", JSON.stringify(recentlyPlayed));
        }

        updateLikeButton();
        renderLibrary();

    } catch (error) {

        console.error("Could not sync account data:", error);

    }

}

// Re-sync whenever auth.js reports a login/logout.
window.addEventListener("aurora:auth-changed", () => {
    syncAccountData();
    renderLibrary();
});


// ============================================================
// INITIALIZE
// ============================================================

async function initializeAurora() {

    console.log(
        "🚀 Initializing Aurora..."
    );

    renderLibrary();

    updatePlayButton();

    updateLikeButton();

    // If a session token is already stored (returning visitor),
    // pull their liked songs / history down from the backend.
    await syncAccountData();

    if (volumeBar) {

        audio.volume =
            Number(
                volumeBar.value
            );

    }

    // Load BOTH sections independently.
    // If one fails, the other can still work.

    await Promise.allSettled([
        loadTrending(),
        loadLatest()
    ]);

    console.log(
        "✅ Aurora initialized"
    );

}


// ============================================================
// START
// ============================================================

initializeAurora();