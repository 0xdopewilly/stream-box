import { ethers } from "ethers";

export interface PaymentDetails {
  amount: string; // Amount in FIL
  recipient: string; // Creator wallet address
  videoId: string;
  buyerAddress: string;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
  actualAmount?: string;
  contractAddress?: string;
}

export interface ContractInfo {
  address: string;
  abi: any[];
  deployed: boolean;
}

export class FilecoinPayService {
  private provider: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private contractInfo: ContractInfo | null = null;
  private creatorWallet?: ethers.Wallet;

  constructor() {
    // Connect to Filecoin Calibration testnet
    this.provider = new ethers.JsonRpcProvider('https://api.calibration.node.glif.io/');
    this.initializeContract();
    this.initializeCreatorWallet();
  }

  private async initializeContract() {
    try {
      // Use real USDFC contract address for payments
      this.contractInfo = {
        address: "0x80b98d3aa09ffff255c3ba4a241111ff1262f045", // Real USDFC contract
        abi: [
          // USDFC ERC20 standard methods for payments
          "function transfer(address to, uint256 amount) external returns (bool)",
          "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function balanceOf(address account) external view returns (uint256)",
          "function allowance(address owner, address spender) external view returns (uint256)",
          "function decimals() external view returns (uint8)",
          "function symbol() external view returns (string)",
          "function name() external view returns (string)",
          "event Transfer(address indexed from, address indexed to, uint256 value)",
          "event Approval(address indexed owner, address indexed spender, uint256 value)"
        ],
        deployed: true
      };
      console.log('USDFC contract initialized:', this.contractInfo.address);
    } catch (error) {
      console.error('Failed to initialize USDFC contract:', error);
    }
  }

