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
      // For now, use a mock contract setup
      // In production, you'd deploy the actual smart contract
      this.contractInfo = {
        address: "0x" + Math.random().toString(16).substring(2, 42), // Mock contract address
        abi: [
          "function listVideo(string memory videoId, uint256 price) external",
          "function purchaseVideo(string memory videoId) external payable",
          "function hasPurchased(address buyer, string memory videoId) external view returns (bool)",
          "function getVideoPrice(string memory videoId) external view returns (uint256)",
          "function getVideoCreator(string memory videoId) external view returns (address)",
          "function getCreatorEarnings(address creator) external view returns (uint256)",
          "event VideoPurchased(bytes32 indexed purchaseId, address indexed buyer, address indexed creator, string videoId, uint256 amount)",
          "event CreatorPaid(address indexed creator, uint256 amount)",
          "event VideoListed(string indexed videoId, address indexed creator, uint256 price)"
        ],
        deployed: true
      };
      console.log('StreamBox payment contract initialized:', this.contractInfo.address);
      console.log('Creator payments will go to:', process.env.CREATOR_WALLET_ADDRESS);
    } catch (error) {
      console.error('Failed to initialize contract:', error);
    }
  }

  private initializeCreatorWallet() {
    try {
      if (process.env.DEPLOYER_PRIVATE_KEY) {
        this.creatorWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, this.provider);
        console.log('Creator wallet initialized:', this.creatorWallet.address);
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
   * Process video purchase payment through smart contract
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
          error: "Payment contract not deployed. Please try again later."
        };
      }

      // Convert FIL amount to wei (18 decimals)
      const amountInWei = ethers.parseEther(details.amount);
      
      // Create contract instance
      const contract = new ethers.Contract(
        this.contractInfo.address,
        this.contractInfo.abi,
        this.signer
      );

      console.log('Processing video purchase:', {
        buyer: await this.signer.getAddress(),
        creator: details.recipient,
        amount: details.amount + ' FIL',
        videoId: details.videoId,
        contract: this.contractInfo.address
      });

      // Call smart contract to purchase video
      const txResponse = await contract.purchaseVideo(details.videoId, {
        value: amountInWei,
        gasLimit: 150000 // Higher gas limit for contract interaction
      });
      
      console.log('Purchase transaction sent:', txResponse.hash);

      // Wait for confirmation
      const receipt = await txResponse.wait();
      console.log('Purchase confirmed:', receipt);

      // Extract events from receipt
      const purchaseEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'VideoPurchased';
        } catch {
          return false;
        }
      });

      return {
        success: true,
        transactionHash: txResponse.hash,
        gasUsed: receipt?.gasUsed?.toString(),
        actualAmount: details.amount,
        contractAddress: this.contractInfo.address
      };

    } catch (error: any) {
      console.error('Payment processing failed:', error);
      return {
        success: false,
        error: error.message || 'Payment failed. Please try again.'
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
   * Get estimated gas cost for a video purchase
   */
  async estimateGasCost(details: PaymentDetails): Promise<string> {
    try {
      const gasPrice = await this.provider.getFeeData();
      const gasLimit = 150000; // Contract interaction gas limit
      
      const gasCostWei = BigInt(gasLimit) * BigInt(gasPrice.gasPrice?.toString() || '0');
      const gasCostFil = ethers.formatEther(gasCostWei);
      
      return gasCostFil;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      return '0.005'; // Fallback estimate for contract interaction
    }
  }

  /**
   * Create payment transaction for MetaMask
   */
  createPaymentTransaction(details: PaymentDetails) {
    if (!this.contractInfo) {
      throw new Error('Contract not initialized');
    }

    const amountWei = ethers.parseEther(details.amount);
    const contract = new ethers.Contract(
      this.contractInfo.address,
      this.contractInfo.abi,
      this.provider
    );

    // Create transaction data for purchaseVideo function call
    const txData = contract.interface.encodeFunctionData('purchaseVideo', [details.videoId]);

    return {
      to: this.contractInfo.address,
      value: `0x${amountWei.toString(16)}`,
      data: txData,
      gasLimit: '0x24F40' // 150000 in hex
    };
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
    return process.env.CREATOR_WALLET_ADDRESS || this.creatorWallet?.address || null;
  }
}

// Export singleton instance
export const filecoinPayService = new FilecoinPayService();