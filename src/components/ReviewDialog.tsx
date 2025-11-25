import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, Loader2 } from "lucide-react";
import { createReview } from "@/services/reviewService";
import { auth } from "@/integrations/firebase/client";

interface ReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tripId: string;
    tripName: string;
}

export const ReviewDialog = ({ open, onOpenChange, tripId, tripName }: ReviewDialogProps) => {
    const { toast } = useToast();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!auth.currentUser) {
            toast({
                title: "Error",
                description: "You must be logged in to submit a review",
                variant: "destructive",
            });
            return;
        }

        if (rating === 0) {
            toast({
                title: "Error",
                description: "Please select a rating",
                variant: "destructive",
            });
            return;
        }

        if (comment.trim().length < 10) {
            toast({
                title: "Error",
                description: "Please provide a comment (at least 10 characters)",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        try {
            await createReview(
                {
                    tripId,
                    tripName,
                    userId: auth.currentUser.uid,
                    userName: auth.currentUser.displayName || "Anonymous",
                    userEmail: auth.currentUser.email || "",
                    rating,
                    comment: comment.trim(),
                    status: "approved", // Auto-approve reviews
                },
                auth.currentUser.uid
            );

            toast({
                title: "Review submitted!",
                description: "Thank you for your feedback",
            });

            // Reset form
            setRating(0);
            setComment("");
            onOpenChange(false);
        } catch (error) {
            console.error("Error submitting review:", error);
            toast({
                title: "Error",
                description: "Failed to submit review. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Write a Review</DialogTitle>
                    <DialogDescription>
                        Share your experience with <span className="font-semibold">{tripName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Star Rating */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Your Rating</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`h-10 w-10 ${star <= (hoverRating || rating)
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-gray-300"
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                        {rating > 0 && (
                            <p className="text-sm text-muted-foreground">
                                {rating === 1 && "Poor"}
                                {rating === 2 && "Fair"}
                                {rating === 3 && "Good"}
                                {rating === 4 && "Very Good"}
                                {rating === 5 && "Excellent"}
                            </p>
                        )}
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Your Review</label>
                        <Textarea
                            placeholder="Tell us about your experience..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={5}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            {comment.length} characters (minimum 10)
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Review
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
