'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Mail, Store, Eye, EyeOff } from '@/components/common/Icons';
import { toast } from 'sonner';
import { useSettings } from '@/lib/hooks/useSettings';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { settings } = useSettings();

  const storeName = settings?.storeName || process.env.NEXT_PUBLIC_BRAND_NAME || 'Your Store';
  const logoUrl = settings?.logoUrl || null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      toast.success('Logged in successfully!');
      window.location.href = '/admin/dashboard';
    } catch (err) {
      console.error('Login error:', err);
      const errMsg = err instanceof Error ? err.message : 'Authentication failed';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0f0f1b] px-4 py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-[#16162a] p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a1a2e] dark:bg-[#e94560] text-white overflow-hidden">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={storeName}
                width={56}
                height={56}
                className="h-full w-full object-contain"
              />
            ) : (
              <Store className="h-7 w-7 text-[#e94560] dark:text-white" />
            )}
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
            Admin Portal Sign-In
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sign in to manage your {storeName} catalog
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Email Address
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="admin@zaynahs.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 py-2.5 pl-10 pr-4 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 py-2.5 pl-10 pr-10 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link
                  href="/admin/forgot-password"
                  className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-[#e94560] transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-[#1a1a2e] dark:bg-[#e94560] hover:bg-[#e94560] dark:hover:bg-[#e94560]/80 active:scale-98 text-white px-5 py-3 text-sm font-bold transition-all duration-200 shadow-md cursor-pointer disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
