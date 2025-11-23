-- Create vendor applications table
CREATE TABLE public.vendor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip_itinerary table for structured daily itinerary
CREATE TABLE public.trip_itinerary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add storage bucket for vendor documents
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-documents', 'vendor-documents', false);

-- Create storage policies for vendor documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vendor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'vendor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all vendor documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'vendor-documents' AND public.has_role(auth.uid(), 'admin'));

-- Add storage bucket for trip images
INSERT INTO storage.buckets (id, name, public) VALUES ('trip-images', 'trip-images', true);

-- Create storage policies for trip images
CREATE POLICY "Anyone can view trip images"
ON storage.objects FOR SELECT
USING (bucket_id = 'trip-images');

CREATE POLICY "Vendors can upload trip images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'trip-images' AND (public.has_role(auth.uid(), 'vendor') OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Vendors can delete their trip images"
ON storage.objects FOR DELETE
USING (bucket_id = 'trip-images' AND (public.has_role(auth.uid(), 'vendor') OR public.has_role(auth.uid(), 'admin')));

-- Enable RLS on vendor_applications
ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for vendor_applications
CREATE POLICY "Users can create their own applications"
ON public.vendor_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications"
ON public.vendor_applications FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
ON public.vendor_applications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable RLS on trip_itinerary
ALTER TABLE public.trip_itinerary ENABLE ROW LEVEL SECURITY;

-- Create policies for trip_itinerary
CREATE POLICY "Anyone can view trip itineraries"
ON public.trip_itinerary FOR SELECT
USING (true);

CREATE POLICY "Vendors and admins can manage itineraries"
ON public.trip_itinerary FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  EXISTS (
    SELECT 1 FROM public.trips 
    WHERE trips.id = trip_itinerary.trip_id 
    AND trips.vendor_id = auth.uid()
  )
);

-- Create trigger for vendor_applications updated_at
CREATE TRIGGER update_vendor_applications_updated_at
BEFORE UPDATE ON public.vendor_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to send notification
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _message TEXT,
  _type TEXT DEFAULT 'info',
  _link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (_user_id, _title, _message, _type, _link)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create trigger to notify user when vendor application is reviewed
CREATE OR REPLACE FUNCTION public.notify_vendor_application_reviewed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Vendor Application ' || INITCAP(NEW.status),
      CASE 
        WHEN NEW.status = 'approved' THEN 'Congratulations! Your vendor application has been approved. You can now create trips.'
        ELSE 'Your vendor application has been rejected. Please contact support for more information.'
      END,
      CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'error' END,
      '/profile'
    );
    
    -- Assign vendor role if approved
    IF NEW.status = 'approved' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, 'vendor')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_vendor_application_reviewed
AFTER UPDATE ON public.vendor_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_vendor_application_reviewed();

-- Create trigger to notify user when booking is confirmed
CREATE OR REPLACE FUNCTION public.notify_booking_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_title TEXT;
BEGIN
  IF NEW.booking_status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.booking_status != 'confirmed') THEN
    SELECT title INTO trip_title FROM public.trips WHERE id = NEW.trip_id;
    
    PERFORM public.create_notification(
      NEW.user_id,
      'Booking Confirmed',
      'Your booking for "' || trip_title || '" has been confirmed!',
      'success',
      '/profile'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_booking_confirmed
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_booking_confirmed();