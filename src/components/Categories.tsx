import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Categories = () => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

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

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Create duplicated categories for infinite loop
  const duplicatedCategories = categories ? [...categories, ...categories, ...categories] : [];

  // Autoscroll effect
  useEffect(() => {
    if (!categories || categories.length === 0 || isHovered) return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const scrollSpeed = 1; // pixels per frame
    const scrollInterval = setInterval(() => {
      if (scrollContainer) {
        scrollContainer.scrollLeft += scrollSpeed;

        // Calculate the width of one set of categories
        const singleSetWidth = scrollContainer.scrollWidth / 3;

        // Reset to the middle set when we've scrolled past it
        if (scrollContainer.scrollLeft >= singleSetWidth * 2) {
          scrollContainer.scrollLeft = singleSetWidth;
        }
      }
    }, 20);

    return () => clearInterval(scrollInterval);
  }, [categories, isHovered]);

  // Initialize scroll position to the middle set
  useEffect(() => {
    if (scrollContainerRef.current && categories && categories.length > 0) {
      const singleSetWidth = scrollContainerRef.current.scrollWidth / 3;
      scrollContainerRef.current.scrollLeft = singleSetWidth;
    }
  }, [categories]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.offsetWidth;
      const scrollAmount = containerWidth; // Scroll by full container width
      const newScrollLeft = direction === 'left'
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="py-12">
      <h2 className="mb-8 text-3xl font-bold">Select Trip Category</h2>

      <div
        className="relative flex items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Left Navigation Button - Responsive sizing */}
        <button
          onClick={() => scroll('left')}
          className="p-2 md:p-3 rounded-full bg-white shadow-lg hover:bg-gray-50 border border-gray-100 transition-all mr-2 md:mr-4 flex-shrink-0 z-10"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4 md:h-6 md:w-6 text-gray-600" />
        </button>

        {/* Carousel Container - Responsive card display */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-3 md:gap-4 flex-1 scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory'
          }}
        >
          <style>
            {`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>
          {duplicatedCategories?.map((category, index) => (
            <div
              key={`${category.id}-${index}`}
              className="flex-shrink-0 w-full md:w-[calc(50%-6px)] lg:w-[calc(25%-12px)]"
              style={{
                scrollSnapAlign: 'start'
              }}
            >
              <Card
                className="cursor-pointer p-4 md:p-6 text-center transition-all hover:shadow-lg hover:scale-105 h-full"
                onClick={() => handleCategoryClick(category.id)}
              >
                <div className="mb-3 flex justify-center">
                  <img
                    src={category.icon}
                    alt={category.name}
                    className="h-12 w-12 md:h-16 md:w-16 object-cover rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image";
                    }}
                  />
                </div>
                <h3 className="font-semibold text-sm md:text-base break-words">{category.name}</h3>
              </Card>
            </div>
          ))}
        </div>

        {/* Right Navigation Button - Responsive sizing */}
        <button
          onClick={() => scroll('right')}
          className="p-2 md:p-3 rounded-full bg-white shadow-lg hover:bg-gray-50 border border-gray-100 transition-all ml-2 md:ml-4 flex-shrink-0 z-10"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4 md:h-6 md:w-6 text-gray-600" />
        </button>
      </div>
    </div>
  );
};
