import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  isConnecting: boolean;
  balance: string | null;
  chainId: string | null;
}

interface WalletContextType extends WalletState {
  shortAddress: string | null;
  isFilecoinNetwork: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const FILECOIN_MAINNET = {
  chainId: '0x1388', // 5000 in hex
  chainName: 'Filecoin Mainnet',
  nativeCurrency: {
    name: 'Filecoin',
    symbol: 'FIL',
    decimals: 18,
  },
  rpcUrls: ['https://api.node.glif.io/'],
  blockExplorerUrls: ['https://filfox.info/'],
};

const FILECOIN_CALIBRATION = {
  chainId: '0x4cb2f', // 314159 in hex  
  chainName: 'Filecoin Calibration',
  nativeCurrency: {
    name: 'Test Filecoin',
    symbol: 'tFIL',
    decimals: 18,
  },
  rpcUrls: ['https://api.calibration.node.glif.io/'],
  blockExplorerUrls: ['https://calibration.filfox.info/'],
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(() => {
    // Try to restore wallet state from localStorage
    if (typeof window !== 'undefined') {
      const savedWallet = localStorage.getItem('streambox_wallet');
      if (savedWallet) {
        try {
          return JSON.parse(savedWallet);
        } catch (e) {
          console.error('Failed to parse saved wallet state:', e);
        }
      }
    }
    return {
      isConnected: false,
      address: null,
      isConnecting: false,
      balance: null,
      chainId: null,
    };
  });

  // Save wallet state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('streambox_wallet', JSON.stringify(wallet));
    }
  }, [wallet]);

  const switchToFilecoin = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return false;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: FILECOIN_CALIBRATION.chainId }],
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [FILECOIN_CALIBRATION],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Filecoin network:', addError);
          return false;
        }
      } else {
        console.error('Failed to switch to Filecoin network:', switchError);
        return false;
      }
    }
  };

  const getBalance = async (address: string): Promise<string | null> => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return null;

    try {
      const balance = await ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      
      const balanceInFil = parseInt(balance, 16) / Math.pow(10, 18);
      return balanceInFil.toFixed(4);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return null;
    }
  };

  const connectWallet = useCallback(async () => {
    setWallet(prev => ({ ...prev, isConnecting: true }));
    
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        
        const accounts = await ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        if (accounts.length === 0) {
          throw new Error('No accounts found');
        }

        const networkSwitched = await switchToFilecoin();
        if (!networkSwitched) {
          throw new Error('Failed to switch to Filecoin network');
        }

        const chainId = await ethereum.request({
          method: 'eth_chainId',
        });

        const balance = await getBalance(accounts[0]);

        const newWalletState = {
          isConnected: true,
          address: accounts[0],
          isConnecting: false,
          balance,
          chainId,
        };
        setWallet(newWalletState);
        
        // Clear the manual disconnect flag when user connects
        if (typeof window !== 'undefined') {
          localStorage.removeItem('streambox_wallet_disconnected');
        }

        // Listen for account changes
        ethereum.on('accountsChanged', (newAccounts: string[]) => {
          if (newAccounts.length === 0) {
            setWallet({
              isConnected: false,
              address: null,
              isConnecting: false,
              balance: null,
              chainId: null,
            });
          } else {
            getBalance(newAccounts[0]).then(newBalance => {
              setWallet(prev => ({
                ...prev,
                address: newAccounts[0],
                balance: newBalance,
              }));
            });
          }
        });

        // Listen for chain changes
        ethereum.on('chainChanged', (newChainId: string) => {
          setWallet(prev => ({ ...prev, chainId: newChainId }));
        });

      } else {
        throw new Error('MetaMask not detected. Please install MetaMask to use this feature.');
      }
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
      setWallet(prev => ({ ...prev, isConnecting: false }));
      
      if (error.code === 4001) {
        throw new Error('Please accept the connection request to continue.');
      } else if (error.message?.includes('MetaMask not detected')) {
        throw new Error('MetaMask not detected. Please install MetaMask to use this feature.');
      } else {
        throw new Error('Failed to connect wallet. Please try again.');
      }
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    const disconnectedState = {
      isConnected: false,
      address: null,
      isConnecting: false,
      balance: null,
      chainId: null,
    };
    setWallet(disconnectedState);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('streambox_wallet');
      localStorage.setItem('streambox_wallet_disconnected', 'true');
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (wallet.address) {
      const balance = await getBalance(wallet.address);
      setWallet(prev => ({ ...prev, balance }));
    }
  }, [wallet.address]);

  // Check for existing connection on page load
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum && !wallet.isConnected) {
        const wasManuallyDisconnected = localStorage.getItem('streambox_wallet_disconnected');
        if (wasManuallyDisconnected === 'true') {
          return;
        }

        try {
          const ethereum = (window as any).ethereum;
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          
          if (accounts && accounts.length > 0) {
            const chainId = await ethereum.request({ method: 'eth_chainId' });
            const balance = await getBalance(accounts[0]);
            
            const newWalletState = {
              isConnected: true,
              address: accounts[0],
              isConnecting: false,
              balance,
              chainId,
            };
            setWallet(newWalletState);
          }
        } catch (error) {
          console.error('Failed to check existing connection:', error);
        }
      }
    };

    checkExistingConnection();
  }, []);

  const shortAddress = wallet.address 
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : null;

  const isFilecoinNetwork = wallet.chainId === FILECOIN_CALIBRATION.chainId || wallet.chainId === FILECOIN_MAINNET.chainId;

  const value: WalletContextType = {
    ...wallet,
    shortAddress,
    isFilecoinNetwork,
    connectWallet,
    disconnectWallet,
    refreshBalance,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}