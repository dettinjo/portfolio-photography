// Guest galleries: same frame as the client area.
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-[70vh] max-w-6xl px-4 py-12 sm:px-6 sm:py-20">{children}</div>;
}
