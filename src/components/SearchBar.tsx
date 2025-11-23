import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const SearchBar = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.append("location", location);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    navigate(`/trips?${params.toString()}`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow-lg">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Enter location"
            className="pl-10"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Check In"
            className="pl-10"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Check Out"
            className="pl-10"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Button onClick={handleSearch} className="w-full">
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>
    </div>
  );
};
