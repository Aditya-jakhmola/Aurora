const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = require("../lib/prisma");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

function signToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt
    };
}


// ============================================================
// REGISTER
// ============================================================

router.post("/register", async (req, res) => {

    try {

        const { email, username, password } = req.body || {};

        if (!email || !username || !password) {
            return res.status(400).json({
                success: false,
                error: "Email, username and password are all required."
            });
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters."
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedUsername = String(username).trim();

        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: normalizedEmail },
                    { username: normalizedUsername }
                ]
            }
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                error: "An account with that email or username already exists."
            });
        }

        const passwordHash = await bcrypt.hash(String(password), 10);

        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                username: normalizedUsername,
                password: passwordHash
            }
        });

        const token = signToken(user.id);

        res.status(201).json({ success: true, token, user: publicUser(user) });

    } catch (error) {

        console.error("Register error:", error.message);
        res.status(500).json({ success: false, error: "Unable to create account." });

    }

});


// ============================================================
// LOGIN
// ============================================================

router.post("/login", async (req, res) => {

    try {

        const { emailOrUsername, password } = req.body || {};

        if (!emailOrUsername || !password) {
            return res.status(400).json({
                success: false,
                error: "Email/username and password are required."
            });
        }

        const identifier = String(emailOrUsername).trim();

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier.toLowerCase() },
                    { username: identifier }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({ success: false, error: "Invalid credentials." });
        }

        const valid = await bcrypt.compare(String(password), user.password);

        if (!valid) {
            return res.status(401).json({ success: false, error: "Invalid credentials." });
        }

        const token = signToken(user.id);

        res.json({ success: true, token, user: publicUser(user) });

    } catch (error) {

        console.error("Login error:", error.message);
        res.status(500).json({ success: false, error: "Unable to log in." });

    }

});


// ============================================================
// CURRENT USER
// ============================================================

router.get("/me", requireAuth, async (req, res) => {

    try {

        const user = await prisma.user.findUnique({ where: { id: req.userId } });

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found." });
        }

        const [likesCount, playlistsCount, historyCount] = await Promise.all([
            prisma.like.count({ where: { userId: req.userId } }),
            prisma.playlist.count({ where: { userId: req.userId } }),
            prisma.historyItem.count({ where: { userId: req.userId } })
        ]);

        res.json({
            success: true,
            user: publicUser(user),
            stats: {
                likes: likesCount,
                playlists: playlistsCount,
                played: historyCount
            }
        });

    } catch (error) {

        console.error("Fetch current user error:", error.message);
        res.status(500).json({ success: false, error: "Unable to fetch profile." });

    }

});

module.exports = router;
