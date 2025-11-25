import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Mountain, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { ProfileDrawer } from "./ProfileDrawer";
import { NotificationBell } from "./NotificationBell";

export const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orgSettings, setOrgSettings] = useState<{ light_logo?: string; company_name?: string }>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const docRef = doc(db, "organization_settings", "profile");
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setOrgSettings(doc.data());
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center space-x-2">
            {orgSettings.light_logo ? (
              <img src={orgSettings.light_logo} alt="Logo" className="h-10 w-auto object-contain" />
            ) : (
              <Mountain className="h-8 w-8 text-primary" />
            )}
            <span className="text-2xl font-bold">{orgSettings.company_name || "TripBuzz"}</span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link to="/trips" className="font-medium hover:text-primary">
              Trips
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="font-medium hover:text-primary">
                  Dashboard
                </Link>
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDrawerOpen(true)}
                  className="hover:bg-accent"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button>Login</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <ProfileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
};
