import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Clock, ArrowRight } from "lucide-react";

interface TripSchedule {
    id: string;
    trip_id: string;
    start_date: any;
    end_date: any;
    available_seats: number;
    is_active: boolean;
}

interface Trip {
    id: string;
    title: string;
    location: string;
    image_url: string;
    pickup_point: string;
    pickup_time: string;
}

interface BookingStats {
    total: number;
    male: number;
    female: number;
    other: number;
    attended: number;
    notAttended: number;
    pending: number;
}

const ScheduledTrips = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigate("/auth");
            } else {
                setUserId(user.uid);
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const { data: scheduledTrips, isLoading, error } = useQuery({
        queryKey: ["scheduled-trips"],
        queryFn: async () => {
            try {
                console.log("🚀 Starting to fetch trip schedules...");

                // Get all trip schedules
                const schedulesRef = collection(db, "trip_schedules");

                // Simplified query - just get all active schedules
                const q = query(
                    schedulesRef,
                    where("is_active", "==", true)
                );

                console.log("📡 Executing Firestore query...");
                const schedulesSnapshot = await getDocs(q);

                console.log("📅 Total schedules found:", schedulesSnapshot.docs.length);

                const tripsData = await Promise.all(
                    schedulesSnapshot.docs.map(async (scheduleDoc) => {
                        const schedule = scheduleDoc.data() as TripSchedule;
                        const scheduleId = scheduleDoc.id;

                        console.log("🔍 Processing schedule:", scheduleId, schedule);

                        // Convert Firestore timestamp to Date - handle both string and Timestamp formats
                        let startDate: Date;
                        let endDate: Date;

                        if (schedule.start_date?.toDate) {
                            startDate = schedule.start_date.toDate();
                        } else if (typeof schedule.start_date === 'string') {
                            startDate = new Date(schedule.start_date);
                        } else {
                            startDate = new Date(schedule.start_date);
                        }

                        if (schedule.end_date?.toDate) {
                            endDate = schedule.end_date.toDate();
                        } else if (typeof schedule.end_date === 'string') {
                            endDate = new Date(schedule.end_date);
                        } else {
                            endDate = new Date(schedule.end_date);
                        }

                        console.log("📆 Start date:", startDate, "End date:", endDate);

                        // Get trip details
                        let tripData: Trip | null = null;
                        if (schedule.trip_id) {
                            const tripDoc = await getDoc(doc(db, "trips", schedule.trip_id));
                            if (tripDoc.exists()) {
                                tripData = { id: tripDoc.id, ...tripDoc.data() } as Trip;
                            }
                        }

                        // Get bookings for this schedule
                        const bookingsRef = collection(db, "bookings");
                        const bookingsQuery = query(
                            bookingsRef,
                            where("schedule_id", "==", scheduleId),
                            where("booking_status", "==", "confirmed")
                        );

                        const bookingsSnapshot = await getDocs(bookingsQuery);

                        // Calculate statistics
                        const stats: BookingStats = {
                            total: 0,
                            male: 0,
                            female: 0,
                            other: 0,
                            attended: 0,
                            notAttended: 0,
                            pending: 0,
                        };

                        bookingsSnapshot.docs.forEach((bookingDoc) => {
                            const booking = bookingDoc.data();
                            const travelers = booking.travelers || [];

                            stats.total += travelers.length;

                            // Count by gender
                            travelers.forEach((traveler: any) => {
                                if (traveler.gender === "male") stats.male++;
                                else if (traveler.gender === "female") stats.female++;
                                else stats.other++;
                            });

                            // Count by attendance status
                            const attendanceStatus = booking.attendance_status || "pending";
                            if (attendanceStatus === "attended") stats.attended += travelers.length;
                            else if (attendanceStatus === "not_attended") stats.notAttended += travelers.length;
                            else stats.pending += travelers.length;
                        });

                        return {
                            scheduleId,
                            schedule: {
                                ...schedule,
                                start_date: startDate,
                                end_date: endDate,
                            },
                            trip: tripData,
                            stats,
                        };
                    })
                );

                console.log("✅ Total trips to display:", tripsData.length);
                return tripsData;
            } catch (error) {
                console.error("❌ Error fetching scheduled trips:", error);
                throw error;
            }
        },
    });

    return (
        <AdminLayout>
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold">Scheduled Trips</h1>
                    <p className="text-muted-foreground">
                        View and manage attendance for all scheduled trips
                    </p>
                </div>

                {isLoading ? (
                    <div className="py-8 text-center">Loading scheduled trips...</div>
                ) : error ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <div className="text-red-600 mb-2">Error loading trips</div>
                            <p className="text-sm text-muted-foreground">
                                {error instanceof Error ? error.message : "Unknown error"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Check browser console for details
                            </p>
                        </CardContent>
                    </Card>
                ) : scheduledTrips && scheduledTrips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scheduledTrips.map((item: any) => (
                            <Card
                                key={item.scheduleId}
                                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => navigate(`/admin/trip-attendance/${item.scheduleId}`)}
                            >
                                <div className="relative h-48 overflow-hidden">
                                    <img
                                        src={item.trip?.image_url || "https://via.placeholder.com/400x300"}
                                        alt={item.trip?.title || "Trip"}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="bg-white/90">
                                            {item.stats.total} Travelers
                                        </Badge>
                                    </div>
                                </div>

                                <CardContent className="p-6">
                                    <h3 className="text-xl font-bold mb-2">{item.trip?.title || "Unknown Trip"}</h3>

                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <MapPin className="h-4 w-4 mr-2" />
                                            {item.trip?.location || "Unknown Location"}
                                        </div>

                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4 mr-2" />
                                            {format(item.schedule.start_date, "MMM dd, yyyy")} -{" "}
                                            {format(item.schedule.end_date, "MMM dd, yyyy")}
                                        </div>

                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Clock className="h-4 w-4 mr-2" />
                                            {item.trip?.pickup_time || "TBD"} at {item.trip?.pickup_point || "TBD"}
                                        </div>
                                    </div>

                                    {/* Gender Breakdown */}
                                    <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <span className="font-medium">Participants</span>
                                            <Users className="h-4 w-4" />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="text-center">
                                                <div className="font-bold text-blue-600">{item.stats.male}</div>
                                                <div className="text-muted-foreground">Male</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold text-pink-600">{item.stats.female}</div>
                                                <div className="text-muted-foreground">Female</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold text-purple-600">{item.stats.other}</div>
                                                <div className="text-muted-foreground">Other</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Attendance Status */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="text-muted-foreground">Attendance Status</span>
                                            <span className="font-medium">
                                                {item.stats.attended + item.stats.notAttended} / {item.stats.total}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div className="h-full flex">
                                                <div
                                                    className="bg-green-500"
                                                    style={{
                                                        width: `${item.stats.total > 0 ? (item.stats.attended / item.stats.total) * 100 : 0}%`,
                                                    }}
                                                />
                                                <div
                                                    className="bg-red-500"
                                                    style={{
                                                        width: `${item.stats.total > 0 ? (item.stats.notAttended / item.stats.total) * 100 : 0}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-xs mt-1">
                                            <span className="text-green-600">{item.stats.attended} Attended</span>
                                            <span className="text-gray-500">{item.stats.pending} Pending</span>
                                            <span className="text-red-600">{item.stats.notAttended} Absent</span>
                                        </div>
                                    </div>

                                    <Button className="w-full" variant="outline">
                                        Manage Attendance
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">No Scheduled Trips</h3>
                            <p className="text-muted-foreground">
                                There are no active trip schedules at the moment.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
};

export default ScheduledTrips;
