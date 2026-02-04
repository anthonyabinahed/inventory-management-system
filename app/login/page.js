"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import config from "@/config";
import { login, getCurrentUser } from "@/actions/auth";

export default function LogIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (user) {
        router.replace(config.routes.home);
      } else {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleLogIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.target);
      const { errorMessage, isAdmin } = await login(formData);

      if (errorMessage) {
        toast.error(errorMessage);
        return;
      }
      if (isAdmin) {
        router.replace(config.routes.admin.dashboard.users);
      } else {
        router.replace(config.routes.home);
      }

      toast.success("Welcome back");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        data-theme={config.colors.theme}
      >
        <span className="loading loading-spinner loading-lg"></span>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-8"
      data-theme={config.colors.theme}
    >
      <div className="w-full max-w-md">
        <form onSubmit={handleLogIn} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input input-bordered w-full"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Password</span>
            </label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-bordered w-full"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading && (
              <span className="loading loading-spinner loading-xs"></span>
            )}
            Sign In
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href={config.routes.forgotPassword} className="link link-hover text-sm">
            Forgot your password?
          </Link>
        </div>

        <div className="text-center mt-4 text-sm text-base-content/50">
          Don't have an account? Contact your administrator.
        </div>
      </div>
    </main>
  );
}
