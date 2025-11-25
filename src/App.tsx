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
import CategoryManagement from "./pages/admin/CategoryManagement";
import FooterPagesManagement from "./pages/admin/FooterPagesManagement";
import CompanyManagement from "./pages/admin/CompanyManagement";
import FooterPage from "./pages/FooterPage";
import CompanyPage from "./pages/CompanyPage";
import NotFound from "./pages/NotFound";
import ProfileManagement from "./pages/admin/ProfileManagement";
import BannerManagement from "./pages/admin/BannerManagement";
import ReviewsManagement from "./pages/admin/ReviewsManagement";

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
          <Route path="/admin/categories" element={<CategoryManagement />} />
          <Route path="/admin/footer-pages" element={<FooterPagesManagement />} />
          <Route path="/admin/company" element={<CompanyManagement />} />
          <Route path="/admin/profile" element={<ProfileManagement />} />
          <Route path="/admin/banner-management" element={<BannerManagement />} />
          <Route path="/admin/reviews" element={<ReviewsManagement />} />
          <Route path="/page/:slug" element={<FooterPage />} />
          <Route path="/company/:slug" element={<CompanyPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
