// Inner pages (shop, product, support…) sit on a white sheet floating over the
// lawn backdrop. The route group keeps URLs unchanged; the home page opts out.
export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-2 py-4 sm:px-6 sm:py-10">
      <div className="sheet">{children}</div>
    </div>
  );
}
