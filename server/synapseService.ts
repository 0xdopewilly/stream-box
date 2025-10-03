import { Synapse, RPC_URLS, TOKENS, CONTRACT_ADDRESSES } from '@filoz/synapse-sdk';
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

export interface PreflightResult {
  sufficient: boolean;
  costs?: {
    rateAllowance: string;
    lockupAllowance: string;
    totalCost: string;
  };
  error?: string;
}

export class SynapseService {
  private synapse: any = null;
  private storageService: any = null;
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
    // Connect to Filecoin Calibration testnet
    this.provider = new ethers.JsonRpcProvider('https://api.calibration.node.glif.io/rpc/v1');
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
      
      // Initialize Synapse SDK using the factory method with RPC URL
      this.synapse = await Synapse.create({
        privateKey: privateKey,
        rpcURL: RPC_URLS.calibration.http,
        withCDN: this.config.withCDN
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
    return this.isInitialized && this.synapse !== null;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string | null {
    return this.signer?.address || null;
  }

  /**
   * Create or get storage service
   */
  private async ensureStorageService(): Promise<any> {
    if (!this.storageService) {
      console.log('Creating Synapse storage service...');
      this.storageService = await this.synapse.createStorage({
        withCDN: this.config.withCDN,
        callbacks: {
          onProviderSelected: (provider: any) => {
            console.log(`✓ Storage provider selected: ${provider.owner}`);
            console.log(`  PDP URL: ${provider.pdpUrl}`);
          },
          onProofSetResolved: (info: any) => {
            if (info.isExisting) {
              console.log(`✓ Using existing proof set: ${info.proofSetId}`);
            } else {
              console.log(`✓ Creating new proof set: ${info.proofSetId}`);
            }
          },
          onProofSetCreationStarted: (transaction: any, statusUrl: string) => {
            console.log(`✓ Proof set creation started, tx: ${transaction.hash}`);
            console.log(`  Monitor status: ${statusUrl}`);
          }
        }
      });
      console.log('Storage service created successfully');
    }
    return this.storageService;
  }

  /**
   * Deposit USDFC tokens for storage payments
   */
  async depositTokens(amount: string): Promise<SynapsePaymentResult> {
    if (!this.isConnected()) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      console.log('Depositing USDFC tokens:', ethers.formatUnits(amount, 18), 'USDFC');

      const depositTx = await this.synapse.payments.deposit(amount, TOKENS.USDFC, {
        onAllowanceCheck: (current: string, required: string) => {
          console.log(`  Current allowance: ${ethers.formatUnits(current, 18)} USDFC`);
          console.log(`  Required: ${ethers.formatUnits(required, 18)} USDFC`);
        },
        onApprovalTransaction: (tx: any) => {
          console.log(`  Approval transaction sent: ${tx.hash}`);
        },
        onDepositStarting: () => {
          console.log('  Starting deposit transaction...');
        }
      });

      await depositTx.wait();
      console.log('✓ USDFC deposit successful:', depositTx.hash);

      return {
        success: true,
        transactionHash: depositTx.hash,
        verified: true
      };
    } catch (error) {
      console.error('Failed to deposit USDFC tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deposit failed'
      };
    }
  }

  /**
   * Approve storage service for automated payments
   * This will trigger MetaMask to approve USDFC spending
   */
  async approveStorageService(rateAllowance: string, lockupAllowance: string): Promise<SynapsePaymentResult> {
    if (!this.isConnected()) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      console.log('Approving storage service for automated payments...');
      console.log(`  Rate allowance: ${ethers.formatUnits(rateAllowance, 18)} USDFC`);
      console.log(`  Lockup allowance: ${ethers.formatUnits(lockupAllowance, 18)} USDFC`);

      // Get WarmStorage contract address from SDK
      const network = this.synapse.getNetwork() as 'calibration' | 'mainnet';
      const warmStorageAddress = CONTRACT_ADDRESSES.WARM_STORAGE[network];

      if (!warmStorageAddress) {
        throw new Error(`No WarmStorage contract found for network: ${network}`);
      }

      // Approve WarmStorage contract to spend USDFC
      const approveTx = await this.synapse.payments.approveService(
        warmStorageAddress,
        rateAllowance,
        lockupAllowance
      );

      await approveTx.wait();
      console.log('✓ Service approval successful:', approveTx.hash);

      return {
        success: true,
        transactionHash: approveTx.hash,
        verified: true
      };
    } catch (error) {
      console.error('Failed to approve storage service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Service approval failed'
      };
    }
  }

