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
  compare_price?: number;
  duration_days: number;
  duration_nights: number;
  max_seats: number;
  available_seats?: number;
  images: string[];
  category?: { name: string };
}

export const TripCard = ({
  id,
  title,
  location,
  price,
  compare_price,
  duration_days,
  duration_nights,
  max_seats,
  available_seats,
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
        {category && category.name !== 'Unknown' && (
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
            {available_seats !== undefined ? (
              <span className="text-green-600 font-medium">{available_seats} Seats Left</span>
            ) : (
              <span>Up to {max_seats} Guests</span>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <div>
          {compare_price && compare_price > price && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm line-through text-muted-foreground">₹{compare_price.toLocaleString()}</span>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                {Math.round(((compare_price - price) / compare_price) * 100)}% OFF
              </span>
            </div>
          )}
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