  private initializeCreatorWallet() {
    try {
      if (process.env.DEPLOYER_PRIVATE_KEY) {
        this.creatorWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, this.provider);
        console.log('Creator wallet initialized:', this.creatorWallet.address);
        console.log('This address will be used for receiving payments');
      }
    } catch (error) {
      console.error('Failed to initialize creator wallet:', error);
    }
  }

  /**
   * Connect buyer's wallet for payments
   */
  async connectWallet(privateKey: string): Promise<boolean> {
    try {
      this.signer = new ethers.Wallet(privateKey, this.provider);
      const balance = await this.provider.getBalance(this.signer.address);
      console.log(`Wallet connected: ${this.signer.address}, Balance: ${ethers.formatEther(balance)} FIL`);
      return true;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return false;
    }
  }

  /**
   * Process video purchase payment through USDFC token transfer
   */
  async processPayment(details: PaymentDetails): Promise<TransactionResult> {
    try {
      if (!this.signer) {
        return {
          success: false,
          error: "Wallet not connected. Please connect your MetaMask wallet."
        };
      }

      if (!this.contractInfo || !this.contractInfo.deployed) {
        return {
          success: false,
          error: "USDFC contract not available. Please try again later."
        };
      }

      // Convert USD amount to USDFC tokens (assuming 6 decimals for USDFC)
      const usdcDecimals = 6; // USDFC uses 6 decimals like USDC
      const amountInTokens = ethers.parseUnits(details.amount, usdcDecimals);
      
      // Create USDFC contract instance
      const usdcContract = new ethers.Contract(
        this.contractInfo.address,
        this.contractInfo.abi,
        this.signer
      );

      console.log('Processing USDFC payment:', {
        buyer: await this.signer.getAddress(),
        creator: details.recipient,
        amount: details.amount + ' USDFC',
        videoId: details.videoId,
        contract: this.contractInfo.address
      });

      // Check user's USDFC balance
      const balance = await usdcContract.balanceOf(await this.signer.getAddress());
      if (balance < amountInTokens) {
        return {
          success: false,
          error: `Insufficient USDFC balance. Need ${details.amount} USDFC, have ${ethers.formatUnits(balance, usdcDecimals)}`
        };
      }

      // Transfer USDFC tokens to creator
      const txResponse = await usdcContract.transfer(details.recipient, amountInTokens, {
        gasLimit: 100000 // Standard ERC20 transfer gas limit
      });
      
      console.log('USDFC transfer transaction sent:', txResponse.hash);

      // Wait for confirmation
      const receipt = await txResponse.wait();
      console.log('USDFC transfer confirmed:', receipt);

      return {
        success: true,
        transactionHash: txResponse.hash,
        gasUsed: receipt?.gasUsed?.toString(),
        actualAmount: details.amount,
        contractAddress: this.contractInfo.address
      };

    } catch (error: any) {
      console.error('USDFC payment failed:', error);
      return {
        success: false,
        error: error.message || 'USDFC payment failed. Please try again.'
      };
    }
  }

  /**
   * List a video for sale on the smart contract
   */
  async listVideoForSale(videoId: string, priceInFil: string): Promise<TransactionResult> {
    try {
      if (!this.contractInfo || !this.contractInfo.deployed) {
        return {
          success: false,
          error: "Payment contract not deployed"
        };
      }

      if (!this.creatorWallet) {
        return {
          success: false,
          error: "Creator wallet not initialized"
        };
      }

      const contract = new ethers.Contract(
        this.contractInfo.address,
        this.contractInfo.abi,
        this.creatorWallet
      );

      const priceInWei = ethers.parseEther(priceInFil);
      
      const txResponse = await contract.listVideo(videoId, priceInWei, {
        gasLimit: 100000
      });
      
      const receipt = await txResponse.wait();
      
      console.log(`Video ${videoId} listed for ${priceInFil} FIL by ${this.creatorWallet.address}`);
      
      return {
        success: true,
        transactionHash: txResponse.hash,
        gasUsed: receipt?.gasUsed?.toString()
      };
    } catch (error: any) {
      console.error('Video listing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a user has purchased a specific video
   */
  async hasPurchasedVideo(buyerAddress: string, videoId: string): Promise<boolean> {
    try {
      if (!this.contractInfo || !this.contractInfo.deployed) {
        return false;
      }

      const contract = new ethers.Contract(
        this.contractInfo.address,
        this.contractInfo.abi,
        this.provider
      );

      return await contract.hasPurchased(buyerAddress, videoId);
    } catch (error) {
      console.error('Purchase check failed:', error);
      return false;
    }
  }

  /**
   * Get video price from smart contract
   */
  async getVideoPrice(videoId: string): Promise<string | null> {
    try {
      if (!this.contractInfo || !this.contractInfo.deployed) {
        return null;
      }

      const contract = new ethers.Contract(
        this.contractInfo.address,
        this.contractInfo.abi,
        this.provider
      );

      const priceWei = await contract.getVideoPrice(videoId);
      return ethers.formatEther(priceWei);
    } catch (error) {
      console.error('Price query failed:', error);
      return null;
    }
  }

  /**
   * Get creator's total earnings
   */
  async getCreatorEarnings(creatorAddress: string): Promise<string | null> {
    try {
      if (!this.contractInfo || !this.contractInfo.deployed) {
        return null;
      }

      const contract = new ethers.Contract(
        this.contractInfo.address,
        this.contractInfo.abi,
        this.provider
      );

      const earningsWei = await contract.getCreatorEarnings(creatorAddress);
      return ethers.formatEther(earningsWei);
    } catch (error) {
      console.error('Earnings query failed:', error);
      return null;
    }
  }

  /**
   * Get estimated gas cost for USDFC token transfer
   */
  async estimateGasCost(details: PaymentDetails): Promise<string> {
    try {
      const gasPrice = await this.provider.getFeeData();
      const gasLimit = 100000; // ERC20 transfer gas limit
      
      const gasCostWei = BigInt(gasLimit) * BigInt(gasPrice.gasPrice?.toString() || '0');
      const gasCostFil = ethers.formatEther(gasCostWei);
      
      return gasCostFil;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      return '0.002'; // Fallback estimate for ERC20 transfer
    }
  }

  /**
   * Create USDFC payment transaction for MetaMask
   */
  createPaymentTransaction(details: PaymentDetails) {
    console.log('createPaymentTransaction called with:', details);
    console.log('contractInfo status:', {
      exists: !!this.contractInfo,
      address: this.contractInfo?.address,
      deployed: this.contractInfo?.deployed
    });
    
    if (!this.contractInfo) {
      console.error('ERROR: contractInfo is null!');
      throw new Error('USDFC contract not initialized');
    }

    try {
      // Convert USD amount to USDFC tokens (6 decimals)
      const usdcDecimals = 6;
      console.log('Converting amount:', details.amount, 'with decimals:', usdcDecimals);
      const amountInTokens = ethers.parseUnits(details.amount, usdcDecimals);
      console.log('Amount in tokens:', amountInTokens.toString());
      
      const contract = new ethers.Contract(
        this.contractInfo.address,
        this.contractInfo.abi,
        this.provider
      );
      console.log('Contract created successfully');

      // Create transaction data for USDFC transfer to creator
      const txData = contract.interface.encodeFunctionData('transfer', [
        details.recipient,
        amountInTokens
      ]);
      console.log('Transaction data encoded successfully');

      const transaction = {
        to: this.contractInfo.address,
        value: '0x0', // No ETH value needed for token transfer
        data: txData,
        gasLimit: '0x186A0' // 100000 in hex for ERC20 transfer
      };
      
      console.log('Transaction created:', transaction);
      return transaction;
    } catch (error) {
      console.error('Error in createPaymentTransaction:', error);
      throw error;
    }
  }

  /**
   * Get contract information
   */
  getContractInfo(): ContractInfo | null {
    return this.contractInfo;
  }

  /**
   * Get creator wallet address
   */
  getCreatorAddress(): string | null {
    // Prefer environment variable if it's a valid Ethereum address
    const envAddress = process.env.CREATOR_WALLET_ADDRESS;
    if (envAddress && ethers.isAddress(envAddress)) {
      return envAddress;
    }
    
    // Fall back to initialized creator wallet
    if (this.creatorWallet?.address) {
      return this.creatorWallet.address;
    }
    
    return null;
  }
}

// Export singleton instance
export const filecoinPayService = new FilecoinPayService();