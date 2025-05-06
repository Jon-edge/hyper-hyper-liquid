"use client"

import Image from "next/image"
import WalletConnect from "@/components/WalletConnect"
import AccountBalance from "@/components/AccountBalance"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="/hyperliquid-logo.svg"
              alt="Hyperliquid Logo"
              width={40}
              height={40}
              className="mr-3"
              priority
            />
            <h1 className="text-xl font-bold text-gray-900">Hyper Hyperliquid</h1>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Welcome to Hyper Hyperliquid</h2>
          <p className="text-gray-600 mb-4">
            This app allows you to trade Hyperliquid, but better.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-700">
              To get started, click the "Connect Wallet" button in the top right corner.
            </p>
          </div>
        </div>

        <AccountBalance />
      </main>

      {/* Footer */}
      <footer className="bg-white shadow-sm mt-8 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-500 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Hyper Hyperliquid
            </div>
            <div className="flex space-x-6">
              <a 
                href="https://hyperliquid.xyz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Hyper Hyperliquid
              </a>
              <a 
                href="https://hyperliquid.gitbook.io/hyperliquid-docs/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
