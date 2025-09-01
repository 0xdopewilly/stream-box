import { useState } from "react";
import { useWallet } from "./useWallet";
import { useToast } from "./use-toast";
import { ethers } from "ethers";

interface PaymentDetails {
  amount: string;
  recipient: string;
  videoId: string;
  purchaseType: 'single' | 'subscription';
}

interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  purchase?: any;
  contractAddress?: string;
}

export function useFilecoinPay() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { isConnected, address, isFilecoinNetwork } = useWallet();
  const { toast } = useToast();

  const processPayment = async (paymentDetails: PaymentDetails): Promise<PaymentResult> => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to make a purchase.",
        variant: "destructive",
      });
      return { success: false, error: "Wallet not connected" };
    }

    if (!isFilecoinNetwork) {
      toast({
        title: "Wrong network",
        description: "Please switch to Filecoin network to make payments.",
        variant: "destructive",
      });
      return { success: false, error: "Wrong network" };
    }

    setIsProcessing(true);

    try {
      // First, get transaction details from backend
      const response = await fetch(`/api/videos/${paymentDetails.videoId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerAddress: address
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get transaction details');
      }

      const { transaction, gasCost, videoPrice, creatorAddress, contractAddress } = await response.json();
      
      console.log('Smart contract purchase:', {
        videoId: paymentDetails.videoId,
        price: videoPrice,
        creator: creatorAddress,
        contract: contractAddress,
        estimatedGas: gasCost
      });

      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error("MetaMask not available");
      }

      // Check if user has sufficient balance (price + gas)
      const balance = await ethereum.request({ method: 'eth_getBalance', params: [address, 'latest'] });
      const balanceWei = BigInt(balance);
      const transactionValueWei = BigInt(transaction.value);
      const gasCostWei = ethers.parseEther(gasCost);
      const totalCostWei = transactionValueWei + gasCostWei;
      
      if (balanceWei < totalCostWei) {
        throw new Error(`Insufficient FIL balance. Need ${ethers.formatEther(totalCostWei)} FIL`);
      }

      toast({
        title: "Processing payment...",
        description: `Purchasing video for ${videoPrice} FIL via smart contract`,
      });

      // Send transaction through smart contract
      const transactionHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          to: transaction.to,
          value: transaction.value,
          data: transaction.data,
          gas: transaction.gasLimit,
          from: address,
        }],
      });
      
      console.log('Transaction sent:', transactionHash);
      
      toast({
        title: "Payment sent!",
        description: "Waiting for confirmation on Filecoin network...",
      });

      // Wait a bit for transaction to be included
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify purchase with backend
      const verifyResponse = await fetch(`/api/videos/${paymentDetails.videoId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerAddress: address,
          transactionHash
        })
      });

      if (verifyResponse.ok) {
        const verifyResult = await verifyResponse.json();
        
        toast({
          title: "Purchase successful!",
          description: "Video unlocked! Payment sent to creator.",
        });
        
        return {
          success: true,
          transactionHash,
          contractAddress,
          purchase: verifyResult.purchase
        };
      } else {
        // Transaction sent but verification pending
        toast({
          title: "Payment processing...",
          description: "Transaction sent, waiting for blockchain confirmation.",
        });
        
        return {
          success: true,
          transactionHash,
          contractAddress
        };
      }

    } catch (error: any) {
      console.error("Payment error:", error);
      
      let errorMessage = "Payment failed";
      if (error.code === 4001) {
        errorMessage = "Payment was canceled by user";
      } else if (error.message?.includes("insufficient")) {
        errorMessage = error.message;
      } else if (error.message?.includes("rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Payment failed",
        description: errorMessage,
        variant: "destructive",
      });

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const estimateGas = async (paymentDetails: PaymentDetails): Promise<string | null> => {
    try {
      // Get gas estimate from backend
      const response = await fetch(`/api/videos/${paymentDetails.videoId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerAddress: address || '0x0000000000000000000000000000000000000000'
        })
      });

      if (!response.ok) return null;

      const { gasCost } = await response.json();
      return gasCost;
    } catch (error) {
      console.error("Gas estimation error:", error);
      return '0.005'; // Fallback estimate
    }
  };

  return {
    processPayment,
    estimateGas,
    isProcessing,
    isWalletReady: isConnected && isFilecoinNetwork,
  };
}