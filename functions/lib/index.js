"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = { enumerable: true, get: function () { return m[k]; } };
  }
  Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
  Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
  o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
  var ownKeys = function (o) {
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
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px dashed #d4d7e0; color: #52555f; font-size: 14px;">${i + 1}. ${t.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px dashed #d4d7e0; font-weight: 600; color: #0C1A25; font-size: 14px; text-align: right;">${t.age} yrs / ${t.gender}</td>
    </tr>
  `).join("");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background: #eef1f7; font-family: 'Inter', Arial, sans-serif;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #eef1f7;">
    <tr>
      <td align="center" style="padding: 25px 0;">
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 6px 25px rgba(0,0,0,0.08); overflow: hidden;">
          
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #0C1A25 0%, #2DBE60 100%); padding: 45px 20px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 28px; letter-spacing: 0.4px; font-weight: 700;">
                Booking Confirmed!
              </h1>
              <p style="margin-top: 10px; font-size: 15px; opacity: 0.95;">
                Your journey has been secured successfully
              </p>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding: 30px;">
              
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #0C1A25; border-left: 4px solid #2DBE60; padding-left: 10px;">Booking Summary</h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #ffffff; border-radius: 12px; border: 1px solid #e8e9ee; border-collapse: separate; border-spacing: 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #d4d7e0; color: #52555f; font-size: 14px; width: 40%;">Booking ID</td>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #d4d7e0; font-weight: 600; color: #0C1A25; font-size: 14px; text-align: right;">${data.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #d4d7e0; color: #52555f; font-size: 14px;">Trip Name</td>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #d4d7e0; font-weight: 600; color: #0C1A25; font-size: 14px; text-align: right;">${data.tripName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #d4d7e0; color: #52555f; font-size: 14px;">Destination</td>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #d4d7e0; font-weight: 600; color: #0C1A25; font-size: 14px; text-align: right;">${data.destination}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #d4d7e0; color: #52555f; font-size: 14px;">Travel Dates</td>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #d4d7e0; font-weight: 600; color: #0C1A25; font-size: 14px; text-align: right;">${data.startDate} → ${data.endDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #52555f; font-size: 14px;">Total Amount</td>
                        <td style="padding: 8px 0; font-weight: 600; color: #0C1A25; font-size: 14px; text-align: right;">₹${data.totalAmount.toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <h2 style="font-size: 18px; font-weight: 600; margin-top: 30px; margin-bottom: 15px; color: #0C1A25; border-left: 4px solid #2DBE60; padding-left: 10px;">Traveler Details</h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #ffffff; border-radius: 12px; border: 1px solid #e8e9ee; border-collapse: separate; border-spacing: 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${travelerListHTML}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- QR CODE SECTION -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 30px; background: #f9fefc; border: 1px solid #cceedd; border-radius: 12px;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Your Boarding Pass</h3>
                    <img src="cid:qrcode_image" width="150" height="150" alt="QR Code" style="display: block; margin: 0 auto; border: 0;" />
                    <p style="margin-top: 10px; color:#555; font-size: 14px;">Show this QR Code at check-in</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="text-align: center; font-size: 13px; color: #7d7f8d; padding: 20px; background: #f3f4f9;">
              Thank you for choosing us. We wish you a wonderful journey!  
              <br/>  
              — Team TripBuzz
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
};
const generateBookingConfirmationText = (data) => {
  return `
Booking Confirmation

Booking ID: ${data.bookingId}
Trip: ${data.tripName}
Destination: ${data.destination}
Dates: ${data.startDate} - ${data.endDate}
Total Amount: ₹${data.totalAmount.toLocaleString()}

Travelers:
${data.travelers.map((t, i) => `${i + 1}. ${t.name} (${t.age} yrs / ${t.gender})`).join("\n")}

Thank you for choosing us!
Team TripBuzz
  `.trim();
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
    const emailText = generateBookingConfirmationText(bookingData);
    await sgMail.send({
      to: recipientEmail,
      from: { email: config.fromEmail, name: config.fromName },
      subject: `Your Booking Confirmed – ${bookingData.startDate} ${bookingData.tripName}`,
      text: emailText,
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