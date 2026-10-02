const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

// Prisma 7 no longer connects on its own — it needs an explicit
// "driver adapter" that does the actual talking to Postgres.
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
});

// Reuse a single PrismaClient across hot-reloads / requires
// so we never open more DB connections than we need.
if (!global.__auroraPrisma) {
    global.__auroraPrisma = new PrismaClient({ adapter });
}

module.exports = global.__auroraPrisma;