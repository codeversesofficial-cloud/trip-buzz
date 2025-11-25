import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2, Upload, Image as ImageIcon, Instagram, Youtube, Facebook, Linkedin, Twitter } from "lucide-react";

const ProfileManagement = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        contact_number: "",
        company_address: "",
        company_name: "",
        country: "",
        timezone: "",
        short_code: "2d98b5", // Default or fetched
        light_logo: "",
        dark_logo: "",
        social_links: {
            instagram: { enabled: false, url: "" },
            youtube: { enabled: false, url: "" },
            facebook: { enabled: false, url: "" },
            linkedin: { enabled: false, url: "" },
            twitter: { enabled: false, url: "" }
        },
        footer_heading: "Ready to explore the world?",
        footer_description: "Join thousands of travelers finding their perfect trip with TripBuzz. Unmatched comfort and unforgettable experiences await.",
        footer_button_text: "Find your trip →",
        footer_button_url: "/trips",
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const docRef = doc(db, "organization_settings", "profile");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Ensure social_links structure exists if fetching old data
                const mergedData = {
                    ...formData,
                    ...data,
                    social_links: {
                        ...formData.social_links,
                        ...(data.social_links || {})
                    }
                };
                setFormData(mergedData);
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSocialChange = (platform: keyof typeof formData.social_links, field: 'enabled' | 'url', value: any) => {
        setFormData(prev => ({
            ...prev,
            social_links: {
                ...prev.social_links,
                [platform]: {
                    ...prev.social_links[platform],
                    [field]: value
                }
            }
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'light_logo' | 'dark_logo') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsSaving(true);
            const storageRef = ref(storage, `logos/${type}_${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            setFormData(prev => ({ ...prev, [type]: url }));
            toast({
                title: "Image Uploaded",
                description: "Logo has been uploaded successfully.",
            });
        } catch (error) {
            console.error("Error uploading image:", error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "Failed to upload image. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await setDoc(doc(db, "organization_settings", "profile"), formData);
            toast({
                title: "Success",
                description: "Organization details updated successfully.",
            });
        } catch (error) {
            console.error("Error saving profile:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save details.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-screen">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold uppercase text-gray-700">Profile</h1>
                </div>

                <Card className="border-none shadow-sm bg-white mb-8">
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
                        <div>
                            <CardTitle className="text-xl text-gray-800">Organization details</CardTitle>
                            <CardDescription className="mt-1">View and edit your organization's profile details.</CardDescription>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white min-w-[100px] rounded-full"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-8">
                        {/* Logos Section */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
                            <div className="md:col-span-6">
                                <Label className="block mb-3 text-gray-600">Light Theme Logo</Label>
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center h-[160px] relative group cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={(e) => handleImageUpload(e, 'light_logo')}
                                    />
                                    {formData.light_logo ? (
                                        <img src={formData.light_logo} alt="Light Logo" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                            <span className="text-xs">Click to upload</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-red-500 mt-2">Image Size 300x100</p>
                            </div>

                            <div className="md:col-span-6">
                                <Label className="block mb-3 text-gray-600">Dark Theme Logo</Label>
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center h-[160px] relative group cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={(e) => handleImageUpload(e, 'dark_logo')}
                                    />
                                    {formData.dark_logo ? (
                                        <img src={formData.dark_logo} alt="Dark Logo" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                            <span className="text-xs">Click to upload</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-red-500 mt-2">Image Size 300x100</p>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="space-y-2">
                                <Label className="text-gray-500 uppercase text-xs font-semibold tracking-wider">Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className="h-12 border-gray-300"
                                    placeholder="Company Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-500 uppercase text-xs font-semibold tracking-wider">Email</Label>
                                <Input
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className="h-12 border-gray-300"
                                    placeholder="admin@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-500 uppercase text-xs font-semibold tracking-wider">Contact Number</Label>
                                <Input
                                    value={formData.contact_number}
                                    onChange={(e) => handleInputChange('contact_number', e.target.value)}
                                    className="h-12 border-gray-300"
                                    placeholder="+91..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="space-y-2">
                                <Label className="text-gray-500 uppercase text-xs font-semibold tracking-wider">Company Address</Label>
                                <Input
                                    value={formData.company_address}
                                    onChange={(e) => handleInputChange('company_address', e.target.value)}
                                    className="h-12 border-gray-300"
                                    placeholder="Address"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-500 uppercase text-xs font-semibold tracking-wider">Company Name</Label>
                                <Input
                                    value={formData.company_name}
                                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                                    className="h-12 border-gray-300"
                                    placeholder="Legal Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-500 uppercase text-xs font-semibold tracking-wider">Country</Label>
                                <Select
                                    value={formData.country}
                                    onValueChange={(value) => handleInputChange('country', value)}
                                >
                                    <SelectTrigger className="h-12 border-gray-300">
                                        <SelectValue placeholder="Select Country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INDIA">INDIA</SelectItem>
                                        <SelectItem value="USA">USA</SelectItem>
                                        <SelectItem value="UK">UK</SelectItem>
                                        <SelectItem value="UAE">UAE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2 md:col-span-1">
                                <Label className="text-gray-500 uppercase text-xs font-semibold tracking-wider">Timezone</Label>
                                <Select
                                    value={formData.timezone}
                                    onValueChange={(value) => handleInputChange('timezone', value)}
                                >
                                    <SelectTrigger className="h-12 border-gray-300">
                                        <SelectValue placeholder="Select Timezone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                                        <SelectItem value="Asia/Riyadh">Asia/Riyadh (UTC+03:00)</SelectItem>
                                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer Customization Section */}
                <Card className="border-none shadow-sm bg-white mb-8">
                    <CardHeader className="border-b pb-6">
                        <CardTitle className="text-xl text-gray-800">Footer Customization</CardTitle>
                        <CardDescription className="mt-1">Customize the footer text and call-to-action.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-gray-500 uppercase text-xs font-semibold tracking-wider">Heading</Label>
                                <Input
                                    value={formData.footer_heading}
                                    onChange={(e) => handleInputChange('footer_heading', e.target.value)}
                                    className="h-12 border-gray-300"
                                    placeholder="Register your properties with us."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-500 uppercase text-xs font-semibold tracking-wider">Button Text</Label>
                                <Input
                                    value={formData.footer_button_text}
                                    onChange={(e) => handleInputChange('footer_button_text', e.target.value)}
                                    className="h-12 border-gray-300"
                                    placeholder="Grow your business with us →"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-500 uppercase text-xs font-semibold tracking-wider">Description</Label>
                            <Textarea
                                value={formData.footer_description}
                                onChange={(e) => handleInputChange('footer_description', e.target.value)}
                                className="min-h-[100px] border-gray-300"
                                placeholder="With best-in-class properties..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-500 uppercase text-xs font-semibold tracking-wider">Button URL</Label>
                            <Input
                                value={formData.footer_button_url}
                                onChange={(e) => handleInputChange('footer_button_url', e.target.value)}
                                className="h-12 border-gray-300"
                                placeholder="#"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Social Media Section */}
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="border-b pb-6">
                        <CardTitle className="text-xl text-gray-800">Social Media Links</CardTitle>
                        <CardDescription className="mt-1">Manage your social media presence.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                        {/* Instagram */}
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                                <Instagram size={20} />
                            </div>
                            <div className="flex-1">
                                <Label className="mb-2 block">Instagram</Label>
                                <Input
                                    value={formData.social_links.instagram.url}
                                    onChange={(e) => handleSocialChange('instagram', 'url', e.target.value)}
                                    placeholder="https://instagram.com/..."
                                    className="h-10"
                                    disabled={!formData.social_links.instagram.enabled}
                                />
                            </div>
                            <div className="flex flex-col items-center pt-6">
                                <Switch
                                    checked={formData.social_links.instagram.enabled}
                                    onCheckedChange={(checked) => handleSocialChange('instagram', 'enabled', checked)}
                                />
                            </div>
                        </div>

                        {/* YouTube */}
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <Youtube size={20} />
                            </div>
                            <div className="flex-1">
                                <Label className="mb-2 block">YouTube</Label>
                                <Input
                                    value={formData.social_links.youtube.url}
                                    onChange={(e) => handleSocialChange('youtube', 'url', e.target.value)}
                                    placeholder="https://youtube.com/..."
                                    className="h-10"
                                    disabled={!formData.social_links.youtube.enabled}
                                />
                            </div>
                            <div className="flex flex-col items-center pt-6">
                                <Switch
                                    checked={formData.social_links.youtube.enabled}
                                    onCheckedChange={(checked) => handleSocialChange('youtube', 'enabled', checked)}
                                />
                            </div>
                        </div>

                        {/* Facebook */}
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <Facebook size={20} />
                            </div>
                            <div className="flex-1">
                                <Label className="mb-2 block">Facebook</Label>
                                <Input
                                    value={formData.social_links.facebook.url}
                                    onChange={(e) => handleSocialChange('facebook', 'url', e.target.value)}
                                    placeholder="https://facebook.com/..."
                                    className="h-10"
                                    disabled={!formData.social_links.facebook.enabled}
                                />
                            </div>
                            <div className="flex flex-col items-center pt-6">
                                <Switch
                                    checked={formData.social_links.facebook.enabled}
                                    onCheckedChange={(checked) => handleSocialChange('facebook', 'enabled', checked)}
                                />
                            </div>
                        </div>

                        {/* LinkedIn */}
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
                                <Linkedin size={20} />
                            </div>
                            <div className="flex-1">
                                <Label className="mb-2 block">LinkedIn</Label>
                                <Input
                                    value={formData.social_links.linkedin.url}
                                    onChange={(e) => handleSocialChange('linkedin', 'url', e.target.value)}
                                    placeholder="https://linkedin.com/in/..."
                                    className="h-10"
                                    disabled={!formData.social_links.linkedin.enabled}
                                />
                            </div>
                            <div className="flex flex-col items-center pt-6">
                                <Switch
                                    checked={formData.social_links.linkedin.enabled}
                                    onCheckedChange={(checked) => handleSocialChange('linkedin', 'enabled', checked)}
                                />
                            </div>
                        </div>

                        {/* X (Twitter) */}
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-900">
                                <Twitter size={20} />
                            </div>
                            <div className="flex-1">
                                <Label className="mb-2 block">X (Twitter)</Label>
                                <Input
                                    value={formData.social_links.twitter.url}
                                    onChange={(e) => handleSocialChange('twitter', 'url', e.target.value)}
                                    placeholder="https://x.com/..."
                                    className="h-10"
                                    disabled={!formData.social_links.twitter.enabled}
                                />
                            </div>
                            <div className="flex flex-col items-center pt-6">
                                <Switch
                                    checked={formData.social_links.twitter.enabled}
                                    onCheckedChange={(checked) => handleSocialChange('twitter', 'enabled', checked)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default ProfileManagement;
