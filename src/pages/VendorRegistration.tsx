import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

const VendorRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    businessName: "",
    phone: "",
    description: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to apply as a vendor",
          variant: "destructive",
        });
        navigate("/auth");
      } else {
        setUserId(user.uid);
      }
    });
    return () => unsubscribe();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      let documentUrl = null;

      // Upload document if provided - Note: Firebase Storage is not fully set up in this migration
      // We will skip the actual file upload for now and just store the file name if present
      if (document) {
        // In a real implementation with Firebase Storage:
        // const storageRef = ref(storage, `vendor-documents/${userId}/${document.name}`);
        // await uploadBytes(storageRef, document);
        // documentUrl = await getDownloadURL(storageRef);
        documentUrl = `mock_url/${document.name}`;
      }

      // Create vendor application
      await addDoc(collection(db, "vendor_applications"), {
        user_id: userId,
        business_name: formData.businessName,
        phone: formData.phone,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        document_url: documentUrl,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      // Create notifications for admins
      const usersRef = collection(db, "users");

      // Query for users with role 'admin'
      const roleQuery = query(usersRef, where("role", "==", "admin"));
      const roleSnapshot = await getDocs(roleQuery);

      // Query for users with 'admin' in roles array
      const rolesArrayQuery = query(usersRef, where("roles", "array-contains", "admin"));
      const rolesArraySnapshot = await getDocs(rolesArrayQuery);

      // Query for the specific admin email (fallback)
      const emailQuery = query(usersRef, where("email", "==", "sahildhiman034@gmail.com"));
      const emailSnapshot = await getDocs(emailQuery);

      // Combine and deduplicate admins
      const adminIds = new Set<string>();
      roleSnapshot.docs.forEach(doc => adminIds.add(doc.id));
      rolesArraySnapshot.docs.forEach(doc => adminIds.add(doc.id));
      emailSnapshot.docs.forEach(doc => adminIds.add(doc.id));

      const notificationsBatch = Array.from(adminIds).map(adminId => {
        return addDoc(collection(db, "notifications"), {
          user_id: adminId,
          title: "New Vendor Application",
          message: `New application from ${formData.businessName}`,
          type: "vendor_application",
          is_read: false,
          link: "/admin/vendors",
          created_at: new Date().toISOString()
        });
      });

      // Add to global activity log
      notificationsBatch.push(
        addDoc(collection(db, "activities"), {
          type: "vendor_application",
          message: `New vendor application: ${formData.businessName}`,
          created_at: new Date().toISOString(),
          link: "/admin/vendors"
        })
      );

      await Promise.all(notificationsBatch);

      toast({
        title: "Application Submitted",
        description: "Your vendor application has been submitted successfully. We'll review it soon!",
      });
      navigate("/profile");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Become a Vendor</CardTitle>
            <CardDescription>
              Fill out this form to apply as a trip vendor. We'll review your application and get back to you soon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    required
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">KYC Document (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setDocument(e.target.files?.[0] || null)}
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload business registration, PAN card, or Aadhar card
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VendorRegistration;
