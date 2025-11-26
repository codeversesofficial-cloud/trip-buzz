import { db } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";

interface SendOtpResult {
    success: boolean;
    message: string;
    otp?: string;
    isStatic?: boolean;
}

export const sendOtp = async (phoneNumber: string): Promise<SendOtpResult> => {
    try {
        const smsDoc = await getDoc(doc(db, "settings", "sms"));

        if (smsDoc.exists()) {
            const config = smsDoc.data();

            if (config.sendStaticOtp) {
                // Static OTP enabled
                return {
                    success: true,
                    message: "OTP sent successfully",
                    otp: "123456",
                    isStatic: true
                };
            } else {
                // Dynamic OTP
                if (config.provider === 'twilio') {
                    const accountSid = config.apiKey;
                    const authToken = config.apiSecret;
                    const fromNumber = config.smsFrom;

                    if (!accountSid || !authToken || !fromNumber) {
                        return {
                            success: false,
                            message: "Twilio configuration missing (SID, Token, or From number)"
                        };
                    }

                    const otp = Math.floor(100000 + Math.random() * 900000).toString();

                    // Format phone number to international format
                    const formattedPhoneNumber = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`;

                    try {
                        // Note: Calling Twilio API directly from frontend will likely fail due to CORS.
                        // This is a demonstration implementation. In production, this should go through a backend proxy.
                        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams({
                                'To': formattedPhoneNumber,
                                'From': fromNumber,
                                'Body': `Your TripBuzz verification code is: ${otp}`
                            })
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            console.error("Twilio Error:", errorData);
                            throw new Error(errorData.message || "Failed to send SMS via Twilio");
                        }

                        return {
                            success: true,
                            message: "OTP sent successfully via Twilio",
                            otp: otp,
                            isStatic: false
                        };
                    } catch (error: any) {
                        console.error("Twilio API Error:", error);
                        // Fallback for demo/CORS issues
                        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
                            return {
                                success: false,
                                message: "CORS Error: Cannot call Twilio directly from browser. Please use a backend.",
                                otp: otp, // Returning OTP for testing purposes even if send failed
                                isStatic: false
                            };
                        }
                        return {
                            success: false,
                            message: error.message
                        };
                    }
                }

                // Firebase Phone Auth (Default if not Twilio)
                return {
                    success: true,
                    message: "Initiating Firebase Phone Auth...",
                    isStatic: false
                };
            }
        }

        // Default fallback if no config found (safe default: static)
        return {
            success: true,
            message: "OTP sent successfully",
            otp: "123456",
            isStatic: true
        };

    } catch (error) {
        console.error("Error sending OTP:", error);
        return {
            success: false,
            message: "Failed to check SMS configuration"
        };
    }
};

export const verifyOtp = (inputOtp: string, sentOtp: string | null): boolean => {
    if (!sentOtp) return false;
    return inputOtp === sentOtp;
};
