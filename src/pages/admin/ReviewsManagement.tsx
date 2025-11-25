import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Review,
    getAllReviews,
    deleteReview,
    updateReviewStatus,
    getTopRatedTrips,
    getLowestRatedTrips,
} from "@/services/reviewService";
import { db } from "@/integrations/firebase/client";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Star, Trash2, Loader2, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LabelList
} from "recharts";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const ReviewsManagement = () => {
    const { toast } = useToast();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [topTrips, setTopTrips] = useState<Array<{ tripId: string; tripName: string; rating: number; count: number }>>([]);
    const [bottomTrips, setBottomTrips] = useState<Array<{ tripId: string; tripName: string; rating: number; count: number }>>([]);

    // Real-time listener for reviews
    useEffect(() => {
        const reviewsRef = collection(db, "reviews");
        const q = query(reviewsRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reviewsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Review[];

            setReviews(reviewsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching reviews:", error);
            toast({
                title: "Error",
                description: "Failed to load reviews",
                variant: "destructive",
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    // Load top and bottom rated trips
    useEffect(() => {
        const loadTripStats = async () => {
            try {
                const [top, bottom] = await Promise.all([
                    getTopRatedTrips(10),
                    getLowestRatedTrips(10),
                ]);
                setTopTrips(top);
                setBottomTrips(bottom);
            } catch (error) {
                console.error("Error loading trip stats:", error);
            }
        };

        loadTripStats();
    }, [reviews]);

    // Filter reviews based on search and status
    useEffect(() => {
        let filtered = reviews;

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(review =>
                review.tripName.toLowerCase().includes(lowerQuery) ||
                review.userName.toLowerCase().includes(lowerQuery) ||
                review.comment.toLowerCase().includes(lowerQuery)
            );
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter(review => review.status === statusFilter);
        }

        setFilteredReviews(filtered);
    }, [reviews, searchQuery, statusFilter]);

    const handleDeleteClick = (review: Review) => {
        setReviewToDelete(review);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!reviewToDelete) return;

        setDeleting(true);
        try {
            await deleteReview(reviewToDelete.id);
            toast({
                title: "Review deleted",
                description: "Review has been deleted successfully",
            });
            setDeleteDialogOpen(false);
            setReviewToDelete(null);
        } catch (error) {
            console.error("Error deleting review:", error);
            toast({
                title: "Error",
                description: "Failed to delete review",
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
        }
    };

    const handleStatusChange = async (reviewId: string, newStatus: 'pending' | 'approved' | 'rejected') => {
        try {
            await updateReviewStatus(reviewId, newStatus);
            toast({
                title: "Status updated",
                description: `Review ${newStatus} successfully`,
            });
        } catch (error) {
            console.error("Error updating status:", error);
            toast({
                title: "Error",
                description: "Failed to update review status",
                variant: "destructive",
            });
        }
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
        ));
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500">Approved</Badge>;
            case 'rejected':
                return <Badge className="bg-red-500">Rejected</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-500">Pending</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Reviews Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage trip reviews and ratings
                    </p>
                </div>

                {/* Top and Bottom Trips Charts */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                                Top Rated Trips
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                {topTrips.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={topTrips}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" domain={[0, 5]} hide />
                                            <YAxis
                                                dataKey="tripName"
                                                type="category"
                                                width={100}
                                                tick={{ fontSize: 12 }}
                                                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                                            />
                                            <Tooltip
                                                formatter={(value: number) => [value.toFixed(1), 'Rating']}
                                                labelStyle={{ color: 'black' }}
                                            />
                                            <Bar dataKey="rating" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20}>
                                                <LabelList dataKey="rating" position="right" formatter={(val: number) => val.toFixed(1)} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-muted-foreground">
                                        No reviews yet
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingDown className="h-5 w-5 text-red-600" />
                                Lowest Rated Trips
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                {bottomTrips.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={bottomTrips}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" domain={[0, 5]} hide />
                                            <YAxis
                                                dataKey="tripName"
                                                type="category"
                                                width={100}
                                                tick={{ fontSize: 12 }}
                                                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                                            />
                                            <Tooltip
                                                formatter={(value: number) => [value.toFixed(1), 'Rating']}
                                                labelStyle={{ color: 'black' }}
                                            />
                                            <Bar dataKey="rating" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20}>
                                                <LabelList dataKey="rating" position="right" formatter={(val: number) => val.toFixed(1)} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-muted-foreground">
                                        No reviews yet
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex gap-4">
                    <Input
                        placeholder="Search reviews..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Reviews</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Reviews List */}
                {filteredReviews.length === 0 ? (
                    <Card className="p-12 text-center">
                        <p className="text-muted-foreground">No reviews found</p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredReviews.map((review) => (
                            <Card key={review.id}>
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{review.tripName}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        by {review.userName} • {format(review.createdAt.toDate(), "MMM dd, yyyy")}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(review.status)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {renderStars(review.rating)}
                                                <span className="ml-2 text-sm font-medium">{review.rating}/5</span>
                                            </div>
                                            <p className="text-sm">{review.comment}</p>
                                            <div className="flex items-center gap-2 pt-2">
                                                <Select
                                                    value={review.status}
                                                    onValueChange={(value) => handleStatusChange(review.id, value as any)}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="approved">Approve</SelectItem>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="rejected">Reject</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteClick(review)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete this review. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AdminLayout>
    );
};

export default ReviewsManagement;
