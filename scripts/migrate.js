import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function main() {
  console.log("Applying schema to the database...");
  
  // Get the database URL from the environment or use a default
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.umrnwoyodduwwxddypth:postgres@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';
  
  // Create connection
  const client = postgres(databaseUrl, { max: 1 });
  
  try {
    // Create all the tables that don't exist yet
    console.log("Creating/altering tables...");
    
    // Users - should already exist, included for reference
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        fitness_goals TEXT[],
        body_measurements JSONB,
        profile_pic TEXT,
        gym_preferences TEXT[],
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Gyms - should already exist, included for reference
    await client`
      CREATE TABLE IF NOT EXISTS gyms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location JSONB NOT NULL,
        images TEXT[],
        amenities TEXT[],
        rating REAL,
        added_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Saved Gyms - should already exist, included for reference
    await client`
      CREATE TABLE IF NOT EXISTS saved_gyms (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gym_id INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
        match_score INTEGER,
        saved_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // User Matches - new table
    await client`
      CREATE TABLE IF NOT EXISTS user_matches (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        match_score INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Messages - new table
    await client`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    console.log("Database schema updated successfully!");
  } catch (error) {
    console.error("Error updating database schema:", error);
  } finally {
    await client.end();
  }
}

main().catch(console.error);