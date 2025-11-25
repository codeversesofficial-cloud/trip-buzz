import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, orderBy, doc, updateDoc, where, writeBatch, setDoc, addDoc } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Edit, UserX, UserCheck, Shield, Store, User as UserIcon, Loader2, Download, Upload, Plus } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role?: string;
  roles: string[];
  created_at: any;
  bookingsCount: number;
}

const UsersManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });

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

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", searchQuery],
    queryFn: async () => {
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("created_at", "desc"));
      const querySnapshot = await getDocs(q);

      let usersData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
        const userData = docSnapshot.data();
        const userId = docSnapshot.id;

        // Fetch booking count
        const bookingsRef = collection(db, "bookings");
        const bookingsQuery = query(bookingsRef, where("user_id", "==", userId));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsCount = bookingsSnapshot.size;

        let roles = ["user"];
        if (userData.role) {
          roles = Array.isArray(userData.role) ? userData.role : [userData.role];
        }

        return {
          id: userId,
          email: userData.email || "",
          full_name: userData.full_name || "",
          phone: userData.phone || "",
          role: userData.role,
          roles,
          created_at: userData.created_at,
          bookingsCount,
        } as User;
      }));

      // Filter out vendors as requested by the user
      usersData = usersData.filter(user => !user.roles.includes("vendor"));

      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        usersData = usersData.filter(user =>
          (user.full_name && user.full_name.toLowerCase().includes(lowerQuery)) ||
          (user.email && user.email.toLowerCase().includes(lowerQuery))
        );
      }

      return usersData;
    },
  });

  const [editingName, setEditingName] = useState("");

  const updateUser = useMutation({
    mutationFn: async ({ userId, roles, fullName }: { userId: string; roles: string[], fullName: string }) => {
      const userRef = doc(db, "users", userId);
      const primaryRole = roles.includes("admin") ? "admin" : roles.includes("vendor") ? "vendor" : "user";

      await updateDoc(userRef, {
        role: primaryRole,
        roles: roles,
        full_name: fullName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
      toast({
        title: "User updated",
        description: "User details have been successfully updated.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user details.",
      });
    },
  });

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditingName(user.full_name || "");
    // Ensure roles is an array
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role || "user"];
    setSelectedRoles(userRoles);
  };

  const handleSaveUser = () => {
    if (editingUser) {
      updateUser.mutate({
        userId: editingUser.id,
        roles: selectedRoles.length > 0 ? selectedRoles : ["user"],
        fullName: editingName
      });
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields (Full Name, Email, Password).",
        variant: "destructive",
      });
      return;
    }

    setIsAddingUser(true);

    try {
      // Dynamically import Firebase modules to avoid initial bundle bloat
      const { initializeApp } = await import("firebase/app");
      const { getAuth, createUserWithEmailAndPassword, signOut } = await import("firebase/auth");
      const { firebaseConfig } = await import("@/integrations/firebase/client");

      // Initialize a secondary app to create the user without logging out the admin
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
      const user = userCredential.user;

      // Create user document
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: newUser.email,
        full_name: newUser.full_name,
        phone: newUser.phone,
        role: "user",
        roles: ["user"],
        created_at: new Date().toISOString(),
      });

      // Sign out the secondary user to clean up
      await signOut(secondaryAuth);

      toast({
        title: "Success",
        description: "User account created successfully.",
      });

      setIsAddUserOpen(false);
      setNewUser({
        full_name: "",
        email: "",
        phone: "",
        password: "",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });

    } catch (error: any) {
      console.error("Error adding user:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleExport = () => {
    if (!users || users.length === 0) {
      toast({
        title: "No Data",
        description: "There are no users to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Full Name", "Email", "Phone", "Roles", "Joined", "Bookings"];
    const csvContent = [
      headers.join(","),
      ...users.map(user =>
        [
          `"${user.full_name || ""}"`,
          `"${user.email || ""}"`,
          `"${user.phone || ""}"`,
          `"${user.roles.join(", ")}"`,
          `"${user.created_at && format(user.created_at.toDate ? user.created_at.toDate() : new Date(user.created_at), "yyyy-MM-dd")}"`,
          `"${user.bookingsCount}"`
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "users_export.csv");
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

  const handleBlockUser = (userId: string) => {
    toast({
      title: "Block User",
      description: "User blocking functionality requires database migration. Contact admin.",
    });
  };

  const getRoleBadges = (roles: string[]) => {
    const roleConfig: Record<string, { label: string; icon: any; variant: any }> = {
      admin: { label: "Admin", icon: Shield, variant: "default" },
      vendor: { label: "Vendor", icon: Store, variant: "secondary" },
      user: { label: "User", icon: UserIcon, variant: "outline" },
    };

    // Ensure roles is an array
    const safeRoles = Array.isArray(roles) ? roles : [roles];

    return safeRoles.map((role) => {
      const config = roleConfig[role] || roleConfig.user;
      const Icon = config.icon;
      return (
        <Badge key={role} variant={config.variant} className="mr-1">
          <Icon className="mr-1 h-3 w-3" />
          {config.label}
        </Badge>
      );
    });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Users Management</h1>
            <p className="text-muted-foreground">Manage all users and their roles</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Manually add a new user to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddUser} disabled={isAddingUser}>
                    {isAddingUser ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add User"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="relative">
              <input
                type="file"
                id="import-user"
                className="hidden"
                accept=".csv"
                onChange={handleImport}
              />
              <Button variant="outline" onClick={() => document.getElementById('import-user')?.click()}>
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

        <Card>
          <CardContent className="pt-6">
            <div className="mb-6">
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {isLoading ? (
              <div className="py-8 text-center">Loading users...</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || "N/A"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getRoleBadges(user.roles)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.created_at && format(user.created_at.toDate ? user.created_at.toDate() : new Date(user.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.bookingsCount} bookings</Badge>
                        </TableCell>
                        <TableCell>{user.phone || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleBlockUser(user.id)}
                            >
                              <UserX className="h-4 w-4" />
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
      {/* Edit Roles Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Roles</DialogTitle>
            <DialogDescription>
              Manage roles for {editingUser?.full_name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="fullName"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="role-user"
                checked={selectedRoles.includes("user")}
                onCheckedChange={() => toggleRole("user")}
              />
              <label
                htmlFor="role-user"
                className="flex cursor-pointer items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                User (Default)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="role-admin"
                checked={selectedRoles.includes("admin")}
                onCheckedChange={() => toggleRole("admin")}
              />
              <label
                htmlFor="role-admin"
                className="flex cursor-pointer items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <Shield className="mr-2 h-4 w-4" />
                Admin (Full access)
              </label>
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <p className="font-medium">Selected roles:</p>
              <p className="mt-1">
                {selectedRoles.length > 0 ? selectedRoles.join(", ") : "None (will default to 'user')"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UsersManagement;
