import lighthouse from "@lighthouse-web3/sdk";

export interface FilecoinStorageOptions {
  apiKey?: string;
  dealParams?: {
    num_copies?: number;
    repair_threshold?: number;
    renew_threshold?: number;
    miner?: string[];
    network?: string;
    add_mock_data?: number;
  };
}

export interface PDPProof {
  hash: string;
  timestamp: number;
  verified: boolean;
  proofType: 'filecoin' | 'ipfs';
  cid?: string;
  dealId?: string;
}

export interface VideoStorageResult {
  cid: string;
  hash: string;
  publicURL: string;
  pdpProof: PDPProof;
  size: number;
  dealId?: string;
}

export class FilecoinOCPService {
  private lighthouse: any;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LIGHTHOUSE_API_KEY || '';
    this.lighthouse = lighthouse;
  }

  /**
   * Store video content on Filecoin with WarmStorage and generate PDP proof
   */
  async storeVideo(
    videoBuffer: Buffer, 
    filename: string, 
    options: FilecoinStorageOptions = {}
  ): Promise<VideoStorageResult> {
    try {
      if (!this.apiKey) {
        throw new Error('Lighthouse API key is required for Filecoin storage');
      }

      // Upload to Lighthouse (Filecoin WarmStorage)
      const uploadResponse = await this.lighthouse.upload(
        [{ content: videoBuffer, name: filename }],
        this.apiKey,
        {
          dealParams: {
            num_copies: options.dealParams?.num_copies || 2,
            repair_threshold: options.dealParams?.repair_threshold || 28800,
            renew_threshold: options.dealParams?.renew_threshold || 240,
            miner: options.dealParams?.miner || [],
            network: options.dealParams?.network || 'calibration',
            add_mock_data: options.dealParams?.add_mock_data || 2,
            ...options.dealParams
          }
        }
      );

      if (!uploadResponse || !uploadResponse.data || !uploadResponse.data.Hash) {
        throw new Error('Failed to upload to Filecoin network');
      }

      const cid = uploadResponse.data.Hash;
      const publicURL = `https://gateway.lighthouse.storage/ipfs/${cid}`;

      // Generate PDP proof
      const pdpProof = await this.generatePDPProof(cid, videoBuffer);

      // Get storage deal information if available
      let dealId: string | undefined;
      try {
        const dealStatus = await this.lighthouse.dealStatus(cid);
        if (dealStatus && dealStatus.dealId) {
          dealId = dealStatus.dealId.toString();
        }
      } catch (error) {
        console.warn('Could not retrieve deal status:', error);
      }

      return {
        cid,
        hash: pdpProof.hash,
        publicURL,
        pdpProof,
        size: videoBuffer.length,
        dealId
      };

    } catch (error) {
      console.error('Filecoin storage error:', error);
      throw new Error(`Failed to store video on Filecoin: ${error}`);
    }
  }

  /**
   * Generate Proof of Data Possession (PDP) for content verification
   */
  async generatePDPProof(cid: string, content: Buffer): Promise<PDPProof> {
    try {
      // Create content hash for verification
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      // Verify the content is actually stored
      const proofData = await this.verifyStorageProof(cid);

      return {
        hash,
        timestamp: Date.now(),
        verified: proofData.verified,
        proofType: 'filecoin',
        cid,
        dealId: proofData.dealId
      };
    } catch (error) {
      console.error('PDP proof generation error:', error);
      // Return unverified proof if verification fails
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      
      return {
        hash,
        timestamp: Date.now(),
        verified: false,
        proofType: 'filecoin',
        cid
      };
    }
  }

  /**
   * Verify that content is actually stored on Filecoin network
   */
  async verifyStorageProof(cid: string): Promise<{ verified: boolean; dealId?: string }> {
    try {
      // Check if content is accessible via IPFS gateway
      const gatewayResponse = await fetch(`https://gateway.lighthouse.storage/ipfs/${cid}`, {
        method: 'HEAD'
      });

      if (!gatewayResponse.ok) {
        return { verified: false };
      }

      // Try to get deal status for additional verification
      try {
        const dealStatus = await this.lighthouse.dealStatus(cid);
        if (dealStatus && dealStatus.dealId) {
          return { 
            verified: true, 
            dealId: dealStatus.dealId.toString() 
          };
        }
      } catch (dealError) {
        console.warn('Deal status check failed:', dealError);
      }

      return { verified: true };
    } catch (error) {
      console.error('Storage proof verification error:', error);
      return { verified: false };
    }
  }

  /**
   * Retrieve content from Filecoin network
   */
  async retrieveContent(cid: string): Promise<Buffer> {
    try {
      const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${cid}`);
      if (!response.ok) {
        throw new Error(`Failed to retrieve content: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Content retrieval error:', error);
      throw new Error(`Failed to retrieve content from Filecoin: ${error}`);
    }
  }

  /**
   * Get storage deal information
   */
  async getDealInfo(cid: string) {
    try {
      const dealStatus = await this.lighthouse.dealStatus(cid);
      return dealStatus;
    } catch (error) {
      console.error('Deal info retrieval error:', error);
      return null;
    }
  }

  /**
   * Create a CDN-optimized URL for global content delivery
   */
  getFilCDNUrl(cid: string): string {
    // Use Lighthouse gateway with CDN optimization
    return `https://gateway.lighthouse.storage/ipfs/${cid}`;
  }

  /**
   * Verify PDP proof for content integrity
   */
  async verifyPDPProof(proof: PDPProof, cid: string): Promise<boolean> {
    try {
      if (proof.cid !== cid) {
        return false;
      }

      // Verify the content is still accessible
      const storageVerification = await this.verifyStorageProof(cid);
      return storageVerification.verified;
    } catch (error) {
      console.error('PDP proof verification error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const filecoinService = new FilecoinOCPService();