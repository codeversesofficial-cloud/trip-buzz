import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Wallet,
  History,
  Settings,
  LogOut,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDrawer = ({ open, onOpenChange }: ProfileDrawerProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);

  // Fetch user profile and role
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const user = auth.currentUser;
      setSession({ user });

      if (!user) return null;

      const docRef = doc(db, "profiles", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    },
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["user-role", session?.user?.uid, session?.user?.email],
    enabled: !!session?.user?.uid,
    queryFn: async () => {
      if (!session?.user?.uid) return false;

      // Hardcoded check for admin
      if (session?.user?.email === "sahildhiman034@gmail.com") return true;

      const q = query(
        collection(db, "user_roles"),
        where("user_id", "==", session.user.uid),
        where("role", "==", "admin")
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    },
  });

  const { data: isVendor } = useQuery({
    queryKey: ["is-vendor", session?.user?.uid, session?.user?.email],
    enabled: !!session?.user?.uid,
    queryFn: async () => {
      if (!session?.user?.uid) return false;

      // Hardcoded check for vendor
      if (session?.user?.email === "vendor@gmail.com") return true;

      const q = query(
        collection(db, "user_roles"),
        where("user_id", "==", session.user.uid),
        where("role", "==", "vendor")
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    },
  });

  const handleSignOut = async () => {
    await auth.signOut();
    navigate("/");
    onOpenChange(false);
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const menuItems = [
    {
      icon: User,
      label: "Profile",
      onClick: () => {
        navigate("/profile");
        onOpenChange(false);
      },
    },
    {
      icon: Wallet,
      label: "Wallet",
      onClick: () => {
        navigate("/wallet");
        onOpenChange(false);
      },
    },
    {
      icon: History,
      label: "Trip History",
      onClick: () => {
        navigate("/dashboard");
        onOpenChange(false);
      },
    },
    {
      icon: Settings,
      label: "Settings",
      onClick: () => {
        navigate("/settings");
        onOpenChange(false);
      },
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Profile Menu</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Profile Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile?.full_name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{profile?.full_name || "User"}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>

          <Separator />

          {/* Admin Control Panel */}
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  navigate("/admin/dashboard");
                  onOpenChange(false);
                }}
                className="flex w-full items-center justify-between rounded-lg bg-primary/10 p-4 transition-colors hover:bg-primary/20"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-medium text-primary">Control Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-primary" />
              </button>
              <Separator />
            </>
          )}

          {/* Vendor Dashboard */}
          {isVendor && !isAdmin && (
            <>
              <button
                onClick={() => {
                  navigate("/vendor/dashboard");
                  onOpenChange(false);
                }}
                className="flex w-full items-center justify-between rounded-lg bg-accent/50 p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-foreground" />
                  <span className="font-medium">Vendor Dashboard</span>
                </div>
                <ChevronRight className="h-5 w-5" />
              </button>
              <Separator />
            </>
          )}

          {/* Become a Vendor */}
          {!isVendor && !isAdmin && (
            <>
              <button
                onClick={() => {
                  navigate("/vendor/register");
                  onOpenChange(false);
                }}
                className="flex w-full items-center justify-between rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Become a Vendor</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <Separator />
            </>
          )}

          {/* Menu Items */}
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex w-full items-center space-x-3 rounded-lg p-3 transition-colors hover:bg-accent"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <Separator />

          {/* Logout Button */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
