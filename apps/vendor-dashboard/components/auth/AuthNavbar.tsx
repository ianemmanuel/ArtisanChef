import Link from 'next/link'

export default function AuthNavbar() {
  return (
    <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_2px_10px_var(--shadow-primary)]">
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2C6.5 2 4 5 4 8c0 2 1 3.5 2 4.5V15h8v-2.5C15 11.5 16 10 16 8c0-3-2.5-6-6-6z" fill="currentColor" className="text-primary-foreground" fillOpacity="0.95" />
              <path d="M7 15h6v1.5a1 1 0 01-1 1H8a1 1 0 01-1-1V15z" fill="currentColor" className="text-primary-foreground" fillOpacity="0.65" />
            </svg>
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Daily<span className="text-primary">Bread</span>
          </span>
        </Link>
      </div>
    </header>
  )
}
