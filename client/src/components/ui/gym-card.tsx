import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoIcon, Star, StarHalf } from "lucide-react";
import { Gym } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

interface GymCardProps {
  gym: Gym & { matchScore?: number };
  onClick?: () => void;
}

export function GymCard({ gym, onClick }: GymCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  
  // Check if gym is saved
  const { data: savedGyms = [] } = useQuery<{ gymId: number }[]>({
    queryKey: ["/api/saved-gyms"],
  });
  
  const isSaved = savedGyms.some(savedGym => savedGym.gymId === gym.id);
  
  // Save gym mutation
  const saveGymMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/saved-gyms", { gymId: gym.id });
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
      const res = await apiRequest("DELETE", `/api/saved-gyms/${gym.id}`, {});
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
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening details
    
    if (isSaving) return;
    
    setIsSaving(true);
    if (isSaved) {
      removeFromFavoritesMutation.mutate();
    } else {
      saveGymMutation.mutate();
    }
  };
  
  // Function to generate mock placeholder image URL for each gym
  const getGymImageUrl = (gym: Gym): string => {
    const imageIndex = gym.id % 5; // Use gym ID to get a consistent image for each gym
    const imageIds = [
      "1534438327276-14e5300c3a48",
      "1571902943202-507ec2618e8f", 
      "1540497077202-7c8a3999166f", 
      "1517836357463-d25dfeac3438",
      "1580086319619-3ed498161c77"
    ];
    
    return `https://images.unsplash.com/photo-${imageIds[imageIndex]}?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80`;
  };

  // Rating stars display
  const renderRatingStars = (rating: number = 0) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        ))}
        {hasHalfStar && <StarHalf className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
        {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
          <Star key={i + fullStars + (hasHalfStar ? 1 : 0)} className="h-4 w-4 text-gray-300" />
        ))}
        <span className="text-xs text-gray-600 ml-1">
          ({Math.round(rating * 10)})</span>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg gym-card">
      {gym.matchScore && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            {gym.matchScore}% Match
          </Badge>
        </div>
      )}
      
      <div className="h-48 w-full">
        <img 
          src={getGymImageUrl(gym)} 
          alt={gym.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-gray-900">{gym.name}</h3>
        </div>
        
        <p className="text-gray-600 text-sm mt-1">
          {(gym.location as any)?.address || 'Location information unavailable'}
        </p>
        
        <div className="mt-2">
          {renderRatingStars(gym.rating || 0)}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {gym.amenities?.slice(0, 3).map((amenity, index) => (
            <Badge key={index} variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
              {amenity}
            </Badge>
          ))}
        </div>
        
        <div className="mt-4 flex justify-between">
          <Button 
            onClick={onClick} 
            className="flex-1 mr-2 bg-primary hover:bg-primary/90 text-white"
          >
            <InfoIcon className="h-4 w-4 mr-1" /> Details
          </Button>
          <Button 
            variant="outline" 
            className={`border-primary px-2 ${isSaved ? 'text-red-500 bg-red-50' : 'text-primary'}`}
            onClick={handleToggleFavorite}
            disabled={isSaving}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill={isSaved ? "currentColor" : "none"} 
              viewBox="0 0 24 24" 
              strokeWidth={1.5} 
              stroke="currentColor" 
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
