import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Booking = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [numberOfPeople, setNumberOfPeople] = useState<number | "">(1);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
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

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      if (!tripId) return null;
      const docRef = doc(db, "trips", tripId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) throw new Error("Trip not found");
      return { id: docSnap.id, ...docSnap.data() } as any;
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ["trip-schedules", tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const schedulesRef = collection(db, "trip_schedules");
      const q = query(
        schedulesRef,
        where("trip_id", "==", tripId),
        where("is_active", "==", true),
        where("start_date", ">=", new Date().toISOString().split("T")[0])
      );

      const querySnapshot = await getDocs(q);
      let schedulesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      // Sort manually since we can't easily do multiple orderBys with inequality filter without index
      schedulesData.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      return schedulesData;
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !trip) {
        throw new Error("Missing required information");
      }

      const peopleCount = numberOfPeople === "" ? 1 : numberOfPeople;
      const totalAmount = trip.price_per_person * peopleCount;

      const bookingData = {
        user_id: userId,
        trip_id: tripId,
        schedule_id: selectedScheduleId || "default", // Use "default" if no schedule selected (fallback)
        number_of_people: peopleCount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: paymentMethod === "cod" ? "pending" : "confirmed",
        booking_status: "pending",
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "bookings"), bookingData);

      // Update available seats ONLY if a real schedule was selected
      if (selectedScheduleId && selectedScheduleId !== "default") {
        const schedule = schedules?.find((s) => s.id === selectedScheduleId);
        if (schedule) {
          const scheduleRef = doc(db, "trip_schedules", selectedScheduleId);
          await updateDoc(scheduleRef, { available_seats: schedule.available_seats - peopleCount });
        }
      }

      // Create notifications for admins
      const usersRef = collection(db, "users");
      const adminIds = new Set<string>();

      try {
        // Query for users with role 'admin'
        const roleQuery = query(usersRef, where("role", "==", "admin"));
        const roleSnapshot = await getDocs(roleQuery);
        roleSnapshot.docs.forEach(doc => adminIds.add(doc.id));

        // Query for users with 'admin' in roles array
        const rolesArrayQuery = query(usersRef, where("roles", "array-contains", "admin"));
        const rolesArraySnapshot = await getDocs(rolesArrayQuery);
        rolesArraySnapshot.docs.forEach(doc => adminIds.add(doc.id));

        // Query for the specific admin email
        const emailQuery = query(usersRef, where("email", "==", "sahildhiman034@gmail.com"));
        const emailSnapshot = await getDocs(emailQuery);
        emailSnapshot.docs.forEach(doc => adminIds.add(doc.id));

        console.log("Found admins for notification:", Array.from(adminIds));
      } catch (error) {
        console.error("Error finding admins:", error);
      }

      if (adminIds.size === 0) {
        console.warn("No admins found to notify!");
      }

      const notificationsBatch = Array.from(adminIds).map(adminId => {
        return addDoc(collection(db, "notifications"), {
          user_id: adminId,
          title: "New Booking Request",
          message: `New booking for ${trip.title} by ${peopleCount} people. Amount: ₹${totalAmount}`,
          type: "booking", // Changed to match AdminLayout listener
          is_read: false,
          link: "/admin/bookings",
          created_at: new Date().toISOString()
        });
      });

      // Add to global activity log
      notificationsBatch.push(
        addDoc(collection(db, "activities"), {
          type: "booking",
          message: `New booking for ${trip.title} (${peopleCount} people)`,
          amount: bookingData.total_amount,
          created_at: new Date().toISOString(),
          link: "/admin/bookings"
        })
      );

      await Promise.all(notificationsBatch);
      console.log("Notifications sent to admins");

      return docRef.id;
    },
    onSuccess: () => {
      toast({
        title: "Booking Successful!",
        description: "Your trip has been booked successfully.",
      });
      navigate("/payment-success");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error.message,
      });
    },
  });

  const handleBooking = () => {
    // If schedules exist, require selection. If not, we use default.
    if (schedules && schedules.length > 0 && !selectedScheduleId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a date",
      });
      return;
    }

    if (numberOfPeople === "" || numberOfPeople < 1) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter at least 1 person",
      });
      return;
    }

    bookingMutation.mutate();
  };

  if (!trip) return null;

  const totalAmount = trip.price_per_person * (numberOfPeople === "" ? 0 : numberOfPeople);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">Book Your Trip</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Trip Details</CardTitle>
              </CardHeader>
              <CardContent>
                <h2 className="mb-2 text-2xl font-bold">{trip.title}</h2>
                <p className="text-muted-foreground">{trip.location}</p>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="schedule">Select Date</Label>
                  {schedules && schedules.length > 0 ? (
                    <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                      <SelectTrigger id="schedule">
                        <SelectValue placeholder="Choose a date" />
                      </SelectTrigger>
                      <SelectContent>
                        {schedules.map((schedule) => (
                          <SelectItem key={schedule.id} value={schedule.id}>
                            {format(new Date(schedule.start_date), "MMM dd")} -{" "}
                            {format(new Date(schedule.end_date), "MMM dd, yyyy")} ({schedule.available_seats} seats left)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 border rounded-md bg-muted/50 text-sm text-muted-foreground">
                      Trip Date: {trip.start_date ? format(new Date(trip.start_date), "MMMM dd, yyyy") : "Date TBD"}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="people">Number of People</Label>
                  <Input
                    id="people"
                    type="number"
                    min="1"
                    max={trip.max_seats}
                    value={numberOfPeople}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") setNumberOfPeople("");
                      else setNumberOfPeople(parseInt(val));
                    }}
                    onBlur={() => {
                      if (numberOfPeople === "" || numberOfPeople < 1) setNumberOfPeople(1);
                    }}
                  />
                </div>

                <div>
                  <Label>Payment Method</Label>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod">Cash on Delivery (Pay at Meeting Point)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="online" id="online" />
                      <Label htmlFor="online">Online Payment</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Price per person</span>
                  <span>₹{trip.price_per_person.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Number of people</span>
                  <span>{numberOfPeople}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total Amount</span>
                    <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  disabled={bookingMutation.isPending || (schedules && schedules.length > 0 && !selectedScheduleId)}
                >
                  {bookingMutation.isPending ? "Processing..." : "Confirm Booking"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Booking;
