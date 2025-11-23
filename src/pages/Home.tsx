import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { Categories } from "@/components/Categories";
import { TripCard } from "@/components/TripCard";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { Navbar } from "@/components/Navbar";

const Home = () => {
  const { data: trips, isLoading } = useQuery({
    queryKey: ["featured-trips"],
    queryFn: async () => {
      const tripsRef = collection(db, "trips");
      const q = query(tripsRef, where("is_active", "==", true), limit(6));
      const querySnapshot = await getDocs(q);

      // Fetch categories if needed or assume data structure
      // For now, mapping the data directly
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Mocking category name if not present, or expecting it in data
        categories: doc.data().categories || { name: 'Unknown' }
      })) as any[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Hero />
        <div className="my-8">
          <SearchBar />
        </div>
        <Categories />
        <div className="py-12">
          <h2 className="mb-8 text-3xl font-bold">Featured Trips</h2>
          {isLoading ? (
            <div className="text-center">Loading trips...</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trips?.map((trip) => (
                <TripCard
                  key={trip.id}
                  id={trip.id}
                  title={trip.title}
                  location={trip.location}
                  price={trip.price_per_person}
                  duration_days={trip.duration_days}
                  duration_nights={trip.duration_nights}
                  max_seats={trip.max_seats}
                  images={trip.image_url ? [trip.image_url] : (trip.images || [])}
                  category={trip.categories}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
