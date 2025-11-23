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
import { Edit, Trash2, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const TripsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddTripOpen, setIsAddTripOpen] = useState(false);
  const [newTrip, setNewTrip] = useState({
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
  });
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
      !newTrip.image_url
    ) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields marked with *.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, "trips", editingId), {
          ...newTrip,
          price_per_person: Number(newTrip.price_per_person),
          duration_days: Number(newTrip.duration_days),
          duration_nights: Number(newTrip.duration_nights),
          max_seats: Number(newTrip.max_seats),
          inclusions: newTrip.inclusions.split(",").map(item => item.trim()).filter(Boolean),
          exclusions: newTrip.exclusions.split(",").map(item => item.trim()).filter(Boolean),
          category_id: newTrip.category_id,
        });
        toast({
          title: "Success",
          description: "Trip updated successfully.",
        });
      } else {
        await addDoc(collection(db, "trips"), {
          ...newTrip,
          price_per_person: Number(newTrip.price_per_person),
          duration_days: Number(newTrip.duration_days),
          duration_nights: Number(newTrip.duration_nights),
          max_seats: Number(newTrip.max_seats),
          inclusions: newTrip.inclusions.split(",").map(item => item.trim()).filter(Boolean),
          exclusions: newTrip.exclusions.split(",").map(item => item.trim()).filter(Boolean),
          category_id: newTrip.category_id,
          created_at: new Date().toISOString(),
          is_active: true,
          vendor_id: userId,
        });
        toast({
          title: "Success",
          description: "Trip added successfully.",
        });
      }

      setIsAddTripOpen(false);
      setNewTrip({
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
      });
      setEditingId(null);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip"] }); // Invalidate individual trip details cache
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

          <Dialog open={isAddTripOpen} onOpenChange={(open) => {
            setIsAddTripOpen(open);
            if (!open) {
              setNewTrip({
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
              });
              setEditingId(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Trip" : "Add New Trip"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Update trip details." : "Create a new trip listing. All fields are mandatory."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                  <Textarea
                    id="description"
                    value={newTrip.description}
                    onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
                  />
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
                    {trips?.map((trip) => (
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
                              <Edit className="h-4 w-4" />
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout >
  );
};

export default TripsManagement;
