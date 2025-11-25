import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { Categories } from "@/components/Categories";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TripCard } from "@/components/TripCard";
import { TripSkeleton } from "@/components/TripSkeleton";
import { TripCarousel } from "@/components/TripCarousel";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useMemo } from "react";

const Home = () => {
  const { data: trips, isLoading } = useQuery({
    queryKey: ["all-active-trips"],
    queryFn: async () => {
      const tripsRef = collection(db, "trips");
      const schedulesRef = collection(db, "trip_schedules");

      // Fetch all active trips
      const q = query(
        tripsRef,
        where("is_active", "==", true)
      );
      const querySnapshot = await getDocs(q);

      const today = new Date().toISOString().split('T')[0];

      const tripsData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          categories: doc.data().categories || { name: 'Unknown' }
        }))
        .filter((trip: any) => {
          // If marked as "Upcoming Trip", always show it (admin wants it visible)
          if (trip.is_upcoming) return true;
          // If NOT marked as upcoming, only show if it's a past trip (for showcase)
          return trip.start_date < today;
        }) as any[];

      // Fetch schedules for all trips
      const scheduleQuery = query(
        schedulesRef,
        where("is_active", "==", true)
      );
      const schedulesSnapshot = await getDocs(scheduleQuery);

      // Map schedules to trips
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
      const tripsWithSeats = tripsData.map(trip => ({
        ...trip,
        available_seats: schedulesByTrip[trip.id]?.available_seats
      }));

      return tripsWithSeats;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Filter trip lists - use all trips in each category
  const upcomingTrips = useMemo(() => trips?.filter(trip => trip.is_upcoming) || [], [trips]);
  const featuredTrips = useMemo(() => {
    const filtered = trips?.filter(trip => trip.is_featured) || [];
    return filtered.length > 0 ? filtered : trips?.slice(0, 6) || [];
  }, [trips]);
  const topRatedTrips = useMemo(() => trips?.filter(trip => trip.is_top_rated) || [], [trips]);
  const premiumTrips = useMemo(() => trips?.filter(trip => trip.is_premium) || [], [trips]);

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 lg:px-8 py-6 max-w-[1400px]">
        <Hero />
        <div className="my-8">
          <SearchBar />
        </div>
        <Categories />


        <div className="space-y-12 py-12">
          {/* Upcoming Trips Section */}
          {(isLoading || upcomingTrips.length > 0) && (
            <>
              {isLoading ? (
                <section>
                  <h2 className="mb-8 text-3xl font-bold">Upcoming Trips</h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <TripSkeleton key={i} />
                    ))}
                  </div>
                </section>
              ) : (
                <TripCarousel
                  trips={upcomingTrips}
                  title="Upcoming Trips"
                  viewAllLink="/trips?upcoming=true"
                />
              )}
            </>
          )}

          {/* Featured Trips Section */}
          {!isLoading && featuredTrips.length > 0 && (
            <TripCarousel
              trips={featuredTrips}
              title="Featured Trips"
              viewAllLink="/trips?featured=true"
            />
          )}

          {/* Top Rated Trips Section */}
          {!isLoading && topRatedTrips.length > 0 && (
            <TripCarousel
              trips={topRatedTrips}
              title="Top Rated Trips"
              viewAllLink="/trips?top_rated=true"
            />
          )}

          {/* Premium Trips Section */}
          {!isLoading && premiumTrips.length > 0 && (
            <TripCarousel
              trips={premiumTrips}
              title="Premium Trips"
              viewAllLink="/trips?premium=true"
            />
          )}
        </div>
      </main>
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;
