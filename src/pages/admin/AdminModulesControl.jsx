import React from 'react';
import TopHeader from './components/TopHeader';
import PlatformConfig from './components/settings/PlatformConfig';

const AdminModulesControl = () => {
  return (
    <div className="flex flex-col">
      <TopHeader title="Modules" subtitle="Global module controls, rollout readiness, and maintenance mode" />
      <div className="p-4 md:p-6">
        <PlatformConfig />
      </div>
    </div>
  );
};

export default AdminModulesControl;

