import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="text-9xl font-extrabold text-brand-primary/20 select-none">404</div>
        <h1 className="text-3xl font-bold text-foreground">Page Not Found</h1>
        <p className="text-muted-foreground text-lg">
          The page you are looking for does not exist or may have been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white">
              Go Home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">My Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
