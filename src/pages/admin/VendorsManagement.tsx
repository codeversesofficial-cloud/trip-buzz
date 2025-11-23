import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc, where, addDoc, setDoc } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Eye, Loader2, Download, Upload, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface VendorApplication {
  id: string;
  user_id: string;
  business_name: string;
  phone: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  document_url: string | null;
  status: string;
  created_at: any; // Firestore Timestamp or Date
  profiles: {
    email: string;
    full_name: string | null;
  };
}

const VendorsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<VendorApplication | null>(null);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({
    business_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    password: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.uid);
        setUserEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Hardcoded check for the specific admin email
      if (userEmail === "sahildhiman034@gmail.com") {
        return true;
      }

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", userId), where("role", "==", "admin"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        navigate("/");
        return false;
      }
      return true;
    },
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["vendor-applications"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const applicationsRef = collection(db, "vendor_applications");
      const q = query(applicationsRef, orderBy("created_at", "desc"));
      const querySnapshot = await getDocs(q);

      const appsData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
        const appData = docSnapshot.data();
        const appId = docSnapshot.id;

        // Fetch profile
        let profileData: any = { email: "", full_name: "" };
        if (appData.user_id) {
          const userDoc = await getDoc(doc(db, "users", appData.user_id));
          if (userDoc.exists()) {
            profileData = userDoc.data();
          }
        }

        return {
          id: appId,
          ...appData,
          profiles: { email: profileData.email || "", full_name: profileData.full_name || "" }
        };
      }));

      return appsData as VendorApplication[];
    },
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const appRef = doc(db, "vendor_applications", id);
      await updateDoc(appRef, {
        status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-applications"] });
      toast({
        title: "Success",
        description: "Application status updated successfully",
      });
      setSelectedApplication(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    if (!applications.length) {
      toast({
        title: "No Data",
        description: "There are no vendors to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Business Name", "Email", "Phone", "City", "State", "Status", "Password"];
    const csvContent = [
      headers.join(","),
      ...applications.map(app =>
        [
          `"${app.business_name}"`,
          `"${app.profiles.email}"`,
          `"${app.phone}"`,
          `"${app.city}"`,
          `"${app.state}"`,
          `"${app.status}"`,
          `"********"` // Password placeholder for security
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "vendors_export.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "Import Initiated",
        description: `Selected file: ${file.name}. Import functionality is coming soon.`,
      });
      // Reset input
      event.target.value = "";
    }
  };

  const handleAddVendor = async () => {
    if (!newVendor.email || !newVendor.password || !newVendor.business_name) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields (Business Name, Email, Password).",
        variant: "destructive",
      });
      return;
    }

    try {
      // Dynamically import Firebase modules to avoid initial bundle bloat if possible, 
      // but here we need them for the secondary app.
      const { initializeApp } = await import("firebase/app");
      const { getAuth, createUserWithEmailAndPassword, signOut } = await import("firebase/auth");
      const { firebaseConfig } = await import("@/integrations/firebase/client");

      // Initialize a secondary app to create the user without logging out the admin
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newVendor.email, newVendor.password);
      const user = userCredential.user;

      // Create user document
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: newVendor.email,
        full_name: newVendor.business_name, // Using business name as full name for simplicity
        role: "vendor",
        created_at: new Date().toISOString(),
      });

      // Create vendor application document (approved by default)
      await addDoc(collection(db, "vendor_applications"), {
        user_id: user.uid,
        business_name: newVendor.business_name,
        phone: newVendor.phone,
        city: newVendor.city,
        state: newVendor.state,
        status: "approved",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        description: "Manually added by admin",
        address: "",
        pincode: "",
        document_url: "",
      });

      // Assign vendor role in user_roles collection
      await addDoc(collection(db, "user_roles"), {
        user_id: user.uid,
        role: "vendor",
        created_at: new Date().toISOString(),
      });

      // Sign out the secondary user to clean up
      await signOut(secondaryAuth);

      toast({
        title: "Success",
        description: "Vendor account created successfully.",
      });

      setIsAddVendorOpen(false);
      setNewVendor({
        business_name: "",
        email: "",
        phone: "",
        city: "",
        state: "",
        password: "",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor-applications"] });

    } catch (error: any) {
      console.error("Error adding vendor:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) return null;

  const pendingApplications = applications.filter((app) => app.status === "pending");
  const approvedApplications = applications.filter((app) => app.status === "approved");
  const rejectedApplications = applications.filter((app) => app.status === "rejected");

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Vendor Management</h1>
            <p className="text-muted-foreground">Review and manage vendor applications</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Vendor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vendor</DialogTitle>
                  <DialogDescription>
                    Manually add a new vendor to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <Input
                      id="business_name"
                      value={newVendor.business_name}
                      onChange={(e) => setNewVendor({ ...newVendor, business_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newVendor.email}
                      onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newVendor.password}
                      onChange={(e) => setNewVendor({ ...newVendor, password: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newVendor.phone}
                      onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddVendorOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddVendor}>Add Vendor</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="relative">
              <input
                type="file"
                id="import-vendor"
                className="hidden"
                accept=".csv"
                onChange={handleImport}
              />
              <Button variant="outline" onClick={() => document.getElementById('import-vendor')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>

            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Applications ({pendingApplications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApplications.length === 0 ? (
                  <p className="text-muted-foreground">No pending applications</p>
                ) : (
                  pendingApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between border rounded-lg p-4"
                    >
                      <div>
                        <h3 className="font-semibold">{app.business_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {app.profiles.email} • {app.phone}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {app.city}, {app.state}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedApplication(app)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            updateApplicationMutation.mutate({ id: app.id, status: "approved" })
                          }
                          disabled={updateApplicationMutation.isPending}
                        >
                          {updateApplicationMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateApplicationMutation.mutate({ id: app.id, status: "rejected" })
                          }
                          disabled={updateApplicationMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approved Vendors ({approvedApplications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvedApplications.length === 0 ? (
                  <p className="text-muted-foreground">No approved vendors yet</p>
                ) : (
                  approvedApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between border rounded-lg p-4"
                    >
                      <div>
                        <h3 className="font-semibold">{app.business_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {app.profiles.email} • {app.phone}
                        </p>
                        <Badge variant="outline" className="mt-2">
                          Approved
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedApplication(app)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rejected Applications ({rejectedApplications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rejectedApplications.length === 0 ? (
                  <p className="text-muted-foreground">No rejected applications</p>
                ) : (
                  rejectedApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between border rounded-lg p-4 opacity-70"
                    >
                      <div>
                        <h3 className="font-semibold">{app.business_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {app.profiles.email} • {app.phone}
                        </p>
                        <Badge variant="destructive" className="mt-2">
                          Rejected
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedApplication(app)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>Review vendor application information</DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Business Name</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedApplication.business_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{selectedApplication.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedApplication.profiles.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge>{selectedApplication.status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground">
                  {selectedApplication.description || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">
                  {selectedApplication.address}, {selectedApplication.city},{" "}
                  {selectedApplication.state} - {selectedApplication.pincode}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default VendorsManagement;
