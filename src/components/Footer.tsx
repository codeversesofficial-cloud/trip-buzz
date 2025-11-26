import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, query, orderBy, doc, getDoc, onSnapshot } from "firebase/firestore";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";

export const Footer = () => {
    const { data: pages } = useQuery({
        queryKey: ["footer-pages-list"],
        queryFn: async () => {
            const pagesRef = collection(db, "footer_pages");
            const q = query(pagesRef, orderBy("title"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data());
        },
    });

    const { data: companyPages } = useQuery({
        queryKey: ["company-pages-list"],
        queryFn: async () => {
            const pagesRef = collection(db, "company_pages");
            const q = query(pagesRef, orderBy("title"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data());
        },
    });

    const [orgSettings, setOrgSettings] = useState<any>(null);

    useEffect(() => {
        const docRef = doc(db, "organization_settings", "profile");
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                setOrgSettings(doc.data());
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <footer className="bg-black text-white py-8 w-full overflow-hidden">
            <div className="container mx-auto px-4 max-w-full">
                {/* Top Section: Call to Action */}
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold mb-2">{orgSettings?.footer_heading || "Ready to explore the world?"}</h2>
                    <p className="text-gray-400 mb-4 text-sm">
                        {orgSettings?.footer_description || "Join thousands of travelers finding their perfect trip with TripBuzz. Unmatched comfort and unforgettable experiences await."}
                    </p>
                    <a href={orgSettings?.footer_button_url || "/trips"} className="text-white font-semibold hover:underline inline-flex items-center text-sm">
                        {orgSettings?.footer_button_text || "Find your trip →"}
                    </a>
                </div>

                <div className="border-t border-gray-800 pt-6 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-full">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center mb-3">
                            {orgSettings?.dark_logo ? (
                                <img src={orgSettings.dark_logo} alt="Logo" className="h-8 w-auto object-contain mr-2" />
                            ) : (
                                <div className="h-8 w-8 bg-yellow-400 rounded-full mr-2"></div>
                            )}
                            <span className="text-xl font-bold">{orgSettings?.company_name || "TripBuzz"}</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            {orgSettings?.company_name || "TripBuzz"}: Discover the best farmhouses, resorts, and staycations in India (starting from Hyderabad), handpicked for unmatched comfort, quality, and unforgettable experiences.
                        </p>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h3 className="font-bold mb-3">Company</h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            {companyPages?.map((page: any) => (
                                <li key={page.slug}>
                                    <Link to={`/company/${page.slug}`} className="hover:text-white capitalize">
                                        {page.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Us */}
                    <div>
                        <h3 className="font-bold mb-3">Contact Us</h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li>{orgSettings?.contact_number || "+91 7997-7887-13"}</li>
                            <li className="break-all">{orgSettings?.email || "contact@tripbuzz.in"}</li>
                        </ul>
                    </div>

                    {/* Social Icons */}
                    <div className="flex flex-wrap gap-4 items-start">
                        {orgSettings?.social_links?.instagram?.enabled && (
                            <a href={orgSettings.social_links.instagram.url} target="_blank" rel="noopener noreferrer" className="p-2 border border-gray-600 rounded-full hover:bg-gray-800"><Instagram size={16} /></a>
                        )}
                        {orgSettings?.social_links?.youtube?.enabled && (
                            <a href={orgSettings.social_links.youtube.url} target="_blank" rel="noopener noreferrer" className="p-2 border border-gray-600 rounded-full hover:bg-gray-800"><Youtube size={16} /></a>
                        )}
                        {orgSettings?.social_links?.facebook?.enabled && (
                            <a href={orgSettings.social_links.facebook.url} target="_blank" rel="noopener noreferrer" className="p-2 border border-gray-600 rounded-full hover:bg-gray-800"><Facebook size={16} /></a>
                        )}
                        {orgSettings?.social_links?.linkedin?.enabled && (
                            <a href={orgSettings.social_links.linkedin.url} target="_blank" rel="noopener noreferrer" className="p-2 border border-gray-600 rounded-full hover:bg-gray-800"><Linkedin size={16} /></a>
                        )}
                        {orgSettings?.social_links?.twitter?.enabled && (
                            <a href={orgSettings.social_links.twitter.url} target="_blank" rel="noopener noreferrer" className="p-2 border border-gray-600 rounded-full hover:bg-gray-800"><Twitter size={16} /></a>
                        )}
                    </div>
                </div>

                {/* Bottom Section: Copyright & Dynamic Pages */}
                <div className="border-t border-gray-800 mt-6 pt-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
                    <div className="mb-4 md:mb-0">
                        © {orgSettings?.company_name || "TripBuzz"} {new Date().getFullYear()}
                    </div>
                    <div className="flex flex-wrap gap-6 justify-center">
                        {pages?.map((page: any) => (
                            <Link key={page.slug} to={`/page/${page.slug}`} className="hover:text-white capitalize">
                                {page.title}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};
