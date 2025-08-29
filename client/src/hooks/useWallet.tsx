import { useState, useCallback } from "react";

interface WalletState {
  isConnected: boolean;
  address: string | null;
  isConnecting: boolean;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    isConnecting: false,
  });

  const connectWallet = useCallback(async () => {
    setWallet(prev => ({ ...prev, isConnecting: true }));
    
    try {
      // Mock MetaMask connection for demo purposes
      // In a real implementation, this would use window.ethereum
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        if (accounts.length > 0) {
          setWallet({
            isConnected: true,
            address: accounts[0],
            isConnecting: false,
          });
        }
      } else {
        // Mock connection for demo
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockAddress = "0x742d35cc6634c0532925a3b8d5c0b5e1ba64e2c1";
        setWallet({
          isConnected: true,
          address: mockAddress,
          isConnecting: false,
        });
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      setWallet(prev => ({ ...prev, isConnecting: false }));
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet({
      isConnected: false,
      address: null,
      isConnecting: false,
    });
  }, []);

  const shortAddress = wallet.address 
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : null;

  return {
    ...wallet,
    shortAddress,
    connectWallet,
    disconnectWallet,
  };
}
