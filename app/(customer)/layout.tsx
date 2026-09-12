import Link from "next/link";
import { LayoutDashboard, History, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-brand-primary">
            Workforce <span className="text-sm font-normal text-muted-foreground ml-2">Customer</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid items-start px-4 text-sm font-medium gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/bookings/new"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              New Booking
            </Link>
            <Link
              href="/bookings"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
            >
              <History className="h-4 w-4" />
              History
            </Link>
          </nav>
        </div>
        <div className="mt-auto border-t p-4">
          <Link href="/logout">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex flex-col sm:gap-4 sm:pl-64 w-full">
        {/* Mobile Header (visible only on small screens) */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-brand-primary">
            Workforce
          </Link>
          <div className="flex-1" />
          <Link href="/logout">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </Link>
        </header>

        <main className="flex-1 items-start p-4 sm:px-6 sm:py-6 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
