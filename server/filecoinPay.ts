import { ethers } from "ethers";

export interface PaymentDetails {
  amount: string; // in FIL
  recipient: string;
  videoId: string;
  purchaseType: 'single' | 'subscription';
  duration?: number; // for subscriptions, in days
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  blockNumber?: number;
  gasUsed?: string;
}

export interface SubscriptionPayment extends PaymentDetails {
  subscriptionId: string;
  startDate: Date;
  endDate: Date;
}

export class FilecoinPayService {
  private provider: ethers.JsonRpcProvider | null = null;
  private readonly CALIBRATION_RPC = 'https://api.calibration.node.glif.io/';
  private readonly MAINNET_RPC = 'https://api.node.glif.io/';

  constructor(private isTestnet: boolean = true) {
    this.initializeProvider();
  }

  private initializeProvider() {
    const rpcUrl = this.isTestnet ? this.CALIBRATION_RPC : this.MAINNET_RPC;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Process a video purchase payment using Filecoin
   */
  async processPayment(
    paymentDetails: PaymentDetails,
    fromAddress: string,
    privateKey?: string
  ): Promise<PaymentResult> {
    try {
      if (!this.provider) {
        throw new Error('Filecoin provider not initialized');
      }

      // Convert FIL amount to wei (18 decimals)
      const amountWei = ethers.parseEther(paymentDetails.amount);

      // Create transaction object
      const transaction = {
        to: paymentDetails.recipient,
        value: amountWei,
        // Add custom data for video purchase tracking
        data: ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify({
          videoId: paymentDetails.videoId,
          purchaseType: paymentDetails.purchaseType,
          timestamp: Date.now()
        })))
      };

      if (privateKey) {
        // Direct payment with private key (for server-side)
        const wallet = new ethers.Wallet(privateKey, this.provider);
        const txResponse = await wallet.sendTransaction(transaction);
        
        // Wait for confirmation
        const receipt = await txResponse.wait();
        
        return {
          success: true,
          transactionHash: receipt?.hash,
          blockNumber: receipt?.blockNumber,
          gasUsed: receipt?.gasUsed?.toString()
        };
      } else {
        // Return transaction for MetaMask signing (client-side)
        return {
          success: true,
          transactionHash: 'pending',
        };
      }

    } catch (error: any) {
      console.error('Filecoin payment error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed'
      };
    }
  }

  /**
   * Process subscription payment
   */
  async processSubscriptionPayment(
    subscriptionPayment: SubscriptionPayment,
    fromAddress: string,
    privateKey?: string
  ): Promise<PaymentResult> {
    try {
      const paymentResult = await this.processPayment(
        subscriptionPayment,
        fromAddress,
        privateKey
      );

      if (paymentResult.success) {
        // Here you would typically store subscription details in your database
        console.log('Subscription payment processed:', {
          subscriptionId: subscriptionPayment.subscriptionId,
          duration: subscriptionPayment.duration,
          startDate: subscriptionPayment.startDate,
          endDate: subscriptionPayment.endDate
        });
      }

      return paymentResult;
    } catch (error: any) {
      console.error('Subscription payment error:', error);
      return {
        success: false,
        error: error.message || 'Subscription payment failed'
      };
    }
  }

  /**
   * Get transaction details for verification
   */
  async getTransactionDetails(txHash: string) {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      const transaction = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);

      return {
        transaction,
        receipt,
        confirmed: receipt !== null,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        status: receipt?.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Transaction details error:', error);
      return null;
    }
  }

  /**
   * Verify payment amount and recipient
   */
  async verifyPayment(
    txHash: string,
    expectedAmount: string,
    expectedRecipient: string
  ): Promise<boolean> {
    try {
      const details = await this.getTransactionDetails(txHash);
      
      if (!details || !details.transaction) {
        return false;
      }

      const { transaction } = details;
      const amountWei = ethers.parseEther(expectedAmount);

      return (
        transaction.to?.toLowerCase() === expectedRecipient.toLowerCase() &&
        transaction.value === amountWei &&
        details.status === 'success'
      );
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }

  /**
   * Get wallet balance in FIL
   */
  async getBalance(address: string): Promise<string | null> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      const balanceWei = await this.provider.getBalance(address);
      return ethers.formatEther(balanceWei);
    } catch (error) {
      console.error('Balance query error:', error);
      return null;
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(transaction: any): Promise<string | null> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      const gasEstimate = await this.provider.estimateGas(transaction);
      return gasEstimate.toString();
    } catch (error) {
      console.error('Gas estimation error:', error);
      return null;
    }
  }

  /**
   * Create payment transaction for MetaMask signing
   */
  createPaymentTransaction(paymentDetails: PaymentDetails) {
    const amountWei = ethers.parseEther(paymentDetails.amount);
    
    return {
      to: paymentDetails.recipient,
      value: `0x${amountWei.toString(16)}`, // Convert to hex for MetaMask
      data: ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify({
        videoId: paymentDetails.videoId,
        purchaseType: paymentDetails.purchaseType,
        timestamp: Date.now()
      })))
    };
  }
}

// Export singleton instance
export const filecoinPayService = new FilecoinPayService(true); // Use testnet by default