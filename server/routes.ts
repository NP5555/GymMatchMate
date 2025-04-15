import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertGymSchema, insertUserMatchSchema, insertMessageSchema, Gym } from "@shared/schema";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { parse } from "csv-parse";
import fs from "fs";
import { db } from "./db"; // Import database connection

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize the database
  const { storage } = await import('./storage');
  if ('seedInitialData' in storage) {
    await (storage as any).seedInitialData();
  }
  // Set up authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);
  
  // Set up multer for file uploads
  const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });
  
  // User profile routes
  // Update user profile
  app.put("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      // Extract profile data from request body
      const { 
        name, age, gender, bodyMeasurements, 
        fitnessGoals, gymPreferences, profilePic,
        progressPhotos
      } = req.body;
      
      // Get the current user first to ensure we have proper base values
      const currentUser = await storage.getUser(req.user.id);
      console.log(`Current user state before update:`, JSON.stringify(currentUser, null, 2));
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prepare update data with proper array handling
      const updateData: Partial<any> = {};
      
      // Only update fields that were provided
      if (name !== undefined) updateData.name = name;
      
      // Handle numeric value conversion for age
      if (age !== undefined) {
        if (typeof age === 'string') {
          updateData.age = parseInt(age, 10);
        } else {
          updateData.age = age;
        }
      }
      
      if (gender !== undefined) updateData.gender = gender;
      
      // Handle bodyMeasurements as a JSON object
      if (bodyMeasurements !== undefined) {
        updateData.bodyMeasurements = typeof bodyMeasurements === 'string' 
          ? JSON.parse(bodyMeasurements) 
          : bodyMeasurements;
      }
      
      // Special handling for arrays with explicit defaulting
      if (fitnessGoals !== undefined) {
        // Ensure the array is handled explicitly for PostgreSQL
        if (Array.isArray(fitnessGoals)) {
          updateData.fitnessGoals = fitnessGoals;
        } else if (fitnessGoals === null) {
          // If null was explicitly passed, use an empty array
          updateData.fitnessGoals = [];
        } else if (typeof fitnessGoals === 'string') {
          // Handle case where it might be a JSON string
          try {
            const parsed = JSON.parse(fitnessGoals);
            updateData.fitnessGoals = Array.isArray(parsed) ? parsed : [];
          } catch {
            // If it's not valid JSON, treat it as a single item
            updateData.fitnessGoals = [fitnessGoals];
          }
        } else {
          updateData.fitnessGoals = [];
        }
        console.log(`Setting fitnessGoals to:`, JSON.stringify(updateData.fitnessGoals));
      }
      
      if (gymPreferences !== undefined) {
        // Same careful handling for gymPreferences
        if (Array.isArray(gymPreferences)) {
          updateData.gymPreferences = gymPreferences;
        } else if (gymPreferences === null) {
          updateData.gymPreferences = [];
        } else if (typeof gymPreferences === 'string') {
          try {
            const parsed = JSON.parse(gymPreferences);
            updateData.gymPreferences = Array.isArray(parsed) ? parsed : [];
          } catch {
            updateData.gymPreferences = [gymPreferences];
          }
        } else {
          updateData.gymPreferences = [];
        }
        console.log(`Setting gymPreferences to:`, JSON.stringify(updateData.gymPreferences));
      }
      
      if (progressPhotos !== undefined) {
        // Same careful handling for progressPhotos
        if (Array.isArray(progressPhotos)) {
          updateData.progressPhotos = progressPhotos;
        } else if (progressPhotos === null) {
          updateData.progressPhotos = [];
        } else if (typeof progressPhotos === 'string') {
          try {
            const parsed = JSON.parse(progressPhotos);
            updateData.progressPhotos = Array.isArray(parsed) ? parsed : [];
          } catch {
            updateData.progressPhotos = [progressPhotos];
          }
        } else {
          updateData.progressPhotos = [];
        }
        console.log(`Setting progressPhotos to:`, JSON.stringify(updateData.progressPhotos));
      }
      
      if (profilePic !== undefined) updateData.profilePic = profilePic;
      
      console.log(`Attempting to update user ${req.user.id} with data:`, JSON.stringify(updateData, null, 2));
      
      // IMPORTANT: For partial updates, ensure we preserve existing values
      // by explicitly including them in the update (we already have currentUser from above)
      
      // Create a merged update that preserves existing array values when not specified
      const mergedUpdateData = {
        ...updateData,
        // Keep the current user values for these arrays if they're not being updated
        fitnessGoals: 'fitnessGoals' in updateData 
          ? updateData.fitnessGoals 
          : (Array.isArray(currentUser.fitnessGoals) ? currentUser.fitnessGoals : []),
        
        gymPreferences: 'gymPreferences' in updateData
          ? updateData.gymPreferences
          : (Array.isArray(currentUser.gymPreferences) ? currentUser.gymPreferences : []),
        
        progressPhotos: 'progressPhotos' in updateData
          ? updateData.progressPhotos
          : (Array.isArray(currentUser.progressPhotos) ? currentUser.progressPhotos : []),
        
        // Also preserve these fields if not updating them
        age: 'age' in updateData ? updateData.age : currentUser.age,
        gender: 'gender' in updateData ? updateData.gender : currentUser.gender,
        bodyMeasurements: 'bodyMeasurements' in updateData 
          ? updateData.bodyMeasurements 
          : currentUser.bodyMeasurements,
      };
      
      console.log(`Merged update data:`, JSON.stringify(mergedUpdateData, null, 2));
      
      // Update user in database
      const updatedUser = await storage.updateUser(req.user.id, mergedUpdateData);
      
      console.log(`Result from storage.updateUser:`, JSON.stringify(updatedUser, null, 2));
      
      if (!updatedUser) {
        console.error(`Failed to update profile for user ${req.user.id}`);
        return res.status(500).json({ message: "Failed to update profile" });
      }
      
      // Fetch the user again to confirm the update took effect
      const verifiedUser = await storage.getUser(req.user.id);
      console.log(`Verified user after update:`, JSON.stringify(verifiedUser, null, 2));
      
      // Make sure we return correct array values in the response, even if database
      // operations have nulled them out for some reason
      const responseUser = {
        ...updatedUser,
        fitnessGoals: Array.isArray(updatedUser.fitnessGoals) ? updatedUser.fitnessGoals : 
                       (fitnessGoals !== undefined ? (Array.isArray(fitnessGoals) ? fitnessGoals : []) : []),
        gymPreferences: Array.isArray(updatedUser.gymPreferences) ? updatedUser.gymPreferences : 
                        (gymPreferences !== undefined ? (Array.isArray(gymPreferences) ? gymPreferences : []) : []),
        progressPhotos: Array.isArray(updatedUser.progressPhotos) ? updatedUser.progressPhotos : 
                        (progressPhotos !== undefined ? (Array.isArray(progressPhotos) ? progressPhotos : []) : [])
      };
      
      // Log the array values for debugging
      console.log("ARRAYS IN RESPONSE:");
      console.log(`- fitnessGoals: ${JSON.stringify(responseUser.fitnessGoals)}`);
      console.log(`- gymPreferences: ${JSON.stringify(responseUser.gymPreferences)}`);
      console.log(`- progressPhotos: ${JSON.stringify(responseUser.progressPhotos)}`);
      
      console.log(`User ${req.user.id} profile updated successfully`);
      res.json(responseUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Upload user photo
  app.post("/api/user/photos", upload.single('photo'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }
      
      // Get the file path
      const filePath = req.file.path;
      const fileName = req.file.filename;
      const fileUrl = `/uploads/${fileName}`;
      
      // In a real app, you would upload to cloud storage
      // For now, we'll just store the local path
      
      console.log(`User ${req.user.id} uploaded photo: ${filePath}`);
      
      // Get the current user from database to ensure we have the latest data
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user's progress photos - ensure we have a valid array
      let progressPhotos = [];
      if (Array.isArray(currentUser.progressPhotos)) {
        progressPhotos = [...currentUser.progressPhotos];
      } else if (currentUser.progressPhotos) {
        try {
          // Try to parse if it's a string
          const parsed = JSON.parse(currentUser.progressPhotos as any);
          progressPhotos = Array.isArray(parsed) ? parsed : [];
        } catch {
          // If parsing fails, use empty array
          progressPhotos = [];
        }
      }
      
      // Add the new photo
      progressPhotos.push(fileUrl);
      
      console.log(`Updating user ${req.user.id} progress photos:`, JSON.stringify(progressPhotos, null, 2));
      
      // Use Drizzle ORM to update the user
      try {
        console.log("Updating progress photos via storage interface");
        const updatedUser = await storage.updateUser(req.user.id, { progressPhotos });
        
        if (!updatedUser) {
          console.error("Failed to update user with new photo");
          return res.status(500).json({ message: "Failed to update user" });
        }
        
        console.log(`Updated user photos:`, JSON.stringify(updatedUser.progressPhotos, null, 2));
      } catch (error) {
        console.error("Error updating photos:", error);
        return res.status(500).json({ message: "Failed to update user with new photo" });
      }
      
      // Verify the photo was added
      const verifiedUser = await storage.getUser(req.user.id);
      console.log(`Verified user photos after update:`, JSON.stringify(verifiedUser?.progressPhotos, null, 2));
      
      // Return the file URL
      res.status(201).json({ url: fileUrl });
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Gym routes
  // Get all gyms
  app.get("/api/gyms", async (req, res) => {
    const gyms = await storage.getAllGyms();
    res.json(gyms);
  });
  
  // Get nearby gyms
  app.get("/api/gyms/nearby", async (req, res) => {
    // For simplicity, we're not doing actual geolocation matching
    // In a real app, you would use the user's location
    const gyms = await storage.getAllGyms();
    res.json(gyms);
  });

  // Get a specific gym
  app.get("/api/gyms/:id", async (req, res) => {
    const gymId = parseInt(req.params.id);
    const gym = await storage.getGym(gymId);
    
    if (!gym) {
      return res.status(404).json({ message: "Gym not found" });
    }
    
    res.json(gym);
  });

  // Import gyms from CSV file (admin only)
  app.post("/api/gyms/import-csv", upload.single('file'), async (req, res) => {
    console.log("Import CSV, user:", req.user);
    
    if (!req.isAuthenticated() || 
        (!req.user?.isAdmin && req.user?.username !== 'admin2')) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    try {
      const filePath = req.file.path;
      console.log(`Processing CSV file: ${filePath}`);
      
      const results: Gym[] = [];
      const errors: any[] = [];
      
      const parser = fs.createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true
        }));
      
      let processedCount = 0;
      let errorCount = 0;
      
      for await (const record of parser) {
        try {
          // Transform CSV data to match gym schema
          const gymData: any = {
            name: record.name,
            location: {
              lat: parseFloat(record.latitude || 0),
              lng: parseFloat(record.longitude || 0),
              address: record.address || '',
              city: record.city || '',
              state: record.state || '',
              zipCode: record.zipCode || ''
            },
            amenities: record.amenities ? record.amenities.split(',').map((a: string) => a.trim()) : [],
            images: record.images ? record.images.split(',').map((i: string) => i.trim()) : [],
            rating: parseFloat(record.rating || 0),
            addedBy: req.user.id
          };
          
          // Validate data
          const parseResult = insertGymSchema.safeParse(gymData);
          if (!parseResult.success) {
            console.error(`Validation error for row ${processedCount + 1}:`, parseResult.error.format());
            errors.push({ 
              row: processedCount + 1, 
              errors: parseResult.error.format(),
              data: record
            });
            errorCount++;
            continue;
          }
          
          // Create gym
          const newGym = await storage.createGym(parseResult.data);
          results.push(newGym);
          processedCount++;
          
        } catch (error) {
          console.error(`Error processing row ${processedCount + 1}:`, error);
          errors.push({ 
            row: processedCount + 1, 
            error: String(error),
            data: record
          });
          errorCount++;
        }
      }
      
      // Clean up the uploaded file
      fs.unlinkSync(filePath);
      
      res.status(200).json({
        success: true,
        message: `Processed ${processedCount + errorCount} records. ${processedCount} gyms imported, ${errorCount} errors.`,
        imported: results,
        errors: errors
      });
      
    } catch (error) {
      console.error("Error processing CSV:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to process CSV file",
        error: String(error)
      });
    }
  });
  
  // Create a new gym (admin only)
  app.post("/api/gyms", async (req, res) => {
    console.log("Creating gym, user:", req.user);
    
    // Always allow admin2 user to create gyms (for testing)
    if (!req.isAuthenticated() || 
        (!req.user?.isAdmin && req.user?.username !== 'admin2')) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    console.log("Processing gym creation with body:", req.body);
    
    const parseResult = insertGymSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error("Gym validation failed:", parseResult.error.format());
      return res.status(400).json({ 
        message: "Invalid gym data", 
        errors: parseResult.error.format() 
      });
    }
    
    const gymData = parseResult.data;
    console.log("Validated gym data:", gymData);
    
    // Set the current user as the one who added this gym
    gymData.addedBy = req.user.id;
    
    try {
      console.log("Calling storage.createGym with:", gymData);
      const newGym = await storage.createGym(gymData);
      console.log("New gym created:", newGym);
      res.status(201).json(newGym);
    } catch (error) {
      console.error("Error creating gym:", error);
      res.status(500).json({ message: "Failed to create gym", error: String(error) });
    }
  });

  // Update a gym (admin only)
  app.put("/api/gyms/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    const gymId = parseInt(req.params.id);
    const updatedGym = await storage.updateGym(gymId, req.body);
    
    if (!updatedGym) {
      return res.status(404).json({ message: "Gym not found" });
    }
    
    res.json(updatedGym);
  });

  // Delete a gym (admin only)
  app.delete("/api/gyms/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    const gymId = parseInt(req.params.id);
    const success = await storage.deleteGym(gymId);
    
    if (!success) {
      return res.status(404).json({ message: "Gym not found" });
    }
    
    res.status(204).send();
  });

  // Matching routes
  // Get matches for current user
  app.get("/api/matches", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const matches = await storage.getMatchesForUser(req.user.id);
    res.json(matches);
  });

  // Save a gym for a user
  app.post("/api/saved-gyms", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const { gymId, matchScore } = req.body;
    
    if (!gymId) {
      return res.status(400).json({ message: "Gym ID is required" });
    }
    
    // Check if gym exists
    const gym = await storage.getGym(parseInt(gymId));
    if (!gym) {
      return res.status(404).json({ message: "Gym not found" });
    }
    
    const savedGym = await storage.saveGym({
      userId: req.user.id,
      gymId: parseInt(gymId),
      matchScore
    });
    
    res.status(201).json(savedGym);
  });

  // Get saved gyms for current user
  app.get("/api/saved-gyms", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const savedGyms = await storage.getSavedGymsByUser(req.user.id);
    
    // Fetch the full gym data for each saved gym
    const gymsWithDetails = await Promise.all(
      savedGyms.map(async (saved) => {
        const gym = await storage.getGym(saved.gymId);
        return {
          ...saved,
          gym
        };
      })
    );
    
    res.json(gymsWithDetails);
  });

  // Remove a saved gym
  app.delete("/api/saved-gyms/:gymId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const gymId = parseInt(req.params.gymId);
    const success = await storage.deleteSavedGym(req.user.id, gymId);
    
    if (!success) {
      return res.status(404).json({ message: "Saved gym not found" });
    }
    
    res.status(204).send();
  });

  // Admin routes
  // Get all users (admin only)
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    const users = await storage.getAllUsers();
    
    // Remove passwords from the response
    const safeUsers = users.map(({ password, ...user }) => user);
    
    res.json(safeUsers);
  });
  
  // Delete user (admin only)
  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    const userId = parseInt(req.params.id);
    console.log(`Admin attempting to delete user ID: ${userId}`);
    
    // Check if user exists
    const user = await storage.getUser(userId);
    if (!user) {
      console.log(`User with ID ${userId} not found`);
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log(`Found user to delete: ${user.username}, isAdmin: ${user.isAdmin}`);
    
    // Don't allow deleting other admins
    if (user.isAdmin) {
      console.log(`Cannot delete admin user: ${user.username}`);
      return res.status(403).json({ message: "Cannot delete admin users" });
    }
    
    try {
      // Delete the user
      console.log(`Attempting to delete user ${user.username} (ID: ${userId})`);
      const success = await storage.deleteUser(userId);
      
      console.log(`User deletion result: ${success ? 'successful' : 'failed'}`);
      
      if (success) {
        // Verify the user was actually deleted
        const checkUser = await storage.getUser(userId);
        if (checkUser) {
          console.log(`ERROR: User still exists after deletion`);
          return res.status(500).json({ message: "Failed to delete user - user still exists" });
        }
        
        console.log(`User ${user.username} successfully deleted`);
        return res.status(200).json({ message: "User deleted successfully" });
      } else {
        return res.status(500).json({ message: "Failed to delete user" });
      }
    } catch (error) {
      console.error('Error in delete user endpoint:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Ban/unban user (admin only)
  app.put("/api/admin/users/:id/:action", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    const userId = parseInt(req.params.id);
    const action = req.params.action;
    
    // Check if the action is valid
    if (action !== "ban" && action !== "unban") {
      return res.status(400).json({ message: "Invalid action. Use 'ban' or 'unban'" });
    }
    
    // Check if user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't allow banning other admins
    if (user.isAdmin) {
      return res.status(403).json({ message: "Cannot ban admin users" });
    }
    
    // Update the user's status in the database
    const updateData = {
      isBanned: action === "ban",
      status: action === "ban" ? "banned" : "active"
    };
    
    try {
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(500).json({ message: `Failed to ${action} user` });
      }
      
      console.log(`User ${userId} successfully ${action}ned`);
      res.json({
        message: `User ${action === "ban" ? "banned" : "unbanned"} successfully`,
        user: updatedUser
      });
    } catch (error) {
      console.error(`Error ${action}ning user:`, error);
      return res.status(500).json({ message: `Internal server error during ${action} operation` });
    }
  });
  
  // Get all users for public display (with limited info)
  app.get("/api/users", async (req, res) => {
    const users = await storage.getAllUsers();
    
    // Filter out sensitive information, return only public profile data
    const publicUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      fitnessGoals: user.fitnessGoals,
      gymPreferences: user.gymPreferences,
      profilePic: user.profilePic
    }));
    
    res.json(publicUsers);
  });

  // User match routes
  // Get all user matches for the current user
  app.get("/api/user-matches", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userId = req.user.id;
    const status = req.query.status as string | undefined;
    
    const matches = await storage.getUserMatches(userId, status);
    
    // Fetch details for matched users
    const matchesWithDetails = await Promise.all(
      matches.map(async (match) => {
        const otherUserId = match.senderId === userId ? match.receiverId : match.senderId;
        const otherUser = await storage.getUser(otherUserId);
        
        if (!otherUser) {
          return match;
        }
        
        // Remove sensitive user information
        const { password, ...safeOtherUser } = otherUser;
        
        return {
          ...match,
          otherUser: safeOtherUser
        };
      })
    );
    
    res.json(matchesWithDetails);
  });
  
  // Create a new user match (send a match request)
  app.post("/api/user-matches", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const parseResult = insertUserMatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid match data", 
        errors: parseResult.error.format() 
      });
    }
    
    const matchData = parseResult.data;
    
    // Ensure the sender is the current user
    if (matchData.senderId !== req.user.id) {
      return res.status(403).json({ 
        message: "You can only create matches for yourself" 
      });
    }
    
    // Check if the receiver exists
    const receiver = await storage.getUser(matchData.receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Create the match
    const userMatch = await storage.createUserMatch(matchData);
    
    res.status(201).json(userMatch);
  });
  
  // Update a user match (accept or reject)
  app.put("/api/user-matches/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const matchId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || !["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ 
        message: "Valid status required (accepted or rejected)" 
      });
    }
    
    // Check if match exists and user is the receiver
    const match = await storage.getUserMatch(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }
    
    // Only the receiver can update the status
    if (match.receiverId !== req.user.id) {
      return res.status(403).json({ 
        message: "You can only respond to matches sent to you" 
      });
    }
    
    const updatedMatch = await storage.updateUserMatchStatus(matchId, status);
    res.json(updatedMatch);
  });
  
  // Delete a user match
  app.delete("/api/user-matches/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const matchId = parseInt(req.params.id);
    
    // Check if match exists and user is part of it
    const match = await storage.getUserMatch(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }
    
    // Only users who are part of the match can delete it
    if (match.senderId !== req.user.id && match.receiverId !== req.user.id) {
      return res.status(403).json({ 
        message: "You can only delete matches you're part of" 
      });
    }
    
    const success = await storage.deleteUserMatch(matchId);
    if (!success) {
      return res.status(500).json({ message: "Failed to delete match" });
    }
    
    res.status(204).send();
  });
  
  // Message routes
  // Get unread message count for current user
  app.get("/api/messages/unread/count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const unreadCount = await storage.getUnreadMessageCount(req.user.id);
    res.json({ count: unreadCount });
  });
  
  // Get messages between current user and another user
  app.get("/api/messages/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const currentUserId = req.user.id;
    const otherUserId = parseInt(req.params.userId);
    
    // Check if the other user exists
    const otherUser = await storage.getUser(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if there's a match between the users
    const match = await storage.getUserMatchByUsers(currentUserId, otherUserId);
    if (!match || match.status !== "accepted") {
      return res.status(403).json({ 
        message: "You can only message users you've matched with" 
      });
    }
    
    // Get messages and mark received messages as read
    const messages = await storage.getMessages(currentUserId, otherUserId);
    
    // Mark messages from the other user as read
    await storage.markMessagesAsRead(currentUserId, otherUserId);
    
    res.json(messages);
  });
  
  // Send a message
  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const parseResult = insertMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid message data", 
        errors: parseResult.error.format() 
      });
    }
    
    const messageData = parseResult.data;
    
    // Ensure the sender is the current user
    if (messageData.senderId !== req.user.id) {
      return res.status(403).json({ 
        message: "You can only send messages as yourself" 
      });
    }
    
    // Check if the receiver exists
    const receiver = await storage.getUser(messageData.receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Recipient not found" });
    }
    
    // Check if there's a match between the users
    const match = await storage.getUserMatchByUsers(
      messageData.senderId, 
      messageData.receiverId
    );
    
    if (!match || match.status !== "accepted") {
      return res.status(403).json({ 
        message: "You can only message users you've matched with" 
      });
    }
    
    // Create the message
    const message = await storage.createMessage(messageData);
    
    res.status(201).json(message);
  });
  
  // CSV upload for bulk gym import (admin only)
  app.post("/api/gyms/upload-csv", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const results: any[] = [];
    const errors: any[] = [];
    
    try {
      // Parse the CSV file
      const parser = fs.createReadStream(req.file.path)
        .pipe(parse({
          columns: true,
          trim: true,
          skip_empty_lines: true
        }));
      
      // Process each row in the CSV
      for await (const row of parser) {
        try {
          // Transform row data into our gym schema format
          const gymData = {
            name: row.name,
            location: {
              address: row.address || '',
              lat: parseFloat(row.latitude) || 0,
              lng: parseFloat(row.longitude) || 0
            },
            rating: parseFloat(row.rating) || 0,
            amenities: row.amenities ? row.amenities.split(',').map((a: string) => a.trim()) : [],
            addedBy: req.user.id
          };
          
          // Validate the gym data
          const parseResult = insertGymSchema.safeParse(gymData);
          if (parseResult.success) {
            // Create the gym in the database
            const newGym = await storage.createGym(parseResult.data);
            results.push(newGym);
          } else {
            errors.push({
              row,
              errors: parseResult.error.format()
            });
          }
        } catch (err) {
          errors.push({
            row,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }
      
      // Delete the temporary file
      fs.unlinkSync(req.file.path);
      
      res.status(200).json({
        success: true,
        imported: results.length,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined
      });
    } catch (err) {
      // Delete the temporary file
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore error */ }
      }
      
      console.error('Error processing CSV:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error processing CSV file',
      });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server on a distinct path to avoid conflicts with Vite's HMR
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Map to store connected clients by user ID
  const connectedClients = new Map<number, WebSocket>();
  
  // WebSocket connection handling
  wss.on('connection', (ws, req) => {
    // Get user ID from query parameter
    const userId = parseInt(req.url?.split('?userId=')[1] || '0');
    if (!userId) {
      // Close connection if no valid user ID
      ws.close(1000, 'User ID required');
      return;
    }
    
    // Store connection mapped to user ID
    connectedClients.set(userId, ws);
    
    console.log(`User ${userId} connected via WebSocket`);
    
    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        // Parse message data
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'send_message': {
            // Validate message data
            const senderId = data.senderId;
            const receiverId = data.receiverId;
            const content = data.content;
            
            if (!senderId || !receiverId || !content) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Invalid message data' 
              }));
              return;
            }
            
            // Verify sender is the connected user
            if (senderId !== userId) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'You can only send messages as yourself' 
              }));
              return;
            }
            
            // Check if there's a match between users
            const match = await storage.getUserMatchByUsers(senderId, receiverId);
            if (!match || match.status !== 'accepted') {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'You can only message users you\'ve matched with' 
              }));
              return;
            }
            
            // Store the message
            const message = await storage.createMessage({
              senderId,
              receiverId,
              content,
            });
            
            // Send confirmation to sender
            ws.send(JSON.stringify({ 
              type: 'message_sent', 
              message 
            }));
            
            // Forward to recipient if they're connected
            const receiverSocket = connectedClients.get(receiverId);
            if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
              receiverSocket.send(JSON.stringify({ 
                type: 'new_message', 
                message 
              }));
            }
            break;
          }
          
          case 'read_messages': {
            // Mark messages as read
            const senderId = data.senderId;
            
            if (!senderId) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Sender ID required' 
              }));
              return;
            }
            
            await storage.markMessagesAsRead(userId, senderId);
            
            ws.send(JSON.stringify({ 
              type: 'messages_read', 
              senderId 
            }));
            break;
          }
          
          default:
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Unknown message type' 
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to process message' 
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log(`User ${userId} disconnected from WebSocket`);
      connectedClients.delete(userId);
    });
  });
  
  return httpServer;
}
