import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Users, User as UserIcon, Calendar, AtSign, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
  
  // Fetch users data
  const { data: users = [], isLoading, error } = useQuery<Partial<User>[]>({
    queryKey: ["/api/users"],
    retry: false,
  });
  
  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    
    return (
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fitnessGoals?.some(goal => 
        goal.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      user.gymPreferences?.some(pref => 
        pref.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-4 md:py-8 pb-20 md:pb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Community Members</h2>
          <div className="flex items-center text-gray-500">
            <Users className="mr-2 h-5 w-5" />
            <span>{users.length} members</span>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Input
              placeholder="Search members by name or fitness interests..."
              className="w-full p-3 pl-10 bg-white rounded-lg shadow text-gray-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
          </div>
        </div>
        
        {/* Users grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Failed to load users data</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 inline-flex rounded-full p-4 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
            <p className="text-gray-600">
              Try adjusting your search or check back later for new members.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map(user => (
              <Card key={user.id} className="overflow-hidden h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-r from-primary-500 to-primary-300 flex items-center justify-center text-white text-xl font-bold">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <CardTitle>{user.name}</CardTitle>
                      <CardDescription>
                        Member since {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {user.fitnessGoals && user.fitnessGoals.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-600 mb-2">Fitness Goals</h3>
                      <div className="flex flex-wrap gap-2">
                        {user.fitnessGoals.map((goal, index) => (
                          <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {user.gymPreferences && user.gymPreferences.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-600 mb-2">Gym Preferences</h3>
                      <div className="flex flex-wrap gap-2">
                        {user.gymPreferences.map((pref, index) => (
                          <Badge key={index} variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
                            {pref}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t bg-gray-50 py-3 px-6 flex justify-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-primary"
                    onClick={() => setSelectedUser(user)}
                  >
                    View Profile
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      
      {/* User Profile Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              View detailed information about this community member
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-r from-primary-500 to-primary-300 flex items-center justify-center text-white text-4xl font-bold">
                    {selectedUser.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  
                  <h2 className="text-xl font-bold text-center">{selectedUser.name}</h2>
                  
                  <div className="flex items-center text-gray-500 text-sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Member since {new Date(selectedUser.createdAt || new Date()).toLocaleDateString()}</span>
                  </div>
                  
                  {selectedUser.username && (
                    <div className="flex items-center text-gray-500 text-sm">
                      <AtSign className="h-4 w-4 mr-1" />
                      <span>{selectedUser.username}</span>
                    </div>
                  )}
                  
                  <div className="w-full mt-4">
                    <Button className="w-full" size="sm">
                      Send Message
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <div className="space-y-6">
                  {/* Personal Info */}
                  <div>
                    <h3 className="text-lg font-semibold flex items-center mb-2">
                      <UserIcon className="h-5 w-5 mr-2 text-primary" />
                      Personal Information
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-sm text-gray-500">Age</p>
                          <p className="font-medium">{selectedUser.age || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Gender</p>
                          <p className="font-medium">{selectedUser.gender || "Not specified"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Fitness Goals */}
                  <div>
                    <h3 className="text-lg font-semibold flex items-center mb-2">
                      <Activity className="h-5 w-5 mr-2 text-primary" />
                      Fitness Goals
                    </h3>
                    
                    {selectedUser.fitnessGoals && selectedUser.fitnessGoals.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.fitnessGoals.map((goal, index) => (
                          <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No fitness goals specified</p>
                    )}
                  </div>
                  
                  {/* Gym Preferences */}
                  <div>
                    <h3 className="text-lg font-semibold flex items-center mb-2">
                      <Activity className="h-5 w-5 mr-2 text-primary" />
                      Gym Preferences
                    </h3>
                    
                    {selectedUser.gymPreferences && selectedUser.gymPreferences.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.gymPreferences.map((pref, index) => (
                          <Badge key={index} variant="outline" className="bg-green-50 text-green-700">
                            {pref}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No gym preferences specified</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      
      <MobileNav />
    </div>
  );
}