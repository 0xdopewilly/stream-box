import { Synapse, StorageService, PaymentsService, PandoraService, PDPServer } from '@filoz/synapse-sdk';
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
  private synapse: Synapse | null = null;
  private storageService: StorageService | null = null;
  private paymentsService: PaymentsService | null = null;
  private pandoraService: PandoraService | null = null;
  private pdpServer: PDPServer | null = null;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;

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
    this.initializeServices();
  }

  /**
   * Initialize Synapse SDK services
   */
  private async initializeServices() {
    try {
      // Create Synapse instance (will be connected when wallet is available)
      console.log('Initializing Synapse SDK services...');
      
      // Initialize without signer first - will connect when wallet is available
      this.synapse = new Synapse();
      
      console.log('Synapse SDK services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Synapse services:', error);
    }
  }

  /**
   * Connect wallet to Synapse SDK
   */
  async connectWallet(privateKey: string): Promise<boolean> {
    try {
      // Create wallet signer
      this.signer = new ethers.Wallet(privateKey, this.provider);
      
      // Initialize Synapse with signer
      this.synapse = new Synapse({
        signer: this.signer,
        network: 'calibration' // Use calibration testnet
      });

      // Initialize individual services
      this.storageService = new StorageService({ signer: this.signer });
      this.paymentsService = new PaymentsService({ signer: this.signer });
      this.pandoraService = new PandoraService({ signer: this.signer });
      this.pdpServer = new PDPServer({ signer: this.signer });

      console.log('Synapse SDK connected with wallet:', this.signer.address);
      return true;
    } catch (error) {
      console.error('Failed to connect wallet to Synapse SDK:', error);
      return false;
    }
  }

  /**
   * Check if Synapse SDK is properly connected
   */
  isConnected(): boolean {
    return this.synapse !== null && this.signer !== null;
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
    if (!this.isConnected() || !this.paymentsService) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      // Get USDFC balance from wallet
      const usdfcBalance = await this.paymentsService.getBalance();
      
      // Get FilecoinWarmStorage service balance
      const warmStorageBalance = await this.paymentsService.getServiceBalance();
      
      // Calculate storage metrics based on config
      const storageMetrics = await this.calculateStorageMetrics();
      
      return {
        usdfcBalance: usdfcBalance.toString(),
        filecoinWarmStorageBalance: warmStorageBalance.toString(),
        persistenceDaysLeft: storageMetrics.persistenceDaysLeft,
        rateNeeded: storageMetrics.rateNeeded,
        lockUpNeeded: storageMetrics.lockUpNeeded,
        depositNeeded: storageMetrics.depositNeeded,
        isSufficient: storageMetrics.isSufficient
      };
    } catch (error) {
      console.error('Failed to get balance info:', error);
      throw error;
    }
  }

  /**
   * Calculate storage requirements based on configuration
   */
  private async calculateStorageMetrics() {
    // This is a simplified calculation - in production you'd use actual PandoraService methods
    const baseRatePerGBPerDay = "100000"; // Base rate in USDFC units
    const rateNeeded = (BigInt(baseRatePerGBPerDay) * BigInt(this.config.storageCapacity)).toString();
    const lockUpNeeded = (BigInt(rateNeeded) * BigInt(this.config.persistencePeriod)).toString();
    
    // For demo, assume we need some deposit
    const depositNeeded = lockUpNeeded;
    
    return {
      persistenceDaysLeft: this.config.persistencePeriod,
      rateNeeded,
      lockUpNeeded,
      depositNeeded,
      isSufficient: true // For demo purposes
    };
  }

  /**
   * Handle USDFC payments for storage (deposit + allowances)
   */
  async processPayment(depositAmount: string, rateAllowance: string, lockupAllowance: string): Promise<SynapsePaymentResult> {
    if (!this.isConnected() || !this.paymentsService) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      console.log('Processing Synapse payment...', { depositAmount, rateAllowance, lockupAllowance });

      // Step 1: Approve USDFC spending
      const approvalTx = await this.paymentsService.approveUSDFC(depositAmount);
      console.log('USDFC approval transaction:', approvalTx.hash);

      // Step 2: Deposit USDFC to Synapse
      const depositTx = await this.paymentsService.deposit(depositAmount);
      console.log('USDFC deposit transaction:', depositTx.hash);

      // Step 3: Set allowances for FilecoinWarmStorageService
      const allowanceTx = await this.paymentsService.setServiceAllowance(rateAllowance, lockupAllowance);
      console.log('Service allowance transaction:', allowanceTx.hash);

      return {
        success: true,
        transactionHash: allowanceTx.hash,
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
    if (!this.isConnected() || !this.storageService) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      console.log('Uploading file via Synapse SDK:', { fileName, size: fileData.length, mimeType });

      // Step 1: Prepare storage upload (creates dataset if needed)
      const uploadContext = await this.storageService.prepareStorageUpload({
        data: fileData,
        filename: fileName,
        persistenceDays: this.config.persistencePeriod,
        withCDN: this.config.withCDN
      });

      console.log('Storage upload prepared:', uploadContext.datasetId);

      // Step 2: Upload to WarmStorage with PDP proof generation
      const uploadResult = await this.storageService.upload(uploadContext);

      console.log('File uploaded successfully:', {
        pieceCid: uploadResult.pieceCid,
        commP: uploadResult.commP,
        datasetId: uploadResult.datasetId
      });

      return {
        success: true,
        pieceCid: uploadResult.pieceCid,
        commP: uploadResult.commP,
        datasetId: uploadResult.datasetId,
        transactionHash: uploadResult.transactionHash
      };
    } catch (error) {
      console.error('Failed to upload file via Synapse SDK:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Verify payment for content access via Synapse
   */
  async verifyContentPayment(userAddress: string, contentId: string, amount: string): Promise<SynapsePaymentResult> {
    if (!this.isConnected() || !this.paymentsService) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      console.log('Verifying content payment via Synapse:', { userAddress, contentId, amount });

      // Check if user has sufficient balance and has made payment
      const userBalance = await this.paymentsService.getBalanceOf(userAddress);
      const hasMinimumBalance = BigInt(userBalance) >= BigInt(amount);

      if (!hasMinimumBalance) {
        return {
          success: false,
          verified: false,
          error: 'Insufficient USDFC balance for content access'
        };
      }

      // In a full implementation, you'd also check specific payment transactions
      // For now, we verify based on balance
      return {
        success: true,
        verified: true,
        transactionHash: 'verified_via_balance_check'
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
    if (!this.isConnected() || !this.storageService) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      console.log('Retrieving file via FilCDN:', { pieceCid, originalFileName });

      // Download via FilCDN for optimized performance
      const downloadResult = await this.storageService.download(pieceCid, {
        preferCDN: this.config.withCDN,
        filename: originalFileName
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
        data: downloadResult.data,
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
    if (!this.isConnected() || !this.pandoraService) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      const address = userAddress || this.signer?.address;
      if (!address) {
        throw new Error('No user address provided');
      }

      const datasets = await this.pandoraService.getDatasets(address);
      console.log('Retrieved datasets:', datasets.length);
      
      return datasets;
    } catch (error) {
      console.error('Failed to get datasets:', error);
      return [];
    }
  }

  /**
   * Get storage provider information
   */
  async getStorageProviders(): Promise<any[]> {
    if (!this.isConnected() || !this.pandoraService) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      const providers = await this.pandoraService.getAvailableProviders();
      console.log('Retrieved storage providers:', providers.length);
      
      return providers;
    } catch (error) {
      console.error('Failed to get storage providers:', error);
      return [];
    }
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    this.synapse = null;
    this.storageService = null;
    this.paymentsService = null;
    this.pandoraService = null;
    this.pdpServer = null;
    this.signer = null;
    console.log('Synapse SDK disconnected');
  }
}

// Export singleton instance
export const synapseService = new SynapseService();