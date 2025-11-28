import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, X, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRScannerProps {
    onScan: (bookingId: string) => void;
    onClose: () => void;
}

export const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
    const { toast } = useToast();
    const [isScanning, setIsScanning] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [manualBookingId, setManualBookingId] = useState("");
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const qrCodeRegionId = "qr-reader";

    const isScanningRef = useRef(false);

    const startScanning = async () => {
        try {
            const html5QrCode = new Html5Qrcode(qrCodeRegionId);
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    // Prevent multiple scans if we're already processing one
                    // Use ref to check state immediately without stale closure issues
                    if (!isScanningRef.current) return;

                    // Successfully scanned
                    console.log("QR Code scanned:", decodedText);

                    // Stop scanning immediately
                    stopScanning();

                    // Extract booking ID from the scanned text
                    // Assuming QR code contains just the booking ID or a URL with booking ID
                    let bookingId = decodedText;

                    // If it's a URL, try to extract booking ID
                    if (decodedText.includes("booking") || decodedText.includes("id=")) {
                        const match = decodedText.match(/[a-zA-Z0-9]{20,}/);
                        if (match) {
                            bookingId = match[0];
                        }
                    }

                    onScan(bookingId);
                },
                (errorMessage) => {
                    // Scanning error (usually just "No QR code found")
                    // We don't need to show this to the user
                }
            );

            setIsScanning(true);
            isScanningRef.current = true;
        } catch (err: any) {
            console.error("Error starting scanner:", err);
            toast({
                variant: "destructive",
                title: "Camera Error",
                description: "Unable to access camera. Please check permissions or use manual entry.",
            });
            setManualMode(true);
        }
    };

    const stopScanning = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
                setIsScanning(false);
                isScanningRef.current = false;
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
    };

    const handleManualSubmit = () => {
        if (manualBookingId.trim()) {
            onScan(manualBookingId.trim());
            setManualBookingId("");
        } else {
            toast({
                variant: "destructive",
                title: "Invalid Input",
                description: "Please enter a valid booking ID.",
            });
        }
    };

    useEffect(() => {
        if (!manualMode) {
            startScanning();
        }

        return () => {
            stopScanning();
        };
    }, [manualMode]);

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                        {manualMode ? "Manual Entry" : "Scan QR Code"}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {!manualMode ? (
                    <>
                        <div
                            id={qrCodeRegionId}
                            className="w-full mb-4 rounded-lg overflow-hidden border-2 border-primary"
                        />

                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground text-center">
                                Position the QR code within the frame to scan
                            </p>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    stopScanning();
                                    setManualMode(true);
                                }}
                            >
                                <Keyboard className="mr-2 h-4 w-4" />
                                Enter Booking ID Manually
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="booking-id">Booking ID</Label>
                                <Input
                                    id="booking-id"
                                    placeholder="Enter booking ID"
                                    value={manualBookingId}
                                    onChange={(e) => setManualBookingId(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleManualSubmit();
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button className="flex-1" onClick={handleManualSubmit}>
                                    Submit
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setManualMode(false)}
                                >
                                    <Camera className="mr-2 h-4 w-4" />
                                    Use Camera
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};
