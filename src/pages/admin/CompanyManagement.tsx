import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const CompanyManagement = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [userId, setUserId] = useState<string | null>(null);

    // State for the form
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        content: "",
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

    const { data: pages, isLoading } = useQuery({
        queryKey: ["company-pages"],
        queryFn: async () => {
            const pagesRef = collection(db, "company_pages");
            const q = query(pagesRef, orderBy("title"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        },
    });

    const deletePage = useMutation({
        mutationFn: async (pageId: string) => {
            await deleteDoc(doc(db, "company_pages", pageId));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["company-pages"] });
            if (selectedPageId) setSelectedPageId(null);
            resetForm();
            toast({
                title: "Page deleted",
                description: "Company page has been successfully deleted.",
            });
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete page.",
            });
        },
    });

    const resetForm = () => {
        setFormData({
            title: "",
            slug: "",
            content: "",
        });
        setSelectedPageId(null);
    };

    const handleAddNew = () => {
        resetForm();
    };

    const handleSelectPage = (page: any) => {
        setSelectedPageId(page.id);
        setFormData({
            title: page.title || "",
            slug: page.slug || "",
            content: page.content || "",
        });
    };

    const handleSavePage = async () => {
        if (!formData.title || !formData.slug) {
            toast({
                title: "Missing Fields",
                description: "Title and Slug are required.",
                variant: "destructive",
            });
            return;
        }

        try {
            const pageData = {
                ...formData,
                updated_at: new Date().toISOString()
            };

            if (selectedPageId) {
                await updateDoc(doc(db, "company_pages", selectedPageId), pageData);
                toast({
                    title: "Success",
                    description: "Page updated successfully.",
                });
            } else {
                await addDoc(collection(db, "company_pages"), {
                    ...pageData,
                    created_at: new Date().toISOString(),
                });
                toast({
                    title: "Success",
                    description: "Page added successfully.",
                });
            }

            queryClient.invalidateQueries({ queryKey: ["company-pages"] });
            if (!selectedPageId) resetForm(); // Reset only if it was a new add
        } catch (error: any) {
            console.error("Error saving page:", error);
            toast({
                title: "Error",
                description: "Failed to save page.",
                variant: "destructive",
            });
        }
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    return (
        <AdminLayout>
            <div className="container mx-auto px-4 py-8 h-[calc(100vh-100px)]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Company Pages</h1>
                        <p className="text-sm text-muted-foreground">Manage company information pages displayed in the footer.</p>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6 h-full">
                    {/* Sidebar List */}
                    <div className="col-span-12 md:col-span-3 flex flex-col h-full">
                        <Card className="h-full flex flex-col">
                            <div className="p-4 border-b flex items-center justify-between">
                                <span className="font-semibold">List</span>
                                <Button size="sm" variant="outline" onClick={handleAddNew} className="h-8">
                                    <Plus className="h-4 w-4 mr-1" /> Add
                                </Button>
                            </div>
                            <div className="p-2 overflow-y-auto flex-1">
                                {isLoading ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                                ) : (
                                    <div className="space-y-1">
                                        {pages?.map((page) => (
                                            <div
                                                key={page.id}
                                                className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-muted transition-colors ${selectedPageId === page.id ? "bg-muted border-l-4 border-primary" : ""}`}
                                                onClick={() => handleSelectPage(page)}
                                            >
                                                <span className="truncate text-sm font-medium">{page.title}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-50 hover:opacity-100 hover:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm("Are you sure you want to delete this page?")) {
                                                            deletePage.mutate(page.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Main Editor Area */}
                    <div className="col-span-12 md:col-span-9 h-full overflow-y-auto pb-20">
                        <Card>
                            <CardContent className="p-6 space-y-6">
                                <div className="flex items-center justify-between border-b pb-4">
                                    <h2 className="text-xl font-semibold">
                                        {selectedPageId ? `Edit: ${formData.title}` : "New Page"}
                                    </h2>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => window.open(`/company/${formData.slug}`, '_blank')} disabled={!formData.slug}>
                                            Preview
                                        </Button>
                                        <Button onClick={handleSavePage} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                                            <Save className="h-4 w-4 mr-2" />
                                            {selectedPageId ? "Update" : "Publish"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Page Title</Label>
                                        <Input
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => {
                                                const title = e.target.value;
                                                const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                                                setFormData(prev => ({
                                                    ...prev,
                                                    title,
                                                    slug: selectedPageId ? prev.slug : slug,
                                                }));
                                            }}
                                            placeholder="e.g. About Us"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="slug">Slug (URL)</Label>
                                        <div className="flex items-center">
                                            <span className="text-sm text-muted-foreground mr-2">/company/</span>
                                            <Input
                                                id="slug"
                                                value={formData.slug}
                                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                                placeholder="about-us"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Content</Label>
                                    <div className="h-[400px] mb-12">
                                        <ReactQuill
                                            theme="snow"
                                            value={formData.content}
                                            onChange={(content) => setFormData({ ...formData, content })}
                                            modules={modules}
                                            className="h-[350px]"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default CompanyManagement;
