import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background overflow-hidden relative">
      
      {/* LEFT PANE: Content */}
      <div className="w-full md:w-[55%] flex flex-col relative z-10 bg-background/80 md:bg-background backdrop-blur-xl md:backdrop-blur-none shadow-2xl md:shadow-none min-h-screen">
        <header className="p-8 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-3xl font-black bg-gradient-to-r from-brand-primary to-purple-500 bg-clip-text text-transparent tracking-tighter">
            Workforce
          </h1>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost" className="hidden sm:inline-flex rounded-full px-6 font-semibold hover:bg-brand-primary/10 hover:text-brand-primary transition-colors">
                Sign In
              </Button>
            </Link>
          </div>
        </header>
        
        <main className="flex-grow flex flex-col justify-center px-8 sm:px-16 lg:px-24">
          <div className="max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 fill-mode-both">
            <div className="inline-block px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-semibold text-sm mb-6">
              🍇 The Future of Farm Labor
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-foreground mb-6 leading-[1.1] tracking-tight">
              Reliable <br />
              <span className="bg-gradient-to-r from-brand-primary via-purple-600 to-brand-secondary bg-clip-text text-transparent">
                Grape Farm
              </span> <br />
              Labor, instantly.
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed font-medium">
              Workforce connects vineyard owners with verified, skilled farm labor exactly when you need them. Book your slot today and manage your farm efficiently.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Link href="/login">
                <Button size="lg" className="rounded-full px-8 h-14 text-lg font-semibold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg shadow-brand-primary/30 hover:shadow-brand-primary/50 transition-all hover:-translate-y-1">
                  Book Labor Now
                </Button>
              </Link>
              <Link href="/login?type=worker">
                <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-lg font-semibold border-brand-primary/20 hover:bg-brand-primary/5 transition-all">
                  Join as Worker
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* RIGHT PANE: Image */}
      <div className="absolute inset-0 md:relative md:w-[45%] h-full min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-background/10 to-transparent z-10" />
        <Image 
          src="/grape_farm_hero.jpg" 
          alt="Lush green grape vineyard at sunrise" 
          fill
          priority
          className="object-cover object-center animate-in fade-in duration-1000"
        />
      </div>

    </div>
  );
}
