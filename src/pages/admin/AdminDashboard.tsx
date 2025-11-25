import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  ShoppingBag,
  DollarSign,
  Store,
  Mountain,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { Activity, Bell, Calendar, UserPlus } from "lucide-react";

const RecentActivityFeed = () => {
  const { data: activities = [] } = useQuery({
    queryKey: ["admin-activities"],
    queryFn: async () => {
      const activitiesRef = collection(db, "activities");
      const q = query(activitiesRef, limit(10));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      // Client-side sort
      return data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (activities.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No recent activity</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
          <div className="rounded-full bg-primary/10 p-2 mt-1">
            {activity.type === 'booking' ? (
              <ShoppingBag className="h-4 w-4 text-primary" />
            ) : activity.type === 'vendor_application' ? (
              <Store className="h-4 w-4 text-primary" />
            ) : (
              <Activity className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{activity.message}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");

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

  const { data: isAdmin, isLoading: isAdminLoading } = useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Hardcoded check for the specific admin email
      if (userEmail === "sahildhiman034@gmail.com") {
        return true;
      }

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", userId), where("role", "==", "admin"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        navigate("/");
        return false;
      }
      return true;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [usersSnap, bookingsSnap, tripsSnap, vendorsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "trips")),
        getDocs(query(collection(db, "users"), where("role", "==", "vendor"))),
      ]);

      const totalRevenue = bookingsSnap.docs.reduce((sum, doc) => sum + Number(doc.data().total_amount || 0), 0);

      return {
        totalUsers: usersSnap.docs.filter(doc => doc.data().role !== 'vendor').length || 0,
        totalBookings: bookingsSnap.size || 0,
        totalRevenue,
        totalVendors: vendorsSnap.size || 0,
        totalTrips: tripsSnap.size || 0,
      };
    },
  });

  const { data: revenueData } = useQuery({
    queryKey: ["revenue-chart", timeRange],
    queryFn: async () => {
      const bookingsSnap = await getDocs(collection(db, "bookings"));
      const data = bookingsSnap.docs.map(doc => doc.data());

      // Group by month for demo
      const monthlyData: Record<string, number> = {};
      data.forEach((booking) => {
        if (booking.created_at) {
          const date = booking.created_at.toDate ? booking.created_at.toDate() : new Date(booking.created_at);
          const month = date.toLocaleString("default", { month: "short" });
          monthlyData[month] = (monthlyData[month] || 0) + Number(booking.total_amount || 0);
        }
      });

      return Object.entries(monthlyData).map(([month, amount]) => ({
        month,
        revenue: amount,
      }));
    },
  });

  const { data: locationData } = useQuery({
    queryKey: ["location-data"],
    queryFn: async () => {
      const bookingsSnap = await getDocs(collection(db, "bookings"));
      // Note: In a real app, you'd likely want to fetch trip details for each booking
      // or store location in the booking document. 
      // For now, assuming we might need to fetch trips separately or it's in booking.

      // Simplified for migration: counting bookings per trip location if available
      // This part might need adjustment based on actual data structure
      const locations: Record<string, number> = {};

      // Fetch all trips to map IDs to locations if needed, or assume location is on booking
      const tripsSnap = await getDocs(collection(db, "trips"));
      const tripLocations: Record<string, string> = {};
      tripsSnap.forEach(doc => {
        tripLocations[doc.id] = doc.data().location;
      });

      bookingsSnap.forEach((doc) => {
        const data = doc.data();
        const tripId = data.trip_id;
        const loc = tripLocations[tripId];

        if (loc) locations[loc] = (locations[loc] || 0) + 1;
      });

      return Object.entries(locations)
        .map(([location, count]) => ({ location, bookings: count }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5);
    },
  });

  if (isAdminLoading) return <div>Loading...</div>;
  if (!isAdmin) return null;

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      trend: "+23.08%",
      isPositive: true,
    },
    {
      title: "Total Bookings",
      value: stats?.totalBookings || 0,
      icon: ShoppingBag,
      trend: "+11.43%",
      isPositive: true,
    },
    {
      title: "Total Revenue",
      value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      trend: "+8.48%",
      isPositive: true,
    },
    {
      title: "Total Vendors",
      value: stats?.totalVendors || 0,
      icon: Store,
      trend: "+100%",
      isPositive: true,
    },
    {
      title: "Total Trips",
      value: stats?.totalTrips || 0,
      icon: Mountain,
      trend: "+0%",
      isPositive: false,
    },
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your trip booking platform</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate("/admin/trips")}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Manage Trips
            </button>
            <button
              onClick={() => navigate("/admin/bookings")}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Manage Bookings
            </button>
            <button
              onClick={() => navigate("/admin/users")}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Manage Users
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat) => (
            <Card key={stat.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="rounded-lg bg-primary/10 p-2">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="mt-1 flex items-center text-xs">
                  {stat.isPositive ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.isPositive ? "text-green-500" : "text-red-500"}>
                    {stat.trend}
                  </span>
                  <span className="ml-1 text-muted-foreground">Since last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Chart */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Overview</CardTitle>
              <Tabs value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                <TabsList>
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Revenue (₹)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Location Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Destinations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={locationData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="location" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bookings" fill="hsl(var(--primary))" name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityFeed />
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;
