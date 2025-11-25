import { db, storage } from "@/integrations/firebase/client";
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    Timestamp,
    orderBy,
    limit
} from "firebase/firestore";
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "firebase/storage";

export interface Banner {
    id: string;
    title?: string; // Primary Text
    subtitle?: string; // Secondary Text
    image_url: string;
    button_text: string;
    button_url: string;
    show_button: boolean;
    is_published: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
    created_by: string;
}

export interface BannerData {
    title?: string;
    subtitle?: string;
    image_url: string;
    button_text: string;
    button_url: string;
    show_button: boolean;
    is_published: boolean;
}

/**
 * Upload banner image to Firebase Storage
 */
export const uploadBannerImage = async (file: File, bannerId: string): Promise<string> => {
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `banners/${bannerId}/${filename}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
};

/**
 * Delete banner image from Firebase Storage
 */
export const deleteBannerImage = async (imageUrl: string): Promise<void> => {
    try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
    } catch (error) {
        console.error("Error deleting banner image:", error);
        // Don't throw error if image doesn't exist
    }
};

/**
 * Create a new banner
 */
export const createBanner = async (
    data: BannerData,
    userId: string
): Promise<string> => {
    const bannersRef = collection(db, "banners");

    const docRef = await addDoc(bannersRef, {
        ...data,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: userId,
    });

    return docRef.id;
};

/**
 * Update an existing banner
 */
export const updateBanner = async (
    id: string,
    data: Partial<BannerData>
): Promise<void> => {
    const bannerRef = doc(db, "banners", id);

    await updateDoc(bannerRef, {
        ...data,
        updated_at: Timestamp.now(),
    });
};

/**
 * Delete a banner and its image
 */
export const deleteBanner = async (id: string, imageUrl: string): Promise<void> => {
    // Delete image from storage
    if (imageUrl) {
        await deleteBannerImage(imageUrl);
    }

    // Delete document from Firestore
    const bannerRef = doc(db, "banners", id);
    await deleteDoc(bannerRef);
};

/**
 * Toggle banner publish status
 */
export const togglePublish = async (
    id: string,
    isPublished: boolean
): Promise<void> => {
    const bannerRef = doc(db, "banners", id);

    await updateDoc(bannerRef, {
        is_published: isPublished,
        updated_at: Timestamp.now(),
    });
};

/**
 * Toggle button visibility
 */
export const toggleButton = async (
    id: string,
    showButton: boolean
): Promise<void> => {
    const bannerRef = doc(db, "banners", id);

    await updateDoc(bannerRef, {
        show_button: showButton,
        updated_at: Timestamp.now(),
    });
};

/**
 * Get the first published banner
 */
export const getPublishedBanner = async (): Promise<Banner | null> => {
    const bannersRef = collection(db, "banners");
    const q = query(
        bannersRef,
        where("is_published", "==", true),
        orderBy("created_at", "desc"),
        limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Banner;
};

/**
 * Get all banners (for admin panel)
 */
export const getAllBanners = async (): Promise<Banner[]> => {
    const bannersRef = collection(db, "banners");
    const q = query(bannersRef, orderBy("created_at", "desc"));

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Banner[];
};
