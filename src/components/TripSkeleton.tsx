import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const TripSkeleton = () => {
    return (
        <Card className="overflow-hidden">
            <div className="h-48 w-full">
                <Skeleton className="h-full w-full" />
            </div>
            <CardContent className="p-4 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between p-4 pt-0">
                <div className="space-y-1">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-10 w-28" />
            </CardFooter>
        </Card>
    );
};
