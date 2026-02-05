"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import config from "@/config";
import {
  getCurrentUser,
  setSessionFromTokens,
  updatePassword,
  signOut
} from "@/actions/auth";

function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyRecoveryLink = async () => {
      try {
        // Check for hash fragments (Supabase redirects with tokens here)
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const hashError = hashParams.get("error");
          const errorDescription = hashParams.get("error_description");

          if (hashError) {
            throw new Error(errorDescription?.replace(/\+/g, " ") || "Invalid reset link");
          }

          // Check for access_token in hash (successful verification)
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            // Set the session from the tokens via server action
            const { errorMessage } = await setSessionFromTokens(accessToken, refreshToken);

            if (errorMessage) throw new Error(errorMessage);

            setIsReady(true);
            // Clear the hash from URL
            window.history.replaceState(null, "", window.location.pathname);
            return;
          }
        }

        // Check if user is already authenticated
        const currentUser = await getCurrentUser();

        if (currentUser) {
          setIsReady(true);
          return;
        }

        // No valid session or tokens found
        setError("Invalid or expired reset link. Please request a new one.");
      } catch (err) {
        console.error("Recovery verification error:", err);
        setError(err.message || "Invalid or expired reset link");
      }
    };

    // Small delay to let the page fully load
    const timer = setTimeout(verifyRecoveryLink, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const { errorMessage } = await updatePassword(password);

      if (errorMessage) throw new Error(errorMessage);

      toast.success("Password updated successfully!");

      // Sign out to force re-login with new password
      await signOut();

      router.push(config.routes.login);
    } catch (error) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-base-200">
        <div className="card bg-base-100 shadow-xl w-full max-w-md">
          <div className="card-body text-center">
            <div className="text-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-lg font-semibold mb-2">Link Expired</h1>
            <p className="text-base-content/60 text-sm mb-6">{error}</p>
            <a href={config.routes.forgotPassword} className="btn btn-primary btn-sm">
              Request New Link
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-8 bg-base-200"
      data-theme={config.colors.theme}
    >
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body">
          <p className="text-center text-base-content/60 text-sm mb-6">
            Choose a strong password for your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">New Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full"
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
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
              Update Password
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-base-200">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
