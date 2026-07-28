import { Link, useLocation } from "wouter";
import { LayoutDashboard, Target, Bug } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/programs", label: "Programs", icon: Target },
    { href: "/findings", label: "Findings", icon: Bug },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-safe">
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}