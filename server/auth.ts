import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser, registerSchema, loginSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  // Use bcrypt for new passwords
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
  
  // Keeping the old function for reference
  // const salt = randomBytes(16).toString("hex");
  // const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  // return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Check if the stored password is a bcrypt hash (starts with $2b$)
    if (stored.startsWith('$2b$')) {
      return await bcrypt.compare(supplied, stored);
    }
    
    // If it's not bcrypt, use our custom scrypt implementation
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error("Invalid stored password format, expected 'hash.salt'");
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "gym-matching-app-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Local Passport strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );
  
  // Configure Google OAuth strategy without hardcoded callback URL
  // The callback URL will be set dynamically per request
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // Callback URL will be specified in the authenticate call
        // This allows us to dynamically set it based on the current domain
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("Google profile:", JSON.stringify(profile, null, 2));
          
          // Check if we already have a user with this Google ID
          let user = await storage.getUserByGoogleId(profile.id);
          
          if (user) {
            // User exists, update their profile info
            user = await storage.updateUser(user.id, {
              googleProfile: profile,
              profilePic: profile.photos?.[0]?.value || user.profilePic,
            });
            return done(null, user);
          }
          
          // Create a new user with Google profile data
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
          const username = email ? email.split('@')[0] : `google_${profile.id}`;
          
          // Check if the username is already taken
          const existingUsername = await storage.getUserByUsername(username);
          const finalUsername = existingUsername ? `${username}_${Date.now().toString(36)}` : username;
          
          // Create new user
          const newUser = await storage.createUser({
            username: finalUsername,
            name,
            email,
            googleId: profile.id,
            googleProfile: profile,
            profilePic: profile.photos?.[0]?.value,
            fitnessGoals: [],
            gymPreferences: []
          });
          
          return done(null, newUser);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate request body
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid registration data", errors: result.error.format() });
      }

      const { username, password, name } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create new user with hashed password
      const user = await storage.createUser({
        username,
        name,
        password: await hashPassword(password),
        fitnessGoals: [],
        gymPreferences: [],
      });

      // Automatically log in the new user
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    // Validate request body
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid login data", errors: result.error.format() });
    }

    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Real Google OAuth Authentication
  app.get("/auth/google", (req, res, next) => {
    console.log("[Google Auth] Starting Google authentication process");
    
    // Get the current hostname from the request to ensure the callback URL matches exactly
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['host'] || req.get('host');
    const fullUrl = `${protocol}://${host}`;
    
    // Create the callback URL directly in the handler, not in the config
    const callbackUrl = `${fullUrl}/auth/google/callback`;
    
    console.log(`[Google Auth] Using callback URL: ${callbackUrl}`);
    
    // Use passport authenticate with the dynamic callback URL
    // Use 'as any' to bypass TypeScript checking because we know this works at runtime
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      callbackURL: callbackUrl,
      prompt: 'select_account'
    } as any)(req, res, next);
  });
  
  // Google OAuth callback route
  app.get("/auth/google/callback", (req, res, next) => {
    console.log("[Google Auth] Received callback from Google OAuth");
    
    // Get the current hostname to use in the authenticate call
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['host'] || req.get('host');
    const fullUrl = `${protocol}://${host}`;
    const callbackUrl = `${fullUrl}/auth/google/callback`;
    
    console.log(`[Google Auth] Processing callback with URL: ${callbackUrl}`);
    
    passport.authenticate('google', {
      callbackURL: callbackUrl,
      failureRedirect: '/auth?error=google-auth-failed'
    } as any, (err: Error | null, user: any, info: any) => {
      if (err) {
        console.error("[Google Auth] Authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.error("[Google Auth] No user returned from authentication");
        return res.redirect('/auth?error=google-auth-failed');
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("[Google Auth] Error during login:", loginErr);
          return next(loginErr);
        }
        
        console.log("[Google Auth] User successfully authenticated");
        return res.redirect('/');
      });
    })(req, res, next);
  });
  
  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Return user without password
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });

  // Update user profile
  app.put("/api/user/profile", (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      // In a real app, you would update the user in the database
      // For this in-memory implementation, we'll need to implement a custom update method
      
      // Here's a simplified implementation for just the profile update
      const updatedUser = {
        ...req.user!,
        ...req.body,
        id: req.user!.id, // Ensure ID stays the same
        username: req.user!.username, // Don't allow username change
        password: req.user!.password, // Don't expose or update password here
        isAdmin: req.user!.isAdmin // Don't allow role change
      };
      
      // Update user in storage
      const userMap = new Map((storage as any).userStore);
      userMap.set(updatedUser.id, updatedUser);
      (storage as any).userStore = userMap;
      
      // Update session
      req.login(updatedUser, (err) => {
        if (err) return next(err);
        
        // Return updated user without password
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });
}
