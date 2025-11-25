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
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Booking = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [trip, setTrip] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [numberOfPeople, setNumberOfPeople] = useState<number | "">(1);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [userId, setUserId] = useState<string | null>(null);
  const [travelers, setTravelers] = useState<{ name: string; age: string; gender: string; phone: string; aadhaar: string }[]>([]);
  const [realTimeSeats, setRealTimeSeats] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        // Redirect to login if not authenticated
        navigate("/auth");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchTrip = async () => {
      if (!tripId) return;
      try {
        const docRef = doc(db, "trips", tripId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTrip({ id: docSnap.id, ...docSnap.data() });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Trip not found",
          });
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching trip:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load trip details",
        });
      }
    };
    fetchTrip();
  }, [tripId, navigate, toast]);

  useEffect(() => {
    if (numberOfPeople === "" || numberOfPeople < 1) {
      setTravelers([]);
      return;
    }
    setTravelers(prev => {
      const newTravelers = [...prev];
      if (newTravelers.length < numberOfPeople) {
        for (let i = newTravelers.length; i < numberOfPeople; i++) {
          newTravelers.push({ name: "", age: "", gender: "male", phone: "", aadhaar: "" });
        }
      } else if (newTravelers.length > numberOfPeople) {
        newTravelers.length = numberOfPeople;
      }
      return newTravelers;
    });
  }, [numberOfPeople]);

  useEffect(() => {
    if (!tripId) return;

    const schedulesRef = collection(db, "trip_schedules");
    const q = query(
      schedulesRef,
      where("trip_id", "==", tripId),
      where("is_active", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const seats: Record<string, number> = {};
      const today = new Date().toISOString().split("T")[0];
      const schedulesList: any[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.start_date >= today) {
          seats[doc.id] = data.available_seats;
          schedulesList.push({ id: doc.id, ...data });
        }
      });

      setRealTimeSeats(seats);
      setSchedules(schedulesList);

      // Auto-select the first schedule if there's only one and none is selected
      if (schedulesList.length === 1 && !selectedScheduleId) {
        setSelectedScheduleId(schedulesList[0].id);
      }
    });

    return () => unsubscribe();
  }, [tripId]);

  const handleTravelerChange = (index: number, field: string, value: string) => {
    const newTravelers = [...travelers];
    (newTravelers[index] as any)[field] = value;
    setTravelers(newTravelers);
  };

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !trip) {
        throw new Error("Missing required information");
      }

      // Validate traveler details
      travelers.forEach((traveler, index) => {
        if (!traveler.name || !traveler.age || !traveler.gender) {
          throw new Error(`Please fill in all details for Traveler ${index + 1}`);
        }
        // Mandatory fields for Traveler 1 (Index 0)
        if (index === 0) {
          if (!traveler.phone) throw new Error("Phone number is mandatory for Traveler 1");
          if (!traveler.aadhaar) throw new Error("Aadhaar number is mandatory for Traveler 1");
        }
      });

      const peopleCount = numberOfPeople === "" ? 1 : numberOfPeople;
      const totalAmount = trip.price_per_person * peopleCount;

      const bookingData = {
        user_id: userId,
        trip_id: tripId,
        schedule_id: selectedScheduleId || "default",
        number_of_people: peopleCount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: paymentMethod === "cod" ? "pending" : "confirmed",
        booking_status: "pending",
        travelers: travelers,
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "bookings"), bookingData);

      if (selectedScheduleId && selectedScheduleId !== "default") {
        const currentSeats = realTimeSeats[selectedScheduleId];
        if (currentSeats < peopleCount) {
          throw new Error("Not enough seats available!");
        }
        const scheduleRef = doc(db, "trip_schedules", selectedScheduleId);
        await updateDoc(scheduleRef, { available_seats: currentSeats - peopleCount });
      }

      // Create notifications for admins
      const usersRef = collection(db, "users");
      const adminIds = new Set<string>();

      try {
        const roleQuery = query(usersRef, where("role", "==", "admin"));
        const roleSnapshot = await getDocs(roleQuery);
        roleSnapshot.docs.forEach(doc => adminIds.add(doc.id));

        const rolesArrayQuery = query(usersRef, where("roles", "array-contains", "admin"));
        const rolesArraySnapshot = await getDocs(rolesArrayQuery);
        rolesArraySnapshot.docs.forEach(doc => adminIds.add(doc.id));

        // Fetch admin email from organization settings
        const orgSettingsRef = doc(db, "organization_settings", "profile");
        const orgSettingsSnap = await getDoc(orgSettingsRef);
        const adminEmail = orgSettingsSnap.exists() ? orgSettingsSnap.data().email : "sahildhiman034@gmail.com";

        if (adminEmail) {
          const emailQuery = query(usersRef, where("email", "==", adminEmail));
          const emailSnapshot = await getDocs(emailQuery);
          emailSnapshot.docs.forEach(doc => adminIds.add(doc.id));
        }
      } catch (error) {
        console.error("Error finding admins:", error);
      }

      const notificationsBatch = Array.from(adminIds).map(adminId => {
        return addDoc(collection(db, "notifications"), {
          user_id: adminId,
          title: "New Booking Request",
          message: `New booking for ${trip.title} by ${peopleCount} people. Amount: ₹${totalAmount}`,
          type: "booking",
          is_read: false,
          link: "/admin/bookings",
          created_at: new Date().toISOString()
        });
      });

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
                            {format(new Date(schedule.end_date), "MMM dd, yyyy")} ({realTimeSeats[schedule.id] ?? schedule.available_seats} seats left)
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

                {/* Traveler Details Form */}
                <div className="space-y-4 mt-4">
                  <h3 className="font-semibold">Traveler Details</h3>
                  {travelers.map((traveler, index) => (
                    <div key={index} className="p-4 border rounded-md space-y-4">
                      <div className="font-medium text-sm text-muted-foreground">Traveler {index + 1} {index === 0 && "(Primary Contact)"}</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`name-${index}`}>Name <span className="text-red-500">*</span></Label>
                          <Input
                            id={`name-${index}`}
                            value={traveler.name}
                            onChange={(e) => handleTravelerChange(index, "name", e.target.value)}
                            placeholder="Full Name"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`age-${index}`}>Age <span className="text-red-500">*</span></Label>
                          <Input
                            id={`age-${index}`}
                            type="number"
                            value={traveler.age}
                            onChange={(e) => handleTravelerChange(index, "age", e.target.value)}
                            placeholder="Age"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`gender-${index}`}>Gender <span className="text-red-500">*</span></Label>
                          <Select
                            value={traveler.gender}
                            onValueChange={(value) => handleTravelerChange(index, "gender", value)}
                          >
                            <SelectTrigger id={`gender-${index}`}>
                              <SelectValue placeholder="Gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`phone-${index}`}>Phone Number {index === 0 && <span className="text-red-500">*</span>}</Label>
                          <Input
                            id={`phone-${index}`}
                            type="tel"
                            value={traveler.phone}
                            onChange={(e) => handleTravelerChange(index, "phone", e.target.value)}
                            placeholder="Phone Number"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`aadhaar-${index}`}>Aadhaar Number {index === 0 && <span className="text-red-500">*</span>}</Label>
                          <Input
                            id={`aadhaar-${index}`}
                            value={traveler.aadhaar}
                            onChange={(e) => handleTravelerChange(index, "aadhaar", e.target.value)}
                            placeholder="Aadhaar Number"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
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
