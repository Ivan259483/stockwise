import { ArrowLeftRight, LayoutDashboard, Package, Tags, Truck, Users } from "lucide-react";

/**
 * Sidebar links. `adminOnly` links are hidden from staff (the routes are also
 * guarded by AdminRoute and the API, so hiding is purely for a cleaner UI).
 */
export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/movements", label: "Stock Movements", icon: ArrowLeftRight },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/users", label: "Users", icon: Users, adminOnly: true },
];
