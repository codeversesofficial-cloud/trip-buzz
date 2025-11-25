import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Loader2 } from "lucide-react";

const CompanyPage = () => {
    const { slug } = useParams<{ slug: string }>();

    const { data: page, isLoading, error } = useQuery({
        queryKey: ["company-page", slug],
        queryFn: async () => {
            const pagesRef = collection(db, "company_pages");
            const q = query(pagesRef, where("slug", "==", slug));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("Page not found");
            }

            return querySnapshot.docs[0].data();
        },
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 py-16 text-center">
                    <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
                    <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-16">
                <article className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold mb-8">{page.title}</h1>
                    <div
                        className="prose prose-lg max-w-none"
                        dangerouslySetInnerHTML={{ __html: page.content }}
                    />
                </article>
            </div>
            <Footer />
        </div>
    );
};

export default CompanyPage;
