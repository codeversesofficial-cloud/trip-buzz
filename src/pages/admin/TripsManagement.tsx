import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, orderBy, deleteDoc, doc, where, addDoc, updateDoc } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Plus, Search, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TripsManagement = () => {
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddTripOpen, setIsAddTripOpen] = useState(false);
  const emptyTripState = {
    title: "",
    location: "",
    price_per_person: "",
    duration_days: "",
    duration_nights: "",
    max_seats: "",
    description: "",
    image_url: "",
    start_date: "",
    inclusions: "",
    exclusions: "",
    category_id: "",
    pickup_point: "",
    pickup_time: "",
    itinerary: "",
    is_featured: false,
    is_top_rated: false,
    is_premium: false,
    is_upcoming: false,
  };

  const [newTrip, setNewTrip] = useState(emptyTripState);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.uid);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const { data: trips, isLoading } = useQuery({
    queryKey: ["admin-trips", searchQuery],
    queryFn: async () => {
      const tripsRef = collection(db, "trips");
      const q = query(tripsRef, orderBy("created_at", "desc"));
      const querySnapshot = await getDocs(q);

      let data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      if (data.length > 0) {
        const categoriesSnapshot = await getDocs(collection(db, "categories"));
        const categoriesMap: Record<string, string> = {};
        categoriesSnapshot.forEach(doc => {
          categoriesMap[doc.id] = doc.data().name;
        });

        data = data.map(trip => ({
          ...trip,
          categories: { name: categoriesMap[trip.category_id] || "Unknown" }
        }));
      }

      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        data = data.filter(trip => trip.title?.toLowerCase().includes(lowerQuery));
      }

      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "categories"));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    },
  });

  const deleteTrip = useMutation({
    mutationFn: async (tripId: string) => {
      await deleteDoc(doc(db, "trips", tripId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
      toast({
        title: "Trip deleted",
        description: "Trip has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete trip.",
      });
    },
  });

  const handleAddTrip = () => {
    setNewTrip(emptyTripState);
    setEditingId(null);
    setIsAddTripOpen(true);
  };

  const handleSaveTrip = async () => {
    if (
      !newTrip.title ||
      !newTrip.location ||
      !newTrip.price_per_person ||
      !newTrip.duration_days ||
      !newTrip.duration_nights ||
      !newTrip.max_seats ||
      !newTrip.start_date ||
      !newTrip.description ||
      !newTrip.image_url ||
      !newTrip.pickup_point ||
      !newTrip.pickup_time ||
      !newTrip.itinerary
    ) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields marked with *.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tripData = {
        ...newTrip,
        price_per_person: Number(newTrip.price_per_person),
        duration_days: Number(newTrip.duration_days),
        duration_nights: Number(newTrip.duration_nights),
        max_seats: Number(newTrip.max_seats),
        inclusions: newTrip.inclusions.split(",").map(item => item.trim()).filter(Boolean),
        exclusions: newTrip.exclusions.split(",").map(item => item.trim()).filter(Boolean),
        category_id: newTrip.category_id,
        pickup_point: newTrip.pickup_point,
        pickup_time: newTrip.pickup_time,
        itinerary: newTrip.itinerary,
        is_featured: newTrip.is_featured,
        is_top_rated: newTrip.is_top_rated,
        is_premium: newTrip.is_premium,
        is_upcoming: newTrip.is_upcoming,
      };

      if (editingId) {
        await updateDoc(doc(db, "trips", editingId), tripData);
        toast({
          title: "Success",
          description: "Trip updated successfully.",
        });
      } else {
        const tripRef = await addDoc(collection(db, "trips"), {
          ...tripData,
          created_at: new Date().toISOString(),
          is_active: true,
          vendor_id: userId,
        });

        // Automatically create a trip_schedule for the trip
        await addDoc(collection(db, "trip_schedules"), {
          trip_id: tripRef.id,
          start_date: newTrip.start_date,
          end_date: new Date(new Date(newTrip.start_date).getTime() + (Number(newTrip.duration_days) - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          available_seats: Number(newTrip.max_seats),
          is_active: true,
          created_at: new Date().toISOString(),
        });

        toast({
          title: "Success",
          description: "Trip added successfully.",
        });
      }

      setIsAddTripOpen(false);
      setNewTrip(emptyTripState);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip"] });
    } catch (error: any) {
      console.error("Error saving trip:", error);
      toast({
        title: "Error",
        description: editingId ? "Failed to update trip." : "Failed to add trip.",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (trip: any) => {
    setNewTrip({
      title: trip.title,
      location: trip.location,
      price_per_person: trip.price_per_person,
      duration_days: trip.duration_days,
      duration_nights: trip.duration_nights,
      max_seats: trip.max_seats,
      description: trip.description,
      image_url: trip.image_url,
      start_date: trip.start_date,
      inclusions: trip.inclusions ? trip.inclusions.join(", ") : "",
      exclusions: trip.exclusions ? trip.exclusions.join(", ") : "",
      category_id: trip.category_id || "",
      pickup_point: trip.pickup_point || "",
      pickup_time: trip.pickup_time || "",
      itinerary: trip.itinerary || "",
      is_featured: trip.is_featured || false,
      is_top_rated: trip.is_top_rated || false,
      is_premium: trip.is_premium || false,
      is_upcoming: trip.is_upcoming || false,
    });
    setEditingId(trip.id);
    setIsAddTripOpen(true);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Trips Management</h1>
            <p className="text-muted-foreground">Manage all trips on the platform</p>
          </div>

          <Button onClick={handleAddTrip}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Trip
          </Button>

          <Dialog open={isAddTripOpen} onOpenChange={(open) => {
            setIsAddTripOpen(open);
            if (!open) {
              setNewTrip(emptyTripState);
              setEditingId(null);
            }
          }}>
            {/* DialogTrigger removed as we control opening via state and button above */}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Trip" : "Add New Trip"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Update trip details." : "Create a new trip listing. All fields are mandatory."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Feature Toggles */}
                <div className="rounded-lg border p-4 bg-muted/20">
                  <h3 className="mb-4 text-sm font-medium text-muted-foreground">OTHER INFORMATION</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_featured" className="cursor-pointer">Featured Trip</Label>
                      <Switch
                        id="is_featured"
                        checked={newTrip.is_featured}
                        onCheckedChange={(checked) => setNewTrip({ ...newTrip, is_featured: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_top_rated" className="cursor-pointer">Top Rated Trip</Label>
                      <Switch
                        id="is_top_rated"
                        checked={newTrip.is_top_rated}
                        onCheckedChange={(checked) => setNewTrip({ ...newTrip, is_top_rated: checked })}
                      />
                    </div>
                    {/* Only show Premium and Upcoming toggles for new trips or non-past trips */}
                    {(!editingId || (editingId && newTrip.start_date && new Date(newTrip.start_date) >= new Date())) && (
                      <>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="is_premium" className="cursor-pointer">Premium Trip</Label>
                          <Switch
                            id="is_premium"
                            checked={newTrip.is_premium}
                            onCheckedChange={(checked) => setNewTrip({ ...newTrip, is_premium: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="is_upcoming" className="cursor-pointer">Upcoming Trip</Label>
                          <Switch
                            id="is_upcoming"
                            checked={newTrip.is_upcoming}
                            onCheckedChange={(checked) => setNewTrip({ ...newTrip, is_upcoming: checked })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                    <Input
                      id="title"
                      value={newTrip.title}
                      onChange={(e) => setNewTrip({ ...newTrip, title: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location <span className="text-red-500">*</span></Label>
                    <Input
                      id="location"
                      value={newTrip.location}
                      onChange={(e) => setNewTrip({ ...newTrip, location: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                    <Select
                      value={newTrip.category_id}
                      onValueChange={(value) => setNewTrip({ ...newTrip, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="price">Price per Person (₹) <span className="text-red-500">*</span></Label>
                    <Input
                      id="price"
                      type="number"
                      value={newTrip.price_per_person}
                      onChange={(e) => setNewTrip({ ...newTrip, price_per_person: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="seats">Max Seats <span className="text-red-500">*</span></Label>
                  <Input
                    id="seats"
                    type="number"
                    value={newTrip.max_seats}
                    onChange={(e) => setNewTrip({ ...newTrip, max_seats: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="days">Duration (Days) <span className="text-red-500">*</span></Label>
                    <Input
                      id="days"
                      type="number"
                      value={newTrip.duration_days}
                      onChange={(e) => setNewTrip({ ...newTrip, duration_days: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nights">Duration (Nights) <span className="text-red-500">*</span></Label>
                    <Input
                      id="nights"
                      type="number"
                      value={newTrip.duration_nights}
                      onChange={(e) => setNewTrip({ ...newTrip, duration_nights: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Start Date <span className="text-red-500">*</span></Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newTrip.start_date}
                    onChange={(e) => setNewTrip({ ...newTrip, start_date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pickup_point">Pickup Point <span className="text-red-500">*</span></Label>
                    <Input
                      id="pickup_point"
                      value={newTrip.pickup_point}
                      onChange={(e) => setNewTrip({ ...newTrip, pickup_point: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pickup_time">Pickup Time <span className="text-red-500">*</span></Label>
                    <Input
                      id="pickup_time"
                      type="time"
                      value={newTrip.pickup_time}
                      onChange={(e) => setNewTrip({ ...newTrip, pickup_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="itinerary">Itinerary <span className="text-red-500">*</span></Label>
                  <div className="h-[250px] mb-12">
                    <ReactQuill
                      theme="snow"
                      value={newTrip.itinerary}
                      onChange={(content) => setNewTrip({ ...newTrip, itinerary: content })}
                      modules={modules}
                      className="h-[200px]"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image">Trip Image URL <span className="text-red-500">*</span></Label>
                  <Input
                    id="image"
                    placeholder="https://example.com/image.jpg"
                    value={newTrip.image_url}
                    onChange={(e) => setNewTrip({ ...newTrip, image_url: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
                  <div className="h-[250px] mb-12">
                    <ReactQuill
                      theme="snow"
                      value={newTrip.description}
                      onChange={(content) => setNewTrip({ ...newTrip, description: content })}
                      modules={modules}
                      className="h-[200px]"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inclusions">Inclusions (comma separated)</Label>
                  <Textarea
                    id="inclusions"
                    placeholder="Breakfast, Lunch, Guide..."
                    value={newTrip.inclusions}
                    onChange={(e) => setNewTrip({ ...newTrip, inclusions: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exclusions">Exclusions (comma separated)</Label>
                  <Textarea
                    id="exclusions"
                    placeholder="Flight, Personal Expenses..."
                    value={newTrip.exclusions}
                    onChange={(e) => setNewTrip({ ...newTrip, exclusions: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddTripOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveTrip}>{editingId ? "Update Trip" : "Create Trip"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-6">
              <Input
                placeholder="Search trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {isLoading ? (
              <div className="py-8 text-center">Loading trips...</div>
            ) : (
              <div className="rounded-md border">
                <Tabs defaultValue="upcoming" className="w-full">
                  <div className="p-4 border-b">
                    <TabsList>
                      <TabsTrigger value="upcoming">Upcoming & Active</TabsTrigger>
                      <TabsTrigger value="past">Past Trips</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="upcoming" className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Seats</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trips?.filter(trip => new Date(trip.start_date) >= new Date()).map((trip) => (
                          <TableRow key={trip.id}>
                            <TableCell className="font-medium">{trip.title}</TableCell>
                            <TableCell>{trip.location}</TableCell>
                            <TableCell>₹{trip.price_per_person}</TableCell>
                            <TableCell>
                              {trip.duration_days}D / {trip.duration_nights}N
                            </TableCell>
                            <TableCell>{trip.max_seats}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${trip.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                  }`}
                              >
                                {trip.is_active ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditClick(trip)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteTrip.mutate(trip.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="past" className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trips?.filter(trip => new Date(trip.start_date) < new Date() && !trip.is_upcoming).map((trip) => (
                          <TableRow key={trip.id}>
                            <TableCell className="font-medium">{trip.title}</TableCell>
                            <TableCell>{trip.location}</TableCell>
                            <TableCell>₹{trip.price_per_person}</TableCell>
                            <TableCell>{trip.start_date}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditClick(trip)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout >
  );
};

export default TripsManagement;
