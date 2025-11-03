import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, Compass, Users, PenSquare, User, Bell, LogOut } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";

import { toast } from "sonner";

export function Navigation() {
  const navigate = useNavigate();
  const [user, setUser] = useState<ReturnType<typeof auth.currentUser> | null>(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-bold">
            Hiver
          </Link>
          <div className="hidden gap-3 sm:flex">
            <Link to="/discover" className="text-sm opacity-80 hover:opacity-100">
              Discover
            </Link>
            <Link to="/connections" className="text-sm opacity-80 hover:opacity-100">
              Connections
            </Link>
            <Link to="/feed" className="text-sm opacity-80 hover:opacity-100">
              Feed
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/create-hive">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Create Hive
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="outline" size="sm">
                  Profile
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}