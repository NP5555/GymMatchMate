import { 
  users, type User, type InsertUser, 
  gyms, type Gym, type InsertGym, 
  savedGyms, type SavedGym, type InsertSavedGym,
  userMatches, type UserMatch, type InsertUserMatch,
  messages, type Message, type InsertMessage
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
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

export class MemStorage implements IStorage {
  private userStore: Map<number, User>;
  private gymStore: Map<number, Gym>;
  private savedGymStore: Map<string, SavedGym>;
  private userMatchStore: Map<number, UserMatch>;
  private messageStore: Map<number, Message>;
  private userIdCounter: number;
  private gymIdCounter: number;
  private savedGymIdCounter: number;
  private userMatchIdCounter: number;
  private messageIdCounter: number;
  
  sessionStore: any;

  constructor() {
    this.userStore = new Map();
    this.gymStore = new Map();
    this.savedGymStore = new Map();
    this.userMatchStore = new Map();
    this.messageStore = new Map();
    this.userIdCounter = 1;
    this.gymIdCounter = 1;
    this.savedGymIdCounter = 1;
    this.userMatchIdCounter = 1;
    this.messageIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Add admin user
    this.createUser({
      username: "admin",
      password: "password", // This will be hashed
      name: "Admin User",
      isAdmin: true
    } as InsertUser);
    
    // Add sample gyms
    this.createSampleGyms();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.userStore.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.userStore.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.userStore.values()).find(
      (user) => user.googleId === googleId
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { 
      ...userData, 
      id, 
      createdAt, 
      fitnessGoals: userData.fitnessGoals || [],
      gymPreferences: userData.gymPreferences || [],
      isAdmin: userData.isAdmin || false
    };
    this.userStore.set(id, user);
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.userStore.values());
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = await this.getUser(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...userData };
    this.userStore.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    // In a real app, we would also handle cascading deletes
    // (e.g., delete user's matches, messages, saved gyms, etc.)
    return this.userStore.delete(id);
  }
  
  // Gym operations
  async getGym(id: number): Promise<Gym | undefined> {
    return this.gymStore.get(id);
  }
  
  async getAllGyms(): Promise<Gym[]> {
    return Array.from(this.gymStore.values());
  }
  
  async getNearbyGyms(lat: number, lng: number, radius = 10): Promise<Gym[]> {
    // Simple implementation - in a real app you'd use proper geospatial queries
    // Here we just return all gyms as "nearby"
    return this.getAllGyms();
  }
  
  async createGym(gymData: InsertGym): Promise<Gym> {
    const id = this.gymIdCounter++;
    const createdAt = new Date();
    const gym: Gym = { ...gymData, id, createdAt, images: gymData.images || [], amenities: gymData.amenities || [] };
    this.gymStore.set(id, gym);
    return gym;
  }
  
  async updateGym(id: number, gymData: Partial<Gym>): Promise<Gym | undefined> {
    const existingGym = await this.getGym(id);
    if (!existingGym) return undefined;
    
    const updatedGym = { ...existingGym, ...gymData };
    this.gymStore.set(id, updatedGym);
    return updatedGym;
  }
  
  async deleteGym(id: number): Promise<boolean> {
    return this.gymStore.delete(id);
  }
  
  // Saved gym/match operations
  private getSavedGymKey(userId: number, gymId: number): string {
    return `${userId}-${gymId}`;
  }
  
  async getSavedGym(userId: number, gymId: number): Promise<SavedGym | undefined> {
    const key = this.getSavedGymKey(userId, gymId);
    return this.savedGymStore.get(key);
  }
  
  async getSavedGymsByUser(userId: number): Promise<SavedGym[]> {
    return Array.from(this.savedGymStore.values())
      .filter(savedGym => savedGym.userId === userId);
  }
  
  async saveGym(savedGymData: InsertSavedGym): Promise<SavedGym> {
    const { userId, gymId } = savedGymData;
    const key = this.getSavedGymKey(userId, gymId);
    
    // Check if already exists
    const existing = await this.getSavedGym(userId, gymId);
    if (existing) {
      // Update match score if provided
      if (savedGymData.matchScore) {
        existing.matchScore = savedGymData.matchScore;
        this.savedGymStore.set(key, existing);
      }
      return existing;
    }
    
    // Create new saved gym
    const id = this.savedGymIdCounter++;
    const savedAt = new Date();
    const savedGym: SavedGym = { ...savedGymData, id, savedAt };
    this.savedGymStore.set(key, savedGym);
    return savedGym;
  }
  
  async deleteSavedGym(userId: number, gymId: number): Promise<boolean> {
    const key = this.getSavedGymKey(userId, gymId);
    return this.savedGymStore.delete(key);
  }
  
  async getMatchesForUser(userId: number): Promise<Array<Gym & { matchScore: number }>> {
    const user = await this.getUser(userId);
    if (!user) return [];
    
    const allGyms = await this.getAllGyms();
    
    // Enhanced matching algorithm using user preferences and goals
    return allGyms.map(gym => {
      // Base score
      let matchScore = 70; // Start with a base score of 70%
      let totalFactors = 0;
      let matchingFactors = 0;
      
      // Match based on user fitness goals and gym amenities
      if (user.fitnessGoals && gym.amenities && user.fitnessGoals.length > 0) {
        totalFactors++;
        
        // Common fitness goals and related gym amenities
        const goalToAmenity: Record<string, string[]> = {
          'Build Muscle': ['Free Weights', 'Weight Training', 'Personal Training', 'Strength Equipment'],
          'Weight Loss': ['Cardio Equipment', 'Classes', 'Swimming Pool', 'Group Training'],
          'Improve Strength': ['Free Weights', 'Weight Training', 'CrossFit', 'Functional Training'],
          'Cardio': ['Treadmills', 'Ellipticals', 'Rowing Machines', 'Cardio Equipment'],
          'Flexibility': ['Yoga Classes', 'Stretching Area', 'Group Classes'],
          'Endurance': ['Cardio Equipment', 'Swimming Pool', 'Running Track'],
          'Agility': ['Functional Training', 'CrossFit', 'Group Classes'],
        };
        
        // Perform fuzzy matching (not case-sensitive, contains partial words)
        let matchCount = 0;
        let amenityMatchCount = 0;
        
        // For each user goal, check if any gym amenity is related
        user.fitnessGoals.forEach(goal => {
          // Get related amenities for this goal
          const goalLower = goal.toLowerCase();
          let relatedAmenities: string[] = [];
          
          // Check if the goal exactly matches one of our predefined goals
          for (const [knownGoal, amenities] of Object.entries(goalToAmenity)) {
            if (goalLower.includes(knownGoal.toLowerCase()) || 
                knownGoal.toLowerCase().includes(goalLower)) {
              relatedAmenities = [...relatedAmenities, ...amenities];
            }
          }
          
          // If no predefined match, try a more generic approach
          if (relatedAmenities.length === 0) {
            // Default amenities that are good for most goals
            relatedAmenities = ['Classes', 'Personal Training', 'Equipment'];
          }
          
          // Check if gym has any of these amenities
          let foundMatch = false;
          relatedAmenities.forEach(amenity => {
            const amenityLower = amenity.toLowerCase();
            gym.amenities?.forEach(gymAmenity => {
              if (gymAmenity.toLowerCase().includes(amenityLower) || 
                  amenityLower.includes(gymAmenity.toLowerCase())) {
                amenityMatchCount++;
                foundMatch = true;
              }
            });
          });
          
          if (foundMatch) matchCount++;
        });
        
        // Calculate match percentage based on goals matched
        if (user.fitnessGoals.length > 0) {
          const goalMatchPercentage = (matchCount / user.fitnessGoals.length);
          if (goalMatchPercentage > 0.5) {
            matchingFactors += goalMatchPercentage;
          }
        }
        
        // Boost score based on how many amenities matched
        matchScore += Math.min(15, amenityMatchCount * 3);
      }
      
      // Match based on user gym preferences
      if (user.gymPreferences && user.gymPreferences.length > 0 && gym.amenities) {
        totalFactors++;
        
        let preferenceMatches = 0;
        
        // For each preference, check if the gym has related amenities
        user.gymPreferences.forEach(preference => {
          const prefLower = preference.toLowerCase();
          
          gym.amenities?.forEach(amenity => {
            const amenityLower = amenity.toLowerCase();
            
            // Check for direct or partial matches
            if (prefLower.includes(amenityLower) || 
                amenityLower.includes(prefLower) ||
                (amenityLower.split(' ').some(word => prefLower.includes(word) && word.length > 3))) {
              preferenceMatches++;
            }
          });
        });
        
        // Calculate match percentage based on preferences matched
        if (user.gymPreferences.length > 0) {
          const prefMatchPercentage = Math.min(1, preferenceMatches / user.gymPreferences.length);
          matchingFactors += prefMatchPercentage;
          
          // Add bonus points for preference matches (up to 20 points)
          matchScore += Math.min(20, preferenceMatches * 5);
        }
      }
      
      // If we have factors to consider, adjust the base score
      if (totalFactors > 0) {
        const factorScore = (matchingFactors / totalFactors) * 20;
        matchScore += factorScore;
      }
      
      // Cap at 100%
      matchScore = Math.min(100, Math.round(matchScore));
      
      return {
        ...gym,
        matchScore
      };
    }).sort((a, b) => b.matchScore - a.matchScore); // Sort by match score
  }
  
  // User Match operations
  async getUserMatches(userId: number, status?: string): Promise<UserMatch[]> {
    const matches = Array.from(this.userMatchStore.values()).filter(match => 
      (match.senderId === userId || match.receiverId === userId) &&
      (!status || match.status === status)
    );
    
    // Sort by most recent first
    return matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserMatch(id: number): Promise<UserMatch | undefined> {
    return this.userMatchStore.get(id);
  }

  async getUserMatchByUsers(senderId: number, receiverId: number): Promise<UserMatch | undefined> {
    return Array.from(this.userMatchStore.values()).find(match => 
      (match.senderId === senderId && match.receiverId === receiverId) || 
      (match.senderId === receiverId && match.receiverId === senderId)
    );
  }

  async createUserMatch(userMatchData: InsertUserMatch): Promise<UserMatch> {
    // Check if this match already exists in either direction
    const existingMatch = await this.getUserMatchByUsers(
      userMatchData.senderId,
      userMatchData.receiverId
    );
    
    if (existingMatch) {
      // If there's an existing match, possibly update it
      if (existingMatch.status === "pending") {
        // If this is a reciprocal match, accept it
        if (
          (existingMatch.senderId === userMatchData.receiverId) && 
          (existingMatch.receiverId === userMatchData.senderId)
        ) {
          return await this.updateUserMatchStatus(existingMatch.id, "accepted");
        }
      }
      return existingMatch;
    }
    
    // Create new user match
    const id = this.userMatchIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const userMatch: UserMatch = {
      ...userMatchData,
      id,
      status: userMatchData.status || "pending",
      createdAt,
      updatedAt
    };
    
    this.userMatchStore.set(id, userMatch);
    return userMatch;
  }

  async updateUserMatchStatus(id: number, status: string): Promise<UserMatch> {
    const match = this.userMatchStore.get(id);
    if (!match) {
      throw new Error(`User match with id ${id} not found`);
    }
    
    const updatedMatch = {
      ...match,
      status,
      updatedAt: new Date()
    };
    
    this.userMatchStore.set(id, updatedMatch);
    return updatedMatch;
  }

  async deleteUserMatch(id: number): Promise<boolean> {
    return this.userMatchStore.delete(id);
  }
  
  // Message operations
  async getMessages(userId: number, otherUserId: number): Promise<Message[]> {
    const messages = Array.from(this.messageStore.values()).filter(message => 
      (message.senderId === userId && message.receiverId === otherUserId) ||
      (message.senderId === otherUserId && message.receiverId === userId)
    );
    
    // Sort by created time ascending
    return messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    return Array.from(this.messageStore.values()).filter(message => 
      message.receiverId === userId && !message.read
    ).length;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const createdAt = new Date();
    
    const message: Message = {
      ...messageData,
      id,
      read: false,
      createdAt
    };
    
    this.messageStore.set(id, message);
    return message;
  }

  async markMessagesAsRead(receiverId: number, senderId: number): Promise<void> {
    // Find all messages from sender to receiver that are unread
    Array.from(this.messageStore.values())
      .filter(message => 
        message.senderId === senderId && 
        message.receiverId === receiverId && 
        !message.read
      )
      .forEach(message => {
        // Mark each message as read
        this.messageStore.set(message.id, {
          ...message,
          read: true
        });
      });
  }

  // Create sample gyms for demo
  private createSampleGyms() {
    const sampleGyms: InsertGym[] = [
      {
        name: "Fitness Evolution",
        location: {
          lat: 47.6062,
          lng: -122.3321,
          address: "2500 Broadway Ave, Seattle, WA"
        },
        images: ["gym1_image1.jpg", "gym1_image2.jpg"],
        amenities: ["24/7 Access", "Personal Training", "Pool"],
        rating: 4.8,
        addedBy: 1
      },
      {
        name: "PowerFit",
        location: {
          lat: 45.5231,
          lng: -122.6765,
          address: "1840 Oak Street, Portland, OR"
        },
        images: ["gym2_image1.jpg", "gym2_image2.jpg"],
        amenities: ["Group Classes", "Cardio Equipment", "Free Weights"],
        rating: 4.5,
        addedBy: 1
      },
      {
        name: "City Fitness Club",
        location: {
          lat: 39.7392,
          lng: -104.9903,
          address: "550 Main Street, Denver, CO"
        },
        images: ["gym3_image1.jpg", "gym3_image2.jpg"],
        amenities: ["Sauna", "Yoga Studio", "Parking"],
        rating: 4.0,
        addedBy: 1
      },
      {
        name: "Iron Athletics",
        location: {
          lat: 37.7749,
          lng: -122.4194,
          address: "123 Market St, San Francisco, CA"
        },
        images: ["gym4_image1.jpg", "gym4_image2.jpg"],
        amenities: ["Weightlifting", "CrossFit", "24/7"],
        rating: 4.6,
        addedBy: 1
      },
      {
        name: "Flex Fitness",
        location: {
          lat: 34.0522,
          lng: -118.2437,
          address: "456 Hollywood Blvd, Los Angeles, CA"
        },
        images: ["gym5_image1.jpg", "gym5_image2.jpg"],
        amenities: ["Cardio", "Classes", "Personal Training"],
        rating: 4.3,
        addedBy: 1
      },
      {
        name: "UrbanFit Gym",
        location: {
          lat: 40.7128,
          lng: -74.0060,
          address: "789 Broadway, New York, NY"
        },
        images: ["gym6_image1.jpg", "gym6_image2.jpg"],
        amenities: ["Free Weights", "Cardio Equipment", "Sauna"],
        rating: 4.2,
        addedBy: 1
      },
      {
        name: "FitZone",
        location: {
          lat: 41.8781,
          lng: -87.6298,
          address: "321 Michigan Ave, Chicago, IL"
        },
        images: ["gym7_image1.jpg", "gym7_image2.jpg"],
        amenities: ["Group Classes", "Personal Training", "Smoothie Bar"],
        rating: 4.5,
        addedBy: 1
      },
      {
        name: "Elite Fitness",
        location: {
          lat: 33.4484,
          lng: -112.0740,
          address: "987 Desert Rd, Phoenix, AZ"
        },
        images: ["gym8_image1.jpg", "gym8_image2.jpg"],
        amenities: ["CrossFit", "Yoga", "Boxing"],
        rating: 3.9,
        addedBy: 1
      }
    ];
    
    sampleGyms.forEach(gym => this.createGym(gym));
  }
}

// Import DatabaseStorage and use it instead of MemStorage
import { DatabaseStorage } from "./database-storage";

// Export the DatabaseStorage instance which will use PostgreSQL
export const storage = new DatabaseStorage();
