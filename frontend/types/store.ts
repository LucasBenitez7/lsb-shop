export interface StoreConfig {
  id: string;
  storeName: string | null;
  logoUrl: string | null;
  // Hero
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroCta: string | null;
  heroImageUrl: string | null;
  heroImageUrlMobile: string | null;
  // Sale banner
  saleTitle: string | null;
  saleSubtitle: string | null;
  saleCta: string | null;
  saleImageUrl: string | null;
  saleImageUrlMobile: string | null;
  saleLink: string | null;
  saleBackgroundColor: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}
