export function squareBaseUrl(environment: string) {
  return environment === "production"
    ? "https://connect.squareup.com/v2"
    : "https://connect.squareupsandbox.com/v2";
}

export function bookingNote(bookingId: string) {
  return `booking:${bookingId}`;
}

type SquareFetchOptions = {
  token: string;
  environment: string;
  path: string;
  method?: string;
  body?: unknown;
};

async function squareFetch({ token, environment, path, method = "GET", body }: SquareFetchOptions) {
  const response = await fetch(`${squareBaseUrl(environment)}${path}`, {
    method,
    headers: {
      "Square-Version": "2024-11-20",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      payload?.errors?.[0]?.detail ||
      payload?.errors?.[0]?.code ||
      `Square API error (${response.status})`;
    throw new Error(String(detail));
  }
  return payload;
}

export function isPaidSquareStatus(status?: string | null) {
  const normalized = String(status || "").toUpperCase();
  return normalized === "COMPLETED" || normalized === "APPROVED";
}

export async function verifySquarePaymentForBooking(
  bookingId: string,
  squareOrderId: string | null | undefined,
  expectedAmountCents: number,
  token: string,
  environment: string
) {
  if (squareOrderId) {
    const orderPayload = await squareFetch({
      token,
      environment,
      path: `/orders/${squareOrderId}`,
    });
    const order = orderPayload?.order;
    if (!order) {
      throw new Error("Square order not found");
    }

    const orderState = String(order.state || "").toUpperCase();
    if (orderState === "COMPLETED") {
      const paidCents = Number(order.total_money?.amount || 0);
      if (paidCents >= expectedAmountCents) {
        return {
          verified: true,
          paymentId: order.tenders?.[0]?.payment_id ? String(order.tenders[0].payment_id) : null,
          orderId: squareOrderId,
        };
      }
      throw new Error("Payment amount does not match booking total");
    }

    if (orderState === "CANCELED") {
      throw new Error("Square order was canceled");
    }
  }

  const searchPayload = await squareFetch({
    token,
    environment,
    path: "/payments/search",
    method: "POST",
    body: {
      query: {
        filter: {
          note: {
            exact: bookingNote(bookingId),
          },
        },
      },
      sort: {
        sort_field: "CREATED_AT",
        sort_order: "DESC",
      },
    },
  });

  const payments = searchPayload?.payments || [];
  const paid = payments.find((payment: Record<string, unknown>) =>
    isPaidSquareStatus(String(payment.status || ""))
  );

  if (!paid) {
    throw new Error("No completed Square payment found for this booking yet");
  }

  const paidCents = Number(paid.amount_money?.amount || 0);
  if (paidCents < expectedAmountCents) {
    throw new Error("Payment amount does not match booking total");
  }

  return {
    verified: true,
    paymentId: paid.id ? String(paid.id) : null,
    orderId: paid.order_id ? String(paid.order_id) : squareOrderId || null,
  };
}
