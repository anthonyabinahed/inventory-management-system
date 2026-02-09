"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { requestPasswordReset } from "@/actions/auth";
import { forgotPasswordSchema } from "@/libs/schemas";
import config from "@/config";

export default function ForgotPassword() {
  const [isSent, setIsSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      const { errorMessage } = await requestPasswordReset(data.email);

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      setSentEmail(data.email);
      setIsSent(true);
      toast.success("Check your email for reset instructions");
    } catch (error) {
      toast.error(error.message || "Failed to send reset email");
    }
  };

  const handleTryAgain = () => {
    setIsSent(false);
    reset();
  };

  if (isSent) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-8 bg-base-200"
        data-theme={config.colors.theme}
      >
        <div className="card bg-base-100 shadow-xl w-full max-w-md">
          <div className="card-body text-center">
            <div className="text-success mb-4">
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-lg font-semibold mb-2">Check Your Email</h1>
            <p className="text-base-content/60 text-sm mb-4">
              We've sent password reset instructions to{" "}
              <strong>{sentEmail}</strong>
            </p>
            <p className="text-xs text-base-content/50 mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                className="btn btn-outline btn-sm"
                onClick={handleTryAgain}
              >
                Try Again
              </button>
              <Link href={config.routes.login} className="btn btn-primary btn-sm">
                Back to Login
              </Link>
            </div>
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
          <div className="flex items-center gap-3 mb-4">
            <Link href={config.routes.login} className="btn btn-ghost btn-sm btn-square">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
            <p className="text-base-content/60 text-sm">Reset your password</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                {...register("email")}
                className={`input input-bordered w-full ${errors.email ? "input-error" : ""}`}
                placeholder="you@company.com"
                autoComplete="email"
              />
              {errors.email && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.email.message}</span>
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
              Send Reset Link
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
