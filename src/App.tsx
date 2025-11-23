import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Trips from "./pages/Trips";
import TripDetails from "./pages/TripDetails";
import Booking from "./pages/Booking";
import PaymentSuccess from "./pages/PaymentSuccess";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TripsManagement from "./pages/admin/TripsManagement";
import BookingsManagement from "./pages/admin/BookingsManagement";
import UsersManagement from "./pages/admin/UsersManagement";
import VendorsManagement from "./pages/admin/VendorsManagement";
import CategoryManagement from "./pages/admin/CategoryManagement";
import VendorRegistration from "./pages/VendorRegistration";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/trips/:id" element={<TripDetails />} />
          <Route path="/booking/:tripId" element={<Booking />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/trips" element={<TripsManagement />} />
          <Route path="/admin/bookings" element={<BookingsManagement />} />
          <Route path="/admin/users" element={<UsersManagement />} />
          <Route path="/admin/vendors" element={<VendorsManagement />} />
          <Route path="/admin/categories" element={<CategoryManagement />} />
          <Route path="/vendor/register" element={<VendorRegistration />} />
          <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
