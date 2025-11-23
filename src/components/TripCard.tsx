import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface TripCardProps {
  id: string;
  title: string;
  location: string;
  price: number;
  duration_days: number;
  duration_nights: number;
  max_seats: number;
  images: string[];
  category?: { name: string };
}

export const TripCard = ({
  id,
  title,
  location,
  price,
  duration_days,
  duration_nights,
  max_seats,
  images,
  category,
}: TripCardProps) => {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-xl">
      <div className="relative h-48 overflow-hidden">
        <img
          src={images[0] || "/placeholder.svg"}
          alt={title}
          className="h-full w-full object-cover transition-transform group-hover:scale-110"
        />
        {category && (
          <Badge className="absolute right-2 top-2 bg-primary">
            {category.name}
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="mb-2 text-xl font-bold">{title}</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            {location}
          </div>
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            {duration_nights}N / {duration_days}D
          </div>
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Up to {max_seats} Guests
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <div>
          <div className="text-2xl font-bold text-primary">₹{price.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Per person</div>
        </div>
        <Link to={`/trips/${id}`}>
          <Button>View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
