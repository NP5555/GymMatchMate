import { Link, useLocation } from "wouter";
import { Home, Dumbbell, User, MessageSquare, Users } from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 z-10 md:hidden">
      <div className="flex justify-around">
        <Link href="/">
          <a className={`py-2 px-4 flex flex-col items-center ${location === '/' ? 'text-primary' : 'text-gray-500'}`}>
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </a>
        </Link>
        <Link href="/matches">
          <a className={`py-2 px-4 flex flex-col items-center ${location === '/matches' ? 'text-primary' : 'text-gray-500'}`}>
            <Dumbbell className="h-5 w-5" />
            <span className="text-xs mt-1">Matches</span>
          </a>
        </Link>
        <Link href="/users">
          <a className={`py-2 px-4 flex flex-col items-center ${location === '/users' ? 'text-primary' : 'text-gray-500'}`}>
            <Users className="h-5 w-5" />
            <span className="text-xs mt-1">Community</span>
          </a>
        </Link>
        <Link href="/profile">
          <a className={`py-2 px-4 flex flex-col items-center ${location === '/profile' ? 'text-primary' : 'text-gray-500'}`}>
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Profile</span>
          </a>
        </Link>
      </div>
    </nav>
  );
}
