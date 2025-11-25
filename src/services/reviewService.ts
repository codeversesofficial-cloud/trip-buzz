import { db } from "@/integrations/firebase/client";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    addDoc,
} from "firebase/firestore";

export interface Review {
    id: string;
    tripId: string;
    tripName: string;
    userId: string;
    userName: string;
    userEmail: string;
    rating: number; // 1-5
    comment: string;
    createdAt: Timestamp;
    status: 'pending' | 'approved' | 'rejected';
}

export interface ReviewData {
    tripId: string;
    tripName: string;
    userId: string;
    userName: string;
    userEmail: string;
    rating: number;
    comment: string;
    status?: 'pending' | 'approved' | 'rejected';
}

// Create a new review
export const createReview = async (reviewData: ReviewData, userId: string): Promise<string> => {
    try {
        const reviewsRef = collection(db, "reviews");
        const newReview = {
            ...reviewData,
            userId,
            status: reviewData.status || 'approved', // Auto-approve for now
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(reviewsRef, newReview);
        return docRef.id;
    } catch (error) {
        console.error("Error creating review:", error);
        throw error;
    }
};

// Get all reviews
export const getAllReviews = async (): Promise<Review[]> => {
    try {
        const reviewsRef = collection(db, "reviews");
        const q = query(reviewsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Review[];
    } catch (error) {
        console.error("Error getting reviews:", error);
        throw error;
    }
};

// Get reviews by trip
export const getReviewsByTrip = async (tripId: string): Promise<Review[]> => {
    try {
        const reviewsRef = collection(db, "reviews");
        const q = query(
            reviewsRef,
            where("tripId", "==", tripId),
            where("status", "==", "approved"),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Review[];
    } catch (error) {
        console.error("Error getting reviews by trip:", error);
        throw error;
    }
};

// Get reviews by user
export const getReviewsByUser = async (userId: string): Promise<Review[]> => {
    try {
        const reviewsRef = collection(db, "reviews");
        const q = query(
            reviewsRef,
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Review[];
    } catch (error) {
        console.error("Error getting reviews by user:", error);
        throw error;
    }
};

// Update review status
export const updateReviewStatus = async (
    reviewId: string,
    status: 'pending' | 'approved' | 'rejected'
): Promise<void> => {
    try {
        const reviewRef = doc(db, "reviews", reviewId);
        await updateDoc(reviewRef, { status });
    } catch (error) {
        console.error("Error updating review status:", error);
        throw error;
    }
};

// Delete review
export const deleteReview = async (reviewId: string): Promise<void> => {
    try {
        const reviewRef = doc(db, "reviews", reviewId);
        await deleteDoc(reviewRef);
    } catch (error) {
        console.error("Error deleting review:", error);
        throw error;
    }
};

// Get average rating for a trip
export const getAverageRating = async (tripId: string): Promise<{ average: number; count: number }> => {
    try {
        const reviewsRef = collection(db, "reviews");
        const q = query(
            reviewsRef,
            where("tripId", "==", tripId),
            where("status", "==", "approved")
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { average: 0, count: 0 };
        }

        const reviews = snapshot.docs.map(doc => doc.data() as Review);
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const average = totalRating / reviews.length;

        return {
            average: Math.round(average * 10) / 10, // Round to 1 decimal
            count: reviews.length
        };
    } catch (error) {
        console.error("Error calculating average rating:", error);
        throw error;
    }
};

// Get top rated trips
export const getTopRatedTrips = async (limit: number = 10): Promise<Array<{ tripId: string; tripName: string; rating: number; count: number }>> => {
    try {
        const reviewsRef = collection(db, "reviews");
        const q = query(reviewsRef, where("status", "==", "approved"));
        const snapshot = await getDocs(q);

        // Group by trip and calculate averages
        const tripRatings: Record<string, { name: string; ratings: number[] }> = {};

        snapshot.docs.forEach(doc => {
            const review = doc.data() as Review;
            if (!tripRatings[review.tripId]) {
                tripRatings[review.tripId] = {
                    name: review.tripName,
                    ratings: []
                };
            }
            tripRatings[review.tripId].ratings.push(review.rating);
        });

        // Calculate averages and sort
        const tripsWithRatings = Object.entries(tripRatings)
            .map(([tripId, data]) => ({
                tripId,
                tripName: data.name,
                rating: data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length,
                count: data.ratings.length
            }))
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit);

        return tripsWithRatings;
    } catch (error) {
        console.error("Error getting top rated trips:", error);
        throw error;
    }
};

// Get lowest rated trips
export const getLowestRatedTrips = async (limit: number = 10): Promise<Array<{ tripId: string; tripName: string; rating: number; count: number }>> => {
    try {
        const reviewsRef = collection(db, "reviews");
        const q = query(reviewsRef, where("status", "==", "approved"));
        const snapshot = await getDocs(q);

        // Group by trip and calculate averages
        const tripRatings: Record<string, { name: string; ratings: number[] }> = {};

        snapshot.docs.forEach(doc => {
            const review = doc.data() as Review;
            if (!tripRatings[review.tripId]) {
                tripRatings[review.tripId] = {
                    name: review.tripName,
                    ratings: []
                };
            }
            tripRatings[review.tripId].ratings.push(review.rating);
        });

        // Calculate averages and sort (ascending)
        const tripsWithRatings = Object.entries(tripRatings)
            .map(([tripId, data]) => ({
                tripId,
                tripName: data.name,
                rating: data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length,
                count: data.ratings.length
            }))
            .sort((a, b) => a.rating - b.rating)
            .slice(0, limit);

        return tripsWithRatings;
    } catch (error) {
        console.error("Error getting lowest rated trips:", error);
        throw error;
    }
};

// Check if user has already reviewed a trip
export const hasUserReviewedTrip = async (userId: string, tripId: string): Promise<boolean> => {
    try {
        const reviewsRef = collection(db, "reviews");
        const q = query(
            reviewsRef,
            where("userId", "==", userId),
            where("tripId", "==", tripId)
        );
        const snapshot = await getDocs(q);

        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking user review:", error);
        throw error;
    }
};
