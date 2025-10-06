"use client"

import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { User, LogOut, ChevronDown, Key } from "lucide-react"
import { useTranslations } from "@/i18n/client"

export function UserDropdown() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const t = useTranslations()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
    setIsOpen(false)
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50">
        <div className="w-8 h-8 rounded-full bg-slate-700/50 animate-pulse" />
        <div className="w-16 h-4 bg-slate-700/50 animate-pulse rounded" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/auth/signin"
          className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
        >
          Connect Wallet
        </Link>
      </div>
    )
  }

  const displayName = session.user?.name || (session.user?.address ? `${session.user.address.slice(0, 6)}...${session.user.address.slice(-4)}` : "")
  const userInitial = displayName.charAt(0).toUpperCase()

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors group"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
          {userInitial}
        </div>
        
        {/* Name */}
        <span className="text-slate-200 text-sm font-medium max-w-24 truncate">
          {displayName}
        </span>
        
        {/* Dropdown Icon */}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800/90 backdrop-blur-md rounded-lg border border-slate-700/50 shadow-xl shadow-black/20 z-50">
          <div className="p-3 border-b border-slate-700/50">
            <p className="text-sm text-slate-200 font-medium">{displayName}</p>
            <p className="text-xs text-slate-400 truncate">{session.user?.address}</p>
          </div>
          
          <div className="py-1">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <User className="w-4 h-4" />
              {t("userDropdown.profile")}
            </button>

            <Link
              href="/api-keys"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <Key className="w-4 h-4" />
              {t("userDropdown.apiKeys")}
            </Link>

            <hr className="my-1 border-slate-700/50" />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t("userDropdown.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}