"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import config from "@/config";
import { login, getCurrentUser } from "@/actions/auth";
import { loginSchema } from "@/libs/schemas";

export default function LogIn() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

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

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);

      const { errorMessage, isAdmin } = await login(formData);

      if (errorMessage) {
        toast.error(errorMessage);
        return;
      }
      if (isAdmin) {
        router.replace(config.routes.admin.dashboard);
      } else {
        router.replace(config.routes.home);
      }

      toast.success("Welcome back");
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (isCheckingAuth) {
    return (
      <main
        className="min-h-screen flex items-center justify-center bg-base-200"
        data-theme={config.colors.theme}
      >
        <span className="loading loading-spinner loading-lg"></span>
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
          <p className="text-center text-base-content/60 text-sm mb-6">Sign in to continue</p>

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

            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                {...register("password")}
                className={`input input-bordered w-full ${errors.password ? "input-error" : ""}`}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {errors.password && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.password.message}</span>
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
              Sign In
            </button>
          </form>

          <div className="divider my-4"></div>

          <div className="text-center">
            <Link href={config.routes.forgotPassword} className="link link-hover text-sm">
              Forgot your password?
            </Link>
          </div>

          <div className="text-center text-sm text-base-content/50">
            Don't have an account? Contact your administrator.
          </div>
        </div>
      </div>
    </main>
  );
}
