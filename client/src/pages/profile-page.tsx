import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import Navbar from "@/components/layout/navbar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ChevronRight, 
  Edit, 
  Loader2,
  Plus,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Camera
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Schema for profile form validation
const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.string().refine((val) => !isNaN(parseInt(val)), {
    message: "Age must be a number",
  }),
  gender: z.string().min(1, "Gender is required"),
  height: z.string().optional(),
  weight: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, updateProfileMutation } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      age: user?.age?.toString() || "",
      gender: user?.gender || "",
      height: user?.bodyMeasurements ? (user.bodyMeasurements as any).height || "" : "",
      weight: user?.bodyMeasurements ? (user.bodyMeasurements as any).weight || "" : "",
    }
  });
  
  // Fetch saved gyms
  const { 
    data: savedGyms = [],
    isLoading: isLoadingSavedGyms
  } = useQuery<any[]>({
    queryKey: ["/api/saved-gyms"],
    enabled: !!user,
  });
  
  const { toast } = useToast();
  
  // State for add goal/preference dialogs  
  const [newGoal, setNewGoal] = useState("");
  const [newPreference, setNewPreference] = useState("");
  
  // State for dialogs
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isPreferenceDialogOpen, setIsPreferenceDialogOpen] = useState(false);
  
  // Use actual user data instead of sample data
  const fitnessGoals = user?.fitnessGoals || [];
  const gymPreferences = user?.gymPreferences || [];
  
  // State for image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progressPhotos, setProgressPhotos] = useState<string[]>(user?.progressPhotos || []);
  
  // Update local state when user data changes
  useEffect(() => {
    if (user) {
      console.log("User data changed, updating form:", user);
      
      // Update form defaults
      form.reset({
        name: user.name || "",
        age: user.age?.toString() || "",
        gender: user.gender || "",
        height: user.bodyMeasurements ? (user.bodyMeasurements as any).height || "" : "",
        weight: user.bodyMeasurements ? (user.bodyMeasurements as any).weight || "" : "",
      });
      
      // Update progress photos
      setProgressPhotos(user.progressPhotos || []);
    }
  }, [user]);
  
  // Handle adding fitness goals
  const handleAddGoal = () => {
    if (!newGoal.trim()) {
      toast({
        title: "Error",
        description: "Please enter a fitness goal",
        variant: "destructive",
      });
      return;
    }
    
    const updatedGoals = [...fitnessGoals, newGoal.trim()];
    updateGoalsMutation.mutate(updatedGoals);
    setNewGoal("");
    setIsGoalDialogOpen(false);
  };
  
  // Handle adding gym preferences
  const handleAddPreference = () => {
    if (!newPreference.trim()) {
      toast({
        title: "Error",
        description: "Please enter a gym preference",
        variant: "destructive",
      });
      return;
    }
    
    const updatedPreferences = [...gymPreferences, newPreference.trim()];
    updatePreferencesMutation.mutate(updatedPreferences);
    setNewPreference("");
    setIsPreferenceDialogOpen(false);
  };
  
  // Handle photo upload
  const handlePhotoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Process selected photo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('photo', file);
    setIsUploading(true);
    
    uploadPhotoMutation.mutate(formData, {
      onSettled: () => {
        setIsUploading(false);
        if (e.target) {
          e.target.value = '';
        }
      }
    });
  };
  
  // Mutations for updating goals and preferences
  const updateGoalsMutation = useMutation({
    mutationFn: async (newGoals: string[]) => {
      console.log("Updating fitness goals:", newGoals);
      
      // First get the current user data
      const currentUser = queryClient.getQueryData<User>(["/api/user"]);
      console.log("Current user data before update:", currentUser);
      
      // Make a direct call to update just the fitness goals
      const res = await apiRequest("PUT", "/api/user/profile", { 
        fitnessGoals: newGoals 
      });
      
      const updatedUser = await res.json();
      console.log("Server response for fitness goals update:", updatedUser);
      
      // Verify arrays in response
      if (!Array.isArray(updatedUser.fitnessGoals)) {
        console.warn("Server returned non-array for fitnessGoals:", updatedUser.fitnessGoals);
        // Force it to be an array for the client
        updatedUser.fitnessGoals = newGoals;
      }
      
      return updatedUser;
    },
    onSuccess: (updatedUser: User) => {
      // Immediately update the local cache
      const currentUser = queryClient.getQueryData<User>(["/api/user"]);
      if (currentUser) {
        // Ensure we preserve all existing data and just update the goals
        const mergedUser = {
          ...currentUser,
          fitnessGoals: Array.isArray(updatedUser.fitnessGoals) ? updatedUser.fitnessGoals : [],
        };
        console.log("Updating local user data with new goals:", mergedUser);
        queryClient.setQueryData(["/api/user"], mergedUser);
      }
      
      // Do NOT invalidate the query as it can cause timing issues
      // and potentially override our local updates
      
      toast({
        title: "Success",
        description: "Fitness goals updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Error updating fitness goals:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update fitness goals",
        variant: "destructive",
      });
    }
  });
  
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: string[]) => {
      console.log("Updating gym preferences:", newPreferences);
      
      // First get the current user data
      const currentUser = queryClient.getQueryData<User>(["/api/user"]);
      console.log("Current user data before update:", currentUser);
      
      // Make a direct call to update just the gym preferences
      const res = await apiRequest("PUT", "/api/user/profile", { 
        gymPreferences: newPreferences 
      });
      
      const updatedUser = await res.json();
      console.log("Server response for gym preferences update:", updatedUser);
      
      // Verify arrays in response
      if (!Array.isArray(updatedUser.gymPreferences)) {
        console.warn("Server returned non-array for gymPreferences:", updatedUser.gymPreferences);
        // Force it to be an array for the client
        updatedUser.gymPreferences = newPreferences;
      }
      
      return updatedUser;
    },
    onSuccess: (updatedUser: User) => {
      // Immediately update the local cache
      const currentUser = queryClient.getQueryData<User>(["/api/user"]);
      if (currentUser) {
        // Ensure we preserve all existing data and just update the preferences
        const mergedUser = {
          ...currentUser,
          gymPreferences: Array.isArray(updatedUser.gymPreferences) ? updatedUser.gymPreferences : [],
        };
        console.log("Updating local user data with new preferences:", mergedUser);
        queryClient.setQueryData(["/api/user"], mergedUser);
      }
      
      // Do NOT invalidate the query as it can cause timing issues
      // and potentially override our local updates
      
      toast({
        title: "Success",
        description: "Gym preferences updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Error updating gym preferences:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update gym preferences",
        variant: "destructive",
      });
    }
  });
  
  const uploadPhotoMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log("Uploading progress photo");
      const res = await fetch("/api/user/photos", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to upload photo");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Photo uploaded successfully, got URL:", data.url);
      
      // Immediately update the local state to show the photo
      setProgressPhotos(prev => [...prev, data.url]);
      
      // Update the user profile with the new photo URL in the database
      const updatedPhotos = [...(user?.progressPhotos || []), data.url];
      
      // Also immediately update the local cache
      const currentUser = queryClient.getQueryData<User>(["/api/user"]);
      if (currentUser) {
        const mergedUser = {
          ...currentUser,
          progressPhotos: updatedPhotos
        };
        console.log("Updating local user data with new photo:", mergedUser);
        queryClient.setQueryData(["/api/user"], mergedUser);
      }
      
      // Then update the server
      updateProfileMutation.mutate({ progressPhotos: updatedPhotos });
      
      toast({
        title: "Success",
        description: "Progress photo uploaded successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Error uploading photo:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    }
  });
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };
  
  // Start editing profile
  const handleEditProfile = () => {
    setIsEditing(true);
  };
  
  // Save profile changes
  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate({
      name: data.name,
      age: parseInt(data.age),
      gender: data.gender,
      bodyMeasurements: {
        height: data.height,
        weight: data.weight
      }
    }, {
      onSuccess: () => {
        setIsEditing(false);
      }
    });
  };
  
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6">
        <div className="flex flex-col md:flex-row md:space-x-6">
          {/* Profile Information */}
          <div className="md:w-1/3 mb-6 md:mb-0">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <Avatar className="h-32 w-32 mb-4">
                    <AvatarImage src={user.profilePic || undefined} alt={user.name} />
                    <AvatarFallback className="text-3xl bg-primary text-white">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-gray-600 text-sm">Member since {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                  
                  {isEditing ? (
                    <div className="flex mt-4 space-x-2">
                      <Button 
                        className="w-full"
                        onClick={() => setIsEditing(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="w-full"
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="mt-4 w-full"
                      onClick={handleEditProfile}
                    >
                      <Edit className="h-4 w-4 mr-2" /> Edit Profile
                    </Button>
                  )}
                </div>

                <div className="mt-6 border-t border-gray-100 pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Personal Information</h3>
                  
                  {isEditing ? (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" {...form.register("name")} />
                        {form.formState.errors.name && (
                          <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="age">Age</Label>
                        <Input id="age" {...form.register("age")} />
                        {form.formState.errors.age && (
                          <p className="text-red-500 text-xs">{form.formState.errors.age.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Input id="gender" {...form.register("gender")} />
                        {form.formState.errors.gender && (
                          <p className="text-red-500 text-xs">{form.formState.errors.gender.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="height">Height</Label>
                        <Input id="height" {...form.register("height")} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="weight">Weight</Label>
                        <Input id="weight" {...form.register("weight")} />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Age:</span>
                        <span className="text-gray-900 font-medium">{user.age || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Gender:</span>
                        <span className="text-gray-900 font-medium">{user.gender || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Height:</span>
                        <span className="text-gray-900 font-medium">{user.bodyMeasurements ? (user.bodyMeasurements as any).height || "-" : "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Weight:</span>
                        <span className="text-gray-900 font-medium">{user.bodyMeasurements ? (user.bodyMeasurements as any).weight || "-" : "-"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="md:w-2/3">
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Fitness Goals</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {fitnessGoals.map((goal, index) => (
                    <Badge 
                      key={index} 
                      className="bg-primary/10 text-primary-dark text-sm px-3 py-1 rounded-full hover:bg-primary/20 group relative"
                    >
                      {goal}
                      <button 
                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Remove this goal
                          const updatedGoals = fitnessGoals.filter((_, i) => i !== index);
                          updateGoalsMutation.mutate(updatedGoals);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-full">
                        <Plus className="h-4 w-4 mr-1" /> Add Goal
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add Fitness Goal</DialogTitle>
                        <DialogDescription>
                          Add a new fitness goal to your profile. What do you want to achieve?
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="goal">Fitness Goal</Label>
                          <Input 
                            id="goal" 
                            placeholder="e.g., Build 10lbs of muscle" 
                            value={newGoal}
                            onChange={(e) => setNewGoal(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={handleAddGoal}
                          disabled={updateGoalsMutation.isPending}
                        >
                          {updateGoalsMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Add Goal
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <h3 className="font-bold text-gray-900 mb-4 mt-6">Gym Preferences</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {gymPreferences.map((pref, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full hover:bg-gray-200 group relative"
                    >
                      {pref}
                      <button 
                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Remove this preference
                          const updatedPreferences = gymPreferences.filter((_, i) => i !== index);
                          updatePreferencesMutation.mutate(updatedPreferences);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Dialog open={isPreferenceDialogOpen} onOpenChange={setIsPreferenceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-full">
                        <Plus className="h-4 w-4 mr-1" /> Add Preference
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add Gym Preference</DialogTitle>
                        <DialogDescription>
                          Add a new gym preference to help us find the perfect match for you.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="preference">Gym Preference</Label>
                          <Input 
                            id="preference" 
                            placeholder="e.g., Olympic weightlifting equipment" 
                            value={newPreference}
                            onChange={(e) => setNewPreference(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={handleAddPreference}
                          disabled={updatePreferencesMutation.isPending}
                        >
                          {updatePreferencesMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Add Preference
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <h3 className="font-bold text-gray-900 mb-4 mt-6">Progress Photos</h3>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="grid grid-cols-3 gap-3">
                  {progressPhotos.map((photo, index) => (
                    <div key={index} className="w-full h-24 border rounded-md overflow-hidden relative group">
                      <img 
                        src={photo} 
                        alt={`Progress photo ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                        <button 
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-1 rounded-full"
                          onClick={() => {
                            // Remove this photo
                            const updatedPhotos = [...progressPhotos];
                            updatedPhotos.splice(index, 1);
                            const userData = { progressPhotos: updatedPhotos };
                            
                            updateProfileMutation.mutate(userData, {
                              onSuccess: () => {
                                setProgressPhotos(updatedPhotos);
                                toast({
                                  title: "Success",
                                  description: "Photo removed successfully",
                                });
                              }
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                    <Button 
                      variant="ghost" 
                      className="flex flex-col items-center h-full w-full text-gray-500"
                      onClick={handlePhotoUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Plus className="h-6 w-6" />
                      )}
                      <span className="text-xs mt-1">Add Photo</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-6 pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold">Saved Gyms</CardTitle>
                  <Button variant="link" className="text-primary text-sm p-0 h-auto">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                {isLoadingSavedGyms ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : savedGyms.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">You haven't saved any gyms yet.</p>
                    <Button variant="link" className="text-primary mt-2">
                      Browse gyms to save
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedGyms.map((saved) => (
                      <div key={saved.id} className="flex items-center">
                        <img 
                          src={`https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&q=80`}
                          className="w-16 h-16 rounded-md object-cover mr-3"
                          alt={saved.gym.name}
                        />
                        <div className="flex-grow">
                          <h4 className="font-medium text-gray-900">{saved.gym.name}</h4>
                          <p className="text-gray-500 text-xs">Saved on {new Date(saved.savedAt).toLocaleDateString()}</p>
                        </div>
                        <Badge className="bg-green-100 text-success">
                          {saved.matchScore}% Match
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Add a Save Profile button that's always visible at the bottom of the page */}
            {!isEditing && (
              <Card className="mt-6 bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <h3 className="font-bold text-gray-900">Save Your Profile Data</h3>
                    <p className="text-gray-600 text-sm">
                      Click the button below to save all your profile data to ensure it's never lost.
                    </p>
                    <Button 
                      className="mt-2"
                      onClick={() => {
                        // Save the entire profile with current data to ensure persistence
                        const userData = {
                          name: user.name,
                          age: user.age,
                          gender: user.gender,
                          bodyMeasurements: user.bodyMeasurements,
                          fitnessGoals: user.fitnessGoals,
                          gymPreferences: user.gymPreferences,
                          progressPhotos: user.progressPhotos
                        };
                        
                        updateProfileMutation.mutate(userData, {
                          onSuccess: () => {
                            toast({
                              title: "Success",
                              description: "Your profile data has been saved successfully.",
                              variant: "default"
                            });
                          },
                          onError: (error) => {
                            toast({
                              title: "Error",
                              description: error.message || "Failed to save profile data",
                              variant: "destructive"
                            });
                          }
                        });
                      }}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Profile Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}
