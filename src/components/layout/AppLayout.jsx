import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import {
    Megaphone,
    Phone,
    UserCheck,
    Headphones,
    CreditCard,
    Settings,
    ChevronDown,
    ChevronRight,
    LayoutDashboard,
    FolderKanban,
    Share2,
    Users,
    Activity,
    Ticket,
    BarChart3,
    Sparkles,
    Wrench,
    BrainCircuit,
    Menu,
    X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SidebarUserMenu from './SidebarUserMenu';
import { useAuth } from '../../context/AuthContext';
import { useMaintenance } from '../../context/MaintenanceContext';
import { useSubscription } from '../../commerce/SubscriptionContext';
import GlobalMaintenancePage from '../maintenance/GlobalMaintenancePage';
import MaintenanceBanner from '../maintenance/MaintenanceBanner';

const AppLayout = () => {
    const location = useLocation();
    const { user } = useAuth();
    const { isModuleActive } = useSubscription();
    const { isGlobalMaintenance, isModuleUnderMaintenance, loading: maintenanceLoading } = useMaintenance();

    const isAdmin = user?.role === 'admin';

    // State for expanded menus
    const [expandedMenus, setExpandedMenus] = useState({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Initialize expanded state based on current URL
    useEffect(() => {
        setExpandedMenus((prev) => ({
            ...prev,
            '/marketing': prev['/marketing'] || location.pathname.startsWith('/marketing'),
            '/sales': prev['/sales'] || location.pathname.startsWith('/sales'),
            '/post-sales': prev['/post-sales'] || location.pathname.startsWith('/post-sales'),
            '/support': prev['/support'] || location.pathname.startsWith('/support'),
        }));
    }, [location.pathname]);

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    const toggleMenu = (path) => {
        setExpandedMenus(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    // ─── Global maintenance guard for non-admin users ────────────────────
    if (!maintenanceLoading && isGlobalMaintenance && !isAdmin) {
        return <GlobalMaintenancePage />;
    }

    const navItems = [
        {
            label: 'Marketing',
            path: '/marketing',
            icon: Megaphone,
            moduleKey: 'marketing',
            children: [
                { label: 'Dashboard', path: '/marketing', icon: LayoutDashboard, end: true },
                { label: 'Projects', path: '/marketing/projects', icon: FolderKanban },
                { label: 'Brain Drive', path: '/marketing/brain-drive', icon: BrainCircuit },
                { label: 'Social', path: '/marketing/social', icon: Share2 },
                { label: 'Custom', path: '/marketing/custom', icon: Sparkles }
            ]
        },
        {
            label: 'Sales',
            path: '/sales',
            icon: Phone,
            moduleKey: 'sales',
            children: [
                { label: 'Dashboard', path: '/sales', icon: LayoutDashboard, end: true },
                { label: 'Leads', path: '/sales/leads', icon: Users },
                { label: 'Interactions', path: '/sales/interactions', icon: Activity },
                { label: 'Campaigns', path: '/sales/campaigns', icon: Megaphone },
                { label: 'Brain Drive', path: '/sales/brain-drive', icon: BrainCircuit },
            ]
        },
        {
            label: 'Post Sales',
            path: '/post-sales',
            icon: UserCheck,
            moduleKey: 'post-sales',
            children: [
                { label: 'Dashboard', path: '/post-sales', icon: LayoutDashboard, end: true },
                { label: 'Customers', path: '/post-sales/customers', icon: Users },
                { label: 'Automations', path: '/post-sales/automations', icon: Settings },
                { label: 'Brain Drive', path: '/post-sales/brain-drive', icon: BrainCircuit },
            ]
        },
        {
            label: 'Support',
            path: '/support',
            icon: Headphones,
            moduleKey: 'support',
            children: [
                { label: 'Dashboard', path: '/support', icon: LayoutDashboard, end: true },
                { label: 'Tickets', path: '/support/tickets', icon: Ticket },
                { label: 'Analytics', path: '/support/analytics', icon: BarChart3 },
                { label: 'Brain Drive', path: '/support/brain-drive', icon: BrainCircuit },
            ]
        },
        { label: 'Subscription', path: '/subscription', icon: CreditCard },
        { label: 'Settings', path: '/settings', icon: Settings },
    ];



    const isParentActive = (item) => {
        if (item.children) {
            return location.pathname.startsWith(item.path);
        }
        return location.pathname.startsWith(item.path);
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[120] focus:px-4 focus:py-2 focus:rounded-md focus:bg-white focus:text-blue-700 focus:shadow-lg focus:ring-2 focus:ring-blue-500/70"
            >
                Skip to main content
            </a>
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.button
                        type="button"
                        aria-label="Close navigation menu"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px] lg:hidden"
                    />
                )}
            </AnimatePresence>
            {/* Sidebar */}
            <aside
                aria-label="Primary navigation"
                className={`w-[240px] bg-white border-r border-gray-200 flex flex-col fixed h-full z-40 shadow-sm transition-transform duration-300 ease-out lg:translate-x-0 ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-center py-3 border-b border-gray-100 shrink-0 h-16">
                    <Link to="/">
                        <img src="/BlackTextLogo.webp" alt="SalesPal" className="h-10 w-auto object-contain" />
                    </Link>
                    <button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() => setIsSidebarOpen(false)}
                        className="absolute right-3 p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 lg:hidden"
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto pt-5 px-3 space-y-1" aria-label="Module navigation">
                    {navItems.map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isExpanded = expandedMenus[item.path];
                        const isActiveParent = isParentActive(item);

                        // Check if this module is under maintenance
                        const moduleUnderMaintenance = item.moduleKey && isModuleUnderMaintenance(item.moduleKey);
                        const subscriptionInactive = item.moduleKey ? !isModuleActive(item.moduleKey) : false;
                        const isModuleDisabled = moduleUnderMaintenance || subscriptionInactive;

                        return (
                            <div key={item.path}>
                                {hasChildren ? (
                                    <div className="relative group">
                                        <button
                                            onClick={() => {
                                                if (isModuleDisabled) return; // Block click
                                                toggleMenu(item.path);
                                            }}
                                            className={`w-full min-h-11 flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
                                                isModuleDisabled
                                                    ? 'text-gray-400 cursor-not-allowed opacity-60'
                                                    : isActiveParent
                                                        ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon size={20} strokeWidth={1.5} className="shrink-0" />
                                                {item.label}
                                                {/* Maintenance badge */}
                                                {moduleUnderMaintenance && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 leading-tight">
                                                        <Wrench size={10} />
                                                        Maintenance
                                                    </span>
                                                )}
                                                {subscriptionInactive && !moduleUnderMaintenance && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 leading-tight">
                                                        <Wrench size={10} />
                                                        Locked
                                                    </span>
                                                )}
                                            </div>
                                            {!isModuleDisabled && (
                                                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                                            )}
                                        </button>
                                        {/* Tooltip for disabled modules */}
                                        {isModuleDisabled && (
                                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
                                                {moduleUnderMaintenance ? 'Currently under maintenance' : 'Subscription required'}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <NavLink
                                        to={item.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 min-h-11 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${isActive
                                                ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`
                                        }
                                    >
                                        <item.icon size={20} strokeWidth={1.5} className="shrink-0" />
                                        {item.label}
                                    </NavLink>
                                )}

                                {/* Dropdown Children */}
                                <AnimatePresence>
                                    {hasChildren && isExpanded && !isModuleDisabled && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-1 ml-4 pl-3 border-l-2 border-gray-100 space-y-1">
                                                {item.children.map((child) => (
                                                    <NavLink
                                                        key={child.path}
                                                        to={child.path}
                                                        end={child.end}
                                                        onClick={() => setIsSidebarOpen(false)}
                                                        className={({ isActive }) =>
                                                            `flex items-center gap-2 min-h-11 px-3 py-2 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${isActive
                                                                ? 'text-blue-600 bg-blue-50 font-medium'
                                                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                                            }`
                                                        }
                                                    >
                                                        {child.label}
                                                    </NavLink>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </nav>

                <SidebarUserMenu />
            </aside>

            {/* Main Content */}
            <main id="main-content" className="flex-1 lg:ml-[240px] overflow-auto bg-gray-50 flex flex-col min-w-0">
                <div className="lg:hidden sticky top-0 z-20 h-14 border-b border-gray-200 bg-white px-3 flex items-center justify-between">
                    <button
                        type="button"
                        aria-label="Open navigation menu"
                        onClick={() => setIsSidebarOpen(true)}
                        className="inline-flex items-center gap-2 min-h-11 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                    >
                        <Menu size={16} />
                        Menu
                    </button>
                    <img src="/BlackTextLogo.webp" alt="SalesPal" className="h-7 w-auto object-contain" />
                </div>
                {/* Admin maintenance banner */}
                {isAdmin && <MaintenanceBanner />}
                <div className="flex-1">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
