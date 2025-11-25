import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { BannerDialog } from "@/components/admin/BannerDialog";
import { Banner, deleteBanner, togglePublish, toggleButton } from "@/services/bannerService";
import { db } from "@/integrations/firebase/client";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const BannerManagement = () => {
    console.log("BannerManagement mounting");
    const { toast } = useToast();
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Real-time listener for banners
    useEffect(() => {
        const bannersRef = collection(db, "banners");
        const q = query(bannersRef, orderBy("created_at", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const bannersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Banner[];

            setBanners(bannersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching banners:", error);
            toast({
                title: "Error",
                description: "Failed to load banners",
                variant: "destructive",
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const handleAddBanner = () => {
        setSelectedBanner(null);
        setDialogOpen(true);
    };

    const handleEditBanner = (banner: Banner) => {
        setSelectedBanner(banner);
        setDialogOpen(true);
    };

    const handleDeleteClick = (banner: Banner) => {
        setBannerToDelete(banner);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!bannerToDelete) return;

        setDeleting(true);
        try {
            await deleteBanner(bannerToDelete.id, bannerToDelete.image_url);
            toast({
                title: "Banner deleted",
                description: "Banner has been deleted successfully",
            });
            setDeleteDialogOpen(false);
            setBannerToDelete(null);
        } catch (error) {
            console.error("Error deleting banner:", error);
            toast({
                title: "Error",
                description: "Failed to delete banner",
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
        }
    };

    const handleTogglePublish = async (banner: Banner) => {
        try {
            await togglePublish(banner.id, !banner.is_published);
            toast({
                title: banner.is_published ? "Banner unpublished" : "Banner published",
                description: `Banner has been ${banner.is_published ? "unpublished" : "published"} successfully`,
            });
        } catch (error) {
            console.error("Error toggling publish:", error);
            toast({
                title: "Error",
                description: "Failed to update banner status",
                variant: "destructive",
            });
        }
    };

    const handleToggleButton = async (banner: Banner) => {
        try {
            await toggleButton(banner.id, !banner.show_button);
            toast({
                title: "Button visibility updated",
                description: `Button is now ${banner.show_button ? "hidden" : "visible"}`,
            });
        } catch (error) {
            console.error("Error toggling button:", error);
            toast({
                title: "Error",
                description: "Failed to update button visibility",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Banner Management</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage hero banners for your website
                        </p>
                    </div>
                    <Button onClick={handleAddBanner}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Banner
                    </Button>
                </div>

                {banners.length === 0 ? (
                    <Card className="p-12 text-center">
                        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Plus className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No banners yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Get started by creating your first banner
                        </p>
                        <Button onClick={handleAddBanner}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Banner
                        </Button>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {banners.map((banner) => (
                            <Card key={banner.id} className="overflow-hidden flex flex-col">
                                {/* Banner Image Preview */}
                                <div className="relative h-48 bg-gray-100 group">
                                    <img
                                        src={banner.image_url}
                                        alt={banner.title || "Banner"}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=Invalid+Image";
                                        }}
                                    />
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        {banner.is_published ? (
                                            <div className="bg-green-500 text-white text-xs px-2 py-1 rounded shadow-sm font-medium">
                                                Published
                                            </div>
                                        ) : (
                                            <div className="bg-gray-500 text-white text-xs px-2 py-1 rounded shadow-sm font-medium">
                                                Unpublished
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Banner Details */}
                                <div className="p-4 space-y-4 flex-1 flex flex-col">
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg line-clamp-1">
                                            {banner.title || <span className="text-gray-400 italic">No Primary Text</span>}
                                        </h3>
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {banner.subtitle || <span className="text-gray-400 italic">No Secondary Text</span>}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className={`w-2 h-2 rounded-full ${banner.show_button ? 'bg-blue-500' : 'bg-gray-300'}`} />
                                        Button: {banner.show_button ? "Active" : "Inactive"}
                                    </div>

                                    <div className="mt-auto pt-4 border-t space-y-3">
                                        {/* Toggle Controls */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Publish Status</span>
                                            <Switch
                                                checked={banner.is_published}
                                                onCheckedChange={() => handleTogglePublish(banner)}
                                            />
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => handleEditBanner(banner)}
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => handleDeleteClick(banner)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Banner Dialog */}
                <BannerDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    banner={selectedBanner}
                    onSuccess={() => {
                        // Banners will update automatically via real-time listener
                    }}
                />

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the banner "{bannerToDelete?.title}". This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AdminLayout>
    );
};

export default BannerManagement;
