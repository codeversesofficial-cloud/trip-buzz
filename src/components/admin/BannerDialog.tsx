import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Banner, BannerData, createBanner, updateBanner } from "@/services/bannerService";
import { auth } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, Image as ImageIcon } from "lucide-react";

interface BannerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    banner?: Banner | null;
    onSuccess: () => void;
}

export const BannerDialog = ({ open, onOpenChange, banner, onSuccess }: BannerDialogProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Get current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUserId(user?.uid || null);
        });
        return () => unsubscribe();
    }, []);

    const [formData, setFormData] = useState<BannerData>({
        title: "",
        subtitle: "",
        image_url: "",
        button_text: "Explore Trips",
        button_url: "/trips",
        show_button: true,
        is_published: false,
    });

    // Load banner data when editing
    useEffect(() => {
        if (banner) {
            setFormData({
                title: banner.title || "",
                subtitle: banner.subtitle || "",
                image_url: banner.image_url,
                button_text: banner.button_text,
                button_url: banner.button_url,
                show_button: banner.show_button,
                is_published: banner.is_published,
            });
        } else {
            // Reset form for new banner
            setFormData({
                title: "",
                subtitle: "",
                image_url: "",
                button_text: "Explore Trips",
                button_url: "/trips",
                show_button: true,
                is_published: false,
            });
        }
    }, [banner, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userId) {
            toast({
                title: "Authentication required",
                description: "You must be logged in to manage banners",
                variant: "destructive",
            });
            return;
        }

        // Validation
        if (!formData.image_url) {
            toast({
                title: "Missing required fields",
                description: "Banner Image URL is required",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            if (banner) {
                // Update existing banner
                await updateBanner(banner.id, formData);
                toast({
                    title: "Banner updated",
                    description: "Banner has been updated successfully",
                });
            } else {
                // Create new banner
                await createBanner(formData, userId);
                toast({
                    title: "Banner created",
                    description: "New banner has been created successfully",
                });
            }

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving banner:", error);
            toast({
                title: "Error",
                description: "Failed to save banner. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{banner ? "Edit Banner" : "Add New Banner"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Banner Image URL */}
                    <div className="space-y-2">
                        <Label htmlFor="image_url">Banner Image URL *</Label>
                        <div className="flex gap-2">
                            <Input
                                id="image_url"
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="https://example.com/image.jpg"
                                required
                            />
                        </div>
                        {/* Live Preview */}
                        {formData.image_url && (
                            <div className="mt-2 relative h-48 w-full bg-gray-100 rounded-lg overflow-hidden border">
                                <img
                                    src={formData.image_url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=Invalid+Image+URL";
                                    }}
                                />
                            </div>
                        )}
                        {!formData.image_url && (
                            <div className="mt-2 h-48 w-full bg-gray-50 rounded-lg border border-dashed flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <ImageIcon className="mx-auto h-8 w-8 mb-2" />
                                    <span className="text-sm">Image preview will appear here</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Primary Text */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Primary Text (Optional)</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Discover North India"
                        />
                    </div>

                    {/* Secondary Text */}
                    <div className="space-y-2">
                        <Label htmlFor="subtitle">Secondary Text (Optional)</Label>
                        <Input
                            id="subtitle"
                            value={formData.subtitle}
                            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                            placeholder="e.g. Verified, Trusted & Ready for Your Adventure"
                        />
                    </div>

                    {/* Explore Button Toggle */}
                    <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show_button" className="text-base">Enable Explore Button</Label>
                            <Switch
                                id="show_button"
                                checked={formData.show_button}
                                onCheckedChange={(checked) => setFormData({ ...formData, show_button: checked })}
                            />
                        </div>

                        {formData.show_button && (
                            <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-gray-100">
                                <div className="space-y-2">
                                    <Label htmlFor="button_text">Button Text</Label>
                                    <Input
                                        id="button_text"
                                        value={formData.button_text}
                                        onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                                        placeholder="Explore Trips"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="button_url">Button URL</Label>
                                    <Input
                                        id="button_url"
                                        value={formData.button_url}
                                        onChange={(e) => setFormData({ ...formData, button_url: e.target.value })}
                                        placeholder="/trips"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Publish Toggle */}
                    <div className="flex items-center justify-between border-t pt-4">
                        <Label htmlFor="is_published" className="text-base font-medium">Publish Banner</Label>
                        <Switch
                            id="is_published"
                            checked={formData.is_published}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {banner ? "Update Banner" : "Create Banner"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
