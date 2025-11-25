import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, Check, X } from "lucide-react";
import { format } from "date-fns";
import ItineraryTimeline from "@/components/ItineraryTimeline";

const TripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      if (!id) return null;
      const docRef = doc(db, "trips", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        categories: data.categories || { name: 'Unknown' }
      } as any;
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ["trip-schedules", id],
    queryFn: async () => {
      if (!id) return [];
      const schedulesRef = collection(db, "trip_schedules");
      const q = query(
        schedulesRef,
        where("trip_id", "==", id),
        where("is_active", "==", true)
      );

      const querySnapshot = await getDocs(q);
      const today = new Date().toISOString().split("T")[0];

      let schedulesData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .filter((schedule: any) => schedule.start_date >= today) as any[];

      // Sort by start_date
      schedulesData.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      return schedulesData;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">Loading...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">Trip not found</div>
      </div>
    );
  }

  const itinerary = trip.itinerary as Record<string, string> || {};

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <img
            src={trip.image_url || trip.images?.[0] || "/placeholder.svg"}
            alt={trip.title}
            className="h-96 w-full rounded-2xl object-cover"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-4xl font-bold">{trip.title}</h1>
              {trip.categories && trip.categories.name !== 'Unknown' && (
                <Badge className="text-lg">{trip.categories.name}</Badge>
              )}
            </div>

            <div className="mb-6 flex flex-wrap gap-4 text-muted-foreground">
              <div className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                {trip.location}
              </div>
              <div className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                {trip.duration_nights}N / {trip.duration_days}D
              </div>
              <div className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                {schedules && schedules.length > 0 ? (
                  <span className="text-green-600 font-medium">
                    {schedules[0].available_seats} Seats Left
                  </span>
                ) : (
                  <span>Max {trip.max_seats} Guests</span>
                )}
              </div>
            </div>

            <div
              className="mb-8 text-lg prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: trip.description }}
            />

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Trip Itinerary</CardTitle>
                <p className="text-muted-foreground text-sm">Your day-by-day adventure plan</p>
              </CardHeader>
              <CardContent className="pt-6">
                {trip.itinerary ? (
                  <ItineraryTimeline itinerary={typeof trip.itinerary === 'string' ? trip.itinerary : "Itinerary details available."} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">No itinerary details available.</p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-600">
                    <Check className="mr-2" /> Inclusions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {trip.inclusions && trip.inclusions.length > 0 ? (
                      trip.inclusions.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start">
                          <Check className="mr-2 mt-0.5 h-4 w-4 text-green-600" />
                          {item}
                        </li>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No inclusions listed</p>
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <X className="mr-2" /> Exclusions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {trip.exclusions && trip.exclusions.length > 0 ? (
                      trip.exclusions.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start">
                          <X className="mr-2 mt-0.5 h-4 w-4 text-red-600" />
                          {item}
                        </li>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No exclusions listed</p>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Book This Trip</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    ₹{trip.price_per_person.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Per person</div>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Pickup Point & Time</h3>
                  <p className="text-sm text-muted-foreground">
                    {trip.pickup_point || "To be decided"}
                    {trip.pickup_time && ` at ${trip.pickup_time}`}
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Trip Date</h3>
                  <p className="text-sm text-muted-foreground">
                    {schedules && schedules.length > 0 ? (
                      <>
                        {format(new Date(schedules[0].start_date), "MMMM dd, yyyy")}
                        <span className="block text-green-600 font-medium mt-1">
                          ({schedules[0].available_seats} seats available)
                        </span>
                      </>
                    ) : (
                      trip.start_date ? format(new Date(trip.start_date), "MMMM dd, yyyy") : "Date TBD"
                    )}
                  </p>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => navigate(`/booking/${trip.id}`)}
                  disabled={!trip.is_active || new Date(trip.start_date) < new Date(new Date().toISOString().split('T')[0])}
                >
                  {!trip.is_active
                    ? "Currently Unavailable"
                    : new Date(trip.start_date) < new Date(new Date().toISOString().split('T')[0])
                      ? "Booking Closed (Past Trip)"
                      : "Book Now"
                  }
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main >
    </div >
  );
};

export default TripDetails;
