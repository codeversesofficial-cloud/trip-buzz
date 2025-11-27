"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBookingEmail = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp({
    storageBucket: "trip-buzz-ab778.firebasestorage.app",
});
const generateBookingConfirmationEmail = (data) => {
    const travelerListHTML = data.travelers.map((t, i) => `
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #d4d7e0;">
      <span style="color: #52555f; font-size: 14px;">${i + 1}. ${t.name}</span>
      <span style="font-weight: 600; color: #0C1A25; font-size: 14px;">${t.age} yrs / ${t.gender}</span>
    </div>
  `).join("");
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background: #eef1f7; font-family: 'Inter', Arial, sans-serif;">

  <div style="max-width: 760px; margin: 25px auto; background: #ffffff; border-radius: 16px; box-shadow: 0 6px 25px rgba(0,0,0,0.08); overflow: hidden;">

    <!-- HEADER -->
    <div style="background: linear-gradient(135deg, #0C1A25 0%, #2DBE60 100%); padding: 45px 20px; text-align: center; color: #ffffff; border-radius: 16px 16px 0 0;">
      <h1 style="margin: 0; font-size: 32px; letter-spacing: 0.4px; font-weight: 700;">
        🎉 Booking Confirmed!
      </h1>
      <p style="margin-top: 10px; font-size: 15px; opacity: 0.95;">
        Your journey has been secured successfully
      </p>
    </div>

    <!-- BOOKING DETAILS -->
    <div style="padding: 30px;">

      <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #0C1A25; border-left: 4px solid #2DBE60; padding-left: 10px;">Booking Summary</h2>

      <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e8e9ee; padding: 22px; box-shadow: 0 3px 15px rgba(0,0,0,0.06);">

        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #d4d7e0;">
          <span style="color: #52555f; font-size: 14px;">Booking ID</span>
          <span style="font-weight: 600; color: #0C1A25; font-size: 14px;">${data.bookingId}</span>
        </div>

        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #d4d7e0;">
          <span style="color: #52555f; font-size: 14px;">Trip Name</span>
          <span style="font-weight: 600; color: #0C1A25; font-size: 14px;">${data.tripName}</span>
        </div>

        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #d4d7e0;">
          <span style="color: #52555f; font-size: 14px;">Destination</span>
          <span style="font-weight: 600; color: #0C1A25; font-size: 14px;">${data.destination}</span>
        </div>

        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #d4d7e0;">
          <span style="color: #52555f; font-size: 14px;">Travel Dates</span>
          <span style="font-weight: 600; color: #0C1A25; font-size: 14px;">${data.startDate} → ${data.endDate}</span>
        </div>

        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: none;">
          <span style="color: #52555f; font-size: 14px;">Total Amount</span>
          <span style="font-weight: 600; color: #0C1A25; font-size: 14px;">₹${data.totalAmount.toLocaleString()}</span>
        </div>

      </div>

      <!-- TRAVELER LIST -->
      <h2 style="font-size: 18px; font-weight: 600; margin-top: 30px; margin-bottom: 12px; color: #0C1A25; border-left: 4px solid #2DBE60; padding-left: 10px;">Traveler Details</h2>

      <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e8e9ee; padding: 22px; box-shadow: 0 3px 15px rgba(0,0,0,0.06);">
        ${travelerListHTML}
      </div>

      <!-- QR CODE SECTION -->
      <div style="margin-top: 30px; text-align: center; background: #f9fefc; border: 1px solid #cceedd; border-radius: 12px; padding: 25px 0;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Your Boarding Pass</h3>
        <img src="cid:qrcode_image" width="150" height="150" alt="QR Code" style="display: block; margin: 0 auto;" />
        <p style="margin-top: 8px; color:#555; font-size: 14px;">Show this QR Code at check-in</p>
      </div>

    </div>

    <!-- FOOTER -->
    <div style="text-align: center; font-size: 13px; color: #7d7f8d; padding: 18px; background: #f3f4f9;">
      Thank you for choosing us. We wish you a wonderful journey!  
      <br/>  
      — Team TripBuzz
    </div>

  </div>

</body>
</html>`;
};
exports.sendBookingEmail = functions.https.onRequest(async (req, res) => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    // Handle preflight
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).send({ success: false, message: "Method not allowed" });
        return;
    }
    try {
        const { recipientEmail, bookingData } = req.body;
        if (!recipientEmail || !bookingData) {
            res.status(400).send({ success: false, message: "Missing fields" });
            return;
        }
        const mailConfig = await admin.firestore().collection("settings").doc("mail").get();
        if (!mailConfig.exists) {
            res.status(500).send({ success: false, message: "Email config not found" });
            return;
        }
        const config = mailConfig.data();
        if (!config || !config.apiKey) {
            res.status(500).send({ success: false, message: "SendGrid API key not configured" });
            return;
        }
        // Use require for CommonJS module compatibility
        const sgMail = require("@sendgrid/mail");
        sgMail.setApiKey(config.apiKey);
        // Generate QR code as buffer
        const QRCode = require("qrcode");
        const qrCodeBuffer = await QRCode.toBuffer(bookingData.bookingId, {
            width: 300,
            margin: 2,
            color: { dark: "#000000", light: "#FFFFFF" },
        });
        // Upload QR code to Firebase Storage
        const bucket = admin.storage().bucket();
        const fileName = `qr-codes/${bookingData.bookingId}.png`;
        const file = bucket.file(fileName);
        await file.save(qrCodeBuffer, {
            metadata: {
                contentType: "image/png",
            },
            public: true,
        });
        // Get public URL
        const qrCodeUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        console.log("QR Code uploaded to:", qrCodeUrl);
        // Replace placeholder with actual QR code URL
        const emailHtml = generateBookingConfirmationEmail(bookingData).replace('src="cid:qrcode_image"', `src="${qrCodeUrl}"`);
        await sgMail.send({
            to: recipientEmail,
            from: { email: config.fromEmail, name: config.fromName },
            subject: `🎉 Booking Confirmed - ${bookingData.tripName}`,
            html: emailHtml,
        });
        res.status(200).send({ success: true, message: "Email sent successfully" });
    }
    catch (error) {
        console.error("Error sending email:", error);
        console.error("Error stack:", error.stack);
        res.status(200).send({ success: false, message: error.message || "Failed to send email" });
    }
});
//# sourceMappingURL=index.js.map