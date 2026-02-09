"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import config from "@/config";
import {
  getCurrentUser,
  verifyInviteToken,
  setSessionFromTokens,
  updatePassword,
  signOut
} from "@/actions/auth";
import { setPasswordSchema } from "@/libs/schemas";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        // Check for error in hash fragment (Supabase redirects with errors here)
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const hashError = hashParams.get("error");
          const errorDescription = hashParams.get("error_description");

          if (hashError) {
            throw new Error(errorDescription?.replace(/\+/g, " ") || "Invalid invitation link");
          }

          // Check for access_token in hash (successful verification)
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            // Set the session from the tokens via server action
            const { user, errorMessage } = await setSessionFromTokens(accessToken, refreshToken);

            if (errorMessage) throw new Error(errorMessage);

            if (user) {
              setUserEmail(user.email);
              setIsVerifying(false);
              // Clear the hash from URL
              window.history.replaceState(null, "", window.location.pathname);
              return;
            }
          }
        }

        // Check if user is already authenticated
        const currentUser = await getCurrentUser();

        if (currentUser) {
          setUserEmail(currentUser.email);
          setIsVerifying(false);
          return;
        }

        // Try to verify from URL query params
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (tokenHash && type === "invite") {
          const { user, errorMessage } = await verifyInviteToken(tokenHash);

          if (errorMessage) throw new Error(errorMessage);

          if (user) {
            setUserEmail(user.email);
          }
          setIsVerifying(false);
        } else {
          setError("Invalid or expired invitation link. Please contact your administrator for a new invitation.");
          setIsVerifying(false);
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError(err.message || "Invalid or expired invitation link");
        setIsVerifying(false);
      }
    };

    // Small delay to let Supabase process any URL tokens
    const timer = setTimeout(verifyInvitation, 100);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const onSubmit = async (data) => {
    try {
      const { errorMessage } = await updatePassword(data.password);

      if (errorMessage) throw new Error(errorMessage);

      toast.success("Password set successfully! Please login with your new credentials.");

      // Sign out to force login with new password
      await signOut();

      router.push(config.routes.login);
    } catch (error) {
      toast.error(error.message || "Failed to set password");
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-base-200">
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
            <h1 className="text-lg font-semibold mb-2">Invalid Invitation</h1>
            <p className="text-base-content/60 text-sm mb-6">{error}</p>
            <a href={config.routes.login} className="btn btn-primary btn-sm">
              Go to Login
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-base-200"
      data-theme={config.colors.theme}
    >
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body">
          <p className="text-center text-base-content/60 text-sm mb-2">
            Set a password to complete your account setup
          </p>
          {userEmail && (
            <p className="text-center text-sm mb-4">
              Account: <strong>{userEmail}</strong>
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">New Password</span>
              </label>
              <input
                type="password"
                {...register("password")}
                className={`input input-bordered w-full ${errors.password ? "input-error" : ""}`}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              {errors.password && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.password.message}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                type="password"
                {...register("confirmPassword")}
                className={`input input-bordered w-full ${errors.confirmPassword ? "input-error" : ""}`}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.confirmPassword.message}</span>
                </label>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <span className="loading loading-spinner loading-xs"></span>
              )}
              Set Password & Get Started
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-base-200">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}
