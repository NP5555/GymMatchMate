import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { RegisterData, LoginData, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  updateProfileMutation: UseMutationResult<User, Error, Partial<User>>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back!",
        description: `You are now logged in as ${user.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Account created!",
        description: "Your account has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      console.log("Updating profile with data:", userData);
      
      // Make sure we're sending array data correctly
      const sanitizedData = { ...userData };
      
      // Ensure arrays are properly handled
      if ('fitnessGoals' in sanitizedData) {
        sanitizedData.fitnessGoals = Array.isArray(sanitizedData.fitnessGoals) 
          ? sanitizedData.fitnessGoals 
          : [];
      }
      
      if ('gymPreferences' in sanitizedData) {
        sanitizedData.gymPreferences = Array.isArray(sanitizedData.gymPreferences)
          ? sanitizedData.gymPreferences
          : [];
      }
      
      if ('progressPhotos' in sanitizedData) {
        sanitizedData.progressPhotos = Array.isArray(sanitizedData.progressPhotos)
          ? sanitizedData.progressPhotos
          : [];
      }
      
      console.log("Sending sanitized data to server:", sanitizedData);
      const res = await apiRequest("PUT", "/api/user/profile", sanitizedData);
      const updatedUser = await res.json();
      console.log("Server returned updated user data:", updatedUser);
      return updatedUser;
    },
    onSuccess: (updatedUser: User) => {
      // Update the cache with the returned user data
      const currentUser = queryClient.getQueryData<User>(["/api/user"]);
      
      // Ensure all array fields are properly initialized, even if they came back as null from server
      const ensuredUpdatedUser = {
        ...updatedUser,
        fitnessGoals: Array.isArray(updatedUser.fitnessGoals) ? updatedUser.fitnessGoals : [],
        gymPreferences: Array.isArray(updatedUser.gymPreferences) ? updatedUser.gymPreferences : [],
        progressPhotos: Array.isArray(updatedUser.progressPhotos) ? updatedUser.progressPhotos : []
      };
      
      // Merge the updated user data with current user data
      // This ensures we don't lose any fields that weren't included in the update
      const mergedUser = currentUser ? {
        ...currentUser,
        ...ensuredUpdatedUser
      } : ensuredUpdatedUser;
      
      console.log("Updating local cache with merged user data:", mergedUser);
      queryClient.setQueryData(["/api/user"], mergedUser);
      
      // Do NOT force a refetch as it can cause issues with timing
      // and potentially override our local changes
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateProfileMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
