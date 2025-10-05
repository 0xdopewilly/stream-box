import { useState, useCallback, useEffect } from "react";

interface WalletState {
  isConnected: boolean;
  address: string | null;
  isConnecting: boolean;
  balance: string | null;
  chainId: string | null;
}

// Filecoin network configuration
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

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(() => {
    // Try to restore wallet state from localStorage
    if (typeof window !== 'undefined') {
      const savedWallet = localStorage.getItem('streambox_wallet');
      if (savedWallet) {
        try {
          const parsed = JSON.parse(savedWallet);
          // Never restore isConnecting state - it should always start as false
          return {
            ...parsed,
            isConnecting: false,
          };
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

  // Clear any stuck connecting state on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && wallet.isConnecting) {
      setWallet(prev => ({ ...prev, isConnecting: false }));
    }
  }, []);

  // Save wallet state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Never save isConnecting state
      const stateToSave = { ...wallet, isConnecting: false };
      localStorage.setItem('streambox_wallet', JSON.stringify(stateToSave));
    }
  }, [wallet]);

  // Check for existing connection on page load only if user didn't manually disconnect
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum && !wallet.isConnected) {
        // Check if user manually disconnected
        const wasManuallyDisconnected = localStorage.getItem('streambox_wallet_disconnected');
        if (wasManuallyDisconnected === 'true') {
          return; // Don't auto-reconnect if user manually disconnected
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
  }, []); // Remove wallet.isConnected dependency to avoid infinite loops

  const switchToFilecoin = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return false;

    try {
      // Try to switch to Filecoin Calibration network first
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: FILECOIN_CALIBRATION.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // Network doesn't exist, add it
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
      
      // Convert from wei to FIL (18 decimals)
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
      // Check if MetaMask is installed
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        
        // Request account access
        const accounts = await ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        if (accounts.length === 0) {
          throw new Error('No accounts found');
        }

        // Switch to Filecoin network
        const networkSwitched = await switchToFilecoin();
        if (!networkSwitched) {
          throw new Error('Failed to switch to Filecoin network');
        }

        // Get current chain ID
        const chainId = await ethereum.request({
          method: 'eth_chainId',
        });

        // Get balance
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
      
      // Handle user rejection gracefully
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
    
    // Clear localStorage and mark as manually disconnected
    if (typeof window !== 'undefined') {
      localStorage.removeItem('streambox_wallet');
      localStorage.setItem('streambox_wallet_disconnected', 'true');
    }
  }, []);

  const shortAddress = wallet.address 
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : null;

  const isFilecoinNetwork = wallet.chainId === FILECOIN_CALIBRATION.chainId || wallet.chainId === FILECOIN_MAINNET.chainId;

  return {
    ...wallet,
    shortAddress,
    isFilecoinNetwork,
    connectWallet,
    disconnectWallet,
    refreshBalance: () => wallet.address && getBalance(wallet.address).then(balance => 
      setWallet(prev => ({ ...prev, balance }))
    ),
  };
}
