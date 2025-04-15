import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Gym, insertGymSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  MapPin, 
  Star,
  Upload 
} from "lucide-react";

// Extended schema with validation for admin form
const gymFormSchema = insertGymSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  locationAddress: z.string().min(5, "Address must be at least 5 characters"),
  locationLat: z.string().refine((val) => !isNaN(parseFloat(val)), {
    message: "Latitude must be a number",
  }),
  locationLng: z.string().refine((val) => !isNaN(parseFloat(val)), {
    message: "Longitude must be a number",
  }),
  amenitiesString: z.string(),
  rating: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 5, {
    message: "Rating must be a number between 0 and 5",
  }),
});

type GymFormValues = z.infer<typeof gymFormSchema>;

export default function GymsManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [deleteGymId, setDeleteGymId] = useState<number | null>(null);

  // Fetch all gyms
  const { data: gyms = [], isLoading } = useQuery<Gym[]>({
    queryKey: ["/api/gyms"],
  });

  // Create form
  const form = useForm<GymFormValues>({
    resolver: zodResolver(gymFormSchema),
    defaultValues: {
      name: "",
      locationAddress: "",
      locationLat: "",
      locationLng: "",
      amenitiesString: "",
      rating: "0",
    },
  });

  // Create gym mutation
  const createGymMutation = useMutation({
    mutationFn: async (data: GymFormValues) => {
      console.log("Adding gym with data:", data);
      
      // Handle empty amenitiesString
      const amenitiesArray = data.amenitiesString.trim() 
        ? data.amenitiesString.split(",").map(item => item.trim()).filter(Boolean)
        : [];
      
      const gymData = {
        name: data.name,
        location: {
          address: data.locationAddress,
          lat: parseFloat(data.locationLat),
          lng: parseFloat(data.locationLng),
        },
        amenities: amenitiesArray,
        rating: parseFloat(data.rating),
        images: [] // Explicitly provide empty images array
      };
      
      console.log("Transformed gym data:", gymData);

      try {
        // Make the API request
        const res = await fetch("/api/gyms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(gymData),
          credentials: "include"
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error("API error:", errorData);
          throw new Error(errorData.message || "Failed to create gym");
        }
        
        return await res.json();
      } catch (error) {
        console.error("Create gym error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Gym created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/gyms"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Gym has been created successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to create gym: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update gym mutation
  const updateGymMutation = useMutation({
    mutationFn: async (data: GymFormValues & { id: number }) => {
      const { id, ...formData } = data;
      const gymData = {
        name: formData.name,
        location: {
          address: formData.locationAddress,
          lat: parseFloat(formData.locationLat),
          lng: parseFloat(formData.locationLng),
        },
        amenities: formData.amenitiesString.split(",").map(item => item.trim()).filter(Boolean),
        rating: parseFloat(formData.rating),
      };

      const res = await apiRequest("PUT", `/api/gyms/${id}`, gymData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gyms"] });
      setIsEditDialogOpen(false);
      setSelectedGym(null);
      toast({
        title: "Success",
        description: "Gym has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update gym: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete gym mutation
  const deleteGymMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/gyms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gyms"] });
      setDeleteGymId(null);
      toast({
        title: "Success",
        description: "Gym has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete gym: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission for creating a new gym
  const onSubmitCreate = (data: GymFormValues) => {
    console.log("Form submitted with data:", data);
    
    // Create proper gym data structure from form values
    const gymData = {
      name: data.name,
      location: {
        address: data.locationAddress,
        lat: parseFloat(data.locationLat),
        lng: parseFloat(data.locationLng)
      },
      amenities: data.amenitiesString.trim() 
        ? data.amenitiesString.split(',').map(item => item.trim()) 
        : [],
      rating: parseFloat(data.rating) || 0,
      images: []
    };
    
    console.log("Submitting gym data:", gymData);
    
    // Send directly with fetch instead of using the mutation
    fetch("/api/gyms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(gymData),
      credentials: "include"
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(err.message || "Failed to create gym");
        });
      }
      return response.json();
    })
    .then(newGym => {
      console.log("Gym created successfully:", newGym);
      queryClient.invalidateQueries({ queryKey: ["/api/gyms"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Gym has been created successfully",
      });
    })
    .catch(error => {
      console.error("Error creating gym:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create gym",
        variant: "destructive",
      });
    });
  };

  // Handle form submission for updating a gym
  const onSubmitUpdate = (data: GymFormValues) => {
    if (selectedGym) {
      updateGymMutation.mutate({ ...data, id: selectedGym.id });
    }
  };

  // Handle edit button click
  const handleEditGym = (gym: Gym) => {
    setSelectedGym(gym);
    form.reset({
      name: gym.name,
      locationAddress: gym.location.address,
      locationLat: gym.location.lat.toString(),
      locationLng: gym.location.lng.toString(),
      amenitiesString: gym.amenities ? gym.amenities.join(", ") : "",
      rating: gym.rating ? gym.rating.toString() : "0",
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteGym = (id: number) => {
    setDeleteGymId(id);
  };

  // Confirm delete gym
  const confirmDeleteGym = () => {
    if (deleteGymId !== null) {
      deleteGymMutation.mutate(deleteGymId);
    }
  };

  // Filter gyms based on search query
  const filteredGyms = gyms.filter(gym => 
    gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gym.location.address.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // CSV upload mutation
  const uploadCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/gyms/upload-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to upload CSV');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gyms"] });
      toast({
        title: "CSV Import Successful",
        description: `Successfully imported ${data.imported} gyms.${data.errors > 0 ? ` ${data.errors} rows had errors.` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "CSV Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle CSV file upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadCsvMutation.mutate(file);
      // Reset file input so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  // Initialize add gym form
  const handleAddGym = () => {
    form.reset({
      name: "",
      locationAddress: "",
      locationLat: "",
      locationLng: "",
      amenitiesString: "",
      rating: "0",
    });
    setIsAddDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Gyms Management</CardTitle>
            <CardDescription>Manage all gyms in the system</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search gyms..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddGym}>
                <Plus className="h-4 w-4 mr-2" /> Add Gym
              </Button>
              <Button 
                variant="outline" 
                onClick={handleUploadClick}
                disabled={uploadCsvMutation.isPending}
              >
                {uploadCsvMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import CSV
              </Button>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredGyms.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No gyms found matching your search criteria.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Amenities</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGyms.map((gym) => (
                  <TableRow key={gym.id}>
                    <TableCell className="font-medium">{gym.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="truncate max-w-[250px]">{gym.location.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" />
                        <span>{gym.rating?.toFixed(1) || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="truncate max-w-[250px]">
                        {gym.amenities?.join(", ") || "None"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEditGym(gym)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the gym "{gym.name}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteGym(gym.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add Gym Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Add New Gym</DialogTitle>
              <DialogDescription>
                Enter the details for the new gym to add to the system.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  console.log("Form submitted directly");
                  const formData = form.getValues();
                  onSubmitCreate(formData);
                }} 
                className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gym Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Fitness Evolution" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Location</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="locationAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St, City, State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="locationLat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude</FormLabel>
                            <FormControl>
                              <Input placeholder="47.6062" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="locationLng"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude</FormLabel>
                            <FormControl>
                              <Input placeholder="-122.3321" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="amenitiesString"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amenities</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="24/7 Access, Personal Training, Pool" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Separate multiple amenities with commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (0-5)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="5" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    disabled={createGymMutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log("Add Gym button clicked");
                      const formData = form.getValues();
                      console.log("Form data:", formData);
                      onSubmitCreate(formData);
                    }}
                  >
                    {createGymMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Gym
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Gym Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Edit Gym</DialogTitle>
              <DialogDescription>
                Update the details for {selectedGym?.name}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitUpdate)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gym Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Location</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="locationAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="locationLat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="locationLng"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="amenitiesString"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amenities</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormDescription>
                        Separate multiple amenities with commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (0-5)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="5" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateGymMutation.isPending}>
                    {updateGymMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Edit2 className="h-4 w-4 mr-2" />
                    )}
                    Update Gym
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteGymId !== null} onOpenChange={() => setDeleteGymId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the gym
                and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteGym}
                className="bg-red-500 hover:bg-red-600"
                disabled={deleteGymMutation.isPending}
              >
                {deleteGymMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* CSV Bulk Upload UI */}
        <div className="mt-4 p-4 border border-dashed rounded-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium mb-1">Bulk Import Gyms</h3>
              <p className="text-xs text-gray-500">
                Upload a CSV file with gym data to add multiple gyms at once. CSV must include columns for name, address, latitude, longitude, rating, and amenities.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleUploadClick}
              disabled={uploadCsvMutation.isPending}
            >
              {uploadCsvMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload CSV
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
