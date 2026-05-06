import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSubscription } from '../commerce/SubscriptionContext';
import ProjectSwitcher from '../components/ProjectSwitcher';
import GlobalCreditDisplay from '../components/GlobalCreditDisplay';
import TopUpDrawer from '../components/credits/TopUpDrawer';
import NotificationBell from '../components/notifications/NotificationBell';

const SalesLayout = () => {
    const location = useLocation();
    const { isModuleActive } = useSubscription();
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);

    // Consider credits relevant if module is active
    const showCredits = isModuleActive('sales') && location.pathname.startsWith('/sales');

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar - Project Switcher, Credits & Notifications */}
                <header aria-label="Sales top bar" className="h-14 md:h-16 bg-white border-b border-gray-200 px-3 md:px-6 flex items-center justify-between gap-2 shrink-0 sticky top-0 z-20 overflow-visible">
                    <div className="w-[min(14rem,58vw)] sm:w-64 min-w-0">
                        <ProjectSwitcher />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {showCredits && <GlobalCreditDisplay onTopUpClick={() => setIsTopUpOpen(true)} />}
                        {showCredits && <div className="w-px h-5 bg-gray-200" />}
                        <NotificationBell />
                    </div>
                </header>

                {/* Content Area */}
                <main id="sales-main-content" className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                    <div className="max-w-[1400px] mx-auto w-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            <TopUpDrawer isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} />
        </div>
    );
};

export default SalesLayout;
