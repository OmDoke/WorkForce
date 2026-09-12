import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Clock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function PendingVerificationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if they've been approved since they last loaded this page
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "worker") {
    redirect("/worker/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 flex items-center justify-between px-8 border-b bg-card">
        <h1 className="text-xl font-bold text-brand-primary">Workforce</h1>
        <Link href="/logout">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your worker profile has been created successfully. However, it requires admin approval before you can be assigned to jobs.
            </p>
            <p className="text-sm font-medium">
              We will contact you via SMS once your account is active.
            </p>
            <form action={async () => {
              "use server";
              const supabase = await createClient();
              await supabase.auth.signOut();
              redirect("/login");
            }}>
              <Button type="submit" variant="outline" className="mt-4">
                Return to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
