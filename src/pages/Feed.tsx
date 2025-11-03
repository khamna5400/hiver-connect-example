import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { getSessionFirebase, insertBuzz } from "@/lib/db";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {  collection,  query,  where,  orderBy,  getDocs,  addDoc,  doc,  getDoc,  serverTimestamp, limit, } from "firebase/firestore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapPin, Clock, Send } from "lucide-react";
import { format } from "date-fns";

interface Buzz {
  id: string;
  description: string;
  location: string | null;
  created_at: string;
  profiles: {
    username: string;
  };
}

const Feed = () => {
  const [buzz, setBuzz] = useState<Buzz[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newBuzz, setNewBuzz] = useState("");
  const [visibility, setVisibility] = useState<"public" | "connections" | "private">("public");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await checkAuth();
      await fetchBuzz();
    })();
  }, []);

  const checkAuth = async () => {
    const sessionResp = await getSessionFirebase();
    const user = sessionResp?.user ?? null;
    if (user) setUserId(user.id);
  };

  const fetchBuzz = async () => {
    try {
      setLoading(true);

      // Firestore: public buzz ordered by newest first
      const q = query(
        collection(db, "buzz"),
        where("visibility", "==", "public"),
        orderBy("created_at", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);

      // Enrich each item with author's username from users/{authorId}
      const items: Buzz[] = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as any;

          // created_at may be a Firestore Timestamp; normalize to ISO string for date-fns
          let createdISO = "";
          if (data.created_at?.toDate) {
            createdISO = data.created_at.toDate().toISOString();
          } else if (typeof data.created_at === "string") {
            createdISO = data.created_at;
          } else {
            createdISO = new Date().toISOString();
          }

          let username = "";
          const authorId: string | undefined = data.user_id || data.authorId; // support either field name
          if (authorId) {
            try {
              const uref = doc(db, "users", authorId);
              const usnap = await getDoc(uref);
              if (usnap.exists()) {
                const u = usnap.data() as any;
                username = u.username || u.displayName || "";
              }
            } catch {
              // ignore enrichment errors
            }
          }

          return {
            id: d.id,
            description: data.description || data.text || "",
            location: data.location || null,
            created_at: createdISO,
            profiles: { username: username || authorId || "User" },
          };
        })
      );

      setBuzz(items);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!userId || !newBuzz.trim()) return;

    setPosting(true);
    try {
      // Your lib/db.insertBuzz writes to Firestore and sets created_at
      const { error } = await insertBuzz({
        description: newBuzz.trim(),
        visibility,
        user_id: userId,
        location: null,
      } as any);

      if (error) {
        toast.error("Failed to post buzz");
      } else {
        toast.success("Buzz posted!");
        setNewBuzz("");
        await fetchBuzz();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to post buzz");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Feed</h1>
          <p className="text-muted-foreground">Share what's on your mind</p>
        </div>

        {userId && (
          <Card className="mb-8 shadow-card">
            <CardContent className="pt-6">
              <Textarea
                placeholder="What's buzzing?"
                value={newBuzz}
                onChange={(e) => setNewBuzz(e.target.value)}
                rows={3}
                className="mb-4"
              />
              <div className="flex items-center gap-4">
                <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="connections">Connections</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handlePost}
                  disabled={posting || !newBuzz.trim()}
                  className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Post
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))
          ) : buzz.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">No buzz yet. Be the first to post!</p>
              </CardContent>
            </Card>
          ) : (
            buzz.map((item) => (
              <Card key={item.id} className="shadow-card hover:shadow-hover transition-all">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                      {item.profiles.username?.[0]?.toUpperCase?.() || "U"}
                    </div>
                    <div>
                      <p className="font-medium">{item.profiles.username}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.created_at), "PPp")}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{item.description}</p>
                  {item.location && (
                    <p className="text-sm text-muted-foreground mt-4 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {item.location}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Feed;