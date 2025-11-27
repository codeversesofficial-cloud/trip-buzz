export interface BookingEmailData {
    bookingId: string;
    tripName: string;
    destination: string;
    startDate: string;
    endDate: string;
    scheduleName: string;
    travelers: Array<{
        name: string;
        age: number;
        gender: string;
    }>;
    totalAmount: number;
    qrCodeDataUrl: string;
}

export const generateBookingConfirmationEmail = (data: BookingEmailData): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7fa;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 8px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .info-label {
            font-weight: 600;
            color: #555;
        }
        .info-value {
            color: #333;
        }
        .travelers-list {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 15px;
        }
        .traveler-item {
            padding: 10px;
            background-color: #fff;
            border-radius: 6px;
            margin-bottom: 10px;
            border-left: 3px solid #667eea;
        }
        .traveler-item:last-child {
            margin-bottom: 0;
        }
        .qr-section {
            text-align: center;
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .qr-code {
            max-width: 200px;
            height: auto;
            margin: 20px auto;
            display: block;
        }
        .qr-instruction {
            color: #666;
            font-size: 14px;
            margin-top: 15px;
        }
        .footer {
            background-color: #f4f7fa;
            padding: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Booking Confirmed!</h1>
            <p>Your adventure awaits</p>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">Trip Details</div>
                <div class="info-row">
                    <span class="info-label">Booking ID:</span>
                    <span class="info-value">${data.bookingId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Trip:</span>
                    <span class="info-value">${data.tripName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Destination:</span>
                    <span class="info-value">${data.destination}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Schedule:</span>
                    <span class="info-value">${data.scheduleName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Dates:</span>
                    <span class="info-value">${data.startDate} - ${data.endDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Total Amount:</span>
                    <span class="info-value">₹${data.totalAmount.toLocaleString()}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Travelers (${data.travelers.length})</div>
                <div class="travelers-list">
                    ${data.travelers.map((traveler, index) => `
                        <div class="traveler-item">
                            <strong>${index + 1}. ${traveler.name}</strong><br>
                            <small>Age: ${traveler.age} | Gender: ${traveler.gender}</small>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="qr-section">
                <div class="section-title">Your Boarding Pass</div>
                <img src="${data.qrCodeDataUrl}" alt="QR Code" class="qr-code">
                <p class="qr-instruction">
                    📱 Show this QR code at the trip location for quick check-in
                </p>
            </div>
        </div>

        <div class="footer">
            <p>Thank you for choosing us for your adventure!</p>
            <p>Need help? Contact us at <a href="mailto:support@tripbuzz.com">support@tripbuzz.com</a></p>
        </div>
    </div>
</body>
</html>
    `.trim();
};
