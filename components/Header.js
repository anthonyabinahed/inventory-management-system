"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Shield, LogOut, Menu, X } from "lucide-react";
import { signOut } from "@/actions/auth";
import config from "@/config";
import logo from "@/app/icon.png";
import Image from "next/image";


const Header = ({ user, isAdmin }) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthPage = [
    config.routes.login,
    config.routes.forgotPassword,
    config.routes.resetPassword,
    config.routes.acceptInvite,
  ].includes(pathname);

  const handleLogout = async () => {
    await signOut();
    window.location.href = config.routes.login;
  };

  return (
    <header className="bg-base-200">
      <nav
        className="container flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4 mx-auto"
        aria-label="Global"
      >
        <Link
          className="flex items-center gap-2 shrink-0"
          href="/"
        >
          <Image
            src={logo}
            alt={`${config.appName} logo`}
            priority={true}
            width={180}
            height={45}
            className="w-[140px] sm:w-[180px] lg:w-[220px] h-auto"
          />
        </Link>

        {user && !isAuthPage && (
          <>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/"
                className={`btn btn-ghost btn-sm ${pathname === "/" ? "btn-active" : ""}`}
                title="Home"
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className={`btn btn-ghost btn-sm ${pathname.startsWith("/admin") ? "btn-active" : ""}`}
                  title="Admin Panel"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              )}
              <div className="divider divider-horizontal mx-0"></div>
              <span className="text-sm text-base-content/70 hidden lg:inline">{user.email}</span>
              <button
                onClick={handleLogout}
                className="btn btn-ghost btn-sm"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="btn btn-ghost btn-sm btn-square"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Mobile Menu Dropdown */}
      {user && !isAuthPage && mobileMenuOpen && (
        <div className="md:hidden bg-base-200 border-t border-base-300 px-4 py-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-base-content/50 px-2 truncate">{user.email}</span>
            <Link
              href="/"
              className={`btn btn-ghost btn-sm justify-start ${pathname === "/" ? "btn-active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className={`btn btn-ghost btn-sm justify-start ${pathname.startsWith("/admin") ? "btn-active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm justify-start text-error"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
