import { LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 flex items-center justify-between px-8 border-b bg-card">
        <h1 className="text-xl font-bold text-brand-primary">Workforce</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Admin Portal</span>
          <Link href="/logout">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-4rem)] border-r bg-card/50 p-6 space-y-4">
          <Link href="/admin/dashboard" className="block p-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link href="/admin/bookings" className="block p-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            Bookings
          </Link>
          <Link href="/admin/workers" className="block p-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            Workers
          </Link>
          <Link href="/admin/workers/new" className="block p-3 rounded-lg text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors">
            + Add Worker
          </Link>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
