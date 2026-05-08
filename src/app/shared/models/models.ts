// Defines the available authorization roles within the application
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

// Supported authentication methods for user login
export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB'
}

// Represents the various stages of an order fulfillment process
export enum OrderStatus {
  PLACED = 'PLACED',
  CONFIRMED = 'CONFIRMED',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

// Data structure for a system user profile
export interface User {
  userId: number;
  fullName: string;
  email: string;
  role: Role;
  provider: AuthProvider;
  mobile?: string;
  profileImage?: string;
  suspended?: boolean;
  createdAt: string;
}

export interface Address {
  addressId?: number;
  customerId: number;
  fullName: string;
  mobileNumber: string;
  flatNumber: string;
  city: string;
  state: string;
  pincode: string;
  createdAt?: string;
  updatedAt?: string;
}

// Data structure representing a book in the catalog
export type CheckoutPaymentMethod = 'WALLET' | 'ONLINE' | 'COD';

export interface CheckoutPayload {
  userId: number;
  addressId?: number;
  paymentMethod: CheckoutPaymentMethod;
  paymentDetails?: Record<string, unknown>;
  discountCode?: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  couponId: number;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxUsage: number | null;
  usageCount: number;
  expiryDate: string | null;
  active: boolean;
  createdAt: string;
  isExpired: boolean;
  isExhausted: boolean;
}

export interface CouponValidateResponse {
  valid: boolean;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

export interface CouponRequestPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxUsage: number | null;
  expiryDate: string | null;
}

export interface Book {
  bookId: number;
  title: string;
  author: string;
  isbn: string;
  genre: string;
  publisher?: string;
  price: number;
  stock: number;
  rating?: number;
  description?: string;
  coverImageUrl?: string;
  publishedDate?: string;
  isFeatured?: boolean;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface CartItem {
  itemId: number;
  bookId: number;
  bookTitle: string;
  price: number;
  quantity: number;
  bookImageUrl?: string;
}

// Data structure for a user's shopping cart
export interface Cart {
  cartId: number;
  userId: number;
  items: CartItem[];
  totalPrice: number;
}

// Data structure representing a finalized customer order
export interface Order {
  orderId: number;
  userId: number;
  orderDate: string;
  amountPaid: number;
  orderStatus: OrderStatus;
  quantity: number;
  bookId: number;
  bookName: string;
  paymentMethod?: CheckoutPaymentMethod;
  customerEmail?: string;
  address?: Address;
  statusHistory: OrderStatusLog[];
}

export interface Invoice {
  invoiceNumber: string;
  orderId: number;
  userId: number;
  bookName: string;
  bookId: number;
  quantity: number;
  amountPaid: number;
  paymentMethod: string;
  orderStatus: string;
  orderDate: string;
  billedTo: string;
  mobileNumber: string;
  shippingAddress: string;
}

export interface OrderStatusLog {
  id: number;
  status: string;
  updatedAt: string;
  message: string;
}

// Data structure for a book review submission
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Review {
  reviewId?: number;
  bookId: number;
  userId: number;
  rating: number;
  comment: string;
  createdAt?: string;
  verified?: boolean;
  status?: ReviewStatus;
}

export interface OrderItem {
  orderItemId: number;
  bookId: number;
  quantity: number;
  price: number;
}

export interface AuthResponse {
  token: string;
  userId?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ErrorResponse {
  success: boolean;
  message: string;
  errorCode: string;
}
export interface WishlistItem {
  itemId: number;
  bookId: number;
  bookTitle: string;
  bookPrice: number;
  bookImageUrl?: string;
  addedAt: string;
}

// Data structure for a user's collection of saved books
export interface Wishlist {
  wishlistId: number;
  userId: number;
  items: WishlistItem[];
}

export enum NotificationType {
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  DELIVERY = 'DELIVERY',
  SYSTEM = 'SYSTEM'
}

// Data structure for system-generated alerts and notifications
export interface Notification {
  notificationId: number;
  userId: number;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// Data structure for a user's digital wallet balance
export interface Wallet {
  walletId: number;
  userId: number;
  balance: number;
}

export interface Statement {
  statementId: number;
  transactionType: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  dateTime: string;
  transactionRemarks: string;
  orderId?: number;
  paymentGateway?: string;
}
