import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-card border rounded-xl p-6 shadow-sm space-y-3">
        <h1 className="text-xl font-bold">Reset password</h1>
        <div>
          <Label htmlFor="np">New password</Label>
          <Input id="np" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Updating…" : "Update password"}</Button>
      </form>
    </div>
  );
}
