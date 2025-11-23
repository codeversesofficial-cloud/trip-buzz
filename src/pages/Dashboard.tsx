import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, doc, getDoc, getCountFromServer } from "firebase/firestore";
import { format } from "date-fns";
import { Calendar, MapPin, Users, ShieldCheck, Store, User as UserIcon, TrendingUp, DollarSign } from "lucide-react";

const Dashboard = () => {
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

  // Fetch user roles
  const { data: userRoles } = useQuery({
    queryKey: ["user-roles", userId, userEmail],
    enabled: !!userId && !!userEmail,
    queryFn: async () => {
      console.log("Checking roles for:", userEmail);
      if (!userId) return [];

      // Hardcoded checks for specific emails
      if (userEmail === "sahildhiman034@gmail.com") {
        console.log("Admin email match found");
        return ["admin"];
      }
      if (userEmail === "vendor@gmail.com") {
        console.log("Vendor email match found");
        return ["vendor"];
      }

      const q = query(
        collection(db, "user_roles"),
        where("user_id", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data().role);
    },
  });

  const isAdmin = userRoles?.includes("admin");
  const isVendor = userRoles?.includes("vendor");
  const isUser = !isAdmin && !isVendor; // Default to user if not admin or vendor

  // Fetch bookings for regular users
  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", userId],
    enabled: !!userId && isUser,
    queryFn: async () => {
      if (!userId) return [];

      const bookingsRef = collection(db, "bookings");
      // Remove orderBy to avoid index issues
      const q = query(bookingsRef, where("user_id", "==", userId));

      try {
        const querySnapshot = await getDocs(q);

        const bookingsData = await Promise.all(querySnapshot.docs.map(async (bookingDoc) => {
          const booking = bookingDoc.data();

          // Fetch trip details
          let tripData = {};
          if (booking.trip_id) {
            const tripDoc = await getDoc(doc(db, "trips", booking.trip_id));
            if (tripDoc.exists()) {
              tripData = tripDoc.data();
            }
          }

          // Fetch schedule details
          let scheduleData: any = {};
          if (booking.schedule_id && booking.schedule_id !== "default") {
            const scheduleDoc = await getDoc(doc(db, "trip_schedules", booking.schedule_id));
            if (scheduleDoc.exists()) {
              scheduleData = scheduleDoc.data();
            }
          }

          // Fallback: Use trip dates if schedule dates are missing
          if ((!scheduleData.start_date || !scheduleData.end_date) && tripData.start_date) {
            let endDate = tripData.end_date;

            // Calculate end date from duration if missing
            if (!endDate && tripData.duration_days) {
              const start = new Date(tripData.start_date);
              const end = new Date(start);
              end.setDate(start.getDate() + (Number(tripData.duration_days) - 1)); // -1 because 1 day trip ends on same day
              endDate = end.toISOString();
            }

            scheduleData = {
              ...scheduleData,
              start_date: tripData.start_date,
              end_date: endDate
            };
          }

          return {
            id: bookingDoc.id,
            ...booking,
            trips: tripData,
            trip_schedules: scheduleData
          };
        }));

        // Sort client-side
        return bookingsData.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ) as any[];
      } catch (error) {
        console.error("Error fetching bookings:", error);
        return [];
      }
    },
  });

  // Fetch trips for vendors
  const { data: vendorTrips } = useQuery({
    queryKey: ["vendor-trips", userId],
    enabled: !!userId && isVendor,
    queryFn: async () => {
      if (!userId) return [];

      const tripsRef = collection(db, "trips");
      const q = query(tripsRef, where("vendor_id", "==", userId), orderBy("created_at", "desc"));
      const querySnapshot = await getDocs(q);

      const tripsData = await Promise.all(querySnapshot.docs.map(async (tripDoc) => {
        // Count bookings for this trip
        const bookingsQ = query(collection(db, "bookings"), where("trip_id", "==", tripDoc.id));
        const bookingsCountSnap = await getCountFromServer(bookingsQ);

        const data = tripDoc.data();
        return {
          id: tripDoc.id,
          title: data.title,
          location: data.location,
          max_seats: data.max_seats,
          price_per_person: data.price_per_person,
          is_active: data.is_active,
          bookings: { count: bookingsCountSnap.data().count }
        };
      }));

      return tripsData;
    },
  });

  // Fetch admin stats
  const { data: adminStats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: !!userId && isAdmin,
    queryFn: async () => {
      const usersCount = await getCountFromServer(collection(db, "profiles"));
      const tripsCount = await getCountFromServer(collection(db, "trips"));
      const bookingsCount = await getCountFromServer(collection(db, "bookings"));

      const vendorAppsQ = query(collection(db, "vendor_applications"), where("status", "==", "pending"));
      const vendorAppsCount = await getCountFromServer(vendorAppsQ);

      return {
        totalUsers: usersCount.data().count || 0,
        totalTrips: tripsCount.data().count || 0,
        totalBookings: bookingsCount.data().count || 0,
        pendingVendorApps: vendorAppsCount.data().count || 0,
      };
    },
  });



  // Admin Dashboard
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          </div>

          <div className="mb-8 grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">{adminStats?.totalUsers || 0}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Trips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">{adminStats?.totalTrips || 0}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">{adminStats?.totalBookings || 0}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Vendor Apps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <div className="text-2xl font-bold">{adminStats?.pendingVendorApps || 0}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/admin/users">
                  <Button variant="outline" className="w-full justify-start">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                </Link>
                <Link to="/admin/trips">
                  <Button variant="outline" className="w-full justify-start">
                    <MapPin className="mr-2 h-4 w-4" />
                    Manage Trips
                  </Button>
                </Link>
                <Link to="/admin/bookings">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    Manage Bookings
                  </Button>
                </Link>
                <Link to="/admin/vendors">
                  <Button variant="outline" className="w-full justify-start">
                    <Store className="mr-2 h-4 w-4" />
                    Manage Vendors
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Welcome to the admin dashboard. You have full access to manage users, trips, bookings, and vendor applications.
                </p>
                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-sm font-medium">
                    {adminStats?.pendingVendorApps ?
                      `You have ${adminStats.pendingVendorApps} pending vendor application${adminStats.pendingVendorApps > 1 ? 's' : ''} to review.` :
                      'All vendor applications have been reviewed.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Vendor Dashboard
  if (isVendor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Vendor Dashboard</h1>
            </div>
            <Link to="/vendor/dashboard">
              <Button>
                <MapPin className="mr-2 h-4 w-4" />
                Create New Trip
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>My Trips</CardTitle>
              </CardHeader>
              <CardContent>
                {vendorTrips && vendorTrips.length > 0 ? (
                  <div className="space-y-4">
                    {vendorTrips.map((trip) => (
                      <Link key={trip.id} to={`/trips/${trip.id}`}>
                        <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted">
                          <div className="space-y-1">
                            <h3 className="font-semibold">{trip.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {trip.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {trip.max_seats} seats
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                ₹{trip.price_per_person}
                              </span>
                            </div>
                          </div>
                          <Badge variant={trip.is_active ? "default" : "secondary"}>
                            {trip.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MapPin className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="mb-4 text-lg text-muted-foreground">
                      You haven't created any trips yet
                    </p>
                    <Link to="/vendor/dashboard">
                      <Button>Create Your First Trip</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Regular User Dashboard
  const pendingBookings = bookings?.filter(b => b.booking_status === "pending");
  const upcomingBookings = bookings?.filter(b => b.booking_status === "confirmed");
  const completedBookings = bookings?.filter(b => b.booking_status === "completed");
  const rejectedBookings = bookings?.filter(b => b.booking_status === "rejected");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <UserIcon className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">My Dashboard</h1>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pending ({pendingBookings?.length || 0})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcomingBookings?.length || 0})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedBookings?.length || 0})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedBookings?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {pendingBookings && pendingBookings.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {pendingBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{booking.trips.title}</CardTitle>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          Pending Approval
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        {booking.trips?.location || "Unknown Location"}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        {booking.trip_schedules?.start_date ? format(new Date(booking.trip_schedules.start_date), "MMM dd") : "TBD"} -{" "}
                        {booking.trip_schedules?.end_date ? format(new Date(booking.trip_schedules.end_date), "MMM dd, yyyy") : "TBD"}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        {booking.number_of_people} {booking.number_of_people === 1 ? "person" : "people"}
                      </div>
                      <div className="pt-2 text-2xl font-bold text-primary">
                        ₹{booking.total_amount}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No pending bookings.</div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingBookings && upcomingBookings.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {upcomingBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{booking.trips.title}</CardTitle>
                        <Badge className="bg-green-500 hover:bg-green-600">
                          Upcoming
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        {booking.trips?.location || "Unknown Location"}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        {booking.trip_schedules?.start_date ? format(new Date(booking.trip_schedules.start_date), "MMM dd") : "TBD"} -{" "}
                        {booking.trip_schedules?.end_date ? format(new Date(booking.trip_schedules.end_date), "MMM dd, yyyy") : "TBD"}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        {booking.number_of_people} {booking.number_of_people === 1 ? "person" : "people"}
                      </div>
                      <div className="pt-2 text-2xl font-bold text-primary">
                        ₹{booking.total_amount}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No upcoming trips.</div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedBookings && completedBookings.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {completedBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{booking.trips.title}</CardTitle>
                        <Badge variant="outline" className="border-green-500 text-green-500">
                          Completed
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        {booking.trips?.location || "Unknown Location"}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        {booking.trip_schedules?.start_date ? format(new Date(booking.trip_schedules.start_date), "MMM dd") : "TBD"} -{" "}
                        {booking.trip_schedules?.end_date ? format(new Date(booking.trip_schedules.end_date), "MMM dd, yyyy") : "TBD"}
                      </div>
                      <div className="pt-2 text-2xl font-bold text-muted-foreground">
                        ₹{booking.total_amount}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No completed trips yet.</div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            {rejectedBookings && rejectedBookings.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {rejectedBookings.map((booking) => (
                  <Card key={booking.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{booking.trips.title}</CardTitle>
                        <Badge variant="destructive">
                          Rejected
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        {booking.trips?.location || "Unknown Location"}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        {booking.trip_schedules?.start_date ? format(new Date(booking.trip_schedules.start_date), "MMM dd") : "TBD"} -{" "}
                        {booking.trip_schedules?.end_date ? format(new Date(booking.trip_schedules.end_date), "MMM dd, yyyy") : "TBD"}
                      </div>
                      <div className="pt-2 text-2xl font-bold text-muted-foreground">
                        ₹{booking.total_amount}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No rejected bookings.</div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
