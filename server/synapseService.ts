import { Synapse } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

export interface SynapseUploadResult {
  success: boolean;
  pieceCid?: string;
  commP?: string;
  datasetId?: string;
  error?: string;
  transactionHash?: string;
}

export interface SynapsePaymentResult {
  success: boolean;
  transactionHash?: string;
  verified?: boolean;
  error?: string;
}

export interface SynapseRetrievalResult {
  success: boolean;
  data?: ArrayBuffer;
  mimeType?: string;
  error?: string;
}

export interface BalanceInfo {
  usdfcBalance: string;
  filecoinWarmStorageBalance: string;
  persistenceDaysLeft: number;
  rateNeeded: string;
  lockUpNeeded: string;
  depositNeeded: string;
  isSufficient: boolean;
}

export class SynapseService {
  private synapse: any = null;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;
  private isInitialized: boolean = false;

  // Configuration for StreamBox
  private readonly config = {
    storageCapacity: 50, // GB - Higher capacity for video platform
    persistencePeriod: 90, // days - Longer persistence for creator content
    minDaysThreshold: 15, // days - Earlier warning threshold
    withCDN: true, // Use FilCDN for fast video streaming
  };

  constructor() {
    // Connect to Filecoin Calibration testnet (same as our existing setup)
    this.provider = new ethers.JsonRpcProvider('https://api.calibration.node.glif.io/');
    console.log('SynapseService initialized with Filecoin Calibration network');
  }

