import { MapPin } from "lucide-react";

interface ItineraryTimelineProps {
    itinerary: string;
}

interface DayItem {
    day: number;
    title: string;
    description: string;
}

const ItineraryTimeline = ({ itinerary }: ItineraryTimelineProps) => {
    const parseDays = (text: string): DayItem[] => {
        const cleanText = text.replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ');
        const dayPattern = /Day\s+(\d+)[:\s]+(.*?)(?=Day\s+\d+:|$)/gis;
        const matches = [...cleanText.matchAll(dayPattern)];

        return matches.map(match => {
            const dayNum = parseInt(match[1]);
            const content = match[2].trim();
            const lines = content.split('\n').filter(line => line.trim());
            const title = lines[0] || '';
            const description = lines.slice(1).join(' ').trim();

            return {
                day: dayNum,
                title: title.trim(),
                description: description
            };
        });
    };

    const days = parseDays(itinerary);

    if (days.length === 0) {
        return (
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: itinerary }} />
        );
    }

    return (
        <div className="relative py-12 px-4">
            {/* Zig-Zag Road connecting milestone dots */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none hidden md:block"
                style={{ zIndex: 0 }}
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id="roadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 0.5 }} />
                        <stop offset="50%" style={{ stopColor: '#3b82f6', stopOpacity: 0.5 }} />
                        <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.5 }} />
                    </linearGradient>
                </defs>
                {/* Create zig-zag path connecting dots */}
                <path
                    d={days.map((_, i) => {
                        const y = ((i) * (100 / Math.max(days.length - 1, 1)));
                        const x = i % 2 === 0 ? 25 : 75;
                        if (i === 0) return `M ${x} ${y}`;
                        const prevX = (i - 1) % 2 === 0 ? 25 : 75;
                        const prevY = ((i - 1) * (100 / Math.max(days.length - 1, 1)));
                        return `L ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="url(#roadGradient)"
                    strokeWidth="2"
                    strokeDasharray="6,4"
                />
            </svg>

            {/* Mobile vertical road */}
            <div className="md:hidden absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-600 opacity-30 -translate-x-1/2 rounded-full" />

            <div className="relative space-y-16 md:space-y-20 max-w-7xl mx-auto">
                {days.map((day, index) => {
                    const isLeft = index % 2 === 0;

                    return (
                        <div
                            key={day.day}
                            className="relative w-full"
                        >
                            {/* Milestone Circle at TOP-CENTER of Card */}
                            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-cyan-500 border-4 border-white shadow-lg z-20" />

                            {/* Day Card - Adjusted: Smaller width (600px), More height */}
                            <div
                                className={`${isLeft ? 'md:mr-auto md:pr-8' : 'md:ml-auto md:pl-8'}`}
                                style={{
                                    width: '100%',
                                    maxWidth: '600px'
                                }}
                            >
                                <div
                                    className="bg-white overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-200"
                                    style={{
                                        borderRadius: '16px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                    }}
                                >
                                    {/* Header - Increased Padding for More Height */}
                                    <div
                                        className="bg-white border-b-2 border-primary"
                                        style={{ padding: '24px 24px' }}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-primary/10 rounded-full px-3 py-1 border border-primary/20">
                                                <span className="font-bold text-sm text-gray-900">Day {day.day}</span>
                                            </div>
                                            <div className="bg-primary/10 rounded-full p-1.5 border border-primary/20">
                                                <MapPin className="h-4 w-4 text-gray-900" />
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-base leading-tight text-gray-900">
                                            {day.title}
                                        </h3>

                                        {day.description && (
                                            <p className="text-sm mt-2 leading-relaxed text-gray-700 line-clamp-2">
                                                {day.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Body - Increased Padding */}
                                    <div style={{ padding: '20px 24px' }} className="bg-white">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <MapPin className="h-4 w-4 text-gray-600" />
                                            <span>Activity</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Journey End Marker */}
            <div className="flex justify-center mt-16">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                </div>
            </div>
        </div>
    );
};

export default ItineraryTimeline;
