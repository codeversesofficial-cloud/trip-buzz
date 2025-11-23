import { useState } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
} from "firebase/firestore";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Category {
    id: string;
    name: string;
    icon: string;
    description?: string;
    is_visible: boolean;
    parent_id?: string;
}

const CategoryManagement = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        icon: "",
        description: "",
        is_visible: true,
        parent_id: "none",
    });

    // Fetch Categories
    const { data: categories, isLoading } = useQuery({
        queryKey: ["admin-categories"],
        queryFn: async () => {
            const q = query(collection(db, "categories"), orderBy("name"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Category[];
        },
    });

    // Add/Update Mutation
    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            const cleanData = {
                name: data.name,
                icon: data.icon,
                description: data.description,
                is_visible: data.is_visible,
                parent_id: data.parent_id === "none" ? null : data.parent_id,
                updated_at: new Date().toISOString(),
            };

            if (editingCategory) {
                await updateDoc(doc(db, "categories", editingCategory.id), cleanData);
            } else {
                await addDoc(collection(db, "categories"), {
                    ...cleanData,
                    created_at: new Date().toISOString(),
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
            queryClient.invalidateQueries({ queryKey: ["categories"] }); // Invalidate public query too
            toast({
                title: "Success",
                description: `Category ${editingCategory ? "updated" : "created"} successfully`,
            });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteDoc(doc(db, "categories", id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            toast({
                title: "Success",
                description: "Category deleted successfully",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            icon: category.icon,
            description: category.description || "",
            is_visible: category.is_visible,
            parent_id: category.parent_id || "none",
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingCategory(null);
        setFormData({
            name: "",
            icon: "",
            description: "",
            is_visible: true,
            parent_id: "none",
        });
    };

    const getParentName = (parentId?: string) => {
        if (!parentId) return "-";
        const parent = categories?.find((c) => c.id === parentId);
        return parent ? parent.name : "Unknown";
    };

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Category Management</h1>
                    <p className="text-muted-foreground">Manage trip categories and catalog</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Category
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="icon">Icon Image URL</Label>
                                <Input
                                    id="icon"
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    placeholder="https://example.com/image.png"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="parent">Parent Category</Label>
                                <Select
                                    value={formData.parent_id}
                                    onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select parent (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (Root Category)</SelectItem>
                                        {categories
                                            ?.filter((c) => c.id !== editingCategory?.id) // Prevent self-parenting
                                            .map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="visible"
                                    checked={formData.is_visible}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
                                />
                                <Label htmlFor="visible">Visible in Menu</Label>
                            </div>
                            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingCategory ? "Update Category" : "Create Category"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Icon</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Parent Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    Loading categories...
                                </TableCell>
                            </TableRow>
                        ) : categories?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    No categories found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            categories?.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell>
                                        <img
                                            src={category.icon}
                                            alt={category.name}
                                            className="h-10 w-10 object-cover rounded-md"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image";
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {category.name}
                                        {category.description && (
                                            <p className="text-xs text-muted-foreground">{category.description}</p>
                                        )}
                                    </TableCell>
                                    <TableCell>{getParentName(category.parent_id)}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs ${category.is_visible
                                                ? "bg-green-100 text-green-800"
                                                : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {category.is_visible ? "Visible" : "Hidden"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(category)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => {
                                                if (confirm("Are you sure you want to delete this category?")) {
                                                    deleteMutation.mutate(category.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </AdminLayout>
    );
};

export default CategoryManagement;
