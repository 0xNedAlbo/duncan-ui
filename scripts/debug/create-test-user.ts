#!/usr/bin/env tsx

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

/**
 * Create Test User Script
 * 
 * Creates a test user in the database with predefined credentials.
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function createTestUser() {
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash("test123456", 10);

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: {
                email: "test@testmann.kk"
            }
        });

        if (existingUser) {
            console.log("✅ Test user already exists:");
            console.log(JSON.stringify({
                id: existingUser.id,
                name: existingUser.name,
                email: existingUser.email,
                createdAt: existingUser.createdAt.toISOString()
            }, null, 2));
            return;
        }

        // Create the test user
        const user = await prisma.user.create({
            data: {
                name: "Test Testmann",
                email: "test@testmann.kk",
                password: hashedPassword,
            }
        });

        console.log("✅ Test user created successfully:");
        console.log(JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString()
        }, null, 2));

    } catch (error) {
        console.error("❌ Error creating test user:", error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

createTestUser().catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
});