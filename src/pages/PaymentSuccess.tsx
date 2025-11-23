import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const PaymentSuccess = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-2xl text-center">
          <CardContent className="pt-12 pb-12">
            <CheckCircle className="mx-auto mb-6 h-24 w-24 text-green-500" />
            <h1 className="mb-4 text-4xl font-bold">Booking Confirmed!</h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Your trip has been successfully booked. We've sent a confirmation to your email.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/dashboard">
                <Button size="lg">View My Bookings</Button>
              </Link>
              <Link to="/trips">
                <Button size="lg" variant="outline">
                  Browse More Trips
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaymentSuccess;
