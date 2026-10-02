const jwt = require("jsonwebtoken");

const JWT_SECRET =
    process.env.JWT_SECRET || "aurora_dev_secret_change_me";

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

        const payload = jwt.verify(token, JWT_SECRET);
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
            const payload = jwt.verify(token, JWT_SECRET);
            req.userId = payload.userId;
        } catch (error) {
            // Invalid/expired token on an optional route: just treat as a guest.
        }

    }

    next();

}

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
