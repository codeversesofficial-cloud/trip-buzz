import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroCamping from "@/assets/hero-camping.jpg";
import { db } from "@/integrations/firebase/client";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Banner } from "@/services/bannerService";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Hero = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    // Fetch published banners from Firestore
    useEffect(() => {
        const bannersRef = collection(db, "banners");
        const q = query(
            bannersRef,
            where("is_published", "==", true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBanners = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Banner[];

            // Sort by created_at desc client-side
            fetchedBanners.sort((a, b) => {
                const dateA = a.created_at?.seconds || 0;
                const dateB = b.created_at?.seconds || 0;
                return dateB - dateA;
            });

            setBanners(fetchedBanners);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching banners:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Auto-scroll functionality
    useEffect(() => {
        if (banners.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
        }, 6000);

        return () => clearInterval(interval);
    }, [banners.length]);

    const nextSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + banners.length) % banners.length);
    };

    // Default fallback banner data
    const defaultBanner: Banner = {
        id: "default",
        title: "Discover North India",
        subtitle: "Verified, Trusted & Ready for Your Adventure",
        image_url: heroCamping,
        button_text: "Explore Trips",
        button_url: "/trips",
        show_button: true,
        is_published: true,
        created_at: {} as any,
        updated_at: {} as any,
        created_by: "system"
    };

    const displayBanners = banners.length > 0 ? banners : [defaultBanner];

    if (loading) {
        return (
            <div className="relative h-[300px] md:h-[400px] lg:h-[500px] w-full overflow-hidden rounded-3xl bg-gray-200 animate-pulse" />
        );
    }

    return (
        <div className="relative h-[300px] md:h-[400px] lg:h-[500px] w-full overflow-hidden rounded-3xl group">
            {/* Slider Container */}
            <div
                className="flex h-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {displayBanners.map((banner) => (
                    <div key={banner.id} className="min-w-full h-full relative">
                        <img
                            src={banner.image_url}
                            alt={banner.title || "Banner"}
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
                        <div className="relative flex h-full flex-col items-center justify-center px-4 text-center z-10">
                            {banner.title && (
                                <h1 className="mb-4 font-bold text-white text-3xl md:text-5xl lg:text-6xl drop-shadow-md">
                                    {banner.title}
                                </h1>
                            )}
                            {banner.subtitle && (
                                <p className="mb-8 text-white/90 text-base md:text-xl lg:text-2xl drop-shadow-sm max-w-2xl">
                                    {banner.subtitle}
                                </p>
                            )}
                            {banner.show_button && (
                                <Link to={banner.button_url}>
                                    <Button size="lg" className="text-lg px-8 py-6 rounded-full hover:scale-105 transition-transform">
                                        {banner.button_text}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Arrows (only if multiple banners) */}
            {displayBanners.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    {/* Dots Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                        {displayBanners.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2 h-2 rounded-full transition-all ${index === currentIndex ? "bg-white w-6" : "bg-white/50 hover:bg-white/80"
                                    }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
