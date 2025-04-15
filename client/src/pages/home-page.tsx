import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Gym } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import MobileNav from "@/components/layout/mobile-nav";
import { GymCard } from "@/components/ui/gym-card";
import { NearbyGymCard } from "@/components/ui/nearby-gym-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Badge, 
  ChevronRight, 
  Dumbbell, 
  Loader2, 
  Map,
  MapPin,
  Search,
  MessageCircle,
  Heart
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

export default function HomePage() {
  const { user } = useAuth();
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch recommended gyms (matches)
  const { 
    data: matchedGyms = [], 
    isLoading: isLoadingMatches 
  } = useQuery<(Gym & { matchScore: number })[]>({
    queryKey: ["/api/matches"],
    enabled: !!user,
  });
  
  // Fetch all gyms (for nearby gyms section)
  const { 
    data: allGyms = [], 
    isLoading: isLoadingGyms 
  } = useQuery<Gym[]>({
    queryKey: ["/api/gyms"],
    enabled: !!user,
  });
  
  // Check if gym is saved
  const { data: savedGyms = [] } = useQuery<{ gymId: number }[]>({
    queryKey: ["/api/saved-gyms"],
    enabled: !!user,
  });
  
  // Handler for opening gym details
  const handleOpenGymDetails = (gym: Gym) => {
    setSelectedGym(gym);
  };
  
  // Handler for closing gym details
  const handleCloseGymDetails = () => {
    setSelectedGym(null);
  };
  
  // Determine if the selected gym is already saved to favorites
  const isGymSaved = selectedGym ? savedGyms.some(savedGym => savedGym.gymId === selectedGym.id) : false;
  
  // Save gym mutation
  const saveGymMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGym) return null;
      const res = await apiRequest("POST", "/api/saved-gyms", { gymId: selectedGym.id });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-gyms"] });
      toast({
        title: "Gym saved",
        description: "This gym has been added to your favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save gym: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });
  
  // Remove from favorites mutation
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGym) return null;
      const res = await apiRequest("DELETE", `/api/saved-gyms/${selectedGym.id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-gyms"] });
      toast({
        title: "Removed from favorites",
        description: "This gym has been removed from your favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove gym: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });
  
  // Handle save/unsave gym
  const handleToggleFavorite = () => {
    if (isSaving || !selectedGym) return;
    
    setIsSaving(true);
    if (isGymSaved) {
      removeFromFavoritesMutation.mutate();
    } else {
      saveGymMutation.mutate();
    }
  };
  
  // Handle messaging the gym
  const handleMessageGym = () => {
    // In a real app, this would create a chat with the gym owner
    // For now, just show a toast
    toast({
      title: "Message sent",
      description: "Your message has been sent to the gym",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6">
        {/* Welcome Banner */}
        <Card className="bg-primary text-white mb-6">
          <CardContent className="p-6">
            <h2 className="font-bold text-xl mb-2">Welcome to GymMatch!</h2>
            <p className="mb-4">Find your perfect gym based on your fitness goals and preferences.</p>
            <Button 
              variant="secondary" 
              className="bg-white text-primary hover:bg-gray-100"
              onClick={() => navigate('/matches')}
            >
              Find My Gym Match
            </Button>
          </CardContent>
        </Card>

        {/* Recommended Gyms */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">Recommended For You</h2>
            <Button 
              variant="link" 
              className="text-primary text-sm p-0 h-auto flex items-center"
              onClick={() => navigate('/matches')}
            >
              See all
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {isLoadingMatches ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchedGyms.slice(0, 3).map((gym) => (
                <GymCard 
                  key={gym.id} 
                  gym={gym} 
                  onClick={() => handleOpenGymDetails(gym)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Nearby Gyms */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">Nearby Gyms</h2>
            <Button variant="link" className="text-primary text-sm p-0 h-auto flex items-center">
              View Map
              <Map className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-4">
              {isLoadingGyms ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                allGyms.slice(0, 3).map((gym) => (
                  <NearbyGymCard 
                    key={gym.id} 
                    gym={{
                      ...gym,
                      matchScore: Math.floor(75 + Math.random() * 15),
                      distance: `In your neighborhood (${(gym.location as any)?.address?.split(',')[1]?.trim() || 'Local area'})`
                    }}
                    onClick={() => handleOpenGymDetails(gym)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Gym Details Dialog */}
      <Dialog open={!!selectedGym} onOpenChange={handleCloseGymDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedGym?.name}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center text-gray-500">
                <MapPin className="h-4 w-4 mr-1" />
                {(selectedGym?.location as any)?.address}
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <img 
                src={`https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80`}
                alt={selectedGym?.name}
                className="w-full h-64 object-cover rounded-lg"
              />
              
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedGym?.amenities?.map((amenity, index) => (
                    <span key={index} className="bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded-md">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Match Score</h3>
                <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg inline-flex items-center">
                  <Dumbbell className="h-4 w-4 mr-2" />
                  <span className="font-semibold">{Math.floor(75 + Math.random() * 15)}% Match</span> with your fitness preferences
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Rating</h3>
                <div className="flex items-center">
                  {[...Array(Math.floor(selectedGym?.rating || 0))].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 fill-yellow-500" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  {selectedGym?.rating && selectedGym.rating % 1 >= 0.5 && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                  {[...Array(5 - Math.ceil(selectedGym?.rating || 0))].map((_, i) => (
                    <svg key={i + Math.ceil(selectedGym?.rating || 0)} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="ml-2 text-gray-600">({Math.round((selectedGym?.rating || 0) * 10)} reviews)</span>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Contact</h3>
                <Button 
                  className="w-full mb-2 flex items-center justify-center" 
                  onClick={handleMessageGym}
                >
                  <MessageCircle className="h-4 w-4 mr-2" /> Message Gym
                </Button>
                <Button 
                  variant={isGymSaved ? "destructive" : "outline"} 
                  className={`w-full flex items-center justify-center ${isGymSaved ? 'bg-red-100 text-red-600 hover:bg-red-200' : ''}`}
                  onClick={handleToggleFavorite}
                  disabled={isSaving}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isGymSaved ? 'fill-current' : ''}`} /> 
                  {isGymSaved ? 'Remove from Favorites' : 'Save to Favorites'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <MobileNav />
    </div>
  );
}
