import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, getCountFromServer } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Package, TrendingUp } from "lucide-react";

const VendorDashboard = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.uid);
        setUserEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const { data: isVendor } = useQuery({
    queryKey: ["is-vendor", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Hardcoded check for vendor email
      if (userEmail === "vendor@gmail.com") return true;

      const q = query(
        collection(db, "user_roles"),
        where("user_id", "==", userId),
        where("role", "==", "vendor")
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        navigate("/");
        return false;
      }
      return true;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["vendor-stats", userId],
    enabled: !!userId && isVendor === true,
    queryFn: async () => {
      // 1. Get all trips for this vendor
      const tripsQ = query(collection(db, "trips"), where("vendor_id", "==", userId));
      const tripsSnapshot = await getDocs(tripsQ);
      const trips = tripsSnapshot.docs.map(doc => doc.id);
      const totalTrips = trips.length;

      if (totalTrips === 0) {
        return { totalTrips: 0, totalBookings: 0, totalRevenue: 0 };
      }

      // 2. Get bookings for these trips
      // Since Firestore 'in' query is limited to 10, and we might have more trips,
      // we'll iterate or fetch all bookings if needed. For now, let's iterate per trip
      // which is not optimal but works for migration.
      // Better approach: If we had a vendor_id on bookings, it would be one query.

      let totalBookings = 0;
      let totalRevenue = 0;

      const bookingPromises = trips.map(async (tripId) => {
        const bookingsQ = query(collection(db, "bookings"), where("trip_id", "==", tripId));
        const bookingsSnapshot = await getDocs(bookingsQ);

        bookingsSnapshot.forEach(doc => {
          const data = doc.data();
          totalBookings += 1;
          totalRevenue += Number(data.total_amount || 0);
        });
      });

      await Promise.all(bookingPromises);

      return {
        totalTrips,
        totalBookings,
        totalRevenue,
      };
    },
  });

  if (!isVendor) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Vendor Dashboard</h1>
          <p className="text-muted-foreground">Manage your trips and bookings</p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Trips
              </CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTrips || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bookings
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(stats?.totalRevenue || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => navigate("/vendor/trips/create")}>
            Create New Trip
          </Button>
          <Button variant="outline" onClick={() => navigate("/vendor/trips")}>
            Manage Trips
          </Button>
          <Button variant="outline" onClick={() => navigate("/vendor/bookings")}>
            View Bookings
          </Button>
        </div>
      </main>
    </div>
  );
};

export default VendorDashboard;
