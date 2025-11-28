import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    getDocs,
    query,
    where,
    getDoc,
    doc,
    updateDoc,
    addDoc,
} from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
    ArrowLeft,
    QrCode,
    CheckCircle,
    XCircle,
    Clock,
    User,
    Phone,
    CreditCard,
} from "lucide-react";
import { QRScanner } from "@/components/admin/QRScanner";

interface Traveler {
    name: string;
    age: number;
    gender: string;
    phone?: string;
    aadhaar?: string;
}

interface Booking {
    id: string;
    user_id: string;
    booking_status: string;
    attendance_status?: string;
    total_amount: number;
    number_of_people: number;
    travelers: Traveler[];
    created_at: string;
    profiles?: {
        full_name: string;
        email: string;
        phone_number?: string;
    };
}

const TripAttendance = () => {
    const { scheduleId } = useParams<{ scheduleId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [userId, setUserId] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [showBookingDialog, setShowBookingDialog] = useState(false);
    const [openedViaQRScan, setOpenedViaQRScan] = useState(false);

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

    const { data: tripData, isLoading: isTripLoading } = useQuery({
        queryKey: ["trip-attendance", scheduleId],
        queryFn: async () => {
            if (!scheduleId) return null;

            // Get schedule details
            const scheduleDoc = await getDoc(doc(db, "trip_schedules", scheduleId));
            if (!scheduleDoc.exists()) {
                throw new Error("Schedule not found");
            }

            const schedule = scheduleDoc.data();

            // Get trip details
            let trip = null;
            if (schedule.trip_id) {
                const tripDoc = await getDoc(doc(db, "trips", schedule.trip_id));
                if (tripDoc.exists()) {
                    trip = { id: tripDoc.id, ...tripDoc.data() };
                }
            }

            return {
                schedule: {
                    id: scheduleId,
                    ...schedule,
                    start_date: schedule.start_date?.toDate
                        ? schedule.start_date.toDate()
                        : new Date(schedule.start_date),
                    end_date: schedule.end_date?.toDate
                        ? schedule.end_date.toDate()
                        : new Date(schedule.end_date),
                },
                trip,
            };
        },
    });

    const { data: bookings, isLoading: isBookingsLoading } = useQuery({
        queryKey: ["trip-bookings", scheduleId],
        queryFn: async () => {
            if (!scheduleId) return [];

            const bookingsRef = collection(db, "bookings");
            const q = query(
                bookingsRef,
                where("schedule_id", "==", scheduleId),
                where("booking_status", "==", "confirmed")
            );

            const bookingsSnapshot = await getDocs(q);

            const bookingsData = await Promise.all(
                bookingsSnapshot.docs.map(async (bookingDoc) => {
                    const booking = bookingDoc.data();

                    // Get user profile
                    let profileData: any = {};
                    if (booking.user_id) {
                        const userDoc = await getDoc(doc(db, "users", booking.user_id));
                        if (userDoc.exists()) {
                            profileData = userDoc.data();
                        }
                    }

                    return {
                        id: bookingDoc.id,
                        ...booking,
                        profiles: {
                            full_name: profileData.full_name || "Unknown",
                            email: profileData.email || "Unknown",
                            phone_number: profileData.phone_number || "",
                        },
                    } as Booking;
                })
            );

            return bookingsData;
        },
    });

    const updateAttendance = useMutation({
        mutationFn: async ({
            bookingId,
            status,
            userId,
            tripTitle,
        }: {
            bookingId: string;
            status: string;
            userId: string;
            tripTitle: string;
        }) => {
            // Update booking attendance status
            const bookingRef = doc(db, "bookings", bookingId);
            await updateDoc(bookingRef, { attendance_status: status });

            // Send notification to user
            const title =
                status === "attended"
                    ? "Attendance Confirmed"
                    : "Attendance Marked as Absent";
            const message =
                status === "attended"
                    ? `Your attendance for ${tripTitle} has been confirmed. Have a great trip!`
                    : `You have been marked as absent for ${tripTitle}. Please contact support if this is incorrect.`;

            await addDoc(collection(db, "notifications"), {
                user_id: userId,
                title: title,
                message: message,
                type: "attendance_confirmation",
                is_read: false,
                link: "/dashboard",
                created_at: new Date().toISOString(),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trip-bookings", scheduleId] });
            queryClient.invalidateQueries({ queryKey: ["scheduled-trips"] });
            setShowBookingDialog(false);
            setOpenedViaQRScan(false);
            setSelectedBooking(null);
            toast({
                title: "Attendance Updated",
                description: "Attendance status has been updated and user notified.",
            });
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update attendance status.",
            });
        },
    });

    const handleScan = async (bookingId: string) => {
        setShowScanner(false);

        // Find the booking
        const booking = bookings?.find((b) => b.id === bookingId);

        if (!booking) {
            toast({
                variant: "destructive",
                title: "Booking Not Found",
                description: "This booking is not associated with this trip.",
            });
            return;
        }

        setSelectedBooking(booking);
        setOpenedViaQRScan(true); // Mark as opened via QR scan
        setShowBookingDialog(true);
    };

    const handleMarkAttendance = (status: "attended" | "not_attended") => {
        if (!selectedBooking || !tripData?.trip) return;

        updateAttendance.mutate({
            bookingId: selectedBooking.id,
            status,
            userId: selectedBooking.user_id,
            tripTitle: tripData.trip.title || "Trip",
        });
    };

    const pendingBookings = bookings?.filter(
        (b) => !b.attendance_status || b.attendance_status === "pending"
    );
    const attendedBookings = bookings?.filter(
        (b) => b.attendance_status === "attended"
    );
    const notAttendedBookings = bookings?.filter(
        (b) => b.attendance_status === "not_attended"
    );

    const BookingCard = ({ booking }: { booking: Booking }) => {
        const statusConfig = {
            pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
            attended: { color: "bg-green-100 text-green-800", icon: CheckCircle },
            not_attended: { color: "bg-red-100 text-red-800", icon: XCircle },
        };

        const status = (booking.attendance_status || "pending") as keyof typeof statusConfig;
        const StatusIcon = statusConfig[status].icon;

        return (
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold">{booking.profiles?.full_name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {booking.profiles?.email}
                            </div>
                            {booking.profiles?.phone_number && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                    <Phone className="h-3 w-3" />
                                    {booking.profiles.phone_number}
                                </div>
                            )}
                        </div>
                        <Badge className={statusConfig[status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.replace("_", " ")}
                        </Badge>
                    </div>

                    <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Travelers:</span>
                            <span className="font-medium">{booking.number_of_people}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-semibold">₹{booking.total_amount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="mb-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            Traveler Details:
                        </div>
                        <div className="space-y-1">
                            {booking.travelers?.slice(0, 2).map((traveler, idx) => (
                                <div key={idx} className="text-xs bg-muted/50 p-2 rounded">
                                    <span className="font-medium">{traveler.name}</span>
                                    <span className="text-muted-foreground">
                                        {" "}
                                        • {traveler.age}y • {traveler.gender}
                                    </span>
                                </div>
                            ))}
                            {booking.travelers?.length > 2 && (
                                <div className="text-xs text-muted-foreground text-center">
                                    +{booking.travelers.length - 2} more
                                </div>
                            )}
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                            setSelectedBooking(booking);
                            setOpenedViaQRScan(false); // Mark as NOT opened via QR scan
                            setShowBookingDialog(true);
                        }}
                    >
                        View Details & Update
                    </Button>
                </CardContent>
            </Card>
        );
    };

    if (isTripLoading) {
        return (
            <AdminLayout>
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">Loading trip details...</div>
                </div>
            </AdminLayout>
        );
    }

    if (!tripData) {
        return (
            <AdminLayout>
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">Trip not found</div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/admin/scheduled-trips")}
                        className="mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Scheduled Trips
                    </Button>

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">
                                {tripData.trip?.title || "Trip Attendance"}
                            </h1>
                            <p className="text-muted-foreground">
                                {tripData.trip?.location} •{" "}
                                {format(tripData.schedule.start_date, "MMM dd, yyyy")} -{" "}
                                {format(tripData.schedule.end_date, "MMM dd, yyyy")}
                            </p>
                        </div>

                        <Button onClick={() => setShowScanner(true)} size="lg">
                            <QrCode className="mr-2 h-5 w-5" />
                            Scan QR Code
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Bookings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{bookings?.length || 0}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Pending
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">
                                {pendingBookings?.length || 0}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Attended
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {attendedBookings?.length || 0}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Not Attended
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {notAttendedBookings?.length || 0}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bookings Tabs */}
                <Card>
                    <CardContent className="pt-6">
                        <Tabs defaultValue="pending">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="pending">
                                    Pending ({pendingBookings?.length || 0})
                                </TabsTrigger>
                                <TabsTrigger value="attended">
                                    Attended ({attendedBookings?.length || 0})
                                </TabsTrigger>
                                <TabsTrigger value="not_attended">
                                    Not Attended ({notAttendedBookings?.length || 0})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="pending" className="mt-6">
                                {isBookingsLoading ? (
                                    <div className="text-center py-8">Loading bookings...</div>
                                ) : pendingBookings && pendingBookings.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {pendingBookings.map((booking) => (
                                            <BookingCard key={booking.id} booking={booking} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No pending bookings
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="attended" className="mt-6">
                                {attendedBookings && attendedBookings.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {attendedBookings.map((booking) => (
                                            <BookingCard key={booking.id} booking={booking} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No attended bookings yet
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="not_attended" className="mt-6">
                                {notAttendedBookings && notAttendedBookings.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {notAttendedBookings.map((booking) => (
                                            <BookingCard key={booking.id} booking={booking} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No absent bookings
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* QR Scanner Dialog */}
                <Dialog open={showScanner} onOpenChange={setShowScanner}>
                    <DialogContent className="sm:max-w-md">
                        <QRScanner
                            onScan={handleScan}
                            onClose={() => setShowScanner(false)}
                        />
                    </DialogContent>
                </Dialog>

                {/* Booking Details Dialog */}
                <Dialog
                    open={showBookingDialog}
                    onOpenChange={(open) => {
                        setShowBookingDialog(open);
                        if (!open) {
                            setOpenedViaQRScan(false); // Reset flag when dialog closes
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Booking Details</DialogTitle>
                            <DialogDescription>
                                Review booking information and update attendance status
                            </DialogDescription>
                        </DialogHeader>

                        {selectedBooking && (
                            <div className="space-y-4">
                                {/* Customer Info */}
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <h4 className="font-semibold mb-2">Customer Information</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Name:</span>{" "}
                                            {selectedBooking.profiles?.full_name}
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Email:</span>{" "}
                                            {selectedBooking.profiles?.email}
                                        </div>
                                        {selectedBooking.profiles?.phone_number && (
                                            <div>
                                                <span className="text-muted-foreground">Phone:</span>{" "}
                                                {selectedBooking.profiles.phone_number}
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-muted-foreground">Amount:</span> ₹
                                            {selectedBooking.total_amount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Travelers */}
                                <div>
                                    <h4 className="font-semibold mb-3">
                                        Travelers ({selectedBooking.travelers?.length || 0})
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedBooking.travelers?.map((traveler, idx) => (
                                            <div key={idx} className="p-3 border rounded-lg">
                                                <div className="font-medium mb-1">
                                                    {traveler.name}{" "}
                                                    {idx === 0 && (
                                                        <Badge variant="outline" className="ml-2">
                                                            Primary
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                                    <div>Age: {traveler.age}</div>
                                                    <div>Gender: {traveler.gender}</div>
                                                    {traveler.phone && <div>Phone: {traveler.phone}</div>}
                                                    {traveler.aadhaar && (
                                                        <div>Aadhaar: {traveler.aadhaar}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Current Status */}
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">Current Status:</span>
                                        <Badge
                                            variant={
                                                selectedBooking.attendance_status === "attended"
                                                    ? "default"
                                                    : selectedBooking.attendance_status === "not_attended"
                                                        ? "destructive"
                                                        : "secondary"
                                            }
                                        >
                                            {selectedBooking.attendance_status || "pending"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowBookingDialog(false);
                                    setOpenedViaQRScan(false);
                                    setSelectedBooking(null);
                                }}
                            >
                                Close
                            </Button>
                            {/* Only show attendance buttons if opened via QR scan */}
                            {openedViaQRScan && (
                                <>
                                    {selectedBooking?.attendance_status !== "not_attended" && (
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleMarkAttendance("not_attended")}
                                            disabled={updateAttendance.isPending}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Mark Not Attended
                                        </Button>
                                    )}
                                    {selectedBooking?.attendance_status !== "attended" && (
                                        <Button
                                            onClick={() => handleMarkAttendance("attended")}
                                            disabled={updateAttendance.isPending}
                                        >
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Mark Attended
                                        </Button>
                                    )}
                                </>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default TripAttendance;
