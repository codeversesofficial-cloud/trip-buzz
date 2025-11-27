import { db } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import QRCode from "qrcode";
import { generateBookingConfirmationEmail, BookingEmailData } from "@/templates/bookingConfirmationEmail";

interface EmailConfig {
    provider: string;
    apiKey: string;
    fromEmail: string;
    fromName: string;
}

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
}

/**
 * Fetch email configuration from Firestore
 */
const getEmailConfig = async (): Promise<EmailConfig | null> => {
    try {
        const mailDoc = await getDoc(doc(db, "settings", "mail"));
        if (mailDoc.exists()) {
            return mailDoc.data() as EmailConfig;
        }
        return null;
    } catch (error) {
        console.error("Error fetching email config:", error);
        return null;
    }
};

/**
 * Generate QR code as data URL
 */
export const generateQRCode = async (data: string): Promise<string> => {
    try {
        const qrDataUrl = await QRCode.toDataURL(data, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        return qrDataUrl;
    } catch (error) {
        console.error("Error generating QR code:", error);
        throw new Error("Failed to generate QR code");
    }
};

/**
 * Send email via SendGrid API
 */
const sendViaSendGrid = async (config: EmailConfig, params: SendEmailParams): Promise<boolean> => {
    try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{
                    to: [{ email: params.to }],
                    subject: params.subject
                }],
                from: {
                    email: config.fromEmail,
                    name: config.fromName
                },
                content: [{
                    type: 'text/html',
                    value: params.html
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("SendGrid Error:", errorData);
            throw new Error(errorData.errors?.[0]?.message || "Failed to send email via SendGrid");
        }

        return true;
    } catch (error: any) {
        console.error("SendGrid API Error:", error);
        throw error;
    }
};

/**
 * Send booking confirmation email
 */
export const sendBookingConfirmationEmail = async (
    recipientEmail: string,
    bookingData: Omit<BookingEmailData, 'qrCodeDataUrl'>
): Promise<{ success: boolean; message: string }> => {
    try {
        // Fetch email configuration
        const config = await getEmailConfig();
        if (!config || !config.apiKey) {
            return {
                success: false,
                message: "Email configuration not found. Please configure SendGrid in Admin Settings."
            };
        }

        // Generate QR code
        const qrCodeDataUrl = await generateQRCode(bookingData.bookingId);

        // Generate email HTML
        const emailHtml = generateBookingConfirmationEmail({
            ...bookingData,
            qrCodeDataUrl
        });

        // Send email
        await sendViaSendGrid(config, {
            to: recipientEmail,
            subject: `🎉 Booking Confirmed - ${bookingData.tripName}`,
            html: emailHtml
        });

        return {
            success: true,
            message: "Booking confirmation email sent successfully"
        };
    } catch (error: any) {
        console.error("Error sending booking confirmation email:", error);
        return {
            success: false,
            message: error.message || "Failed to send booking confirmation email"
        };
    }
};
