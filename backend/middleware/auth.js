const jwt = require("jsonwebtoken");

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Values that are fine on your own laptop but must NEVER be used on a real server.
const WEAK_SECRETS = new Set([
    "",
    "aurora_dev_secret_change_me",
    "change_this_to_a_long_random_string"
]);

function resolveJwtSecret() {

    const secret = process.env.JWT_SECRET || "";
    const isWeak = WEAK_SECRETS.has(secret) || secret.length < 32;

    // On a real server a weak secret would let anyone forge login tokens,
    // so refuse to start instead of quietly running unsafely.
    if (IS_PRODUCTION && isWeak) {
        throw new Error(
            "JWT_SECRET is missing or too weak. In production it must be a random " +
            "string of at least 32 characters. Generate one with: " +
            "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        );
    }

    if (isWeak) {
        console.warn(
            "⚠️  JWT_SECRET is not set to a strong value. That's OK for local " +
            "development, but set a real one before you deploy."
        );
    }

    return secret || "aurora_dev_secret_change_me";

}

const JWT_SECRET = resolveJwtSecret();

// Only accept tokens signed with the algorithm we actually use.
const VERIFY_OPTIONS = { algorithms: ["HS256"] };

function getTokenFromRequest(req) {

    const header = req.headers.authorization || "";

    if (header.startsWith("Bearer ")) {
        return header.slice(7).trim();
    }

    return null;
}

// Blocks the request unless a valid token is present.
// Use for anything that reads/writes a specific user's data.
function requireAuth(req, res, next) {

    const token = getTokenFromRequest(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            error: "You need to be logged in to do that."
        });
    }

    try {

        const payload = jwt.verify(token, JWT_SECRET, VERIFY_OPTIONS);
        req.userId = payload.userId;
        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            error: "Your session has expired. Please log in again."
        });

    }

}

// Attaches req.userId when a valid token is present,
// but never blocks the request. Use for routes that behave
// differently for logged-in vs guest users.
function optionalAuth(req, res, next) {

    const token = getTokenFromRequest(req);

    if (token) {

        try {
            const payload = jwt.verify(token, JWT_SECRET, VERIFY_OPTIONS);
            req.userId = payload.userId;
        } catch (error) {
            // Invalid/expired token on an optional route: just treat as a guest.
        }

    }

    next();

}

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
