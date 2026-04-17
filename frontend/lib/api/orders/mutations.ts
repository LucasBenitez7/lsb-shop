"use server";

/**
 * Admin order mutations — stubs until Django order admin API is wired.
 */
export async function cancelOrderAdminAction(
  _orderId: string,
): Promise<{ success?: boolean; error?: string }> {
  void _orderId;
  return { error: "Order API not wired yet." };
}

export async function updateFulfillmentStatusAction(
  _orderId: string,
  _status: string,
): Promise<{ success?: boolean; error?: string }> {
  void _orderId;
  void _status;
  return { error: "Order API not wired yet." };
}

export async function rejectReturnAction(
  _orderId: string,
  _reason?: string,
): Promise<{ success?: boolean; error?: string }> {
  void _orderId;
  void _reason;
  return { error: "Order API not wired yet." };
}

export async function processPartialReturnAction(
  _orderId: string,
  _payload: unknown,
  _rejectionNote?: string,
): Promise<{ success?: boolean; error?: string }> {
  void _orderId;
  void _payload;
  void _rejectionNote;
  return { error: "Order API not wired yet." };
}
