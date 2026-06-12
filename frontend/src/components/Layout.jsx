import { motion } from "framer-motion";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({
  children,
  address,
  balance,
  isConnected,
  activePage,
  onPageChange,
  onConnect,
  networkName,
  walletError,
  notifications,
}) {
  return (
    <div className="min-h-screen bg-[#F6F8FF] text-[#071127]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(120deg,rgba(37,99,235,0.12),rgba(124,58,237,0.10),rgba(255,255,255,0))]"
          animate={{ opacity: [0.65, 0.95, 0.65] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.94),rgba(246,248,255,0)_42%)]" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1520px] grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)]">
        <Sidebar
          address={address}
          balance={balance}
          isConnected={isConnected}
          activePage={activePage}
          onPageChange={onPageChange}
          onConnect={onConnect}
        />

        <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-7 lg:py-6 2xl:px-8">
          <Header
            address={address}
            networkName={networkName}
            isConnected={isConnected}
            walletError={walletError}
            onConnect={onConnect}
            notifications={notifications}
          />

          <motion.main
            className="mx-auto mt-6 w-full max-w-[1240px] space-y-7 2xl:max-w-[1280px]"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
