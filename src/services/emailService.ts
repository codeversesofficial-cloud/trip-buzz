import { getFunctions } from "firebase/functions";
import { BookingEmailData } from "@/templates/bookingConfirmationEmail";

export const sendBookingConfirmationEmail = async (
    recipientEmail: string,
    bookingData: Omit<BookingEmailData, "qrCodeDataUrl">
): Promise<{ success: boolean; message: string }> => {
    try {
        const functions = getFunctions();
        const region = functions.region || "us-central1";
        const projectId = functions.app.options.projectId;

        const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/sendBookingEmail`;

        console.log("📤 Calling cloud function...");

        const response = await fetch(functionUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipientEmail, bookingData }),
        });

        const data = await response.json();
        console.log("🎯 Result:", data);

        return data;
    } catch (error: any) {
        console.error("❌ Error:", error);
        return { success: false, message: error.message || "Failed to send email" };
    }
};
