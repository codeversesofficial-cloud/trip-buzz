import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/ui/password-input";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Loader2 } from "lucide-react";

const Configuration = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Map Configuration State
    const [mapConfig, setMapConfig] = useState({
        provider: "",
        apiKey: "",
        androidApiKey: "",
        iosApiKey: "",
    });

    // SMS Configuration State
    const [smsConfig, setSmsConfig] = useState({
        provider: "",
        sendStaticOtp: true,
        smsFrom: "",
        apiKey: "",
        apiSecret: "",
    });

    // Mail Configuration State
    const [mailConfig, setMailConfig] = useState({
        type: "",
        driver: "",
        host: "",
        port: "",
        username: "",
        password: "",
        encryption: "",
        from: "",
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setLoading(true);

                // Fetch Map Settings
                const mapDoc = await getDoc(doc(db, "settings", "map"));
                if (mapDoc.exists()) {
                    setMapConfig(mapDoc.data() as any);
                }

                // Fetch SMS Settings
                const smsDoc = await getDoc(doc(db, "settings", "sms"));
                if (smsDoc.exists()) {
                    setSmsConfig(smsDoc.data() as any);
                }

                // Fetch Mail Settings
                const mailDoc = await getDoc(doc(db, "settings", "mail"));
                if (mailDoc.exists()) {
                    setMailConfig(mailDoc.data() as any);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load configuration settings.",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [toast]);

    const handleSave = async (section: string) => {
        try {
            setSaving(section);
            let data = {};
            let docId = "";

            switch (section) {
                case "Map":
                    data = mapConfig;
                    docId = "map";
                    break;
                case "SMS":
                    data = smsConfig;
                    docId = "sms";
                    break;
                case "Mail":
                    data = mailConfig;
                    docId = "mail";
                    break;
            }

            await setDoc(doc(db, "settings", docId), data);

            toast({
                title: "Configuration Saved",
                description: `${section} configuration has been updated successfully.`,
            });
        } catch (error) {
            console.error(`Error saving ${section} settings:`, error);
            toast({
                variant: "destructive",
                title: "Error",
                description: `Failed to save ${section} configuration.`,
            });
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold uppercase tracking-tight">Map SMS Emails</h1>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Map Configuration */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-medium">Map Configuration</CardTitle>
                                <CardDescription>View and update your Map type and it's API key.</CardDescription>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full border-cyan-500 text-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"
                                onClick={() => handleSave("Map")}
                                disabled={saving === "Map"}
                            >
                                {saving === "Map" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>MAP PROVIDER</Label>
                                <Select
                                    value={mapConfig.provider}
                                    onValueChange={(value) => setMapConfig({ ...mapConfig, provider: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="google">Google Map</SelectItem>
                                        <SelectItem value="mapbox">Mapbox</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>API KEY</Label>
                                <PasswordInput
                                    value={mapConfig.apiKey}
                                    onChange={(e) => setMapConfig({ ...mapConfig, apiKey: e.target.value })}
                                    placeholder="Enter API Key"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>API KEY FOR ANDROID APP</Label>
                                <PasswordInput
                                    value={mapConfig.androidApiKey}
                                    onChange={(e) => setMapConfig({ ...mapConfig, androidApiKey: e.target.value })}
                                    placeholder="Enter Android API Key"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>API KEY FOR IOS APP</Label>
                                <PasswordInput
                                    value={mapConfig.iosApiKey}
                                    onChange={(e) => setMapConfig({ ...mapConfig, iosApiKey: e.target.value })}
                                    placeholder="Enter iOS API Key"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* SMS Configuration */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-medium">SMS Configuration</CardTitle>
                                <CardDescription>View and update your SMS Gateway and it's API keys.</CardDescription>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full border-cyan-500 text-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"
                                onClick={() => handleSave("SMS")}
                                disabled={saving === "SMS"}
                            >
                                {saving === "SMS" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <Label>Send Static Otp</Label>
                                <Switch
                                    checked={smsConfig.sendStaticOtp}
                                    onCheckedChange={(checked) => setSmsConfig({ ...smsConfig, sendStaticOtp: checked })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>SMS PROVIDER</Label>
                                <Select
                                    value={smsConfig.provider}
                                    onValueChange={(value) => setSmsConfig({ ...smsConfig, provider: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="twilio">Twilio Service</SelectItem>
                                        <SelectItem value="msg91">Msg91</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>SMS From</Label>
                                <Input
                                    onChange={(e) => setSmsConfig({ ...smsConfig, smsFrom: e.target.value })}
                                    placeholder="e.g. +1234567890"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{smsConfig.provider === 'twilio' ? 'Account SID' : 'API KEY'}</Label>
                                <Input
                                    value={smsConfig.apiKey}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, apiKey: e.target.value })}
                                    placeholder={smsConfig.provider === 'twilio' ? 'Enter Account SID' : 'Enter API Key'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{smsConfig.provider === 'twilio' ? 'Auth Token' : 'API Secret'}</Label>
                                <PasswordInput
                                    value={smsConfig.apiSecret}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, apiSecret: e.target.value })}
                                    placeholder={smsConfig.provider === 'twilio' ? 'Enter Auth Token' : 'Enter API Secret'}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mail Configuration */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-medium">Mail Configuration</CardTitle>
                                <CardDescription>View and update your SMTP credentials.</CardDescription>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full border-cyan-500 text-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"
                                onClick={() => handleSave("Mail")}
                                disabled={saving === "Mail"}
                            >
                                {saving === "Mail" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mail Type</Label>
                                    <Input
                                        value={mailConfig.type}
                                        onChange={(e) => setMailConfig({ ...mailConfig, type: e.target.value })}
                                        placeholder="e.g. smtp"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mail Driver</Label>
                                    <Input
                                        value={mailConfig.driver}
                                        onChange={(e) => setMailConfig({ ...mailConfig, driver: e.target.value })}
                                        placeholder="e.g. smtp"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mail Host</Label>
                                    <Input
                                        value={mailConfig.host}
                                        onChange={(e) => setMailConfig({ ...mailConfig, host: e.target.value })}
                                        placeholder="e.g. smtp.example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mail Port</Label>
                                    <Input
                                        value={mailConfig.port}
                                        onChange={(e) => setMailConfig({ ...mailConfig, port: e.target.value })}
                                        placeholder="e.g. 587"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Mail Username</Label>
                                <Input
                                    value={mailConfig.username}
                                    onChange={(e) => setMailConfig({ ...mailConfig, username: e.target.value })}
                                    placeholder="e.g. user@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Mail Password</Label>
                                <PasswordInput
                                    value={mailConfig.password}
                                    onChange={(e) => setMailConfig({ ...mailConfig, password: e.target.value })}
                                    placeholder="Enter Mail Password"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mail Encryption</Label>
                                    <Input
                                        value={mailConfig.encryption}
                                        onChange={(e) => setMailConfig({ ...mailConfig, encryption: e.target.value })}
                                        placeholder="e.g. tls"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mail From</Label>
                                    <Input
                                        value={mailConfig.from}
                                        onChange={(e) => setMailConfig({ ...mailConfig, from: e.target.value })}
                                        placeholder="e.g. noreply@example.com"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Configuration;
