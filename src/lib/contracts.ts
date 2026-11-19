export type Id = number;
export type Money = string;
export type ISODateTime = string;
export type Gender =
  "MALE" | "FEMALE" | "NON_BINARY" | "OTHER" | "PREFER_NOT_TO_SAY";
export type VerificationStatus =
  "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
export type ProductCondition = "NEW" | "USED" | "REFURBISHED";
export type ProductStatus = "DRAFT" | "ACTIVE" | "SOLD_OUT" | "ARCHIVED";
export type ProductSort = "newest" | "oldest" | "price_asc" | "price_desc";
export type Rating = 1 | 2 | 3 | 4 | 5;
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}
export type SessionResponse = { user: AuthUser; session: AuthSession } | null;
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface Page<T> {
  items: T[];
  pagination: Pagination;
}
export interface RatingOverview {
  averageRating: number;
  totalReviews: number;
}
export interface RatingSummary extends RatingOverview {
  ratingDistribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}
export interface ReviewPage<T> extends Page<T> {
  ratings: RatingSummary;
}
export interface Category {
  id: Id;
  name: string;
  slug: string;
}
export interface CreateCategoryInput {
  name: string;
  slug: string;
}
export interface CreateProfileInput {
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber?: string | null;
  bio?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  gender?: Gender | null;
  preferredLanguage?: string | null;
  address?: string | null;
}
export type UpdateProfileInput = Partial<CreateProfileInput>;
export interface ProfileCompletion {
  complete: boolean;
  missingFields: string[];
}
export interface OwnProfile extends Required<CreateProfileInput> {
  id: Id;
  userId: Id;
  email: string;
  profilePicture: string | null;
  accountCreatedAt: string;
  isSeller: boolean;
  seller: {
    id: Id;
    slug: string;
    verificationStatus: VerificationStatus;
  } | null;
  completion: ProfileCompletion;
  createdAt: string;
  updatedAt: string;
}
export interface PublicProfile {
  firstName: string;
  lastName: string;
  username: string;
  bio: string | null;
  country: string | null;
  city: string | null;
  preferredLanguage: string | null;
  profilePicture: string | null;
  accountCreatedAt: string;
  isSeller: boolean;
  seller: {
    slug: string;
    displayName: string;
    verificationStatus: VerificationStatus;
  } | null;
}
export interface CreateSellerInput {
  displayName: string;
  slug: string;
  description: string;
  country: string;
  state: string;
  city: string;
  businessName?: string | null;
  businessEmail?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
}
export type UpdateSellerInput = Partial<CreateSellerInput>;
export interface PublicSeller {
  id: Id;
  displayName: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  country: string;
  state: string;
  city: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
}
export interface SellerStatistics extends RatingSummary {
  activeProducts: number;
}
export interface OwnSellerStatistics extends SellerStatistics {
  productsByStatus: Partial<Record<ProductStatus, number>>;
}
export interface Storefront extends PublicSeller {
  statistics: SellerStatistics;
}
export interface OwnSeller extends PublicSeller {
  userId: Id;
  businessName: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  updatedAt: string;
  statistics: OwnSellerStatistics;
}
export interface CreateProductInput {
  title: string;
  slug?: string;
  description: string;
  shortDescription?: string | null;
  price: Money;
  currency: string;
  discountPrice?: Money | null;
  categoryId: Id;
  brand?: string | null;
  condition?: ProductCondition;
  stockQuantity: number;
  available?: boolean;
  status?: ProductStatus;
  country: string;
  state: string;
  city: string;
}
export type UpdateProductInput = Partial<CreateProductInput>;
export interface ProductImage {
  id: Id;
  url: string;
  sortOrder: number;
}
export type SellerCard = Pick<
  PublicSeller,
  "id" | "displayName" | "slug" | "logoUrl" | "verificationStatus"
>;
export interface Product {
  id: Id;
  title: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  price: Money;
  currency: string;
  discountPrice: Money | null;
  brand: string | null;
  condition: ProductCondition;
  stockQuantity: number;
  available: boolean;
  status: ProductStatus;
  country: string;
  state: string;
  city: string;
  createdAt: string;
  updatedAt: string;
  category: Category;
  seller: SellerCard;
  images: ProductImage[];
}
export interface ProductListItem extends Product {
  ratings: RatingOverview;
}
export interface ProductDetail extends Product {
  ratings: RatingSummary;
}
export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: Id;
  category?: string;
  sellerId?: Id;
  minPrice?: Money;
  maxPrice?: Money;
  condition?: ProductCondition;
  country?: string;
  state?: string;
  city?: string;
  sort?: ProductSort;
}
export interface OwnProductQuery extends ProductQuery {
  status?: ProductStatus;
}
export interface CreateReviewInput {
  rating: Rating;
  title?: string | null;
  comment: string;
}
export type UpdateReviewInput = Partial<CreateReviewInput>;
export interface ReviewQuery {
  page?: number;
  limit?: number;
  rating?: Rating;
  sort?: "newest" | "oldest";
}
export interface ReviewAuthor {
  name: string;
  image: string | null;
  profile: { username: string } | null;
}
export interface Review {
  id: Id;
  rating: Rating;
  title: string | null;
  comment: string;
  createdAt: string;
  updatedAt: string;
  reviewer: ReviewAuthor;
}
export interface ProductReview extends Review {
  productId: Id;
}
export interface SellerReview extends Review {
  sellerId: Id;
}
export interface OwnProductReview extends Review {
  product: Pick<Product, "id" | "slug" | "title" | "status">;
}
export interface OwnSellerReview extends Review {
  seller: Pick<PublicSeller, "id" | "slug" | "displayName">;
}
