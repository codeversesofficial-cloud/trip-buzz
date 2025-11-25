import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";

const FooterPage = () => {
    const { slug } = useParams();

    const { data: page, isLoading } = useQuery({
        queryKey: ["footer-page", slug],
        queryFn: async () => {
            const pagesRef = collection(db, "footer_pages");
            const q = query(pagesRef, where("slug", "==", slug));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) return null;
            return querySnapshot.docs[0].data();
        },
    });

    useEffect(() => {
        if (page) {
            document.title = page.meta_title || page.title || "TripBuzz";
        }
    }, [page]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 py-12 text-center">
                    Loading...
                </div>
                <Footer />
            </div>
        );
    }

    if (!page) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 py-12 text-center">
                    <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
                    <p className="text-muted-foreground">The page you are looking for does not exist.</p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-12">
                <h1 className="text-4xl font-bold mb-8">{page.title}</h1>
                <div
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />
            </main>
            <Footer />
        </div>
    );
};

export default FooterPage;
