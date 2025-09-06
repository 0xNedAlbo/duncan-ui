import Link from "next/link"
import { UserDropdown } from "./auth/user-dropdown"

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              DUNCAN
            </div>
            <span className="text-xs text-slate-400 hidden sm:block">
              V3 Risk Manager
            </span>
          </Link>

          {/* Navigation (optional for later) */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className="text-slate-300 hover:text-white transition-colors text-sm"
            >
              Dashboard
            </Link>
            <Link 
              href="/positions" 
              className="text-slate-300 hover:text-white transition-colors text-sm"
            >
              Positionen
            </Link>
            <Link 
              href="/analytics" 
              className="text-slate-300 hover:text-white transition-colors text-sm"
            >
              Analytics
            </Link>
          </nav>

          {/* User Dropdown */}
          <UserDropdown />
        </div>
      </div>
    </header>
  )
}