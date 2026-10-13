const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = require("../lib/prisma");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

function signToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d", algorithm: "HS256" });
}

// Used so that logging in with an unknown username takes about as long as a
// wrong password does — otherwise response time would reveal which accounts exist.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("aurora-not-a-real-password", 10);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,30}$/;

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

        if (
            typeof email !== "string" ||
            typeof username !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                error: "Please check the details you entered and try again."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUsername = username.trim();

        if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                error: "Please enter a valid email address."
            });
        }

        if (!USERNAME_PATTERN.test(normalizedUsername)) {
            return res.status(400).json({
                success: false,
                error: "Username must be 3–30 characters: letters, numbers, dots, dashes or underscores."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters."
            });
        }

        if (password.length > 72) {
            return res.status(400).json({
                success: false,
                error: "Password must be 72 characters or fewer."
            });
        }

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

        if (identifier.length > 254) {
            return res.status(401).json({ success: false, error: "Invalid credentials." });
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier.toLowerCase() },
                    { username: identifier }
                ]
            }
        });

        // Always run a password comparison, even for unknown users (see note above).
        const valid = await bcrypt.compare(
            String(password),
            user ? user.password : DUMMY_PASSWORD_HASH
        );

        if (!user || !valid) {
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

// ============================================================
// CHANGE PASSWORD
// (wrong-password errors use 400, NOT 401 — the frontend logs the
//  user out on any 401, which would be wrong here)
// ============================================================

router.patch("/password", requireAuth, async (req, res) => {

    try {

        const { currentPassword, newPassword } = req.body || {};

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: "Please fill in your current and new password."
            });
        }

        if (String(newPassword).length < 6) {
            return res.status(400).json({
                success: false,
                error: "New password must be at least 6 characters."
            });
        }

        if (String(newPassword).length > 72) {
            return res.status(400).json({
                success: false,
                error: "New password must be 72 characters or fewer."
            });
        }

        const user = await prisma.user.findUnique({ where: { id: req.userId } });

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found." });
        }

        const valid = await bcrypt.compare(String(currentPassword), user.password);

        if (!valid) {
            return res.status(400).json({
                success: false,
                error: "Your current password is incorrect."
            });
        }

        if (String(currentPassword) === String(newPassword)) {
            return res.status(400).json({
                success: false,
                error: "Your new password must be different from the current one."
            });
        }

        const passwordHash = await bcrypt.hash(String(newPassword), 10);

        await prisma.user.update({
            where: { id: req.userId },
            data: { password: passwordHash }
        });

        res.json({ success: true });

    } catch (error) {

        console.error("Change password error:", error.message);
        res.status(500).json({ success: false, error: "Unable to change password." });

    }

});


// ============================================================
// DELETE ACCOUNT (also deletes likes, playlists and history,
// because the database relations are set to cascade)
// ============================================================

router.delete("/account", requireAuth, async (req, res) => {

    try {

        const { password } = req.body || {};

        if (!password) {
            return res.status(400).json({
                success: false,
                error: "Please enter your password to confirm."
            });
        }

        const user = await prisma.user.findUnique({ where: { id: req.userId } });

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found." });
        }

        const valid = await bcrypt.compare(String(password), user.password);

        if (!valid) {
            return res.status(400).json({
                success: false,
                error: "That password is incorrect."
            });
        }

        await prisma.user.delete({ where: { id: req.userId } });

        res.json({ success: true });

    } catch (error) {

        console.error("Delete account error:", error.message);
        res.status(500).json({ success: false, error: "Unable to delete account." });

    }

});

module.exports = router;
