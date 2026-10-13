// ============================================================
// AURORA — SECURITY MIDDLEWARE
// Security headers, rate limiting, CORS, and error handling.
// ============================================================

const helmet = require("helmet");
const cors = require("cors");
const rateLimitModule = require("express-rate-limit");

const rateLimit = rateLimitModule.rateLimit || rateLimitModule;

const IS_PRODUCTION = process.env.NODE_ENV === "production";


// ============================================================
// TRUST PROXY
// On a host like Render/Railway, every request arrives via the
// host's proxy. Without this, rate limiting would see the proxy's
// address for EVERYONE and treat all visitors as one person.
// ============================================================

function trustProxySetting() {

    const raw = String(process.env.TRUST_PROXY || "").trim().toLowerCase();

    if (raw === "false" || raw === "0") return false;

    if (raw) {
        const hops = Number(raw);
        return Number.isInteger(hops) && hops > 0 ? hops : 1;
    }

    return IS_PRODUCTION ? 1 : false;

}


// ============================================================
// SECURITY HEADERS (Helmet) + CONTENT SECURITY POLICY
// Lists exactly which outside sites Aurora is allowed to load from.
// Set CSP_MODE=report-only to log problems without blocking anything.
// ============================================================

function securityHeaders() {

    return helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            reportOnly: process.env.CSP_MODE === "report-only",
            directives: {
                "default-src": ["'self'"],
                "script-src": ["'self'"],
                // Needed for the small onerror="..." / onclick="..." handlers in the UI.
                "script-src-attr": ["'unsafe-inline'"],
                "style-src": [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com",
                    "https://cdnjs.cloudflare.com"
                ],
                "font-src": [
                    "'self'",
                    "data:",
                    "https://fonts.gstatic.com",
                    "https://cdnjs.cloudflare.com"
                ],
                // Song artwork comes from Audius's servers.
                "img-src": ["'self'", "data:", "https:"],
                "media-src": ["'self'"],
                "connect-src": ["'self'"],
                "object-src": ["'none'"],
                "base-uri": ["'self'"],
                "form-action": ["'self'"],
                "frame-ancestors": ["'self'"]
            }
        }
    });

}


// ============================================================
// CORS
// Aurora serves its own frontend, so no other website needs
// access. Add origins to CORS_ORIGINS only if you ever need one.
// ============================================================

function corsMiddleware() {

    const allowed = (process.env.CORS_ORIGINS || "")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean);

    return cors({ origin: allowed.length ? allowed : false });

}


// ============================================================
// RATE LIMITS
// ============================================================

function makeLimiter({ windowMs, limit, message, skipSuccessfulRequests, skip }) {

    const options = {
        windowMs,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { success: false, error: message }
    };

    if (skipSuccessfulRequests) options.skipSuccessfulRequests = true;
    if (typeof skip === "function") options.skip = skip;

    return rateLimit(options);

}

// Everything under /api, except audio streaming (which makes many
// legitimate requests while a song plays).
const apiLimiter = makeLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    message: "You're making requests too quickly. Please slow down for a moment.",
    skip: req => req.originalUrl.startsWith("/api/stream")
});

// Only FAILED logins count, so normal use is never affected.
const loginLimiter = makeLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    message: "Too many failed login attempts. Please wait 15 minutes and try again."
});

const registerLimiter = makeLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    message: "Too many accounts created from this connection. Please try again later."
});

// Changing a password / deleting an account both ask for a password.
const sensitiveLimiter = makeLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    message: "Too many attempts. Please wait 15 minutes and try again."
});


// ============================================================
// PRIVATE RESPONSES ARE NEVER CACHED
// ============================================================

function noStore(req, res, next) {

    res.setHeader("Cache-Control", "no-store");
    next();

}


// ============================================================
// ERROR HANDLER (keeps errors as tidy JSON, never a stack trace)
// ============================================================

function errorHandler(err, req, res, next) {

    if (res.headersSent) {
        return next(err);
    }

    if (err && err.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, error: "That request wasn't valid JSON." });
    }

    if (err && err.type === "entity.too.large") {
        return res.status(413).json({ success: false, error: "That request was too large." });
    }

    console.error("Unhandled error:", err && err.message ? err.message : err);

    res.status(500).json({ success: false, error: "Something went wrong on our side." });

}

module.exports = {
    trustProxySetting,
    securityHeaders,
    corsMiddleware,
    apiLimiter,
    loginLimiter,
    registerLimiter,
    sensitiveLimiter,
    noStore,
    errorHandler
};
