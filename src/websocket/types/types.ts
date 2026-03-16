import type WebSocket from "ws";

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

// Enum for Auction status
type AuctionStatus = "ACTIVE" | "ENDED";

// Bid interface
export interface Bid {
  id: string;
  price: number;
  bidderId: string;
  bidder?: User;
  auctionId: string;
  auction?: Auction;
  winningAuction?: Auction;
  createdAt: string;
  updatedAt: string;
}

// shubham bhai
// shubham bhai
// shubham bhai

// Auction interface
export interface Auction {
  id: string;
  ownerId: string;
  owner?: User;
  winnerId?: string | null;
  winner?: User | null;
  winningBidId?: string | null;
  winningBid?: Bid | null;
  biddings?: Bid[];
  productId: string;
  product?: Product;
  startTime: Date;
  auctionDuration: number;
  startingPrice: number;
  finalBidPrice?: number | null;
  status: AuctionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  image: string;
  status: "NOTLIVE" | "LIVE" | "ARCHIVE";
  ownerId: string;
  owner?: User;
  auctions?: Auction[];
  initialPrice: number;
  durationInSeconds: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  message: string;
  data: T | null;
}

export interface getAllProductResponse<T> {
  message: string;
  data: T | [];
}

export interface ApiRes<T> {
  message: string;
  data: T;
}

export interface AuctionBid {
  id: string;
  userId: string;
  amount: number;
  timestamp: number;
  userName: string;
}

export interface RawDataState {
  type: string;
  payload: any;
}

export interface AuctionParticipant {
  userId: string;
  username: string;
  ws: WebSocket;
  joinedAt: number;
}

export interface AuctionState {
  auctionId: string;
  participants: Map<string, AuctionParticipant>;
  viewerCount: number;
  bids: AuctionBid[];
  startingPrice: number;
  nextBidAmount: number;
  currentHighestBid: AuctionBid | null;
  startTime: number;
  endTime: number;
  remainingTime: number;
  status: "pending" | "active" | "ended";
}

// Serialize for sending data via ws to frontend
export interface AuctionStateSerialize {
  auctionId: string;
  viewerCount: number;
  bids: AuctionBid[];
  currentHighestBid: AuctionBid | null;
  startTime: number;
  endTime: number;
  startingPrice: number;
  nextBidAmount: number;
  remainingTime: number;
  status: "pending" | "active" | "ended";
  participants: {
    userId: string;
    username: string;
    joinedAt: number;
  }[];
}
