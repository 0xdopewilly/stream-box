import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { ethers } from 'ethers';

interface PaymentSetupStatus {
  deposited: boolean;
  approved: boolean;
  ready: boolean;
}

export function useSynapsePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<PaymentSetupStatus>({
    deposited: false,
    approved: false,
    ready: false
  });
  const [error, setError] = useState<string | null>(null);

  /**
   * Deposit USDFC tokens for storage - triggers MetaMask prompt
   */
  const depositTokens = async (amount: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('Initiating USDFC deposit:', ethers.formatUnits(amount, 18), 'USDFC');
      
      const response = await apiRequest('POST', '/api/synapse/deposit', { amount });
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.details || 'Deposit failed');
      }
      
      console.log('✓ USDFC deposit successful:', result.transactionHash);
      setStatus(prev => ({ ...prev, deposited: true }));
      
      return { success: true, transactionHash: result.transactionHash };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Deposit failed';
      console.error('Deposit error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Approve storage service for automated payments - triggers MetaMask prompt
   */
  const approveService = async (rateAllowance: string, lockupAllowance: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('Initiating service approval...', {
        rate: ethers.formatUnits(rateAllowance, 18),
        lockup: ethers.formatUnits(lockupAllowance, 18)
      });
      
      const response = await apiRequest('POST', '/api/synapse/approve', {
        rateAllowance,
        lockupAllowance
      });
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.details || 'Approval failed');
      }
      
      console.log('✓ Service approval successful:', result.transactionHash);
      setStatus(prev => ({ ...prev, approved: true, ready: true }));
      
      return { success: true, transactionHash: result.transactionHash };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Approval failed';
      console.error('Approval error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Run preflight check to verify user has sufficient allowances
   */
  const checkPreflight = async (dataSize: number) => {
    try {
      const response = await apiRequest('POST', '/api/synapse/preflight', { dataSize });
      const result = await response.json();
      
      if (result.sufficient) {
        setStatus(prev => ({ ...prev, ready: true }));
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Preflight check failed';
      console.error('Preflight error:', errorMessage);
      return { sufficient: false, error: errorMessage };
    }
  };

  /**
   * Get balance information
   */
  const getBalance = async () => {
    try {
      const response = await apiRequest('GET', '/api/synapse/balance');
      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Balance check error:', err);
      return null;
    }
  };

  /**
   * Complete payment setup flow: deposit + approve
   */
  const setupPayments = async (depositAmount: string, rateAllowance: string, lockupAllowance: string) => {
    setError(null);
    
    // Step 1: Deposit tokens
    const depositResult = await depositTokens(depositAmount);
    if (!depositResult.success) {
      return { success: false, step: 'deposit', error: depositResult.error };
    }
    
    // Step 2: Approve service
    const approveResult = await approveService(rateAllowance, lockupAllowance);
    if (!approveResult.success) {
      return { success: false, step: 'approve', error: approveResult.error };
    }
    
    return { 
      success: true, 
      depositTx: depositResult.transactionHash,
      approveTx: approveResult.transactionHash
    };
  };

  return {
    depositTokens,
    approveService,
    checkPreflight,
    getBalance,
    setupPayments,
    isProcessing,
    status,
    error
  };
}
