import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Dumbbell, ChevronDown, LogOut, User, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <header className="bg-white sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Dumbbell className="text-primary h-6 w-6 mr-2" />
          <h1 className="text-xl font-bold text-primary-dark">GymMatch</h1>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/">
            <a className={`${location === '/' ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary transition-colors'}`}>
              Home
            </a>
          </Link>
          <Link href="/matches">
            <a className={`${location === '/matches' ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary transition-colors'}`}>
              Matches
            </a>
          </Link>
          
          <Link href="/users">
            <a className={`${location === '/users' ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary transition-colors'}`}>
              Community
            </a>
          </Link>
          
          {user.isAdmin && (
            <Link href="/admin">
              <a className={`${location.startsWith('/admin') ? 'text-primary font-medium' : 'text-gray-600 hover:text-primary transition-colors'}`}>
                Admin
              </a>
            </Link>
          )}
          
          <div className="relative ml-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profilePic || undefined} alt={user.name} />
                    <AvatarFallback className="bg-primary text-white">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <a className="flex w-full cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <a className="flex w-full cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>
    </header>
  );
}
