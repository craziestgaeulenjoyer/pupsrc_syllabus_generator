/* @ts-ignore */
declare const route: any;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, usePage, router } from '@inertiajs/react';
import LogoutConfirmationModal from '../modals_section/LogoutConfirmation';
import { FolderClosed, FolderOpenDot, LogOut, Table2 } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { url } = usePage();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
    router.post(route("logout"));
  };

  const safeRoute = (name: string) => {
    try {
      if (typeof route !== 'undefined') {
        return route(name);
      }
      return "#";
    } catch (e) {
      console.warn(`Route "${name}" not found.`);
      return "#";
    }
  };

  const NavLink = ({ 
    icon,
    activeIcon, 
    label, 
    index, 
    href, 
    onClick 
  }: { 
    icon: React.ReactNode, 
    activeIcon?: React.ReactNode,
    label: string, 
    index: number, 
    href: string, 
    onClick?: () => void 
  }) => {
    const isActive =
      url === href ||
      (href !== '/' && url.startsWith(href)) ||
      (label === "Syllabus Generator" && url.startsWith('/syllabus'));


    return (
      <Link 
        href={href} 
        onClick={onClick} 
        className="block w-full outline-none no-underline"
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 * index, duration: 0.2 }}
          whileHover={{ x: 5 }}
          whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-4 w-full p-4 rounded-lg font-bold mb-2 transition-all duration-200 group relative overflow-hidden border-l-4 
            ${isActive 
              ? "bg-[#800000]/10 text-[#800000] border-[#800000] shadow-sm" 
              : "text-slate-700 border-transparent hover:bg-slate-50 hover:border-[#800000]/30"
            }`}
        >
          <div  
            className={`w-5 h-5 transition-opacity duration-200 
              ${isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}
          >
            {isActive && activeIcon ? activeIcon : icon}
          </div>
          <span className="text-md">{label}</span>

          {isActive && (
            <motion.div 
              layoutId="activePill"
              className="absolute inset-0 bg-[#800000]/5 -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.div>
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full bg-[#800000] text-white z-50 flex items-center justify-between shadow-lg px-4 py-3 md:px-8 md:py-4">
        
        <div className="flex items-center gap-3 md:gap-5 select-none">
          <div className="bg-white rounded-full p-1 h-10 w-10 md:h-12 md:w-12 flex items-center justify-center overflow-hidden shadow-sm">
            <img
              src="/images/pup_logo.png" 
              alt="PUP Logo"
              className="h-full w-auto object-contain"
            />
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight">
            PUP Syllabi<span className="text-[#F5F21F]">Sys</span>
          </h1>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none active:scale-95"
          aria-label="Open Menu"
        >
          <svg className="h-7 w-7 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-60 backdrop-blur-[3px]"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-screen w-70 md:w-[320px] bg-white z-70 shadow-2xl flex flex-col justify-between overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-end mb-8">
                  <motion.button 
                    onClick={() => setIsOpen(false)} 
                    whileHover={{ rotate: 90, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-slate-400 hover:text-[#800000] transition-colors p-1"
                  >
                     <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                  </motion.button>
                </div>

                <div className="space-y-1">
                  <NavLink 
                    index={1}
                    href="/dashboard" 
                    icon={<FolderClosed />}
                    activeIcon={<FolderOpenDot />}
                    label="Dashboard" 
                    onClick={() => setIsOpen(false)}
                  />
                  <NavLink 
                    index={2}
                    href={safeRoute('syllabus.step1')} 
                    icon={<Table2 />}
                    activeIcon={<Table2 />}
                    label="Syllabus Generator" 
                    onClick={() => setIsOpen(false)}
                  />
                </div>
              </div>

              <div className="bg-[#800000] mt-auto">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center justify-center gap-3 py-5 text-white transition-all font-bold text-md tracking-wider border-t border-white/10 uppercase hover:bg-black/20 active:bg-black/30 outline-none w-full text-center"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <LogoutConfirmationModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          handleLogout();
        }}
      />
    </>
  );
};

export default Navbar;