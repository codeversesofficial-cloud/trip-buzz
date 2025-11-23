import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc, addDoc } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const BookingsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.uid);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const bookingsRef = collection(db, "bookings");
      const q = query(bookingsRef, orderBy("created_at", "desc"));
      const querySnapshot = await getDocs(q);

      const bookingsData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
        const booking = docSnapshot.data();
        const bookingId = docSnapshot.id;

        // Fetch related data manually since Firestore is NoSQL
        let profileData: any = {};
        let tripData: any = {};
        let scheduleData: any = {};

        if (booking.user_id) {
          // Assuming user profile is stored in 'users' collection or 'profiles'
          // The original code used 'profiles' table.
          const userDoc = await getDoc(doc(db, "users", booking.user_id));
          if (userDoc.exists()) {
            profileData = userDoc.data();
          }
        }

        if (booking.trip_id) {
          const tripDoc = await getDoc(doc(db, "trips", booking.trip_id));
          if (tripDoc.exists()) {
            tripData = tripDoc.data();
          }
        }

        // Assuming trip_schedule_id is in booking
        if (booking.trip_schedule_id) {
          const scheduleDoc = await getDoc(doc(db, "trip_schedules", booking.trip_schedule_id));
          if (scheduleDoc.exists()) {
            scheduleData = scheduleDoc.data();
          }
        }

        return {
          id: bookingId,
          ...booking,
          profiles: { full_name: profileData.full_name || "Unknown", email: profileData.email || "Unknown" },
          trips: { title: tripData.title || "Unknown", location: tripData.location || "Unknown" },
          trip_schedules: { start_date: scheduleData.start_date, end_date: scheduleData.end_date }
        };
      }));

      return bookingsData;
    },
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ bookingId, status, userId, tripTitle }: { bookingId: string; status: string; userId?: string; tripTitle?: string }) => {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { booking_status: status });

      // Send notification to user
      if (userId) {
        let title = "Booking Update";
        let message = `Your booking status has been updated to ${status}.`;

        if (status === "confirmed") {
          title = "Booking Approved!";
          message = `Your booking for ${tripTitle} has been approved! Get ready for your adventure.`;
        } else if (status === "rejected") {
          title = "Booking Rejected";
          message = `Your booking for ${tripTitle} has been rejected. Please contact support for more info.`;
        } else if (status === "completed") {
          title = "Trip Completed";
          message = `Your trip ${tripTitle} has been marked as completed. We hope you had a great time!`;
        }

        await addDoc(collection(db, "notifications"), {
          user_id: userId,
          title: title,
          message: message,
          type: "booking_update",
          is_read: false,
          link: "/dashboard",
          created_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast({
        title: "Booking updated",
        description: "Booking status has been successfully updated and user notified.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update booking status.",
      });
    }
  });

  interface Booking {
    id: string;
    booking_status: string;
    payment_method: string;
    number_of_people: number;
    total_amount: number;
    user_id: string;
    trip_id: string;
    trip_schedule_id: string;
    profiles?: { full_name: string; email: string };
    trips?: { title: string; location: string };
    trip_schedules?: { start_date: any; end_date: any };
  }

  const confirmedBookings = bookings?.filter((b: Booking) => b.booking_status === "confirmed");
  const pendingBookings = bookings?.filter((b: Booking) => b.booking_status === "pending");
  const rejectedBookings = bookings?.filter((b: Booking) => b.booking_status === "rejected");

  const BookingsTable = ({ data }: { data: Booking[] }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Trip</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>People</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((booking: any) => (
            <TableRow key={booking.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{booking.profiles?.full_name || "N/A"}</p>
                  <p className="text-sm text-muted-foreground">{booking.profiles?.email}</p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{booking.trips?.title}</p>
                  <p className="text-sm text-muted-foreground">{booking.trips?.location}</p>
                </div>
              </TableCell>
              <TableCell>
                {booking.trip_schedules?.start_date &&
                  format(booking.trip_schedules.start_date.toDate ? booking.trip_schedules.start_date.toDate() : new Date(booking.trip_schedules.start_date), "MMM dd, yyyy")}
              </TableCell>
              <TableCell>{booking.number_of_people}</TableCell>
              <TableCell className="font-semibold">₹{(booking.total_amount || 0).toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={booking.payment_method === "cod" ? "outline" : "default"}>
                  {booking.payment_method === "cod" ? "COD" : "Online"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    booking.booking_status === "confirmed"
                      ? "default"
                      : booking.booking_status === "rejected"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {booking.booking_status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  {booking.booking_status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          updateBookingStatus.mutate({
                            bookingId: booking.id,
                            status: "confirmed",
                            userId: booking.user_id,
                            tripTitle: booking.trips?.title || "Trip"
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          updateBookingStatus.mutate({
                            bookingId: booking.id,
                            status: "rejected",
                            userId: booking.user_id,
                            tripTitle: booking.trips?.title || "Trip"
                          })
                        }
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {booking.booking_status === "confirmed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateBookingStatus.mutate({
                          bookingId: booking.id,
                          status: "completed",
                          userId: booking.user_id,
                          tripTitle: booking.trips?.title || "Trip"
                        })
                      }
                    >
                      Mark Completed
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Bookings Management</h1>
          <p className="text-muted-foreground">Manage all bookings on the platform</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All ({bookings?.length || 0})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({pendingBookings?.length || 0})</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed ({confirmedBookings?.length || 0})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({bookings?.filter(b => b.booking_status === "completed").length || 0})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedBookings?.length || 0})</TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="py-8 text-center">Loading bookings...</div>
              ) : (
                <>
                  <TabsContent value="all">
                    <BookingsTable data={bookings || []} />
                  </TabsContent>
                  <TabsContent value="pending">
                    <BookingsTable data={pendingBookings || []} />
                  </TabsContent>
                  <TabsContent value="confirmed">
                    <BookingsTable data={confirmedBookings || []} />
                  </TabsContent>
                  <TabsContent value="completed">
                    <BookingsTable data={bookings?.filter(b => b.booking_status === "completed") || []} />
                  </TabsContent>
                  <TabsContent value="rejected">
                    <BookingsTable data={rejectedBookings || []} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default BookingsManagement;
