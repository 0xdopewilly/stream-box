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
      console.log('🔄 Initiating USDFC deposit:', ethers.formatUnits(amount, 18), 'USDFC');
      console.log('Calling API: POST /api/synapse/deposit');
      
      const response = await apiRequest('POST', '/api/synapse/deposit', { amount });
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: Deposit failed`);
      }
      
      const result = await response.json();
      console.log('API response data:', result);
      
      if (!result.success) {
        throw new Error(result.details || result.error || 'Deposit failed');
      }
      
      console.log('✅ USDFC deposit successful! TX:', result.transactionHash);
      setStatus(prev => ({ ...prev, deposited: true }));
      
      return { success: true, transactionHash: result.transactionHash };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Deposit failed - Unknown error';
      console.error('❌ Deposit error:', errorMessage, err);
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
      console.log('🔄 Initiating service approval...', {
        rate: ethers.formatUnits(rateAllowance, 18),
        lockup: ethers.formatUnits(lockupAllowance, 18)
      });
      console.log('Calling API: POST /api/synapse/approve');
      
      const response = await apiRequest('POST', '/api/synapse/approve', {
        rateAllowance,
        lockupAllowance
      });
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: Approval failed`);
      }
      
      const result = await response.json();
      console.log('API response data:', result);
      
      if (!result.success) {
        throw new Error(result.details || result.error || 'Approval failed');
      }
      
      console.log('✅ Service approval successful! TX:', result.transactionHash);
      setStatus(prev => ({ ...prev, approved: true, ready: true }));
      
      return { success: true, transactionHash: result.transactionHash };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Approval failed - Unknown error';
      console.error('❌ Approval error:', errorMessage, err);
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
