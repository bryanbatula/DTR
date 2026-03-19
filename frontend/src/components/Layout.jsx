import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const TITLES = {
  '/':           { title: 'Dashboard',   sub: "Overview of today's attendance activity" },
  '/employees':  { title: 'Employees',   sub: 'Manage employee records and rates' },
  '/attendance': { title: 'DTR Log',     sub: 'Log and review daily time records' },
  '/reports':    { title: 'Reports',     sub: 'Payroll summary and attendance reports' },
};

export default function Layout() {
  const { pathname } = useLocation();
  const meta = TITLES[pathname] || { title: 'DTR System', sub: '' };
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content — offset on desktop, full-width on mobile */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-60">

        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-none truncate">
                  {meta.title}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{meta.sub}</p>
              </div>
            </div>

            <div className="text-xs text-slate-400 hidden md:block flex-shrink-0">
              {new Date().toLocaleDateString('en-PH', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              })}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
