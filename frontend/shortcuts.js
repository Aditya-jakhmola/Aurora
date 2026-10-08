// ============================================================
// AURORA — KEYBOARD SHORTCUTS
// Loaded after script.js, so it can use the player functions.
// ============================================================

(function () {

    const kbd = (...keys) => keys.map(k => `<kbd>${k}</kbd>`).join("");

    const SHORTCUTS = [
        { keys: kbd("Space"),                         label: "Play / pause" },
        { keys: kbd("←") + kbd("→"),                  label: "Seek back / forward 5 seconds" },
        { keys: kbd("N"),                             label: "Next track" },
        { keys: kbd("P"),                             label: "Previous track" },
        { keys: kbd("Shift") + "+" + kbd("↑") + kbd("↓"), label: "Volume up / down" },
        { keys: kbd("M"),                             label: "Mute / unmute" },
        { keys: kbd("L"),                             label: "Like / unlike current song" },
        { keys: kbd("S"),                             label: "Toggle shuffle" },
        { keys: kbd("R"),                             label: "Toggle repeat" },
        { keys: kbd("/"),                             label: "Go to search" },
        { keys: kbd("Q"),                             label: "Open the queue" },
        { keys: kbd("?"),                             label: "Show this list" }
    ];


    // ------------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------------

    function toast(message) {
        if (typeof showToast === "function") {
            showToast(message);
        }
    }

    function isTypingTarget(element) {

        if (!element) return false;

        const tag = element.tagName;

        return (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            element.isContentEditable
        );

    }

    function isClickable(element) {

        if (!element) return false;

        const tag = element.tagName;

        return tag === "BUTTON" || tag === "A";

    }

    function modalIsOpen() {
        return Boolean(document.querySelector(".modal-overlay.show"));
    }

    function hasAudio() {
        return typeof audio !== "undefined" && audio;
    }


    // ------------------------------------------------------------
    // ACTIONS
    // ------------------------------------------------------------

    function seekBy(seconds) {

        if (!hasAudio() || !Number.isFinite(audio.duration)) {
            return;
        }

        audio.currentTime = Math.min(
            audio.duration,
            Math.max(0, audio.currentTime + seconds)
        );

    }

    function changeVolume(delta) {

        if (!hasAudio()) return;

        audio.muted = false;

        audio.volume = Math.min(
            1,
            Math.max(0, Math.round((audio.volume + delta) * 100) / 100)
        );

        if (typeof volumeBar !== "undefined" && volumeBar) {
            volumeBar.value = audio.volume;
        }

        toast(`Volume ${Math.round(audio.volume * 100)}%`);

    }

    function toggleMute() {

        if (!hasAudio()) return;

        audio.muted = !audio.muted;

        toast(audio.muted ? "Muted" : "Unmuted");

    }

    function likeCurrent() {

        if (typeof currentTrack !== "undefined" && currentTrack) {
            toggleLike(currentTrack);
        } else {
            toast("Play a song first");
        }

    }

    function focusSearch() {

        if (typeof goToSearch === "function") {
            goToSearch();
        }

        setTimeout(() => {
            document.getElementById("searchInput")?.focus();
        }, 60);

    }


    // ------------------------------------------------------------
    // HELP DIALOG
    // ------------------------------------------------------------

    function openHelp() {

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";

        overlay.innerHTML = `
            <div class="modal-box pl-modal kbd-modal" role="dialog" aria-modal="true">

                <button class="modal-close" data-close type="button" title="Close">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <div class="pl-modal-head">
                    <div class="pl-modal-icon"><i class="fa-solid fa-keyboard"></i></div>
                    <div>
                        <h3 class="pl-modal-title">Keyboard shortcuts</h3>
                        <p class="pl-modal-sub">Control Aurora without touching the mouse.</p>
                    </div>
                </div>

                <div class="kbd-list">
                    ${SHORTCUTS.map(item => `
                        <div class="kbd-row">
                            <span class="kbd-label">${item.label}</span>
                            <span class="kbd-keys">${item.keys}</span>
                        </div>
                    `).join("")}
                </div>

            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add("show"));

        function close() {
            overlay.classList.remove("show");
            document.removeEventListener("keydown", onKeydown);
            setTimeout(() => overlay.remove(), 220);
        }

        function onKeydown(event) {
            if (event.key === "Escape") close();
        }

        document.addEventListener("keydown", onKeydown);

        overlay.addEventListener("click", event => {
            if (event.target === overlay || event.target.closest("[data-close]")) {
                close();
            }
        });

    }


    // ------------------------------------------------------------
    // KEY HANDLER
    // ------------------------------------------------------------

    function handleKeydown(event) {

        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (isTypingTarget(event.target)) return;
        if (modalIsOpen()) return;

        const key = event.key;

        if (key === " " || key === "Spacebar") {

            // Let a focused button/link keep its normal Space behaviour.
            if (isClickable(event.target)) return;

            event.preventDefault();
            if (typeof togglePlay === "function") togglePlay();
            return;

        }

        if (key === "ArrowLeft")  { event.preventDefault(); seekBy(-5); return; }
        if (key === "ArrowRight") { event.preventDefault(); seekBy(5);  return; }

        if (event.shiftKey && key === "ArrowUp")   { event.preventDefault(); changeVolume(0.05);  return; }
        if (event.shiftKey && key === "ArrowDown") { event.preventDefault(); changeVolume(-0.05); return; }

        switch (key.toLowerCase()) {

            case "n":
                if (typeof playNext === "function") playNext();
                break;

            case "p":
                if (typeof playPrevious === "function") playPrevious();
                break;

            case "m":
                toggleMute();
                break;

            case "l":
                likeCurrent();
                break;

            case "s":
                if (typeof toggleShuffle === "function") toggleShuffle();
                break;

            case "r":
                if (typeof toggleRepeat === "function") toggleRepeat();
                break;

            case "q":
                if (typeof goToQueue === "function") goToQueue();
                break;

            case "/":
                event.preventDefault();
                focusSearch();
                break;

            case "?":
                openHelp();
                break;

        }

    }

    document.addEventListener("keydown", handleKeydown);


    // ------------------------------------------------------------
    // SIDEBAR HINT BUTTON (so people can discover the shortcuts)
    // ------------------------------------------------------------

    function addSidebarHint() {

        const bottom = document.querySelector(".sidebar-bottom");

        if (!bottom || bottom.querySelector(".shortcuts-hint")) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "shortcuts-hint";
        button.innerHTML = `<i class="fa-solid fa-keyboard"></i> Keyboard shortcuts <kbd>?</kbd>`;

        button.addEventListener("click", openHelp);

        bottom.insertBefore(button, bottom.querySelector(".api-status"));

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", addSidebarHint);
    } else {
        addSidebarHint();
    }

})();