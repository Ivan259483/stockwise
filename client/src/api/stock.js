import api from "./client";

/**
 * Records a stock movement.
 * @param {"IN"|"OUT"} type
 * @param {{ productId: string, quantity: number, reason: string, note?: string }} data
 */
export const recordMovement = (type, data) =>
  api.post(type === "IN" ? "/stock/in" : "/stock/out", data).then((res) => res.data);

/** @param {{ product?: string, type?: string, from?: string, to?: string, page?: number, limit?: number }} params */
export const getMovements = (params) => api.get("/stock/movements", { params }).then((res) => res.data);