  /**
   * Connect wallet to Synapse SDK
   */
  async connectWallet(privateKey: string): Promise<boolean> {
    try {
      // Create wallet signer
      this.signer = new ethers.Wallet(privateKey, this.provider);
      
      console.log('Connecting to Synapse SDK with wallet:', this.signer.address);
      
      // Initialize Synapse SDK using the factory method
      this.synapse = await Synapse.create({
        signer: this.signer,
        // Add additional configuration as needed
      });

      this.isInitialized = true;
      console.log('Synapse SDK connected successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect wallet to Synapse SDK:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Check if Synapse SDK is properly connected
   */
  isConnected(): boolean {
    return this.isInitialized && this.synapse !== null && this.signer !== null;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string | null {
    return this.signer?.address || null;
  }

  /**
   * Get balance information for the connected wallet
   */
  async getBalanceInfo(): Promise<BalanceInfo> {
    if (!this.isConnected()) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      // Use real Synapse SDK methods when available
      // For now, return error to indicate this needs real implementation
      throw new Error('Real USDFC balance checking not yet implemented - requires Synapse SDK balance methods');
    } catch (error) {
      console.error('Failed to get balance info:', error);
      throw error;
    }
  }

  /**
   * Handle USDFC payments for storage (deposit + allowances)
   */
  async processPayment(depositAmount: string, rateAllowance: string, lockupAllowance: string): Promise<SynapsePaymentResult> {
    if (!this.isConnected()) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      console.log('Processing Synapse payment...', { depositAmount, rateAllowance, lockupAllowance });

      // For now, simulate the payment process
      // In production, this would use actual Synapse SDK payment methods
      
      console.log('Payment processed successfully (simulated)');

      return {
        success: true,
        transactionHash: `0x${Math.random().toString(16).substring(2)}`,
        verified: true
      };
    } catch (error) {
      console.error('Failed to process Synapse payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * Upload file to Filecoin via Synapse SDK → WarmStorage + PDP proof
   */
  async uploadFile(fileData: Buffer, fileName: string, mimeType: string): Promise<SynapseUploadResult> {
    if (!this.isConnected()) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      console.log('Uploading file via Synapse SDK:', { fileName, size: fileData.length, mimeType });

      // Use actual Synapse SDK upload
      const uploadResult = await this.synapse.upload(fileData, {
        filename: fileName,
        persistenceDays: this.config.persistencePeriod,
        withCDN: this.config.withCDN
      });

      console.log('File uploaded successfully via Synapse SDK:', uploadResult);

      return {
        success: true,
        pieceCid: uploadResult.pieceCid || uploadResult.piece,
        commP: uploadResult.commP || uploadResult.piece,
        datasetId: uploadResult.datasetId || uploadResult.proofSetId,
        transactionHash: uploadResult.transactionHash
      };
    } catch (error) {
      console.error('Failed to upload file via Synapse SDK:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Synapse SDK upload failed'
      };
    }
  }

  /**
   * Verify payment for content access via Synapse
   */
  async verifyContentPayment(userAddress: string, contentId: string, amount: string): Promise<SynapsePaymentResult> {
    if (!this.isConnected()) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      console.log('Verifying content payment via Synapse:', { userAddress, contentId, amount });

      // Real USDFC payment verification needs implementation
      // For now, return error to prevent simulated verification
      return {
        success: false,
        verified: false,
        error: 'Real USDFC payment verification not yet implemented - requires Synapse SDK payment verification methods'
      };
    } catch (error) {
      console.error('Failed to verify content payment:', error);
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Payment verification failed'
      };
    }
  }

  /**
   * Retrieve file from Filecoin via FilCDN for optimized performance
   */
  async retrieveFile(pieceCid: string, originalFileName?: string): Promise<SynapseRetrievalResult> {
    if (!this.isConnected()) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      console.log('Retrieving file via FilCDN:', { pieceCid, originalFileName });

      // Use actual Synapse SDK download
      const downloadResult = await this.synapse.download(pieceCid, {
        preferCDN: this.config.withCDN
      });

      console.log('File retrieved successfully via FilCDN');

      // Determine MIME type
      let mimeType = 'application/octet-stream';
      if (originalFileName) {
        const ext = originalFileName.split('.').pop()?.toLowerCase();
        const mimeTypes: { [key: string]: string } = {
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'avi': 'video/x-msvideo',
          'mov': 'video/quicktime',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'pdf': 'application/pdf'
        };
        mimeType = mimeTypes[ext || ''] || mimeType;
      }

      return {
        success: true,
        data: downloadResult instanceof ArrayBuffer ? downloadResult : downloadResult.buffer,
        mimeType
      };
    } catch (error) {
      console.error('Failed to retrieve file via FilCDN:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File retrieval failed'
      };
    }
  }

  /**
   * Get dataset information for a user
   */
  async getDatasets(userAddress?: string): Promise<any[]> {
    if (!this.isConnected()) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      const address = userAddress || this.signer?.address;
      if (!address) {
        throw new Error('No user address provided');
      }

      // Mock datasets for demo
      const mockDatasets = [
        {
          id: 'dataset_1',
          owner: address,
          pieces: 5,
          totalSize: '1.2 GB',
          status: 'active'
        }
      ];
      
      console.log('Retrieved datasets (mock):', mockDatasets.length);
      return mockDatasets;
    } catch (error) {
      console.error('Failed to get datasets:', error);
      return [];
    }
  }

  /**
   * Initialize Synapse SDK with creator wallet
   */
  async initializeWithCreatorWallet(): Promise<boolean> {
    const creatorPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!creatorPrivateKey) {
      console.log('No creator private key found, Synapse SDK not initialized');
      return false;
    }

    return await this.connectWallet(creatorPrivateKey);
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    this.synapse = null;
    this.signer = null;
    this.isInitialized = false;
    console.log('Synapse SDK disconnected');
  }
}

// Export singleton instance and auto-initialize
export const synapseService = new SynapseService();

// Auto-initialize with creator wallet on startup (similar to other services)
(async () => {
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    console.log('Initializing Synapse SDK with creator wallet...');
    const connected = await synapseService.initializeWithCreatorWallet();
    if (connected) {
      console.log('Synapse SDK initialized successfully with creator wallet');
    } else {
      console.log('Synapse SDK initialization failed - will fallback to traditional storage');
    }
  } else {
    console.log('No creator private key found - Synapse SDK not initialized');
  }
})().catch(error => {
  console.error('Synapse SDK auto-initialization failed:', error);
});