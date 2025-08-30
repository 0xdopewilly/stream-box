import { useState } from "react";
import { useWallet } from "./useWallet";
import { useToast } from "./use-toast";

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
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error("MetaMask not available");
      }

      // Convert FIL amount to wei (18 decimals)
      const amountWei = (parseFloat(paymentDetails.amount) * Math.pow(10, 18)).toString(16);

      // Create transaction data with video purchase info
      const transactionData = JSON.stringify({
        videoId: paymentDetails.videoId,
        purchaseType: paymentDetails.purchaseType,
        timestamp: Date.now()
      });

      // Create the transaction
      const transaction = {
        to: paymentDetails.recipient,
        value: `0x${amountWei}`,
        data: `0x${Buffer.from(transactionData).toString('hex')}`,
        from: address,
      };

      // Request payment via MetaMask
      const transactionHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [transaction],
      });

      toast({
        title: "Payment sent!",
        description: "Your payment is being processed on the Filecoin network.",
      });

      return {
        success: true,
        transactionHash,
      };

    } catch (error: any) {
      console.error("Payment error:", error);
      
      let errorMessage = "Payment failed";
      if (error.code === 4001) {
        errorMessage = "Payment was canceled by user";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient FIL balance";
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
      const ethereum = (window as any).ethereum;
      if (!ethereum || !address) return null;

      const amountWei = (parseFloat(paymentDetails.amount) * Math.pow(10, 18)).toString(16);
      
      const transaction = {
        to: paymentDetails.recipient,
        value: `0x${amountWei}`,
        from: address,
      };

      const gasEstimate = await ethereum.request({
        method: 'eth_estimateGas',
        params: [transaction],
      });

      // Convert from hex to decimal and then to FIL
      const gasCostWei = parseInt(gasEstimate, 16);
      const gasCostFil = gasCostWei / Math.pow(10, 18);
      
      return gasCostFil.toFixed(6);
    } catch (error) {
      console.error("Gas estimation error:", error);
      return null;
    }
  };

  return {
    processPayment,
    estimateGas,
    isProcessing,
    isWalletReady: isConnected && isFilecoinNetwork,
  };
}