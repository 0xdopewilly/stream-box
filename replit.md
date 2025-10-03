# StreamBox - Decentralized Video Platform

## Overview

StreamBox is a decentralized video streaming platform that empowers creators with tamper-proof storage and direct monetization capabilities. Built with modern web technologies, the platform leverages Filecoin for decentralized storage, providing content verification and creator-owned infrastructure. Users can upload, stream, and monetize video content through various pricing models including free content, pay-per-view, and subscription-based access.

## Recent Changes (October 3, 2025)

### Synapse SDK Payment Integration
- **Added Payment Setup UI**: Implemented three-step payment flow (Deposit USDFC → Approve Service → Upload Ready)
- **Backend Payment APIs**: Created `/api/synapse/deposit`, `/api/synapse/approve`, `/api/synapse/preflight`, `/api/synapse/balance` endpoints
- **Payment Hook**: Added `useSynapsePayment` hook with detailed error logging for debugging
- **Known Issue**: Synapse SDK v1.x has hardcoded incorrect USDFC contract address (`0xb3042734...cDf0`) that doesn't exist on Calibration network
  - **Correct Address**: `0x80b98d3aa09ffff255c3ba4a241111ff1262f045`
  - **Workaround**: Added "Skip Payment Setup" button to proceed directly to upload
  - **Get Test USDFC**: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc
- **Payment Flow**: Currently processes transactions via backend creator wallet (0x2D3AfFD88f17ba3Bf895E23c820f646b69F7D3cb)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built with React and TypeScript, using a modern component-based architecture. The UI framework utilizes Shadcn/UI components with Radix UI primitives for accessibility and customization. Tailwind CSS provides utility-first styling with a dark theme design system. The application uses Wouter for lightweight client-side routing and React Query (TanStack Query) for server state management and API data fetching.

Key architectural decisions:
- **Component Structure**: Modular component design with reusable UI components in the `/components/ui` directory
- **State Management**: React Query handles server state while local component state manages UI interactions
- **Routing**: File-based routing structure with dedicated pages for home, discover, creators, upload, and video viewing
- **Styling**: CSS custom properties enable dynamic theming with a consistent dark mode design

### Backend Architecture
The server architecture follows a RESTful API design built with Express.js and TypeScript. The application uses a modular approach with separate concerns for routing, storage abstraction, and object management.

Key architectural decisions:
- **API Design**: RESTful endpoints organized by resource type (videos, users, purchases, subscriptions)
- **Storage Abstraction**: Interface-based storage layer allowing for multiple implementations (currently in-memory for development)
- **Middleware Pipeline**: Express middleware handles logging, JSON parsing, and error handling
- **Development Tooling**: Vite integration for hot module replacement and development server proxy

### Data Storage Solutions
The application implements a dual-storage approach combining traditional database operations with decentralized file storage.

**Database Layer**:
- Drizzle ORM with PostgreSQL for structured data management
- Schema-first approach with TypeScript type generation
- Tables for users, videos, subscriptions, and purchases with proper foreign key relationships

**File Storage**:
- Google Cloud Storage integration for video and image assets
- Object-level access control with custom ACL policies
- Filecoin integration for tamper-proof content verification through PDP (Proof of Data Possession) hashes

### Authentication and Authorization
The platform implements a wallet-based authentication system designed for Web3 integration:
- MetaMask wallet connection for user authentication
- Mock wallet implementation for development and demonstration
- Creator verification system with verified badges
- Object-level permissions managed through custom ACL policies

### Content Management and Monetization
The video platform supports multiple content distribution models:
- **Free Content**: Open access videos with view tracking
- **Pay-per-view**: Individual video purchases with transaction recording
- **Subscription Model**: Creator-based subscription system for premium content access

Content verification ensures integrity through:
- Filecoin hash storage for tamper-proof verification
- Creator verification badges for trusted content producers
- Content categorization and search functionality

## External Dependencies

### Cloud Infrastructure
- **Google Cloud Storage**: Primary object storage for video files, thumbnails, and user-generated content
- **Neon Database**: PostgreSQL database hosting with serverless scaling capabilities

### File Upload and Management
- **Uppy**: File upload library providing drag-and-drop interfaces, progress tracking, and AWS S3 direct upload capabilities
- **@uppy/aws-s3**: S3 integration for direct-to-cloud uploads with presigned URL support

### UI and Styling Framework
- **Radix UI**: Unstyled, accessible React components providing the foundation for custom UI elements
- **Tailwind CSS**: Utility-first CSS framework for responsive design and consistent styling
- **Lucide Icons**: Consistent icon system throughout the application

### State Management and API Integration
- **TanStack React Query**: Server state management with caching, background updates, and optimistic UI updates
- **Wouter**: Lightweight routing library for single-page application navigation

### Development and Build Tools
- **Vite**: Fast build tool and development server with hot module replacement
- **Drizzle Kit**: Database migration and schema management tooling
- **TypeScript**: Type-safe development across frontend and backend code

### Blockchain and Web3 Integration
- **MetaMask**: Browser wallet integration for user authentication and transaction handling
- **Filecoin Network**: Decentralized storage network for content verification and tamper-proof storage guarantees