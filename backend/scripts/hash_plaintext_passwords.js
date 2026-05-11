/**
 * Security Migration: Hash all plain-text passwords in the database.
 *
 * Run this once inside the backend container:
 *   docker exec -it turnos-backend-prod node scripts/hash_plaintext_passwords.js
 *
 * It is safe to run multiple times — already-hashed passwords are detected
 * and skipped automatically.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function isPlainText(password) {
    // bcrypt hashes always start with $2b$ or $2a$ and are 60 chars
    return !(password && password.length === 60 && (password.startsWith('$2b$') || password.startsWith('$2a$')));
}

async function run() {
    console.log('🔐 Starting plain-text password migration...\n');

    const users = await prisma.user.findMany({
        select: { id: true, employeeNumber: true, name: true, password: true }
    });

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
        try {
            if (await isPlainText(user.password)) {
                const hashed = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { password: hashed, mustChangePassword: true }
                });
                console.log(`  ✅ Migrated user #${user.employeeNumber} (${user.name})`);
                migrated++;
            } else {
                skipped++;
            }
        } catch (err) {
            console.error(`  ❌ Error migrating user #${user.employeeNumber}: ${err.message}`);
            errors++;
        }
    }

    console.log(`\n📊 Migration complete:`);
    console.log(`   Migrated : ${migrated}`);
    console.log(`   Skipped  : ${skipped} (already hashed)`);
    console.log(`   Errors   : ${errors}`);

    await prisma.$disconnect();
}

run().catch(async (err) => {
    console.error('Fatal error:', err);
    await prisma.$disconnect();
    process.exit(1);
});
