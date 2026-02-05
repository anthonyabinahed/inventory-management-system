"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/actions/auth";
import config from "@/config";
import logo from "@/app/icon.png";
import Image from "next/image";


const Header = ({ user }) => {
  const pathname = usePathname();
  const isLoginPage = pathname === config.routes.login;

  const handleLogout = async () => {
    await signOut();
    window.location.href = config.routes.login;
  };

  return (
    <header className="bg-base-200">
      <nav
        className="container flex items-center justify-between px-8 py-4 mx-auto"
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
                width={250}
                height={60}
              />
        </Link>

        {user && !isLoginPage && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-base-content/70">{user.email}</span>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm"
              title="Logout"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </button>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
