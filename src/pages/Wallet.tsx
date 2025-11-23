import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";

const Wallet = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.uid);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const walletBalance = 0; // Dummy balance
  const transactions = [
    { id: 1, type: "credit", amount: 1000, description: "Wallet recharge", date: "2024-11-15" },
    { id: 2, type: "debit", amount: 500, description: "Trip booking - Manali", date: "2024-11-14" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">My Wallet</h1>

        {/* Wallet Balance Card */}
        <Card className="mb-8 bg-gradient-to-br from-primary to-primary/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-sm opacity-90">Available Balance</p>
                <h2 className="mt-2 text-4xl font-bold">₹{walletBalance.toLocaleString()}</h2>
              </div>
              <WalletIcon className="h-12 w-12 opacity-80" />
            </div>
            <Button className="mt-6 w-full bg-white text-primary hover:bg-white/90">
              <Plus className="mr-2 h-4 w-4" />
              Recharge Wallet
            </Button>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`rounded-full p-2 ${transaction.type === "credit"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                        }`}
                    >
                      {transaction.type === "credit" ? (
                        <ArrowDownRight className="h-5 w-5" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">{transaction.date}</p>
                    </div>
                  </div>
                  <p
                    className={`text-lg font-semibold ${transaction.type === "credit" ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    {transaction.type === "credit" ? "+" : "-"}₹{transaction.amount}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Wallet;
