import { type User, type InsertUser, type Video, type InsertVideo, type Subscription, type InsertSubscription, type Purchase, type InsertPurchase } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Video operations
  getVideo(id: string): Promise<Video | undefined>;
  getVideosByCreator(creatorId: string): Promise<Video[]>;
  getAllVideos(): Promise<Video[]>;
  getVideosByCategory(category: string): Promise<Video[]>;
  getTrendingVideos(limit: number): Promise<Video[]>;
  searchVideos(query: string): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, updates: Partial<InsertVideo>): Promise<Video | undefined>;
  incrementViews(id: string): Promise<void>;

  // Subscription operations
  getSubscription(userId: string, creatorId: string): Promise<Subscription | undefined>;
  getSubscriptionsByUser(userId: string): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  cancelSubscription(userId: string, creatorId: string): Promise<void>;

  // Purchase operations
  getPurchase(userId: string, videoId: string): Promise<Purchase | undefined>;
  getPurchasesByUser(userId: string): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private videos: Map<string, Video>;
  private subscriptions: Map<string, Subscription>;
  private purchases: Map<string, Purchase>;

  constructor() {
    this.users = new Map();
    this.videos = new Map();
    this.subscriptions = new Map();
    this.purchases = new Map();
    this.seedData();
  }

  private seedData() {
    // Create sample users
    const user1: User = {
      id: "user1",
      username: "alexchen",
      email: "alex@example.com",
      walletAddress: "0x742d35cc6634c0532925a3b8d5c0b5e1ba64e2c1",
      bio: "Tech educator passionate about making complex topics simple",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
      isVerified: true,
      createdAt: new Date(),
    };

    const user2: User = {
      id: "user2",
      username: "mayarivera",
      email: "maya@example.com",
      walletAddress: "0x8ba1f109551bd432803012645hac136c0c8326b",
      bio: "Digital artist creating stunning visual experiences",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b66ad77c?w=400",
      isVerified: true,
      createdAt: new Date(),
    };

    const user3: User = {
      id: "user3",
      username: "jordanblake",
      email: "jordan@example.com",
      walletAddress: "0x5aae4c53c2c1b92c8e784b89e7cdaebbb7b5e123",
      bio: "Music producer and sound engineer",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
      isVerified: true,
      createdAt: new Date(),
    };

    this.users.set("user1", user1);
    this.users.set("user2", user2);
    this.users.set("user3", user3);

    // Create sample videos
    const videos: Video[] = [
      {
        id: "video1",
        title: "Digital Art Masterclass",
        description: "Learn advanced digital painting techniques using industry-standard tools and workflows.",
        thumbnailUrl: "https://images.unsplash.com/photo-1561736778-92e52a7769ef?w=800",
        videoUrl: "/objects/uploads/video1.mp4",
        duration: 1455, // 24:15
        category: "Art",
        price: "5.99",
        pricingType: "payper",
        views: 12500,
        isVerified: true,
        filecoinHash: "0x8a2b4c3d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z",
        creatorId: "user2",
        createdAt: new Date(),
      },
      {
        id: "video2",
        title: "Music Production Secrets",
        description: "Professional music production techniques from mixing to mastering.",
        thumbnailUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
        videoUrl: "/objects/uploads/video2.mp4",
        duration: 1902, // 31:42
        category: "Music",
        price: "8.99",
        pricingType: "payper",
        views: 8200,
        isVerified: true,
        filecoinHash: "0x9b3c5d4e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z1a",
        creatorId: "user3",
        createdAt: new Date(),
      },
      {
        id: "video3",
        title: "React Performance Optimization",
        description: "Advanced React patterns and performance optimization techniques.",
        thumbnailUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
        videoUrl: "/objects/uploads/video3.mp4",
        duration: 2145, // 35:45
        category: "Technology",
        price: "12.99",
        pricingType: "payper",
        views: 15600,
        isVerified: true,
        filecoinHash: "0xa4c6e5f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z2b3c",
        creatorId: "user1",
        createdAt: new Date(),
      },
      {
        id: "video4",
        title: "Blockchain Development Fundamentals",
        description: "Learn the basics of blockchain development and smart contracts.",
        thumbnailUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800",
        videoUrl: "/objects/uploads/video4.mp4",
        duration: 2890, // 48:10
        category: "Technology",
        price: "0",
        pricingType: "free",
        views: 22300,
        isVerified: true,
        filecoinHash: "0xb5d7f6g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z3c4d5e",
        creatorId: "user1",
        createdAt: new Date(),
      },
      {
        id: "video5",
        title: "3D Animation Masterclass",
        description: "Complete guide to 3D animation using Blender and advanced techniques.",
        thumbnailUrl: "https://images.unsplash.com/photo-1551731409-43eb3e517a1a?w=800",
        videoUrl: "/objects/uploads/video5.mp4",
        duration: 3245, // 54:05
        category: "Art",
        price: "15.99",
        pricingType: "payper",
        views: 18900,
        isVerified: true,
        filecoinHash: "0xc6e8g7h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z4d5e6f",
        creatorId: "user2",
        createdAt: new Date(),
      },
      {
        id: "video6",
        title: "Advanced AI Prompting Techniques",
        description: "Master the art of AI prompt engineering for better results.",
        thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800",
        videoUrl: "/objects/uploads/video6.mp4",
        duration: 1856, // 30:56
        category: "Technology",
        price: "9.99",
        pricingType: "payper",
        views: 31200,
        isVerified: true,
        filecoinHash: "0xd7f9h8i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z5e6f7g8h",
        creatorId: "user1",
        createdAt: new Date(),
      },
      {
        id: "video7",
        title: "Podcast Production Complete Guide",
        description: "Everything you need to know about recording and producing podcasts.",
        thumbnailUrl: "https://images.unsplash.com/photo-1618519214282-5d92d66b9e40?w=800",
        videoUrl: "/objects/uploads/video7.mp4",
        duration: 2134, // 35:34
        category: "Music",
        price: "0",
        pricingType: "free",
        views: 14500,
        isVerified: true,
        filecoinHash: "0xe8g0i9j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z6f7g8h9i0j",
        creatorId: "user3",
        createdAt: new Date(),
      },
      {
        id: "video8",
        title: "Cryptocurrency Trading Strategies",
        description: "Professional crypto trading strategies and risk management.",
        thumbnailUrl: "https://images.unsplash.com/photo-1642790551116-18e150f248e3?w=800",
        videoUrl: "/objects/uploads/video8.mp4",
        duration: 2756, // 45:56
        category: "Finance",
        price: "24.99",
        pricingType: "payper",
        views: 27600,
        isVerified: true,
        filecoinHash: "0xf9h1j0k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7g8h9i0j1k2l",
        creatorId: "user1",
        createdAt: new Date(),
      },
    ];

    videos.forEach(video => this.videos.set(video.id, video));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      isVerified: false,
      createdAt: new Date(),
      walletAddress: insertUser.walletAddress || null,
      bio: insertUser.bio || null,
      avatar: insertUser.avatar || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getVideo(id: string): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async getVideosByCreator(creatorId: string): Promise<Video[]> {
    return Array.from(this.videos.values()).filter(video => video.creatorId === creatorId);
  }

  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getVideosByCategory(category: string): Promise<Video[]> {
    return Array.from(this.videos.values()).filter(video => 
      video.category.toLowerCase() === category.toLowerCase()
    );
  }

  async getTrendingVideos(limit: number): Promise<Video[]> {
    return Array.from(this.videos.values())
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, limit);
  }

  async searchVideos(query: string): Promise<Video[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.videos.values()).filter(video =>
      video.title.toLowerCase().includes(searchTerm) ||
      video.description?.toLowerCase().includes(searchTerm) ||
      video.category.toLowerCase().includes(searchTerm)
    );
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = randomUUID();
    const video: Video = {
      ...insertVideo,
      id,
      views: 0,
      isVerified: false,
      filecoinHash: null,
      duration: insertVideo.duration || null,
      description: insertVideo.description || null,
      thumbnailUrl: insertVideo.thumbnailUrl || null,
      price: insertVideo.price || null,
      pricingType: insertVideo.pricingType || "free",
      creatorId: insertVideo.creatorId || null,
      createdAt: new Date()
    };
    this.videos.set(id, video);
    return video;
  }

  async updateVideo(id: string, updates: Partial<InsertVideo>): Promise<Video | undefined> {
    const video = this.videos.get(id);
    if (!video) return undefined;

    const updatedVideo = { ...video, ...updates };
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }

  async incrementViews(id: string): Promise<void> {
    const video = this.videos.get(id);
    if (video) {
      video.views = (video.views || 0) + 1;
      this.videos.set(id, video);
    }
  }

  async getSubscription(userId: string, creatorId: string): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(sub => 
      sub.userId === userId && sub.creatorId === creatorId && sub.isActive
    );
  }

  async getSubscriptionsByUser(userId: string): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values()).filter(sub => 
      sub.userId === userId && sub.isActive
    );
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = randomUUID();
    const subscription: Subscription = {
      ...insertSubscription,
      id,
      isActive: true,
      userId: insertSubscription.userId || null,
      creatorId: insertSubscription.creatorId || null,
      createdAt: new Date()
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async cancelSubscription(userId: string, creatorId: string): Promise<void> {
    const subscription = await this.getSubscription(userId, creatorId);
    if (subscription) {
      subscription.isActive = false;
      this.subscriptions.set(subscription.id, subscription);
    }
  }

  async getPurchase(userId: string, videoId: string): Promise<Purchase | undefined> {
    return Array.from(this.purchases.values()).find(purchase => 
      purchase.userId === userId && purchase.videoId === videoId
    );
  }

  async getPurchasesByUser(userId: string): Promise<Purchase[]> {
    return Array.from(this.purchases.values()).filter(purchase => 
      purchase.userId === userId
    );
  }

  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const id = randomUUID();
    const purchase: Purchase = {
      ...insertPurchase,
      id,
      userId: insertPurchase.userId || null,
      videoId: insertPurchase.videoId || null,
      transactionHash: insertPurchase.transactionHash || null,
      createdAt: new Date()
    };
    this.purchases.set(id, purchase);
    return purchase;
  }
}

export const storage = new MemStorage();
