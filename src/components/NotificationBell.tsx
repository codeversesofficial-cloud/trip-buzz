import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, limit, getDocs, onSnapshot, doc, updateDoc, writeBatch, addDoc, getDoc } from "firebase/firestore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export const NotificationBell = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const notificationsRef = collection(db, "notifications");
      // Sort client-side to avoid Firestore index requirements for where+orderBy
      const q = query(
        notificationsRef,
        where("user_id", "==", userId!),
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return data;
    },
  });

  const { toast } = useToast();

  // Real-time Logic
  useEffect(() => {
    if (!userId) return;

    const notificationsRef = collection(db, "notifications");
    // Listen for changes
    const q = query(notificationsRef, where("user_id", "==", userId));

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const notif = change.doc.data();
          if (!notif.is_read) {
            // Play Sound
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            audio.play().catch(e => console.error("Audio play failed", e));

            // Show Popup (Toast)
            toast({
              title: notif.title || "New Notification",
              description: notif.message,
              duration: 5000,
              action: (
                <Button variant="outline" size="sm" onClick={() => navigate(notif.link || "/dashboard")}>
                  View
                </Button>
              ),
            });
          }
        }
      });

      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    });

    return () => unsubscribe();
  }, [userId, queryClient, navigate, toast]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      const docRef = doc(db, "notifications", notification.id);
      await updateDoc(docRef, { is_read: true });
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const markAllAsRead = async () => {
    const batch = writeBatch(db);
    const unreadNotifications = notifications.filter(n => !n.is_read);

    unreadNotifications.forEach(n => {
      const docRef = doc(db, "notifications", n.id);
      batch.update(docRef, { is_read: true });
    });

    await batch.commit();
    queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
  };



  if (!userId) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-background animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground border-b">
          <p>Debug ID: {userId.slice(0, 8)}...</p>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-b p-4 cursor-pointer hover:bg-muted/50 transition-colors ${!notification.is_read ? "bg-muted/30" : ""
                  }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{notification.title}</p>
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
