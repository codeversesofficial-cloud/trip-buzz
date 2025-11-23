import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    ShoppingBag,
    Store,
    Mountain,
    LogOut,
    Menu,
    X,
    List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/integrations/firebase/client";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, writeBatch, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/NotificationBell";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [unreadBookings, setUnreadBookings] = useState(false);
    const [unreadVendors, setUnreadVendors] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!userId) return;

        const q = query(
            collection(db, "notifications"),
            where("user_id", "==", userId),
            where("is_read", "==", false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let hasBookings = false;
            let hasVendors = false;

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.type === 'booking') hasBookings = true;
                if (data.type === 'vendor_application') hasVendors = true;
            });

            setUnreadBookings(hasBookings);
            setUnreadVendors(hasVendors);
        });

        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        const markAsRead = async () => {
            if (!userId) return;

            let type = "";
            if (location.pathname === "/admin/bookings") type = "booking";
            else if (location.pathname === "/admin/vendors") type = "vendor_application";

            if (!type) return;

            const q = query(
                collection(db, "notifications"),
                where("user_id", "==", userId),
                where("is_read", "==", false),
                where("type", "==", type)
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) return;

            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { is_read: true });
            });

            await batch.commit();
        };

        markAsRead();
    }, [location.pathname, userId]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/auth");
            toast({
                title: "Logged out",
                description: "You have been successfully logged out.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to log out.",
            });
        }
    };

    const navItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
        { icon: Mountain, label: "Trips", path: "/admin/trips" },
        { icon: ShoppingBag, label: "Bookings", path: "/admin/bookings", hasNotification: unreadBookings },
        { icon: Users, label: "Users", path: "/admin/users" },
        { icon: Store, label: "Vendors", path: "/admin/vendors", hasNotification: unreadVendors },
        { icon: List, label: "Catalog", path: "/admin/categories" },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Sidebar Toggle */}
            <div className="lg:hidden p-4 border-b flex items-center justify-between">
                <span className="font-bold text-xl">TripBuzz Admin</span>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <X /> : <Menu />}
                </Button>
            </div>

            <div className="flex">
                {/* Sidebar */}
                <aside
                    className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                        } fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-200 ease-in-out lg:translate-x-0`}
                >
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b hidden lg:block">
                            <h1 className="text-2xl font-bold text-primary">TripBuzz Admin</h1>
                        </div>

                        <nav className="flex-1 p-4 space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link key={item.path} to={item.path}>
                                        <Button
                                            variant={isActive ? "secondary" : "ghost"}
                                            className="w-full justify-start relative"
                                        >
                                            <Icon className="mr-2 h-4 w-4" />
                                            {item.label}
                                            {item.hasNotification && (
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-red-600" />
                                            )}
                                        </Button>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="p-4 border-t">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <header className="h-16 border-b flex items-center justify-end px-8 bg-background">
                        <NotificationBell />
                    </header>
                    <main className="flex-1 p-8 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
};
