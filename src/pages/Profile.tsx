import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type UserDoc = {
  username?: string;
  bio?: string;
  created_at?: any;
  updated_at?: any;
  email?: string | null;
};

const Profile = () => {
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Ensure user is logged in; load basic auth + profile doc
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/auth");
        return;
      }
      setUid(u.uid);
      setEmail(u.email || "");
      setDisplayName(u.displayName || "");

      // Load Firestore user doc
      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as UserDoc;
          setUsername(data.username || "");
          setBio(data.bio || "");
        } else {
          // create a minimal doc if missing
          await setDoc(ref, {
            username: u.displayName || "",
            email: u.email || "",
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          } as UserDoc);
          setUsername(u.displayName || "");
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    setSaving(true);
    try {
      // Update Firebase Auth displayName
      if (displayName.trim() !== (auth.currentUser?.displayName || "")) {
        await fbUpdateProfile(auth.currentUser!, {
          displayName: displayName.trim(),
        });
      }

      // Update Firestore user doc
      const ref = doc(db, "users", uid);
      await updateDoc(ref, {
        username: username.trim(),
        bio: bio,
        email,
        updated_at: serverTimestamp(),
      });

      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Loading profile…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="email">Email (read-only)</Label>
              <Input id="email" value={email} disabled />
            </div>
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_handle"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people something about you"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;