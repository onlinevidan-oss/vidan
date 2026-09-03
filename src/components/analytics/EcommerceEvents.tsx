"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsItem } from "@/lib/analytics";

export function ViewItemEvent({
  item,
}: {
  item: AnalyticsItem;
}) {
  useEffect(() => {
    trackEvent("view_item", {
      currency: "MNT",
      value: item.price,
      items: [item],
    });
  }, [item]);
  return null;
}

export function PurchaseEvent({
  transactionId,
  value,
  shipping,
  tax,
  items,
}: {
  transactionId: string;
  value: number;
  shipping: number;
  tax: number;
  items: AnalyticsItem[];
}) {
  useEffect(() => {
    const key = `vidan-ga-purchase:${transactionId}`;
    if (sessionStorage.getItem(key)) return;
    trackEvent("purchase", {
      transaction_id: transactionId,
      value,
      tax,
      shipping,
      currency: "MNT",
      items,
    });
    sessionStorage.setItem(key, "1");
  }, [items, shipping, tax, transactionId, value]);
  return null;
}

export function ViewItemListEvent({
  listId,
  listName,
  items,
}: {
  listId: string;
  listName: string;
  items: AnalyticsItem[];
}) {
  useEffect(() => {
    if (!items.length) return;
    trackEvent("view_item_list", { item_list_id: listId, item_list_name: listName, items });
  }, [items, listId, listName]);
  return null;
}

export function SearchEvent({ term }: { term: string }) {
  useEffect(() => {
    if (term.trim()) trackEvent("search", { search_term: term.trim() });
  }, [term]);
  return null;
}
