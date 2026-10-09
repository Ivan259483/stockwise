/**
 * Content of the StockWise technical documentation, written once and rendered
 * to both Word (.docx) and HTML/PDF by build-docs.mjs.
 *
 * Block types: h1, h2, p, bullets, numbered, table, figure, figureRow, pageBreak.
 * Inline markup: **bold** and *italic*.
 */

export const META = {
  title: "StockWise: Inventory Management System",
  subtitle: "A MERN Stack Web Application for Philippine Micro, Small and Medium Enterprises",
  documentType: "Technical Documentation",
  course: "Integrative Programming and Technologies",
  section: "INF238",
  members: ["Ivan Tadena (Developer)"],
  date: "October 9, 2026",
  liveApp: "https://stockwise-ivan.vercel.app",
  api: "https://stockwise-api-ivan.vercel.app",
  repo: "https://github.com/Ivan259483/stockwise",
};

const shot = (name) => `../docs/screenshots/${name}.png`;

/** Body blocks after the cover page and the table of contents. */
export const BODY = [
  // ------------------------------------------------------------------ 1
  { type: "h1", text: "Project Overview" },
  { type: "h2", text: "Background and Problem" },
  {
    type: "p",
    text: "Micro, small and medium enterprises (MSMEs) account for more than 99 percent of all business establishments in the Philippines, according to the Department of Trade and Industry. Many of them, such as neighborhood hardware stores, sari-sari stores and supply shops, still record their stock in paper logbooks or in loosely maintained spreadsheets.",
  },
  {
    type: "p",
    text: 'Manual record keeping causes recurring problems. Owners discover that an item has run out only when a customer asks for it (stockouts), they reorder items that are already plentiful (overstocking), and items go missing without any record of when or by whom the quantity was changed. Because the records are scattered, the owner also cannot easily answer basic questions such as "How much is my current stock worth?" or "What do I need to reorder this week?"',
  },
  { type: "h2", text: "Proposed Solution" },
  {
    type: "p",
    text: "**StockWise** is a web-based inventory management system built on the MERN stack (MongoDB, Express, React and Node.js). It replaces the logbook with a single, searchable product catalog and records every stock change as a *stock movement* that stores who made the change, when, why, and the quantity before and after it. A dashboard summarizes the total stock value in Philippine pesos, highlights products that are low or out of stock, and charts stock movements over the last seven days.",
  },
  {
    type: "p",
    text: "The system has two roles. An **admin** (typically the store owner) manages products, categories, suppliers and user accounts. A **staff** member can view all inventory data and record stock in and stock out, but cannot change the catalog. StockWise runs in any modern browser on a desktop computer or a mobile phone and is deployed publicly on Vercel with a MongoDB Atlas database.",
  },
  // Starts a new page so Word and Chrome break page 3 identically (keeps TOC numbers in sync).
  { type: "pageBreak" },
  { type: "h2", text: "Live Deliverables" },
  {
    type: "table",
    caption: "Deployed resources",
    widths: [30, 70],
    columns: ["Resource", "URL"],
    rows: [
      ["Web application", META.liveApp],
      ["REST API", META.api],
      ["Source code", META.repo],
      ["Demo admin account", "admin@stockwise.com / Admin123!"],
      ["Demo staff account", "staff@stockwise.com / Staff123!"],
    ],
  },

  // ------------------------------------------------------------------ 2
  { type: "h1", text: "Objectives" },
  {
    type: "p",
    text: "The general objective of the project is to develop a secure, responsive web application that allows a small Philippine retail business to track its inventory accurately and to know what to reorder. The specific, measurable objectives are the following:",
  },
  {
    type: "bullets",
    items: [
      "**Secure access:** require a valid JSON Web Token (JWT) for every endpoint except health, login and registration, and enforce two roles (admin and staff) on both the server and the user interface.",
      "**Complete data management:** provide create, read, update and delete (CRUD) operations for products, categories and suppliers, and user management for administrators, all through a RESTful API.",
      "**Full audit trail:** record every change to a product's stock quantity as a stock movement that stores the previous quantity, the new quantity, the reason and the user who made the change.",
      "**No negative stock:** reject every stock-out request that exceeds the available quantity with HTTP status 409, using an atomic database update so that simultaneous requests cannot push stock below zero.",
      '**Low-stock alerts:** mark a product as "Low stock" when its quantity is at or below its reorder level and as "Out of stock" at zero, and list the five most urgent products on the dashboard.',
      "**Reliable input:** validate every write request on the server with express-validator and every form on the client before submission, and return errors in one consistent format.",
      "**Responsive design:** keep every page usable without horizontal scrolling from a 360-pixel-wide phone screen up to a desktop monitor.",
      "**Verified quality:** pass an automated 40-check API smoke test and a 30-step browser end-to-end test against both the local and the deployed system.",
    ],
  },

  // ------------------------------------------------------------------ 3
  { type: "h1", text: "Scope and Limitations" },
  { type: "h2", text: "Scope" },
  {
    type: "bullets",
    items: [
      "User registration and login with JWT authentication, bcrypt password hashing and two roles (admin and staff).",
      "Management of products, categories and suppliers, including an optional product image of up to 1 MB.",
      "Stock-in and stock-out recording with reasons (for example Purchase, Sale, Damaged or Expired) and a filterable movement history.",
      "A dashboard with summary statistics, a stock-value-by-category bar chart, a seven-day stock movement line chart, a restock list and recent movements.",
      "User administration: changing roles, activating or deactivating accounts, and deleting accounts.",
      "Input validation and error handling on both the client and the server.",
      "A responsive interface for desktop, tablet and mobile browsers.",
    ],
  },
  { type: "h2", text: "Limitations" },
  {
    type: "bullets",
    items: [
      "The system manages a single store. It does not support multiple branches or transfers of stock between locations.",
      "It is not a point-of-sale (POS) system. Sales are recorded as stock-out movements, without receipts, payments or customer records.",
      "Products are identified by SKU text only; barcode and QR code scanning are not supported.",
      "Quantities are whole numbers. Items sold by weight or volume must be tracked in whole units such as kilograms or liters.",
      "Low-stock alerts appear inside the application only; no email or SMS notifications are sent.",
      "Product images are stored inside the database as data URLs and are limited to 1 MB each.",
      "There is no self-service password reset; an administrator must manage accounts.",
      'The free hosting tiers may add a short delay to the first request after a period of inactivity (a serverless "cold start"), and the login rate limit is kept in memory per serverless instance.',
    ],
  },

  // ------------------------------------------------------------------ 4
  { type: "h1", text: "System Architecture" },
  {
    type: "p",
    text: "StockWise follows a three-tier architecture. The presentation tier (React) and the application tier (Express) are deployed as two separate Vercel projects and communicate only through a RESTful JSON API over HTTPS. The data tier is a MongoDB database hosted on MongoDB Atlas. Figure 1 shows the tiers and the path of a request through the API.",
  },
  {
    type: "figure",
    src: "../docs/diagrams/architecture.png",
    width: 5.6,
    caption: "System architecture of StockWise",
  },
  { type: "h2", text: "Presentation Tier (Client)" },
  {
    type: "p",
    text: "The client is a single-page application built with React 19 and Vite and styled with Tailwind CSS. React Router maps each URL to a page, and route guards (ProtectedRoute and AdminRoute) keep signed-out users and staff away from pages they may not use. All server calls go through one Axios instance whose interceptors attach the JWT to every request, show an error notification for every failed request, and end the session automatically when the server answers 401 (Unauthorized). The production build is served as static files by Vercel, and a rewrite rule sends every path to index.html so that deep links such as /products/123 work when the page is refreshed.",
  },
  { type: "h2", text: "Application Tier (REST API)" },
  {
    type: "p",
    text: "The API is an Express 5 application written in Node.js with ES modules. It is organized by responsibility into models, controllers, routes, middleware, validators and utilities. Every request passes through the same pipeline:",
  },
  {
    type: "numbered",
    items: [
      "**Security and parsing middleware:** helmet sets secure HTTP headers, cors allows only the deployed client and localhost, express.json parses the body (up to 5 MB so that images fit), and morgan logs the request.",
      "**Database connection:** the dbConnect middleware opens the MongoDB connection or reuses the one cached on the serverless instance.",
      "**Authentication and authorization:** protect verifies the JWT and reloads the user from the database, so a deactivated user is blocked immediately; authorize then checks the user's role.",
      "**Validation and controller:** express-validator rules check the request, and the controller performs the business logic using Mongoose models.",
      "**Central error handler:** every error is converted into the same JSON shape with an appropriate HTTP status code.",
    ],
  },
  {
    type: "p",
    text: "On Vercel, the Express application is exported from server.js and runs as a serverless function, while app.listen is called only during local development. The Mongoose connection promise is cached across invocations to avoid opening a new connection pool for every request.",
  },
  { type: "h2", text: "Data Tier (Database)" },
  {
    type: "p",
    text: "MongoDB Atlas stores five collections in a database named stockwise. Mongoose schemas define the structure, validation rules, indexes and relationships of the documents, as described in the Database Design section.",
  },
  { type: "h2", text: "REST and JWT Authentication Flow" },
  {
    type: "numbered",
    items: [
      "The user submits the login form. The client sends POST /api/auth/login with the email address and password.",
      "The API finds the user, compares the password with the stored bcrypt hash and, if they match, returns a JWT signed with a secret key that expires after one day, together with the user's profile.",
      'The client stores the token in localStorage, and the Axios interceptor adds the header "Authorization: Bearer <token>" to every later request.',
      "For each protected request, the API verifies the token, loads the user and checks the role. It responds with JSON in the form { success: true, data } on success or { success: false, message, errors } on failure.",
      "If the token is missing, invalid or expired, the API returns 401; the client clears the session and redirects to the login page.",
    ],
  },
  { type: "h2", text: "Stock Integrity" },
  {
    type: "p",
    text: 'A stock-out is performed with a single atomic MongoDB operation that decreases the quantity only if enough stock is available (a findOneAndUpdate with the condition quantity ≥ requested amount). If the condition fails, the API returns 409 (Conflict) with the message "Insufficient stock: only X available". Because the check and the update happen in one database operation, two users recording sales at the same moment can never make the stock negative. Each successful change then writes a stock movement record; if writing the record fails, the quantity change is reversed so that stock levels never change without a matching history entry.',
  },

  // ------------------------------------------------------------------ 5
  { type: "h1", text: "Database Design" },
  {
    type: "p",
    text: "Figures 2 and 3 show the five collections and their relationships. Figure 2 covers the product catalog: products reference their category and, optionally, their supplier. Figure 3 covers the stock history: stock movements reference the product and the user who recorded them, and they also store a copy of the product name and SKU so that the history remains readable after a product is renamed or deleted (Figure 3 repeats only the key fields of products). The constraints of every field are listed in Tables 2 to 6. All collections include automatic createdAt and updatedAt timestamps, which are omitted from the diagrams for clarity.",
  },
  {
    type: "figure",
    src: "../docs/diagrams/erd-1-catalog.png",
    width: 6.0,
    caption: "Entity relationship diagram, part 1: product catalog",
  },
  {
    type: "figure",
    src: "../docs/diagrams/erd-2-stock-history.png",
    width: 6.0,
    caption: "Entity relationship diagram, part 2: stock history",
  },
  {
    type: "bullets",
    items: [
      "**Category to Product (one to many):** a category groups many products; every product must belong to exactly one category. A category that is still in use cannot be deleted.",
      "**Supplier to Product (zero or one to many):** a supplier may supply many products; the supplier is optional. Deleting a supplier removes the reference from its products.",
      "**Product to StockMovement (one to many):** each product has a history of stock movements.",
      "**User to StockMovement (one to many):** each movement records the user who performed it.",
    ],
  },
  {
    type: "table",
    caption: "users collection",
    widths: [20, 17, 33, 30],
    columns: ["Field", "Type", "Constraints", "Description"],
    rows: [
      ["_id", "ObjectId", "Primary key", "Unique identifier"],
      ["name", "String", "Required, max 60 characters", "Full name"],
      ["email", "String", "Required, unique, lowercase, valid format", "Login email address"],
      ["password", "String", "Required, min 8 characters, hidden from queries", "bcrypt hash of the password"],
      ["role", "String", "admin or staff, default staff", "Determines permissions"],
      ["isActive", "Boolean", "Default true", "Inactive users cannot log in"],
      ["createdAt, updatedAt", "Date", "Automatic", "Timestamps"],
    ],
  },
  {
    type: "table",
    caption: "categories collection",
    widths: [20, 17, 33, 30],
    columns: ["Field", "Type", "Constraints", "Description"],
    rows: [
      ["_id", "ObjectId", "Primary key", "Unique identifier"],
      ["name", "String", "Required, unique (case-insensitive), max 50", "Category name, e.g. Plumbing"],
      ["description", "String", "Optional, max 300 characters", "Short description"],
      ["createdAt, updatedAt", "Date", "Automatic", "Timestamps"],
    ],
  },
  {
    type: "table",
    caption: "suppliers collection",
    widths: [20, 17, 33, 30],
    columns: ["Field", "Type", "Constraints", "Description"],
    rows: [
      ["_id", "ObjectId", "Primary key", "Unique identifier"],
      ["name", "String", "Required, max 80 characters", "Supplier business name"],
      ["contactPerson", "String", "Optional", "Name of the contact person"],
      ["phone", "String", "Optional, valid phone format", "Contact number"],
      ["email", "String", "Optional, valid email format", "Contact email address"],
      ["address", "String", "Optional, max 200 characters", "Business address"],
      ["createdAt, updatedAt", "Date", "Automatic", "Timestamps"],
    ],
  },
  {
    type: "table",
    caption: "products collection",
    widths: [20, 17, 33, 30],
    columns: ["Field", "Type", "Constraints", "Description"],
    rows: [
      ["_id", "ObjectId", "Primary key", "Unique identifier"],
      ["name", "String", "Required, max 100 characters; text index", "Product name"],
      ["sku", "String", "Required, unique, uppercase; text index", "Stock keeping unit code"],
      ["category", "ObjectId", "Required, references categories", "Product category"],
      ["supplier", "ObjectId", "Optional, references suppliers", "Usual supplier"],
      ["description", "String", "Optional, max 500 characters", "Product details"],
      ["unit", "String", "pcs, box, kg, L or pack; default pcs", "Unit of measure"],
      ["costPrice", "Number", "≥ 0", "Purchase cost per unit (₱)"],
      ["sellingPrice", "Number", "≥ 0", "Selling price per unit (₱)"],
      ["quantity", "Number", "Integer ≥ 0, default 0", "Units currently in stock"],
      ["reorderLevel", "Number", "Integer ≥ 0, default 10", "Low-stock threshold"],
      ["image", "String", "Optional URL or image data URL ≤ 1 MB", "Product photo"],
      ["stockStatus", "Virtual", "Computed, not stored", "in_stock, low_stock or out_of_stock"],
      ["stockValue", "Virtual", "Computed, not stored", "quantity × costPrice"],
      ["createdAt, updatedAt", "Date", "Automatic", "Timestamps"],
    ],
  },
  {
    type: "table",
    caption: "stockmovements collection",
    widths: [20, 17, 33, 30],
    columns: ["Field", "Type", "Constraints", "Description"],
    rows: [
      ["_id", "ObjectId", "Primary key", "Unique identifier"],
      ["product", "ObjectId", "Required, references products", "Product that changed"],
      ["productName, sku", "String", "Required", "Snapshot kept after deletion"],
      ["type", "String", "IN or OUT", "Direction of the movement"],
      ["quantity", "Number", "Integer > 0", "Units moved"],
      ["previousQty, newQty", "Number", "Required", "Stock before and after"],
      ["reason", "String", "Purchase, Return, Sale, Damaged, Expired, Adjustment or Other", "Why the stock changed"],
      ["note", "String", "Optional, max 300 characters", "Free-text remark"],
      ["performedBy", "ObjectId", "Required, references users", "User who recorded it"],
      ["createdAt, updatedAt", "Date", "Automatic; indexed", "When it happened"],
    ],
  },

  // ------------------------------------------------------------------ 6
  { type: "pageBreak" },
  { type: "h1", text: "User Interface Design" },
  {
    type: "p",
    text: "The interface uses a consistent indigo and slate color palette, rounded cards and clear spacing. Color-coded badges show stock status (green for in stock, amber for low stock and red for out of stock). All screenshots below were captured from the live deployment at a desktop width of 1440 pixels and a mobile width of 390 pixels.",
  },
  {
    type: "figure",
    src: shot("01-login"),
    width: 5.2,
    caption: "Login page",
    text: "The login page has a centered form with inline validation. Demo-account buttons fill in the admin or staff credentials so reviewers can try both roles quickly.",
  },
  {
    type: "figure",
    src: shot("02-register-validation"),
    width: 5.2,
    caption: "Registration form with validation errors",
    text: "Public registration creates staff accounts. Each invalid field shows its own message before any request is sent to the server.",
  },
  {
    type: "figure",
    src: shot("03-dashboard"),
    width: 5.2,
    caption: "Admin dashboard",
    text: "The dashboard shows the total number of products, the total stock value in pesos, and the low-stock and out-of-stock counts. Below them are a bar chart of stock value by category and a line chart comparing units stocked in and out over the last seven days.",
  },
  {
    type: "figure",
    src: shot("03b-dashboard-full"),
    width: 5.2,
    caption: "Dashboard restock list and recent movements",
    text: 'The "Needs restocking" list shows the most urgent products, each with a Restock button that opens the stock-in form for that product. The recent movements panel shows the latest stock changes and who made them.',
  },
  {
    type: "figure",
    src: shot("04-products-desktop"),
    width: 5.2,
    caption: "Products list (desktop)",
    text: "The products page supports search by name or SKU (debounced by 300 ms), filtering by category and stock status, sorting and pagination. Administrators see view, edit and delete actions for each product.",
  },
  {
    type: "figure",
    src: shot("05-products-low-stock-filter"),
    width: 5.2,
    caption: "Products filtered by low stock",
    text: 'Filters are stored in the page address, so the dashboard\'s "Low stock" card links directly to this filtered view.',
  },
  {
    type: "figure",
    src: shot("06-product-form-validation"),
    width: 5.2,
    caption: "Product form with validation errors",
    text: "The product form validates every field before submission and also shows field errors returned by the server, such as a duplicate SKU.",
  },
  {
    type: "figure",
    src: shot("07-product-details"),
    width: 5.2,
    caption: "Product details with movement history",
    text: "The product details page shows the product information, current stock, status, stock value and potential sales, followed by the product's last 20 stock movements.",
  },
  {
    type: "figure",
    src: shot("08-stock-movement-modal"),
    width: 5.2,
    caption: "Stock movement form",
    text: "Stock in and stock out are recorded in a modal dialog with the movement type, quantity, reason and an optional note. The current stock is shown for reference.",
  },
  {
    type: "figure",
    src: shot("09-insufficient-stock"),
    width: 5.2,
    caption: "Insufficient stock error",
    text: "When a stock-out is larger than the available quantity, the API rejects it with status 409. The message appears both as a notification and under the quantity field.",
  },
  {
    type: "figure",
    src: shot("10-stock-movements"),
    width: 5.2,
    caption: "Stock movements history",
    text: "The stock movements page is the complete audit trail. It can be filtered by product, type and date range, and new movements can be recorded from here.",
  },
  {
    type: "figure",
    src: shot("11-categories"),
    width: 5.2,
    caption: "Categories page",
    text: "Categories are listed with the number of products in each. Administrators create and edit categories in a modal form; deleting a category that still has products is refused.",
  },
  {
    type: "figure",
    src: shot("12-suppliers"),
    width: 5.2,
    caption: "Suppliers page",
    text: "The supplier directory shows contact persons, phone numbers, email addresses and the number of products each supplier provides.",
  },
  {
    type: "figure",
    src: shot("13-users"),
    width: 5.2,
    caption: "User management (admin only)",
    text: "Administrators can change roles, activate or deactivate accounts and delete users. The controls for the administrator's own account are disabled to prevent accidental lock-out.",
  },
  {
    type: "figure",
    src: shot("14-products-staff-view"),
    width: 5.2,
    caption: "Products page as seen by staff",
    text: "Staff users see the same inventory data, but the Users link and all product editing actions are hidden. The API enforces the same restrictions.",
  },
  {
    type: "figureRow",
    width: 2.0,
    items: [
      { src: shot("15-dashboard-mobile"), caption: "Dashboard on a phone" },
      { src: shot("16-products-mobile"), caption: "Products as mobile cards" },
      { src: shot("17-navigation-drawer-mobile"), caption: "Navigation drawer" },
    ],
    text: "On small screens the sidebar becomes a drawer opened from the menu button, stat cards stack vertically, and tables are replaced by easy-to-read cards.",
  },

  // ------------------------------------------------------------------ 7
  { type: "pageBreak" },
  { type: "h1", text: "Feature List" },
  { type: "h2", text: "Authentication and Roles" },
  {
    type: "bullets",
    items: [
      "Registration of staff accounts and login with JSON Web Tokens that expire after one day.",
      "Passwords hashed with bcrypt and never returned by the API.",
      "Rate limiting of failed login and registration attempts (20 per 15 minutes per IP address).",
      "Two roles: admins manage everything; staff view inventory and record stock movements.",
      "Protected and admin-only routes in the client; automatic logout when the session expires.",
    ],
  },
  { type: "h2", text: "Dashboard" },
  {
    type: "bullets",
    items: [
      "Statistic cards: total products and units, total stock value in pesos, low-stock count and out-of-stock count.",
      "Bar chart of stock value by category and line chart of units stocked in and out over the last seven days.",
      "Restock list of the five most urgent products with a one-click Restock action.",
      "List of the five most recent stock movements.",
    ],
  },
  { type: "h2", text: "Products" },
  {
    type: "bullets",
    items: [
      "Search by name or SKU with a 300 ms debounce, filters by category and stock status, sorting and pagination.",
      "Table layout on desktop and card layout on mobile, with color-coded status badges.",
      "Create, edit and delete products (admin), with category and supplier selection and an optional image of up to 1 MB with preview.",
      "Opening stock recorded automatically as the first stock movement.",
      "Product details page with stock value, potential sales and the last 20 movements.",
    ],
  },
  { type: "h2", text: "Categories" },
  {
    type: "bullets",
    items: [
      "List of categories with the number of products in each.",
      "Create and edit categories in a modal form (admin); names are unique regardless of letter case.",
      "Deletion is blocked with a clear message while products still use the category.",
    ],
  },
  { type: "h2", text: "Suppliers" },
  {
    type: "bullets",
    items: [
      "Supplier directory with contact person, phone, email, address and product count.",
      "Create, edit and delete suppliers (admin); deleting a supplier removes it from its products.",
    ],
  },
  { type: "h2", text: "Stock Movements" },
  {
    type: "bullets",
    items: [
      "Stock in (Purchase, Return, Adjustment, Other) and stock out (Sale, Damaged, Expired, Adjustment, Other) for both roles.",
      'Atomic updates that never allow negative stock; oversized stock-outs return "Insufficient stock: only X available".',
      "Complete history with previous and new quantities, filterable by product, type and date range, with pagination.",
    ],
  },
  { type: "h2", text: "Users" },
  {
    type: "bullets",
    items: [
      "List of all accounts with role selection, an active/inactive switch and deletion (admin only).",
      "Administrators cannot demote, deactivate or delete their own account.",
    ],
  },
  { type: "h2", text: "Validation and Error Handling" },
  {
    type: "bullets",
    items: [
      "express-validator rules on every write endpoint and matching client-side validation on every form.",
      "One central error handler that returns { success: false, message, errors } with field-level details.",
      "Correct status codes: 400 for invalid input or IDs, 401 for missing or invalid tokens, 403 for forbidden roles, 404 for unknown resources or routes, 409 for duplicates and insufficient stock, and 500 for unexpected errors, whose details are logged only on the server.",
      "Inline field errors, a notification for every failed request, and loading states that disable buttons while a request is in progress.",
    ],
  },
  { type: "h2", text: "Responsive Design" },
  {
    type: "bullets",
    items: [
      "No horizontal scrolling on any page, verified at widths of 360, 375 and 390 pixels and on desktop screens.",
      "Collapsible navigation drawer, stacked cards on mobile, and accessible labels on all form controls.",
      "Loading, empty and error states on every list.",
    ],
  },
  { type: "h2", text: "API Endpoints" },
  {
    type: "table",
    caption: "REST API endpoints (base path /api)",
    widths: [12, 33, 18, 37],
    columns: ["Method", "Endpoint", "Access", "Purpose"],
    rows: [
      ["GET", "/api/health", "Public", "Health check"],
      ["POST", "/api/auth/register", "Public", "Create a staff account"],
      ["POST", "/api/auth/login", "Public", "Log in and receive a JWT"],
      ["GET", "/api/auth/me", "Logged in", "Current user"],
      ["GET", "/api/users", "Admin", "List users"],
      ["PATCH", "/api/users/:id", "Admin", "Change role or active status"],
      ["DELETE", "/api/users/:id", "Admin", "Delete a user"],
      ["GET", "/api/categories", "Logged in", "List categories with product counts"],
      ["POST", "/api/categories", "Admin", "Create a category"],
      ["PUT", "/api/categories/:id", "Admin", "Update a category"],
      ["DELETE", "/api/categories/:id", "Admin", "Delete an unused category"],
      ["GET", "/api/suppliers", "Logged in", "List suppliers"],
      ["POST", "/api/suppliers", "Admin", "Create a supplier"],
      ["PUT", "/api/suppliers/:id", "Admin", "Update a supplier"],
      ["DELETE", "/api/suppliers/:id", "Admin", "Delete a supplier"],
      ["GET", "/api/products", "Logged in", "Search, filter, sort and paginate products"],
      ["GET", "/api/products/:id", "Logged in", "Product details and last 20 movements"],
      ["POST", "/api/products", "Admin", "Create a product"],
      ["PUT", "/api/products/:id", "Admin", "Update a product"],
      ["DELETE", "/api/products/:id", "Admin", "Delete a product"],
      ["POST", "/api/stock/in", "Logged in", "Record a stock-in movement"],
      ["POST", "/api/stock/out", "Logged in", "Record a stock-out movement"],
      ["GET", "/api/stock/movements", "Logged in", "Filtered movement history"],
      ["GET", "/api/dashboard/summary", "Logged in", "Dashboard statistics and charts"],
    ],
  },

  // ------------------------------------------------------------------ 8
  { type: "pageBreak" },
  { type: "h1", text: "Summary and Future Work" },
  { type: "h2", text: "Summary" },
  {
    type: "p",
    text: "StockWise demonstrates how the MERN stack can solve a common problem of Philippine MSMEs: inaccurate, untraceable inventory records. The application integrates a React client with an Express REST API and a MongoDB Atlas database, and it covers the core concepts of the course, namely authentication, CRUD operations, database management, API integration, input validation, error handling and responsive user interface design.",
  },
  {
    type: "p",
    text: "The code is modular and documented. The server separates models, controllers, routes, middleware and validators, and the client is built from reusable components and custom hooks. ESLint and Prettier enforce consistent coding standards.",
  },
  { type: "h2", text: "Testing and Verification" },
  {
    type: "bullets",
    items: [
      "**API smoke test:** 40 automated checks covering login, CRUD for products, categories and suppliers, stock in and out, insufficient stock (409), invalid IDs (400), staff access to admin routes (403), missing tokens (401) and duplicate SKUs (409). All 40 checks passed against both the local and the deployed API.",
      "**Browser end-to-end test:** 30 automated steps in headless Chrome for both roles, covering validation errors, product CRUD, stock movements, the insufficient-stock error, the 375-pixel mobile layout, refreshing a nested route and session expiry. All 30 steps passed on the live site.",
      "**Code quality:** the client builds without warnings and both projects pass ESLint with no errors.",
    ],
  },
  { type: "h2", text: "Future Work" },
  {
    type: "bullets",
    items: [
      "**Barcode and QR code scanning** with the phone camera to find products and record movements faster.",
      "**Purchase orders** that are created from the restock list and update stock automatically when the goods arrive.",
      "**Multi-branch support** with separate stock levels per branch and transfers between branches.",
      "**Sales and POS integration** so that each sale automatically records a stock-out with receipt details.",
      "**CSV and PDF reports** of inventory valuation, movement history and low-stock items.",
      "**Email low-stock alerts** sent to the owner when a product reaches its reorder level.",
    ],
  },

  // ------------------------------------------------------------------ 9
  { type: "pageBreak" },
  { type: "h1", text: "Sources" },
  { type: "h2", text: "Frameworks, Libraries and Services" },
  {
    type: "numbered",
    items: [
      "Node.js. (n.d.). *Node.js documentation*. https://nodejs.org/",
      "Express. (n.d.). *Express: Fast, unopinionated, minimalist web framework for Node.js*. https://expressjs.com/",
      "MongoDB, Inc. (n.d.). *MongoDB Atlas*. https://www.mongodb.com/atlas",
      "Mongoose. (n.d.). *Mongoose ODM documentation*. https://mongoosejs.com/",
      "Meta Open Source. (n.d.). *React*. https://react.dev/",
      "Vite. (n.d.). *Vite: Next generation frontend tooling*. https://vite.dev/",
      "Tailwind Labs. (n.d.). *Tailwind CSS*. https://tailwindcss.com/",
      "Remix Software. (n.d.). *React Router*. https://reactrouter.com/",
      "Axios. (n.d.). *Axios: Promise based HTTP client*. https://axios-http.com/",
      "Recharts. (n.d.). *Recharts: A composable charting library built on React components*. https://recharts.org/",
      "react-hot-toast. (n.d.). *Smoking hot React notifications*. https://react-hot-toast.com/",
      "Lucide. (n.d.). *Lucide icons*. https://lucide.dev/",
      "Auth0. (n.d.). *jsonwebtoken*. https://github.com/auth0/node-jsonwebtoken",
      "bcrypt.js. (n.d.). *Optimized bcrypt in JavaScript*. https://github.com/dcodeIO/bcrypt.js",
      "express-validator. (n.d.). *express-validator documentation*. https://express-validator.github.io/",
      "Helmet. (n.d.). *Helmet: Secure Express apps with HTTP headers*. https://helmetjs.github.io/",
      "Express. (n.d.). *cors middleware*. https://github.com/expressjs/cors",
      "Express. (n.d.). *morgan HTTP request logger*. https://github.com/expressjs/morgan",
      "express-rate-limit. (n.d.). *Basic rate-limiting middleware for Express*. https://github.com/express-rate-limit/express-rate-limit",
      "dotenv. (n.d.). *Loads environment variables from a .env file*. https://github.com/motdotla/dotenv",
      "Vercel. (n.d.). *Express on Vercel*. https://vercel.com/docs/frameworks/backend/express",
      "Vercel. (n.d.). *Configuring projects with vercel.json*. https://vercel.com/docs/project-configuration/vercel-json",
      "Puppeteer. (n.d.). *Puppeteer documentation*. https://pptr.dev/",
      "Mermaid. (n.d.). *Diagramming and charting tool*. https://mermaid.js.org/",
      "docx. (n.d.). *Generate .docx files with JavaScript*. https://docx.js.org/",
      "OpenJS Foundation. (n.d.). *ESLint: Find and fix problems in your JavaScript code*. https://eslint.org/",
      "Prettier. (n.d.). *Prettier: An opinionated code formatter*. https://prettier.io/",
    ],
  },
  { type: "h2", text: "References" },
  {
    type: "numbered",
    start: 28,
    items: [
      "Department of Trade and Industry. (n.d.). *MSME statistics*. https://www.dti.gov.ph/resources/msme-statistics/",
      "Jones, M., Bradley, J., & Sakimura, N. (2015). *JSON Web Token (JWT)* (RFC 7519). Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc7519",
      "MDN Web Docs. (n.d.). *HTTP response status codes*. https://developer.mozilla.org/en-US/docs/Web/HTTP/Status",
      "OWASP Foundation. (n.d.). *Password storage cheat sheet*. https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
      "MongoDB, Inc. (n.d.). *Atomicity and transactions*. https://www.mongodb.com/docs/manual/core/write-operations-atomicity/",
    ],
  },
];
