import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div className="flex flex-col md:flex-row h-dvh overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 min-h-0 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
