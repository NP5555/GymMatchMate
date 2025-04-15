import {
  User, InsertUser, Gym, InsertGym, SavedGym, InsertSavedGym,
  UserMatch, InsertUserMatch, Message, InsertMessage,
  users, gyms, savedGyms, userMatches, messages
} from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and, or, desc, count } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

// Create a PostgreSQL connection pool
import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Gym operations
  getGym(id: number): Promise<Gym | undefined>;
  getAllGyms(): Promise<Gym[]>;
  getNearbyGyms(lat: number, lng: number, radius?: number): Promise<Gym[]>;
  createGym(gym: InsertGym): Promise<Gym>;
  updateGym(id: number, gym: Partial<Gym>): Promise<Gym | undefined>;
  deleteGym(id: number): Promise<boolean>;
  
  // Saved gym/match operations
  getSavedGym(userId: number, gymId: number): Promise<SavedGym | undefined>;
  getSavedGymsByUser(userId: number): Promise<SavedGym[]>;
  saveGym(savedGym: InsertSavedGym): Promise<SavedGym>;
  deleteSavedGym(userId: number, gymId: number): Promise<boolean>;
  getMatchesForUser(userId: number): Promise<Array<Gym & { matchScore: number }>>;

  // User match operations (for connecting users)
  getUserMatches(userId: number, status?: string): Promise<UserMatch[]>;
  getUserMatch(id: number): Promise<UserMatch | undefined>;
  getUserMatchByUsers(senderId: number, receiverId: number): Promise<UserMatch | undefined>;
  createUserMatch(userMatch: InsertUserMatch): Promise<UserMatch>;
  updateUserMatchStatus(id: number, status: string): Promise<UserMatch | undefined>;
  deleteUserMatch(id: number): Promise<boolean>;
  
  // Message operations
  getMessages(userId: number, otherUserId: number): Promise<Message[]>;
  getUnreadMessageCount(userId: number): Promise<number>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(receiverId: number, senderId: number): Promise<void>;
  
  // Session store
  sessionStore: any;
  
  // For database storage only
  seedInitialData?(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    // Use direct SQL query to ensure we properly handle array fields
    console.log(`DB: Getting user ${id}`);
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM users WHERE id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        console.log(`DB: User ${id} not found`);
        return undefined;
      }
      
      // Convert snake_case database columns to camelCase for app use
      const dbUser = result.rows[0];
      console.log(`DB: Found user, raw data:`, JSON.stringify(dbUser, null, 2));
      
      // Create properly formatted user with array handling
      const user: User = {
        id: dbUser.id,
        username: dbUser.username,
        password: dbUser.password,
        name: dbUser.name,
        age: dbUser.age,
        gender: dbUser.gender,
        fitnessGoals: Array.isArray(dbUser.fitness_goals) ? dbUser.fitness_goals : [],
        bodyMeasurements: dbUser.body_measurements,
        profilePic: dbUser.profile_pic,
        progressPhotos: Array.isArray(dbUser.progress_photos) ? dbUser.progress_photos : [],
        gymPreferences: Array.isArray(dbUser.gym_preferences) ? dbUser.gym_preferences : [],
        isAdmin: dbUser.is_admin,
        isBanned: dbUser.is_banned,
        status: dbUser.status,
        createdAt: dbUser.created_at
      };
      
      console.log(`DB: Formatted user:`, JSON.stringify(user, null, 2));
      return user;
    } finally {
      client.release();
    }
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    // Use direct SQL query to check for Google ID
    console.log(`DB: Getting user with Google ID ${googleId}`);
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM users WHERE google_id = $1`,
        [googleId]
      );
      
      if (result.rows.length === 0) {
        console.log(`DB: User with Google ID ${googleId} not found`);
        return undefined;
      }
      
      // Convert snake_case database columns to camelCase for app use
      const dbUser = result.rows[0];
      console.log(`DB: Found user by Google ID, raw data:`, JSON.stringify(dbUser, null, 2));
      
      // Create properly formatted user with array handling
      const user: User = {
        id: dbUser.id,
        username: dbUser.username,
        password: dbUser.password,
        name: dbUser.name,
        email: dbUser.email,
        googleId: dbUser.google_id,
        googleProfile: dbUser.google_profile,
        age: dbUser.age,
        gender: dbUser.gender,
        fitnessGoals: Array.isArray(dbUser.fitness_goals) ? dbUser.fitness_goals : [],
        bodyMeasurements: dbUser.body_measurements,
        profilePic: dbUser.profile_pic,
        progressPhotos: Array.isArray(dbUser.progress_photos) ? dbUser.progress_photos : [],
        gymPreferences: Array.isArray(dbUser.gym_preferences) ? dbUser.gym_preferences : [],
        isAdmin: dbUser.is_admin,
        isBanned: dbUser.is_banned,
        status: dbUser.status,
        createdAt: dbUser.created_at
      };
      
      console.log(`DB: Formatted user from Google ID:`, JSON.stringify(user, null, 2));
      return user;
    } finally {
      client.release();
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Use direct SQL query to ensure we properly handle array fields
    console.log(`DB: Getting user with username ${username}`);
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM users WHERE username = $1`,
        [username]
      );
      
      if (result.rows.length === 0) {
        console.log(`DB: User with username ${username} not found`);
        return undefined;
      }
      
      // Convert snake_case database columns to camelCase for app use
      const dbUser = result.rows[0];
      console.log(`DB: Found user, raw data:`, JSON.stringify(dbUser, null, 2));
      
      // Create properly formatted user with array handling
      const user: User = {
        id: dbUser.id,
        username: dbUser.username,
        password: dbUser.password,
        name: dbUser.name,
        email: dbUser.email,
        googleId: dbUser.google_id,
        googleProfile: dbUser.google_profile,
        age: dbUser.age,
        gender: dbUser.gender,
        fitnessGoals: Array.isArray(dbUser.fitness_goals) ? dbUser.fitness_goals : [],
        bodyMeasurements: dbUser.body_measurements,
        profilePic: dbUser.profile_pic,
        progressPhotos: Array.isArray(dbUser.progress_photos) ? dbUser.progress_photos : [],
        gymPreferences: Array.isArray(dbUser.gym_preferences) ? dbUser.gym_preferences : [],
        isAdmin: dbUser.is_admin,
        isBanned: dbUser.is_banned,
        status: dbUser.status,
        createdAt: dbUser.created_at
      };
      
      console.log(`DB: Formatted user:`, JSON.stringify(user, null, 2));
      return user;
    } finally {
      client.release();
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        fitnessGoals: userData.fitnessGoals || [],
        gymPreferences: userData.gymPreferences || []
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    // Use direct SQL query to ensure we properly handle array fields
    console.log(`DB: Getting all users`);
    
    const client = await pool.connect();
    try {
      const result = await client.query(`SELECT * FROM users`);
      
      if (result.rows.length === 0) {
        console.log(`DB: No users found`);
        return [];
      }
      
      // Map each row to a properly formatted user
      const userList: User[] = result.rows.map(dbUser => ({
        id: dbUser.id,
        username: dbUser.username,
        password: dbUser.password,
        name: dbUser.name,
        age: dbUser.age,
        gender: dbUser.gender,
        fitnessGoals: Array.isArray(dbUser.fitness_goals) ? dbUser.fitness_goals : [],
        bodyMeasurements: dbUser.body_measurements,
        profilePic: dbUser.profile_pic,
        progressPhotos: Array.isArray(dbUser.progress_photos) ? dbUser.progress_photos : [],
        gymPreferences: Array.isArray(dbUser.gym_preferences) ? dbUser.gym_preferences : [],
        isAdmin: dbUser.is_admin,
        isBanned: dbUser.is_banned,
        status: dbUser.status,
        createdAt: dbUser.created_at
      }));
      
      console.log(`DB: Retrieved ${userList.length} users`);
      return userList;
    } finally {
      client.release();
    }
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    console.log(`DB: Updating user ${id} with data:`, JSON.stringify(userData, null, 2));
    
    // Handle array & JSON fields correctly - ensure they're not null/undefined
    const cleanedData: any = { ...userData };
    
    // Specifically handle arrays to avoid null/undefined issues
    if ('fitnessGoals' in userData) {
      // Special PostgreSQL array handling using client directly
      if (Array.isArray(userData.fitnessGoals) && userData.fitnessGoals.length > 0) {
        cleanedData.fitnessGoals = userData.fitnessGoals;
      } else {
        // For empty arrays, we need to make sure they're stored as empty arrays and not NULL
        cleanedData.fitnessGoals = [];
      }
      console.log(`DB: Normalized fitnessGoals:`, JSON.stringify(cleanedData.fitnessGoals));
    }
    
    if ('gymPreferences' in userData) {
      if (Array.isArray(userData.gymPreferences) && userData.gymPreferences.length > 0) {
        cleanedData.gymPreferences = userData.gymPreferences;
      } else {
        cleanedData.gymPreferences = [];
      }
      console.log(`DB: Normalized gymPreferences:`, JSON.stringify(cleanedData.gymPreferences));
    }
    
    if ('progressPhotos' in userData) {
      if (Array.isArray(userData.progressPhotos) && userData.progressPhotos.length > 0) {
        cleanedData.progressPhotos = userData.progressPhotos;
      } else {
        cleanedData.progressPhotos = [];
      }
      console.log(`DB: Normalized progressPhotos:`, JSON.stringify(cleanedData.progressPhotos));
    }
    
    // Handle bodyMeasurements object
    if ('bodyMeasurements' in userData) {
      cleanedData.bodyMeasurements = userData.bodyMeasurements || {};
      console.log(`DB: Normalized bodyMeasurements:`, JSON.stringify(cleanedData.bodyMeasurements));
    }
    
    // Handle scalar values to ensure they're the correct type
    if ('age' in userData && userData.age !== null && userData.age !== undefined) {
      cleanedData.age = parseInt(String(userData.age), 10);
    }
    
    // Perform the database update with cleaned data
    try {
      console.log(`DB: Performing final update with data:`, JSON.stringify(cleanedData, null, 2));
      
      // For critical array fields, use a direct SQL query to ensure arrays are properly set
      if ('fitnessGoals' in cleanedData || 'gymPreferences' in cleanedData || 'progressPhotos' in cleanedData) {
        console.log(`DB: Using direct SQL approach for arrays`);
        
        // First get current user to preserve any fields not being updated
        const currentUser = await this.getUser(id);
        if (!currentUser) {
          console.error(`DB: User ${id} not found for update`);
          return undefined;
        }
        
        // Prepare SQL query parts
        const setParts = [];
        const params = [];
        let paramIndex = 1;
        
        // For each field, either use the new value or keep the current one
        for (const [key, value] of Object.entries(cleanedData)) {
          if (key === 'fitnessGoals' || key === 'gymPreferences' || key === 'progressPhotos') {
            // Special handling for arrays - PostgreSQL expects array literals
            const arrayStr = JSON.stringify(value || []);
            setParts.push(`${key === 'fitnessGoals' ? 'fitness_goals' : 
                           key === 'gymPreferences' ? 'gym_preferences' : 
                           'progress_photos'} = $${paramIndex}::text[]`);
            params.push(arrayStr);
            paramIndex++;
          } else {
            // Normal fields
            setParts.push(`${key} = $${paramIndex}`);
            params.push(value);
            paramIndex++;
          }
        }
        
        // Add the user ID as the last parameter
        params.push(id);
        
        // Construct and execute the query
        const query = `
          UPDATE users 
          SET ${setParts.join(', ')} 
          WHERE id = $${paramIndex}
          RETURNING *
        `;
        
        console.log(`DB: Executing SQL: ${query}`);
        console.log(`DB: With params:`, params);
        
        // Execute query
        const client = await pool.connect();
        try {
          const result = await client.query(query, params);
          if (result.rows.length > 0) {
            const updatedUser = result.rows[0];
            
            // Verify the arrays in the returned user
            console.log(`DB: User ${id} updated successfully via SQL. Arrays in result:`);
            console.log(`- fitnessGoals: ${JSON.stringify(updatedUser.fitness_goals)}`);
            console.log(`- gymPreferences: ${JSON.stringify(updatedUser.gym_preferences)}`);
            console.log(`- progressPhotos: ${JSON.stringify(updatedUser.progress_photos)}`);
            
            // Convert snake_case column names to camelCase for consistency
            const formattedUser: User = {
              id: updatedUser.id,
              username: updatedUser.username,
              password: updatedUser.password,
              name: updatedUser.name,
              age: updatedUser.age,
              gender: updatedUser.gender,
              fitnessGoals: updatedUser.fitness_goals || [],
              bodyMeasurements: updatedUser.body_measurements,
              profilePic: updatedUser.profile_pic,
              progressPhotos: updatedUser.progress_photos || [],
              gymPreferences: updatedUser.gym_preferences || [],
              isAdmin: updatedUser.is_admin,
              isBanned: updatedUser.is_banned,
              status: updatedUser.status,
              createdAt: updatedUser.created_at
            };
            
            return formattedUser;
          } else {
            console.error(`DB: SQL update returned no rows for user ${id}`);
            return undefined;
          }
        } finally {
          client.release();
        }
      } else {
        // For updates without arrays, use the ORM approach
        const [updatedUser] = await db
          .update(users)
          .set(cleanedData)
          .where(eq(users.id, id))
          .returning();
        
        if (!updatedUser) {
          console.error(`DB: Update query returned no results for user ${id}`);
          return undefined;
        }
        
        // Ensure arrays are never null
        updatedUser.fitnessGoals = updatedUser.fitnessGoals || [];
        updatedUser.gymPreferences = updatedUser.gymPreferences || [];
        updatedUser.progressPhotos = updatedUser.progressPhotos || [];
        
        console.log(`DB: User ${id} updated successfully via ORM. Arrays in result:`);
        console.log(`- fitnessGoals: ${JSON.stringify(updatedUser.fitnessGoals)}`);
        console.log(`- gymPreferences: ${JSON.stringify(updatedUser.gymPreferences)}`);
        console.log(`- progressPhotos: ${JSON.stringify(updatedUser.progressPhotos)}`);
        
        return updatedUser;
      }
    } catch (error) {
      console.error(`DB: Error updating user ${id}:`, error);
      return undefined;
    }
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      console.log(`Attempting to delete user with ID: ${id}`);
      
      // Get the user to make sure it exists before we try to delete
      const user = await this.getUser(id);
      if (!user) {
        console.log(`User with ID ${id} not found`);
        return false;
      }
      
      console.log(`User to delete: ${JSON.stringify(user)}`);
      
      // DIRECT APPROACH - Execute raw SQL for deletion to bypass any potential ORM issues
      try {
        console.log("Using direct SQL approach to delete user");
        
        // Use Postgres driver directly to ensure we're not hitting ORM issues
        const client = await pool.connect();
        try {
          // Start transaction
          await client.query('BEGIN');
          
          // Delete saved gyms
          const savedGymsResult = await client.query(
            'DELETE FROM saved_gyms WHERE user_id = $1 RETURNING id', 
            [id]
          );
          console.log(`Deleted ${savedGymsResult.rowCount} saved gyms directly`);
          
          // Delete user matches
          const userMatchesResult = await client.query(
            'DELETE FROM user_matches WHERE sender_id = $1 OR receiver_id = $1 RETURNING id', 
            [id]
          );
          console.log(`Deleted ${userMatchesResult.rowCount} user matches directly`);
          
          // Delete messages
          const messagesResult = await client.query(
            'DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1 RETURNING id', 
            [id]
          );
          console.log(`Deleted ${messagesResult.rowCount} messages directly`);
          
          // Delete user
          const userResult = await client.query(
            'DELETE FROM users WHERE id = $1 RETURNING id', 
            [id]
          );
          
          if (userResult.rowCount > 0) {
            console.log(`Direct SQL: Successfully deleted user ${id}`);
            await client.query('COMMIT');
            return true;
          } else {
            console.log(`Direct SQL: Failed to delete user ${id}`);
            await client.query('ROLLBACK');
            return false;
          }
        } catch (sqlError) {
          await client.query('ROLLBACK');
          console.error('SQL Error in transaction:', sqlError);
          throw sqlError;
        } finally {
          client.release();
        }
      } catch (directError) {
        console.error('Error in direct SQL approach:', directError);
        
        // Fall back to ORM approach if direct SQL fails
        console.log("Falling back to ORM approach");
        
        // Delete user's saved gyms
        const deletedGyms = await db
          .delete(savedGyms)
          .where(eq(savedGyms.userId, id))
          .returning({ id: savedGyms.id });
        console.log(`Deleted ${deletedGyms.length} saved gyms via ORM`);
        
        // Delete user's matches
        const deletedMatches = await db
          .delete(userMatches)
          .where(
            or(
              eq(userMatches.senderId, id),
              eq(userMatches.receiverId, id)
            )
          )
          .returning({ id: userMatches.id });
        console.log(`Deleted ${deletedMatches.length} matches via ORM`);
        
        // Delete user's messages
        const deletedMessages = await db
          .delete(messages)
          .where(
            or(
              eq(messages.senderId, id),
              eq(messages.receiverId, id)
            )
          )
          .returning({ id: messages.id });
        console.log(`Deleted ${deletedMessages.length} messages via ORM`);
        
        // Finally delete the user
        console.log(`Now deleting the user record itself via ORM`);
        const deleted = await db
          .delete(users)
          .where(eq(users.id, id))
          .returning({ id: users.id });
        
        console.log(`ORM user deletion result: ${JSON.stringify(deleted)}`);
        const success = deleted.length > 0;
        console.log(`ORM user deletion ${success ? 'successful' : 'failed'}`);
        
        return success;
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getGym(id: number): Promise<Gym | undefined> {
    const [gym] = await db.select().from(gyms).where(eq(gyms.id, id));
    return gym;
  }

  async getAllGyms(): Promise<Gym[]> {
    return await db.select().from(gyms);
  }

  async getNearbyGyms(lat: number, lng: number, radius = 10): Promise<Gym[]> {
    // In a real app with PostGIS, you would do proper geospatial filtering
    // For now, just return all gyms
    return this.getAllGyms();
  }

  async createGym(gymData: InsertGym): Promise<Gym> {
    const [gym] = await db
      .insert(gyms)
      .values({
        ...gymData,
        images: gymData.images || [],
        amenities: gymData.amenities || []
      })
      .returning();
    return gym;
  }

  async updateGym(id: number, gymData: Partial<Gym>): Promise<Gym | undefined> {
    const [updatedGym] = await db
      .update(gyms)
      .set(gymData)
      .where(eq(gyms.id, id))
      .returning();
    return updatedGym;
  }

  async deleteGym(id: number): Promise<boolean> {
    const deleted = await db
      .delete(gyms)
      .where(eq(gyms.id, id))
      .returning({ id: gyms.id });
    return deleted.length > 0;
  }

  async getSavedGym(userId: number, gymId: number): Promise<SavedGym | undefined> {
    const [savedGym] = await db
      .select()
      .from(savedGyms)
      .where(
        and(
          eq(savedGyms.userId, userId),
          eq(savedGyms.gymId, gymId)
        )
      );
    return savedGym;
  }

  async getSavedGymsByUser(userId: number): Promise<SavedGym[]> {
    return await db
      .select()
      .from(savedGyms)
      .where(eq(savedGyms.userId, userId))
      .orderBy(desc(savedGyms.savedAt));
  }

  async saveGym(savedGymData: InsertSavedGym): Promise<SavedGym> {
    // Check if this gym is already saved by this user
    const existingSavedGym = await this.getSavedGym(savedGymData.userId, savedGymData.gymId);
    
    if (existingSavedGym) {
      // Update match score if needed
      if (savedGymData.matchScore !== existingSavedGym.matchScore) {
        const [updatedSavedGym] = await db
          .update(savedGyms)
          .set({ matchScore: savedGymData.matchScore })
          .where(eq(savedGyms.id, existingSavedGym.id))
          .returning();
        return updatedSavedGym;
      }
      return existingSavedGym;
    }
    
    // Create new saved gym entry
    const [savedGym] = await db
      .insert(savedGyms)
      .values(savedGymData)
      .returning();
    return savedGym;
  }

  async deleteSavedGym(userId: number, gymId: number): Promise<boolean> {
    const deleted = await db
      .delete(savedGyms)
      .where(
        and(
          eq(savedGyms.userId, userId),
          eq(savedGyms.gymId, gymId)
        )
      )
      .returning({ id: savedGyms.id });
    return deleted.length > 0;
  }

  async getMatchesForUser(userId: number): Promise<Array<Gym & { matchScore: number }>> {
    const user = await this.getUser(userId);
    if (!user) return [];

    const allGyms = await this.getAllGyms();
    
    // In a real app, you would implement a more complex matching algorithm
    // based on user preferences and gym attributes
    
    // For now, we'll calculate match scores based on a simple algorithm:
    return allGyms.map(gym => {
      // Calculate match score based on user preferences
      let matchScore = Math.floor(Math.random() * 15) + 75; // Random score between 75-90
      
      // If user has fitness goals and gym has amenities that match, boost score
      if (user.fitnessGoals && gym.amenities) {
        const goalToAmenity: Record<string, string[]> = {
          'Build Muscle': ['Free Weights', 'Weight Training', 'Personal Training'],
          'Weight Loss': ['Cardio Equipment', 'Classes', 'Swimming Pool'],
          'Improve Strength': ['Free Weights', 'Weight Training', 'CrossFit']
        };
        
        // Boost score for each matching amenity
        user.fitnessGoals.forEach(goal => {
          const relatedAmenities = goalToAmenity[goal] || [];
          relatedAmenities.forEach(amenity => {
            if (gym.amenities?.includes(amenity)) {
              matchScore += 2; // Boost by 2 points per match
            }
          });
        });
      }
      
      // Cap at 100%
      matchScore = Math.min(matchScore, 100);
      
      return {
        ...gym,
        matchScore
      };
    }).sort((a, b) => b.matchScore - a.matchScore); // Sort by match score
  }

  // User match operations
  async getUserMatches(userId: number, status?: string): Promise<UserMatch[]> {
    let query = db
      .select()
      .from(userMatches)
      .where(
        or(
          eq(userMatches.senderId, userId),
          eq(userMatches.receiverId, userId)
        )
      );
    
    if (status) {
      // Add status filter to the base query
      return await db
        .select()
        .from(userMatches)
        .where(
          and(
            or(
              eq(userMatches.senderId, userId),
              eq(userMatches.receiverId, userId)
            ),
            eq(userMatches.status, status)
          )
        )
        .orderBy(desc(userMatches.createdAt));
    }
    
    return await query.orderBy(desc(userMatches.createdAt));
  }

  async getUserMatch(id: number): Promise<UserMatch | undefined> {
    const [match] = await db
      .select()
      .from(userMatches)
      .where(eq(userMatches.id, id));
    return match;
  }

  async getUserMatchByUsers(senderId: number, receiverId: number): Promise<UserMatch | undefined> {
    // Check in both directions
    const [match] = await db
      .select()
      .from(userMatches)
      .where(
        or(
          and(
            eq(userMatches.senderId, senderId),
            eq(userMatches.receiverId, receiverId)
          ),
          and(
            eq(userMatches.senderId, receiverId),
            eq(userMatches.receiverId, senderId)
          )
        )
      );
    return match;
  }

  async createUserMatch(userMatchData: InsertUserMatch): Promise<UserMatch> {
    // Check if this match already exists in either direction
    const existingMatch = await this.getUserMatchByUsers(
      userMatchData.senderId,
      userMatchData.receiverId
    );
    
    if (existingMatch) {
      // If there's an existing match, update it instead
      if (existingMatch.status === "pending") {
        // If this is a reciprocal match, accept it
        if (
          (existingMatch.senderId === userMatchData.receiverId) && 
          (existingMatch.receiverId === userMatchData.senderId)
        ) {
          return await this.updateUserMatchStatus(existingMatch.id, "accepted") as UserMatch;
        }
      }
      return existingMatch;
    }
    
    // Create a new match
    const [userMatch] = await db
      .insert(userMatches)
      .values(userMatchData)
      .returning();
    return userMatch;
  }

  async updateUserMatchStatus(id: number, status: string): Promise<UserMatch | undefined> {
    const [updatedMatch] = await db
      .update(userMatches)
      .set({ 
        status, 
        updatedAt: new Date() 
      })
      .where(eq(userMatches.id, id))
      .returning();
    return updatedMatch;
  }

  async deleteUserMatch(id: number): Promise<boolean> {
    const deleted = await db
      .delete(userMatches)
      .where(eq(userMatches.id, id))
      .returning({ id: userMatches.id });
    return deleted.length > 0;
  }

  // Message operations
  async getMessages(userId: number, otherUserId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, userId),
            eq(messages.receiverId, otherUserId)
          ),
          and(
            eq(messages.senderId, otherUserId),
            eq(messages.receiverId, userId)
          )
        )
      )
      .orderBy(messages.createdAt);
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.read, false)
        )
      );
    return result[0]?.count || 0;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async markMessagesAsRead(receiverId: number, senderId: number): Promise<void> {
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.receiverId, receiverId),
          eq(messages.senderId, senderId),
          eq(messages.read, false)
        )
      );
  }

  // Method to seed the database with initial sample data if needed
  async seedInitialData() {
    // Check if we have any users or gyms
    const existingUsers = await this.getAllUsers();
    
    if (existingUsers.length === 0) {
      console.log("Seeding initial data...");
      
      // Create admin user
      await this.createUser({
        username: "admin",
        password: "$2b$10$BnO/Mvxz1/LJ.5PPSlUZB.PKK9bJVjwcV7pwbXbsdwGNKMYbLcMIu", // hashed "password"
        name: "Admin User",
        fitnessGoals: ["Weight Loss", "Muscle Building"],
        gymPreferences: ["Equipment Variety", "Clean Facilities"]
      }).then(async (user) => {
        // Make this user an admin
        await db
          .update(users)
          .set({ isAdmin: true })
          .where(eq(users.id, user.id));
        
        // Add sample gyms
        const sampleGyms = [
          {
            name: "Fitness Evolution",
            location: {
              lat: 47.6062,
              lng: -122.3321,
              address: "123 Pike St, Seattle, WA 98101"
            },
            images: [
              "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
            ],
            amenities: ["Cardio Equipment", "Free Weights", "Sauna", "Pool", "Group Classes"],
            rating: 4.7,
            addedBy: user.id
          },
          {
            name: "PowerHouse Gym",
            location: {
              lat: 37.7749,
              lng: -122.4194,
              address: "456 Market St, San Francisco, CA 94105"
            },
            images: [
              "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
            ],
            amenities: ["Heavy Weights", "CrossFit Area", "Supplement Shop", "Personal Training"],
            rating: 4.5,
            addedBy: user.id
          },
          {
            name: "Iron Athletics",
            location: {
              lat: 37.7749,
              lng: -122.4194,
              address: "789 Mission St, San Francisco, CA 94103"
            },
            images: [
              "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1051&q=80"
            ],
            amenities: ["Olympic Lifting", "Strongman Equipment", "Boxing Ring", "MMA Area"],
            rating: 4.8,
            addedBy: user.id
          },
          {
            name: "Curve Fitness",
            location: {
              lat: 40.7128,
              lng: -74.0060,
              address: "321 Broadway, New York, NY 10007"
            },
            images: [
              "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
            ],
            amenities: ["Women's Only Area", "Yoga Studio", "Pilates", "Massage Services"],
            rating: 4.6,
            addedBy: user.id
          },
          {
            name: "Elite Fitness",
            location: {
              lat: 33.4484,
              lng: -112.0740,
              address: "555 Central Ave, Phoenix, AZ 85004"
            },
            images: [
              "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
            ],
            amenities: ["Basketball Court", "Racquetball", "Swimming Pool", "Spa", "Childcare"],
            rating: 4.9,
            addedBy: user.id
          },
          {
            name: "UrbanFit Gym",
            location: {
              lat: 40.7128,
              lng: -74.0060,
              address: "987 5th Ave, New York, NY 10022"
            },
            images: [
              "https://images.unsplash.com/photo-1521805103424-d8f8430e8933?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
            ],
            amenities: ["High-End Equipment", "Towel Service", "Protein Bar", "Rooftop Classes"],
            rating: 4.4,
            addedBy: user.id
          }
        ];
        
        for (const gymData of sampleGyms) {
          await this.createGym(gymData);
        }
        
        console.log("Initial data seeding complete");
      });
    }
  }
}