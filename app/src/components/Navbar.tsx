import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Download, Sprout } from "lucide-react";

interface Props {
  onExport: () => void;
}

export function Navbar({ onExport }: Props) {
  const loc = useLocation();
  const isActive = (p: string) => loc.pathname === p;

  return (
    <header className="border-b bg-card sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 mr-4">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <Sprout className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Tanzania Market Price Tracker</h1>
        </div>

        <nav className="flex gap-1">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive("/")
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            }`}
          >
            Data Table
          </Link>
          <Link
            to="/chart"
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive("/chart")
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            }`}
          >
            Trend Chart
          </Link>
        </nav>

        <div className="ml-auto flex gap-2">
          <Button onClick={onExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>
    </header>
  );
}
