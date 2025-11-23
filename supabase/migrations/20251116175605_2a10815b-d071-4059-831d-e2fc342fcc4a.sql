-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table (security best practice - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  meeting_point TEXT,
  price_per_person DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  duration_nights INTEGER NOT NULL,
  max_seats INTEGER NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  vendor_id UUID REFERENCES public.profiles(id),
  images TEXT[], -- Array of image URLs
  inclusions TEXT[],
  exclusions TEXT[],
  itinerary JSONB, -- Store day-by-day itinerary
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trip_schedules table
CREATE TABLE public.trip_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  available_seats INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  trip_id UUID NOT NULL REFERENCES public.trips(id),
  schedule_id UUID NOT NULL REFERENCES public.trip_schedules(id),
  number_of_people INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- 'cod' or 'online'
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
  booking_status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Categories policies (public read, admin write)
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trips policies
CREATE POLICY "Anyone can view active trips"
  ON public.trips FOR SELECT
  USING (is_active = true OR vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can insert own trips"
  ON public.trips FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'vendor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendors can update own trips"
  ON public.trips FOR UPDATE
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete trips"
  ON public.trips FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trip schedules policies
CREATE POLICY "Anyone can view active schedules"
  ON public.trip_schedules FOR SELECT
  USING (true);

CREATE POLICY "Vendors and admins can manage schedules"
  ON public.trip_schedules FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_schedules.trip_id
      AND trips.vendor_id = auth.uid()
    )
  );

-- Bookings policies
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = bookings.trip_id
      AND trips.vendor_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin')
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Check if this is the admin email and assign admin role
  IF NEW.email = 'sahildhiman034@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, description, icon) VALUES
  ('Trekking', 'Adventure treks in the mountains', '🏔️'),
  ('Adventure', 'Thrilling adventure activities', '🎿'),
  ('Weekend', 'Quick weekend getaways', '🏕️'),
  ('Family', 'Family-friendly trips', '👨‍👩‍👧‍👦'),
  ('Religious', 'Spiritual and religious tours', '🙏');

-- Insert sample trips for North India
INSERT INTO public.trips (
  title, description, location, meeting_point, price_per_person, 
  duration_days, duration_nights, max_seats, category_id, images,
  inclusions, exclusions, itinerary
) VALUES
  (
    'Manali Adventure 3N/4D',
    'Experience the beauty of Manali with adventure activities and scenic views',
    'Manali, Himachal Pradesh',
    'Manali Bus Stand',
    4999.00,
    4, 3, 20,
    (SELECT id FROM public.categories WHERE name = 'Adventure' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1506905925346-21bda4d32df4'],
    ARRAY['Accommodation', 'Breakfast', 'Transport', 'Guide'],
    ARRAY['Lunch & Dinner', 'Personal expenses', 'Adventure activity fees'],
    '{"day1": "Arrival and check-in", "day2": "Solang Valley visit", "day3": "Rohtang Pass excursion", "day4": "Departure"}'::jsonb
  ),
  (
    'Shimla Heritage Walk 2N/3D',
    'Explore the colonial charm of Shimla with heritage walks',
    'Shimla, Himachal Pradesh',
    'Shimla Railway Station',
    3499.00,
    3, 2, 15,
    (SELECT id FROM public.categories WHERE name = 'Weekend' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1559827260-dc66d52bef19'],
    ARRAY['Accommodation', 'Breakfast', 'City tour'],
    ARRAY['Meals', 'Personal expenses'],
    '{"day1": "Arrival and Mall Road", "day2": "Kufri and Jakhu Temple", "day3": "Departure"}'::jsonb
  ),
  (
    'Kasol Backpacking 2N/3D',
    'Backpacking trip to the mini Israel of India',
    'Kasol, Himachal Pradesh',
    'Bhuntar Airport',
    2999.00,
    3, 2, 25,
    (SELECT id FROM public.categories WHERE name = 'Trekking' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99'],
    ARRAY['Accommodation', 'Bonfire', 'Transport'],
    ARRAY['All meals', 'Personal expenses'],
    '{"day1": "Arrival and Kasol exploration", "day2": "Chalal village trek", "day3": "Departure"}'::jsonb
  );

-- Insert sample schedules for trips
INSERT INTO public.trip_schedules (trip_id, start_date, end_date, available_seats)
SELECT 
  id, 
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '11 days',
  max_seats
FROM public.trips;

INSERT INTO public.trip_schedules (trip_id, start_date, end_date, available_seats)
SELECT 
  id, 
  CURRENT_DATE + INTERVAL '14 days',
  CURRENT_DATE + INTERVAL '18 days',
  max_seats
FROM public.trips;