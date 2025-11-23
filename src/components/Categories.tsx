import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export const Categories = () => {
  const navigate = useNavigate();

  const { data: categories, error } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const categoriesRef = collection(db, "categories");
      // Only show visible categories
      const q = query(categoriesRef, where("is_visible", "==", true));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      // Sort client-side to avoid needing a composite index
      return data.sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  if (error) {
    return <div className="text-red-500 text-center py-4">Error loading categories: {(error as Error).message}</div>;
  }

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/trips?category=${categoryId}`);
  };

  return (
    <div className="py-12">
      <h2 className="mb-8 text-3xl font-bold">Select Trip Category</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {categories?.map((category) => (
          <Card
            key={category.id}
            className="cursor-pointer p-6 text-center transition-all hover:shadow-lg hover:scale-105"
            onClick={() => handleCategoryClick(category.id)}
          >
            <div className="mb-3 flex justify-center">
              <img
                src={category.icon}
                alt={category.name}
                className="h-16 w-16 object-cover rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image";
                }}
              />
            </div>
            <h3 className="font-semibold">{category.name}</h3>
          </Card>
        ))}
      </div>
    </div>
  );
};
