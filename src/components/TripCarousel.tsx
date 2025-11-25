import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TripCard } from "./TripCard";
import { Button } from "./ui/button";

interface TripCarouselProps {
    trips: any[];
    title: string;
    viewAllLink: string;
}

export const TripCarousel = ({ trips, title, viewAllLink }: TripCarouselProps) => {
    const navigate = useNavigate();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [isAutoScrolling, setIsAutoScrolling] = useState(true);
    const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Only enable auto-scroll if we have 3 or more items
    const shouldAutoScroll = trips.length >= 3;

    // Duplicate trips for seamless infinite loop
    const displayTrips = shouldAutoScroll ? [...trips, ...trips, ...trips] : trips;

    // Auto-scroll functionality with forward-only continuous loop
    useEffect(() => {
        if (!isAutoScrolling || !shouldAutoScroll) return;

        autoScrollIntervalRef.current = setInterval(() => {
            if (scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                const cardWidth = container.scrollWidth / displayTrips.length;
                const currentScroll = container.scrollLeft;
                const targetScroll = currentScroll + cardWidth;

                // Smooth scroll to next card
                container.scrollTo({
                    left: targetScroll,
                    behavior: 'smooth'
                });

                // Reset position during the smooth scroll animation to make it invisible
                // This happens at the midpoint of the animation (300ms into the 600ms animation)
                setTimeout(() => {
                    const scrollPosition = container.scrollLeft;
                    const firstSetEnd = trips.length * cardWidth;
                    const secondSetEnd = trips.length * 2 * cardWidth;

                    // If we're approaching the end of the second set, reset to middle set
                    // We check with a smaller threshold to reset earlier during the animation
                    if (scrollPosition >= secondSetEnd - (cardWidth * 0.5)) {
                        container.scrollTo({
                            left: trips.length * cardWidth,
                            behavior: 'auto' // Instant jump, happens during smooth scroll so user won't see it
                        });
                    }
                    // If we somehow scrolled backwards past the first set, reset forward
                    else if (scrollPosition <= firstSetEnd - (cardWidth * 0.5)) {
                        container.scrollTo({
                            left: trips.length * cardWidth,
                            behavior: 'auto'
                        });
                    }
                }, 300); // Reset at midpoint of smooth scroll animation
            }
        }, 2500); // 2.5 seconds per scroll

        return () => {
            if (autoScrollIntervalRef.current) {
                clearInterval(autoScrollIntervalRef.current);
            }
        };
    }, [isAutoScrolling, trips.length, displayTrips.length, shouldAutoScroll]);

    // Initialize scroll position to middle set for seamless looping
    useEffect(() => {
        if (scrollContainerRef.current && shouldAutoScroll && trips.length > 0) {
            const container = scrollContainerRef.current;
            // Wait a bit for the component to fully render
            setTimeout(() => {
                const cardWidth = container.scrollWidth / displayTrips.length;
                // Start at the beginning of the middle set
                container.scrollLeft = trips.length * cardWidth;
            }, 100);
        }
    }, [trips.length, displayTrips.length, shouldAutoScroll]);

    // Add wheel event listener with { passive: false } to fix passive event error
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // Only handle horizontal scrolling when Shift key is pressed
            // This allows normal vertical page scrolling
            if (e.shiftKey && Math.abs(e.deltaY) > 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
                pauseAutoScroll();
            }
            // Also handle native horizontal scroll (trackpad swipe)
            else if (Math.abs(e.deltaX) > 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaX;
                pauseAutoScroll();
            }
            // Allow normal vertical scrolling (don't preventDefault)
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    const pauseAutoScroll = () => {
        setIsAutoScrolling(false);

        // Clear existing timeout
        if (resumeTimeoutRef.current) {
            clearTimeout(resumeTimeoutRef.current);
        }

        // Clear auto-scroll interval
        if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
        }

        // Resume after 2 seconds
        resumeTimeoutRef.current = setTimeout(() => {
            setIsAutoScrolling(true);
        }, 2000);
    };

    // Mouse drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
        pauseAutoScroll();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    return (
        <section>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">{title}</h2>
                <Button
                    variant="outline"
                    onClick={() => navigate(viewAllLink)}
                >
                    View All
                </Button>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto gap-6 pb-4 cursor-grab active:cursor-grabbing"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    scrollSnapType: 'x mandatory'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            >
                <style>
                    {`
            .flex.overflow-x-auto::-webkit-scrollbar {
              display: none;
            }
          `}
                </style>
                {displayTrips.map((trip, index) => (
                    <div
                        key={`${trip.id}-${index}`}
                        className="flex-shrink-0 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                        style={{ scrollSnapAlign: 'start' }}
                    >
                        <TripCard
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
                    </div>
                ))}
            </div>
        </section>
    );
};
