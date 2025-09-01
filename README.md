# StreamBox - Decentralized Video Platform

StreamBox is a decentralized video streaming platform that empowers creators with tamper-proof storage and direct monetization capabilities. Built with modern web technologies, the platform leverages Filecoin for decentralized storage, providing content verification and creator-owned infrastructure.

## 🚀 Features

- **Decentralized Storage**: Videos stored on Filecoin network with tamper-proof verification
- **Creator Monetization**: Direct payments via Filecoin smart contracts (95% creator / 5% platform)
- **Wallet Integration**: MetaMask wallet connection for Filecoin Calibration network
- **Content Verification**: Proofs of Data Possession (PDP) for content integrity
- **Multiple Payment Models**: Free content, pay-per-view, and subscription-based access

## 🛠 Tech Stack

### Frontend
- **React** with TypeScript
- **Shadcn/UI** components with Radix UI
- **Tailwind CSS** for styling
- **Wouter** for routing
- **TanStack Query** for state management

### Backend
- **Node.js** with Express
- **Drizzle ORM** with PostgreSQL
- **Google Cloud Storage** for file storage
- **Ethers.js** for blockchain interaction

### Blockchain
- **Filecoin Calibration Network**
- **Smart Contracts** for payments
- **MetaMask** wallet integration

## 🔧 Setup Instructions

### Prerequisites
- Node.js 18+ 
- MetaMask browser extension
- Filecoin Calibration testnet FIL (from [faucet](https://calibration.yoga/))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd streambox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Required Environment Variables**
   - `DEPLOYER_PRIVATE_KEY`: Your wallet private key for contract deployment
   - `CREATOR_WALLET_ADDRESS`: Creator wallet address for payments
   - `LIGHTHOUSE_API_KEY`: (Optional) For IPFS storage via Lighthouse

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:5000
   - Connect your MetaMask wallet
   - Switch to Filecoin Calibration network

## 📱 Usage

### For Viewers
1. Browse featured content on the homepage
2. Connect wallet to purchase premium content
3. Pay with FIL for instant access

### For Creators
1. Connect MetaMask wallet
2. Upload videos with pricing options
3. Earn 95% of revenue from sales
4. Track earnings in creator dashboard

## 🔐 Security

- All sensitive information uses environment variables
- Private keys never stored in code
- Smart contracts handle payments securely
- Object-level access control for content

## 🚀 Deployment

This project is designed to run on Replit with automatic deployment. For other platforms:

1. Set up environment variables
2. Deploy smart contracts to Filecoin network
3. Configure object storage
4. Start the production server

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For questions or support, please open an issue in the repository.

---

**⚠️ Important**: This platform uses real cryptocurrency transactions on Filecoin Calibration testnet. Always test thoroughly before mainnet deployment.