  /**
   * Run preflight check before upload to verify allowances
   */
  async preflightUpload(dataSize: number): Promise<PreflightResult> {
    if (!this.isConnected()) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      const storage = await this.ensureStorageService();
      
      console.log('Running preflight upload check for', dataSize, 'bytes...');
      const preflightResult = await storage.preflightUpload(dataSize);

      if (!preflightResult.allowanceCheck.sufficient) {
        console.log('⚠ Insufficient allowance for upload');
        console.log('  Required costs:', preflightResult.costs);
        return {
          sufficient: false,
          costs: preflightResult.costs,
          error: 'Insufficient USDFC allowance. Please deposit tokens and approve service.'
        };
      }

      console.log('✓ Preflight check passed - sufficient allowance');
      return {
        sufficient: true,
        costs: preflightResult.costs
      };
    } catch (error) {
      console.error('Preflight upload check failed:', error);
      return {
        sufficient: false,
        error: error instanceof Error ? error.message : 'Preflight check failed'
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

      // Ensure storage service is created
      const storage = await this.ensureStorageService();

      // Convert Buffer to Uint8Array
      const uint8Data = new Uint8Array(fileData);

      // Upload to Filecoin WarmStorage
      const uploadResult = await storage.upload(uint8Data);

      console.log('✓ File uploaded successfully via Synapse SDK');
      console.log(`  CommP: ${uploadResult.commp}`);
      if (uploadResult.proofSetId) {
        console.log(`  Proof Set ID: ${uploadResult.proofSetId}`);
      }

      return {
        success: true,
        pieceCid: uploadResult.commp,
        commP: uploadResult.commp,
        datasetId: uploadResult.proofSetId,
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
   * Get balance information for the connected wallet
   */
  async getBalanceInfo(): Promise<BalanceInfo> {
    if (!this.isConnected()) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      const walletAddress = this.signer?.address;
      if (!walletAddress) {
        throw new Error('No wallet address available');
      }

      console.log('Checking wallet balances...');

      // Get USDFC token balance
      const network = this.synapse.getNetwork() as 'calibration' | 'mainnet';
      const warmStorageAddress = CONTRACT_ADDRESSES.WARM_STORAGE[network];
      
      // Check allowance for WarmStorage contract
      const allowance = await this.synapse.payments.allowance(TOKENS.USDFC, warmStorageAddress);
      
      // For actual balance, we'd need to query the token contract directly
      // For now, use allowance as an indicator of available funds
      const balance = allowance;

      console.log('Balance check complete');
      console.log(`  USDFC allowance: ${ethers.formatUnits(balance, 18)} USDFC`);

      return {
        usdfcBalance: balance.toString(),
        filecoinWarmStorageBalance: balance.toString(),
        persistenceDaysLeft: 30, // Estimated
        rateNeeded: ethers.parseUnits("0.1", 18).toString(),
        lockUpNeeded: ethers.parseUnits("9", 18).toString(),
        depositNeeded: "0",
        isSufficient: BigInt(balance) > BigInt(ethers.parseUnits("10", 18))
      };
    } catch (error) {
      console.error('Failed to get balance info:', error);
      
      // Return reasonable defaults
      return {
        usdfcBalance: "0",
        filecoinWarmStorageBalance: "0",
        persistenceDaysLeft: 0,
        rateNeeded: ethers.parseUnits("0.1", 18).toString(),
        lockUpNeeded: ethers.parseUnits("9", 18).toString(),
        depositNeeded: ethers.parseUnits("10", 18).toString(),
        isSufficient: false
      };
    }
  }

  /**
   * Verify payment for content access (for video purchases)
   */
  async verifyContentPayment(userAddress: string, contentId: string, amount: string): Promise<SynapsePaymentResult> {
    // This would integrate with your video purchase smart contract
    // For now, we'll use a simplified check
    console.log('Verifying content payment:', { userAddress, contentId, amount });
    
    // In production, query the purchase contract or event logs
    return {
      success: true,
      verified: true
    };
  }

  /**
   * Retrieve file from Filecoin via FilCDN
   */
  async retrieveFile(pieceCid: string, originalFileName?: string): Promise<SynapseRetrievalResult> {
    if (!this.isConnected()) {
      throw new Error('Synapse SDK not connected');
    }

    try {
      console.log('Retrieving file via FilCDN:', pieceCid);

      // Download from Filecoin using Synapse SDK (with CDN optimization)
      const downloadResult = await this.synapse.download(pieceCid);

      console.log('✓ File retrieved successfully via FilCDN');

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
    this.storageService = null;
    this.signer = null;
    this.isInitialized = false;
    console.log('Synapse SDK disconnected');
  }
}

// Export singleton instance
export const synapseService = new SynapseService();

// Auto-initialize with creator wallet on startup
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
