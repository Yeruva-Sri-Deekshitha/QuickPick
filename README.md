# 🛍️ QuickPick – Last-Minute Local Food Deals App


QuickPick is a mobile-first marketplace that helps **local vendors sell last-minute food deals** to nearby **buyers**, reducing food waste while supporting small businesses.

Built with **React Native (Expo)** and **Supabase**, the app connects people in real-time based on geo-location and time-sensitive offers.

---

[![Watch the video](https://img.youtube.com/vi/9K6QiIw5fTA/maxresdefault.jpg)](https://youtu.be/9K6QiIw5fTA?si=Wz5AzmqX0k65D7s6)


## 🚀 Key Features

### 👤 Roles

**Buyers:**
- Discover real-time food deals posted nearby
- View deal details, price comparisons, and vendor info
- Call vendors or open their profile to get directions

**Vendors:**
- Post last-minute food deals with images, discounts, expiry
- View and manage active  deals from their dashboard
- Update deal quantities and status (active/sold/expired) instantly


---

## 📲 App Flow

1. **Onboarding**  
   - Choose role (Buyer or Vendor)
   - Provide the details to register
   - Profile setup (Vendor fills shop details)

2. **Authentication**  
   - OTP-based login with Supabase Auth

3. **Buyers Experience**
   - See list of deals nearby (sorted by distance and time)
   - Tap on a deal to view full details
   - Contact the vendor or visit location

4. **Vendors Experience**
   - Create deal: upload image, price, expiry, item
   - Auto-calculates discount
   - Manage current and expired deals

---

## 🧱 Tech Stack

| Layer     | Tech                         |
|-----------|------------------------------|
| Frontend  | React Native (Expo)          |
| Backend   | Supabase (PostgreSQL + Auth) |
| Auth      | Supabase Auth (OTP Login)    |
| DB        | Supabase Tables + RPC        |
| Geo       | PostGIS for nearby queries   |
| UI Icons  | lucide-react-native          |
| Location  | Expo Location API (planned)  |

---

## 📁 Project Structure

```bash
QuickPick/
├── app/                     # Screens & navigation
├── components/              # Reusable UI components
├── services/                # Supabase calls & logic
├── contexts/                # Auth & role providers
├── lib/                     # Supabase client, helpers
├── assets/                  # Images, logo
├── .env                     # Supabase keys
├── .gitignore
├── app.json / package.json
└── README.md
```

---

## ⚙️ Setup Instructions

### 1. Clone the Repo

```bash
git clone https://github.com/Yeruva-Sri-Deekshitha/QuickPick.git
cd QuickPick
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

Find these in Supabase Dashboard → Project Settings → API.

### 4. Start Development Server

```bash
npx expo start
```

Scan the QR from your phone (Expo Go app) to open the app.

---

## 🗄️ Supabase Database Schema

### Tables

- **users**
  - `id`,`name`, `email`, `role` (buyer/vendor)

- **vendor_profile**
  - `user_id`, `full_name`, `vendor_type`, `shop_name`, `latitude`, `longitude`, `location_name`, `phone_number`

- **deals**
  - `id`, `vendor_id`, `item_name`, `quantity`, `discount_percent`, `original_price`, `discounted_price`, `expiry_time`, `image_url`, `status`, `deal_title`, etc..
- **buyer_profile**
   - `id`, `user_id`, `full_name`, `latitude`, `longitude`.

### RPC Function

```sql
get_nearby_deals(latitude, longitude, radius)
```

Used to query nearby active deals using `ST_DWithin` from PostGIS.

---

## 🧪 Testing Guide

To simulate the full app experience:

1. Register as a **Vendor**
   - Post a deal with expiry and location

2. Register as a **Buyer**
   - View posted deal
   - Open deal → contact vendor → track expiry

3. Try actions like:
   - Deleting deal
   - Updating status (Sold/Expired)
   - Real-time updates using Supabase channels

---

## 📦 Git Commands for Deployment

```bash
# Track local files
git init

# Add your remote repo
git remote add origin https://github.com/YOUR_USERNAME/QuickPick.git

# Add files and commit
git add .
git commit -m "Initial commit with working app"

# Push to GitHub
git push -u origin main
```

---

## 📌 Future Roadmap

- 🔔 Push notifications
- 📍 Map view of deals
- 📊 Analytics for vendors
- 💬 Chat system between buyer & vendor
- 🧾 Order reservations and deal claiming
- 📷 Vendor profile photos & reviews

---

## 📝 .gitignore Sample

```
node_modules/
.env
.expo/
.DS_Store
npm-debug.log
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit changes:
   ```bash
   git commit -m "Add new feature"
   ```
4. Push and create Pull Request
