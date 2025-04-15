import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  MoreHorizontal, 
  UserX, 
  UserCheck,
  Shield, 
  User as UserIcon, 
  Loader2, 
  ChevronDown,
  Ban
} from "lucide-react";
import { format } from "date-fns";

export default function UsersManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [banUserId, setbanUserId] = useState<number | null>(null);

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Ban/unban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: number, action: "ban" | "unban" }) => {
      // Implement actual API call to ban/unban user
      const res = await apiRequest("PUT", `/api/admin/users/${userId}/${action}`, {
        status: action === "ban" ? "banned" : "active"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setbanUserId(null);
      toast({
        title: "Success",
        description: "User status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update user status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      // Make API call to delete user and get the response
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`, {});
      return response.json().catch(() => ({})); // Handle both JSON and non-JSON responses
    },
    onSuccess: (data) => {
      console.log('Delete user response:', data);
      
      // Refresh the user list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      // Reset delete state
      setDeleteUserId(null);
      
      // Show success toast
      toast({
        title: "Success",
        description: "User has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Delete user error:', error);
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filter users based on search query and filter status
  const filteredUsers = users.filter(user => {
    const matchesSearch = (
      (user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.username?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    // Filter by status
    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "admin") return matchesSearch && !!user.isAdmin;
    if (filterStatus === "banned") return matchesSearch && (!!user.isBanned || user.status === "banned");
    return matchesSearch;
  });

  // Confirm ban/unban user
  const confirmBanUser = () => {
    if (banUserId !== null) {
      // For demo purposes we're using "ban" action
      banUserMutation.mutate({ userId: banUserId, action: "ban" });
    }
  };

  // Confirm delete user
  const confirmDeleteUser = () => {
    if (deleteUserId !== null) {
      deleteUserMutation.mutate(deleteUserId);
    }
  };

  // Check if user is an admin
  const isUserAdmin = (user: User) => {
    return user.isAdmin;
  };

  // Format date as "MMM d, yyyy"
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage all users in the system</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  {filterStatus === "all" && "All Users"}
                  {filterStatus === "admin" && "Admins Only"}
                  {filterStatus === "banned" && "Banned Users"}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter Users</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                  All Users
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("admin")}>
                  Admins Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("banned")}>
                  Banned Users
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No users found matching your search criteria.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          {user.profilePic ? (
                            <img
                              src={user.profilePic}
                              alt={user.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <UserIcon className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{user.name || "Unnamed User"}</div>
                          {user.fitnessGoals && user.fitnessGoals.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Goals: {user.fitnessGoals.slice(0, 2).join(", ")}
                              {user.fitnessGoals.length > 2 && "..."}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      {isUserAdmin(user) ? (
                        <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                          <Shield className="h-3 w-3 mr-1" /> Admin
                        </Badge>
                      ) : user.isBanned || user.status === "banned" ? (
                        <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">
                          <Ban className="h-3 w-3 mr-1" /> Banned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setbanUserId(user.id)}
                            disabled={isUserAdmin(user)}
                            className={isUserAdmin(user) ? "text-gray-400" : "text-orange-600"}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Ban User
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteUserId(user.id)}
                            disabled={isUserAdmin(user)}
                            className={isUserAdmin(user) ? "text-gray-400" : "text-red-600"}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Ban User Confirmation Dialog */}
        <AlertDialog open={banUserId !== null} onOpenChange={() => setbanUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ban this user?</AlertDialogTitle>
              <AlertDialogDescription>
                This will prevent the user from logging in and using the application. 
                You can unban them later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmBanUser}
                className="bg-orange-500 hover:bg-orange-600"
                disabled={banUserMutation.isPending}
              >
                {banUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserX className="h-4 w-4 mr-2" />
                )}
                Ban User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete User Confirmation Dialog */}
        <AlertDialog open={deleteUserId !== null} onOpenChange={() => setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user
                account and all associated data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                className="bg-red-500 hover:bg-red-600"
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
