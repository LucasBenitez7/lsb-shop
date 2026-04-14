export interface UserAddress {
  id: string;
  userId: string;
  name: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  details: string | null;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  isDefault: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}
