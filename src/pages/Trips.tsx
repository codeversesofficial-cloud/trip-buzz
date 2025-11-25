import { Navbar } from "@/components/Navbar";
import { TripCard } from "@/components/TripCard";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const Trips = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const locationParam = searchParams.get("location");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const [searchLocation, setSearchLocation] = useState(locationParam || "");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || "all");

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips", selectedCategory, searchLocation, startDateParam, endDateParam],
    queryFn: async () => {
      const tripsRef = collection(db, "trips");
      const schedulesRef = collection(db, "trip_schedules");

      let q = query(tripsRef, where("is_active", "==", true));

      if (selectedCategory !== "all") {
        q = query(q, where("category_id", "==", selectedCategory));
      }

      const querySnapshot = await getDocs(q);
      let tripsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        categories: doc.data().categories || { name: 'Unknown' }
      })) as any[];

      const today = new Date().toISOString().split('T')[0];
      // Only show future trips in Explore Trips and category pages
      tripsData = tripsData.filter((trip: any) => trip.start_date >= today);

      if (searchLocation) {
        tripsData = tripsData.filter(trip =>
          trip.location.toLowerCase().includes(searchLocation.toLowerCase())
        );
      }

      if (startDateParam) {
        tripsData = tripsData.filter(trip => new Date(trip.start_date) >= new Date(startDateParam));
      }

      if (endDateParam) {
        tripsData = tripsData.filter(trip => new Date(trip.start_date) <= new Date(endDateParam));
      }

      // Fetch schedules for trips
      const scheduleQuery = query(
        schedulesRef,
        where("is_active", "==", true)
      );
      const schedulesSnapshot = await getDocs(scheduleQuery);

      const schedulesByTrip: Record<string, any> = {};
      schedulesSnapshot.docs.forEach(doc => {
        const scheduleData = doc.data();
        if (scheduleData.start_date >= today) {
          if (!schedulesByTrip[scheduleData.trip_id] || scheduleData.start_date < schedulesByTrip[scheduleData.trip_id].start_date) {
            schedulesByTrip[scheduleData.trip_id] = { id: doc.id, ...scheduleData };
          }
        }
      });

      // Add available_seats to trips
      tripsData = tripsData.map(trip => ({
        ...trip,
        available_seats: schedulesByTrip[trip.id]?.available_seats
      }));

      // Client-side sorting
      tripsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return tripsData;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const categoriesRef = collection(db, "categories");
      const querySnapshot = await getDocs(categoriesRef);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">Explore Trips</h1>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Input
            placeholder="Search by location..."
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center">Loading trips...</div>
        ) : trips && trips.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                id={trip.id}
                title={trip.title}
                location={trip.location}
                price={trip.price_per_person}
                duration_days={trip.duration_days}
                duration_nights={trip.duration_nights}
                max_seats={trip.max_seats}
                available_seats={trip.available_seats}
                images={trip.image_url ? [trip.image_url] : (trip.images || [])}
                category={trip.categories}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            No trips found. Try adjusting your filters.
          </div>
        )}
      </main>
    </div>
  );
};

export default Trips;
