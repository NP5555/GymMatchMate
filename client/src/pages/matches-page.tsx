import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gym } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import MobileNav from "@/components/layout/mobile-nav";
import { GymCard } from "@/components/ui/gym-card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const filters = ["All Matches", "Highly Rated", "Nearby", "Recently Added", "My Favorites"];

export default function MatchesPage() {
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [activeFilter, setActiveFilter] = useState("All Matches");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch matches
  const { 
    data: matchedGyms = [], 
    isLoading 
  } = useQuery<(Gym & { matchScore: number })[]>({
    queryKey: ["/api/matches"],
  });
  
  // Fetch saved gyms
  const { 
    data: savedGyms = [],
    isLoading: isLoadingSavedGyms
  } = useQuery<{ gymId: number, gym?: Gym }[]>({
    queryKey: ["/api/saved-gyms"],
  });
  
  // Get IDs of saved gyms
  const savedGymIds = savedGyms.map(sg => sg.gymId);
  
  // Filter matches based on active filter and search query
  const filteredGyms = matchedGyms.filter(gym => {
    const matchesSearch = searchQuery === "" || 
      gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (gym.location as any)?.address?.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;
    
    switch (activeFilter) {
      case "Highly Rated":
        return gym.rating && gym.rating >= 4.5;
      case "Nearby":
        // In a real app, this would use actual geospatial data
        return true; 
      case "Recently Added":
        // In a real app, this would check the gym's creation date
        return true;
      case "My Favorites":
        // Show only gyms that are in the user's saved gyms
        return savedGymIds.includes(gym.id);
      default:
        return true;
    }
  });
  
  // Handler for opening gym details
  const handleOpenGymDetails = (gym: Gym) => {
    setSelectedGym(gym);
  };
  
  // Handler for closing gym details
  const handleCloseGymDetails = () => {
    setSelectedGym(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your Gym Matches</h2>
        
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Input
              placeholder="Search matches..."
              className="w-full p-3 pl-10 bg-white rounded-lg shadow text-gray-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "outline"}
              className={`whitespace-nowrap ${activeFilter === filter ? 'bg-primary text-white' : 'bg-white text-gray-700 shadow'}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
        
        {/* Matches grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredGyms.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 inline-flex rounded-full p-4 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-600">
              Try adjusting your search filters or check back later for new gyms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGyms.map((gym) => (
              <GymCard 
                key={gym.id} 
                gym={gym} 
                onClick={() => handleOpenGymDetails(gym)}
              />
            ))}
          </div>
        )}
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
                  <span className="font-semibold">{Math.floor(80 + Math.random() * 15)}% Match</span> with your fitness preferences
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
                <Button className="w-full bg-primary mb-2">
                  Message Gym
                </Button>
                <Button variant="outline" className="w-full">
                  Save to Favorites
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
