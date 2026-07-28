import { BottomNav } from "./BottomNav";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-20">
      <main className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}