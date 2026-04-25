/**
 * Must match Django `apps.users.constants.GUEST_SESSION_COOKIE` (`lsb_guest_session`).
 * Set after successful guest OTP verify; forwarded to the API for guest order access.
 */
export const GUEST_SESSION_COOKIE_NAME = "lsb_guest_session";
