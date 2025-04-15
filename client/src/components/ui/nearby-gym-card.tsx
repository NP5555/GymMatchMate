import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Gym } from "@shared/schema";

interface NearbyGymCardProps {
  gym: Gym & { 
    matchScore?: number;
    distance?: string;
  };
  onClick?: () => void;
}

export function NearbyGymCard({ gym, onClick }: NearbyGymCardProps) {
  // Function to generate mock placeholder image URL for each gym
  const getGymImageUrl = (gym: Gym): string => {
    const imageIndex = gym.id % 3; // Use gym ID to get a consistent image for each gym
    const imageIds = [
      "1558611848-73f7eb4001a1",
      "1580086319619-3ed498161c77", 
      "1593079831268-3381b0db4a77"
    ];
    
    return `https://images.unsplash.com/photo-${imageIds[imageIndex]}?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80`;
  };

  // Generate an approximate distance if not provided
  // Use a general area description rather than exact distance
  const distance = gym.distance || `Nearby (within ${(gym.id % 5) + 2} mile radius)`;

  return (
    <div 
      className="flex items-center py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <img 
        src={getGymImageUrl(gym)} 
        alt={gym.name}
        className="w-16 h-16 rounded-md object-cover mr-4"
      />
      <div className="flex-grow">
        <h3 className="font-medium text-gray-900">{gym.name}</h3>
        <p className="text-gray-500 text-sm">{distance}</p>
        <div className="flex items-center mt-1">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm text-gray-600 ml-1">{gym.rating?.toFixed(1)}</span>
          </div>
          <span className="mx-2 text-gray-300">•</span>
          <span className="text-gray-600 text-sm">{gym.amenities?.length ? '$$' : '$'}</span>
        </div>
      </div>
      {gym.matchScore && (
        <Badge className="bg-gray-100 text-primary hover:bg-gray-100 font-medium">
          {gym.matchScore}% Match
        </Badge>
      )}
    </div>
  );
}
