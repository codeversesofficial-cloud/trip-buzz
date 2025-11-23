import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroCamping from "@/assets/hero-camping.jpg";

export const Hero = () => {
  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-2xl">
      <img
        src={heroCamping}
        alt="Camping adventure in mountains"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
      <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-4 text-5xl font-bold text-white md:text-6xl">
          Discover North India
        </h1>
        <p className="mb-8 text-xl text-white/90 md:text-2xl">
          Verified, Trusted & Ready for Your Adventure
        </p>
        <Link to="/trips">
          <Button size="lg" className="text-lg">
            Explore Trips
          </Button>
        </Link>
      </div>
    </div>
  );
};
