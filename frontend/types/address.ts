export interface PostalAddressLines {
  street: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
}

/**
 * Same postal lines as {@link PostalAddressLines} but nullable — e.g. order shipping snapshot
 * before all fields are known.
 */
export interface PostalAddressLinesNullable {
  street: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
}

export interface UserAddress extends PostalAddressLines {
  id: string;
  userId: string;
  name: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  details: string | null;
  isDefault: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─── Backend API Types (DRF snake_case responses) ────────────────────────────

/**
 * Raw API response from Django/DRF for UserAddress endpoints.
 * Used internally to transform snake_case to camelCase.
 */
export interface UserAddressDRFResponse {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  details: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
