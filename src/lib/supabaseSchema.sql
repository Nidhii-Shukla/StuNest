-- ============================================================
-- StuNest - Hostel Discovery Platform - Supabase Schema
-- Run this in Supabase SQL Editor to set up the full backend
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COLLEGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS colleges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  city TEXT DEFAULT 'Hyderabad',
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'owner', 'admin')),
  avatar_url TEXT,
  college_id UUID REFERENCES colleges(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOSTELS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS hostels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  address TEXT NOT NULL,
  city TEXT DEFAULT 'Hyderabad',
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  price INTEGER NOT NULL CHECK (price > 0),
  category TEXT NOT NULL CHECK (category IN ('boys', 'girls', 'both')),
  type TEXT NOT NULL CHECK (type IN ('hostel', 'pg')),
  description TEXT,
  phone TEXT,
  whatsapp TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected', 'inactive')),
  facilities TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  rating DECIMAL(2, 1) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  mess_rating DECIMAL(2, 1) DEFAULT 0.0,
  vacancy_count INTEGER DEFAULT 0,
  total_rooms INTEGER DEFAULT 0,
  deposit_amount INTEGER DEFAULT 0,
  notice_period_days INTEGER DEFAULT 30,
  featured_bid INTEGER DEFAULT 0,
  featured_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOSTEL_COLLEGES (many-to-many: a hostel can be near multiple colleges)
-- ============================================================
CREATE TABLE IF NOT EXISTS hostel_colleges (
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
  distance_km DECIMAL(5, 2),
  walk_minutes INTEGER,
  PRIMARY KEY (hostel_id, college_id)
);

-- ============================================================
-- ROOM TYPES (per hostel)
-- ============================================================
CREATE TABLE IF NOT EXISTS room_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- e.g. 'Single AC', 'Double Non-AC', 'Triple'
  price INTEGER NOT NULL,
  capacity INTEGER DEFAULT 1,
  available INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  amenities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  mess_rating INTEGER CHECK (mess_rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  pros TEXT[],
  cons TEXT[],
  is_verified BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENQUIRIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  student_name TEXT,
  student_phone TEXT,
  student_college TEXT,
  message TEXT NOT NULL,
  move_in_date DATE,
  room_type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS (token bookings with escrow)
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
  token_amount INTEGER DEFAULT 200,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled_by_student', 'cancelled_by_owner', 'completed')),
  move_in_date DATE,
  payment_id TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FOOD MENU TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS food_menus (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  items TEXT[] NOT NULL,
  is_vegetarian BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hostel_id, day_of_week, meal_type)
);

-- ============================================================
-- PRICE ALERTS (smart price alerts feature)
-- ============================================================
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  college_id UUID REFERENCES colleges(id),
  category TEXT CHECK (category IN ('boys', 'girls', 'both')),
  max_price INTEGER NOT NULL,
  facilities TEXT[] DEFAULT '{}',
  whatsapp TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOSTEL COMPARISONS (save compare sets)
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_compares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  hostel_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SHORTLISTS (saved/favorited hostels)
-- ============================================================
CREATE TABLE IF NOT EXISTS shortlists (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, hostel_id)
);

-- ============================================================
-- GRIEVANCES (complaint tracking portal - Feature #25)
-- ============================================================
CREATE TABLE IF NOT EXISTS grievances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('maintenance', 'food', 'cleanliness', 'security', 'staff', 'water', 'electricity', 'internet', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMUNITY Q&A (Feature #16)
-- ============================================================
CREATE TABLE IF NOT EXISTS hostel_qa (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  question_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  answered_at TIMESTAMPTZ,
  is_verified_resident BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESIDENT PHOTOS (Feature #24)
-- ============================================================
CREATE TABLE IF NOT EXISTS resident_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REFERRALS (Feature #23)
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  hostel_id UUID REFERENCES hostels(id) ON DELETE SET NULL,
  reward_amount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (referrer_id, referred_id)
);

-- ============================================================
-- VERIFICATION BADGES (Feature #02)
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_inspections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  inspector_name TEXT NOT NULL,
  inspection_date DATE DEFAULT CURRENT_DATE,
  checklist JSONB,  -- { cleanliness: true, security: true, facilities: true, ... }
  notes TEXT,
  badge_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAGE VIEWS / ANALYTICS (Feature #12)
-- ============================================================
CREATE TABLE IF NOT EXISTS hostel_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  viewer_college TEXT,
  device_type TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEASONAL PRICING (Feature #17)
-- ============================================================
CREATE TABLE IF NOT EXISTS seasonal_pricing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  season_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROOMMATE PROFILES (Feature #04)
-- ============================================================
CREATE TABLE IF NOT EXISTS roommate_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  hostel_id UUID REFERENCES hostels(id) ON DELETE SET NULL,
  branch TEXT,
  year_of_study INTEGER,
  sleep_schedule TEXT CHECK (sleep_schedule IN ('early_bird', 'night_owl', 'flexible')),
  study_habits TEXT CHECK (study_habits IN ('silent', 'music', 'group_study', 'flexible')),
  dietary_pref TEXT CHECK (dietary_pref IN ('veg', 'non_veg', 'vegan', 'any')),
  hobbies TEXT[],
  bio TEXT,
  is_looking BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMERGENCY CONTACTS (Feature #22)
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
  warden_name TEXT,
  warden_phone TEXT,
  nearest_hospital TEXT,
  hospital_phone TEXT,
  hospital_distance_km DECIMAL(4, 1),
  police_station TEXT,
  police_phone TEXT,
  ambulance_phone TEXT DEFAULT '108',
  fire_station_phone TEXT DEFAULT '101',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hostel_id)
);

-- ============================================================
-- MOVE-IN CHECKLIST (Feature #21)
-- ============================================================
CREATE TABLE IF NOT EXISTS movein_checklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  documents_checklist JSONB,
  items_checklist JSONB,
  questions_checklist JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA: Colleges (Fixed UUIDs for relations)
-- ============================================================
INSERT INTO colleges (id, name, short_name, city, lat, lng) VALUES
  ('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 'CMRIT Hyderabad', 'CMRIT', 'Hyderabad', 17.6041, 78.4866),
  ('c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2', 'JNTUH College of Engineering', 'JNTUH', 'Hyderabad', 17.4933, 78.3914),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'CBIT Hyderabad', 'CBIT', 'Hyderabad', 17.3916, 78.3193),
  ('c4c4c4c4-c4c4-c4c4-c4c4-c4c4c4c4c4c4', 'MLRIT Dundigal', 'MLRIT', 'Hyderabad', 17.5878, 78.4326),
  ('c5c5c5c5-c5c5-c5c5-c5c5-c5c5c5c5c5c5', 'VNR VJIET', 'VNR', 'Hyderabad', 17.5385, 78.3854),
  ('c6c6c6c6-c6c6-c6c6-c6c6-c6c6c6c6c6c6', 'IIIT Hyderabad', 'IIIT-H', 'Hyderabad', 17.4452, 78.3489),
  ('c7c7c7c7-c7c7-c7c7-c7c7-c7c7c7c7c7c7', 'Osmania University', 'OU', 'Hyderabad', 17.4127, 78.5188),
  ('c8c8c8c8-c8c8-c8c8-c8c8-c8c8c8c8c8c8', 'BITS Pilani Hyderabad', 'BITS', 'Hyderabad', 17.5449, 78.5719)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  city = EXCLUDED.city,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng;

-- ============================================================
-- SEED DATA: Hostels
-- ============================================================
INSERT INTO hostels (id, name, address, price, category, type, rating, review_count, is_premium, is_verified, status, phone, vacancy_count, facilities, images, lat, lng, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sunrise Premium Boys Hostel', 'Near JNTUH, Kukatpally', 8500, 'boys', 'hostel', 4.8, 124, true, true, 'active', '+91 98765 43210', 3, ARRAY['ac', 'wifi', 'food', 'laundry', 'security', 'gym'], ARRAY['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1200','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200','https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200'], 17.4910, 78.3930, 'Sunrise Premium Boys Hostel offers a modern and comfortable living experience for B.Tech and engineering students. Located just 0.5 km from JNTUH, the hostel provides fully furnished rooms with high-speed Wi-Fi, 3 meals a day, 24/7 security, and a dedicated study room.'),
  ('22222222-2222-2222-2222-222222222222', 'Cozy Living PG for Girls', 'KPHB Colony, Near JNTUH', 6000, 'girls', 'pg', 4.2, 89, false, true, 'active', '+91 91234 56789', 2, ARRAY['wifi', 'food', 'security', 'study table'], ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200','https://images.unsplash.com/photo-1502672260266-1c1de2d96674?q=80&w=1200'], 17.4850, 78.3900, 'A safe, hygienic, and comfortable PG exclusively for girls with strict security protocols and CCTV surveillance.'),
  ('33333333-3333-3333-3333-333333333333', 'Elite Unisex Co-living', 'Gachibowli, Near CBIT', 12000, 'both', 'hostel', 4.9, 210, true, true, 'active', '+91 99887 76655', 0, ARRAY['ac', 'wifi', 'food', 'laundry', 'security', 'parking', 'pool'], ARRAY['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200','https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=1200'], 17.4200, 78.3400, 'Premium co-living with rooftop pool, world-class gym, and fully air-conditioned rooms.'),
  ('44444444-4444-4444-4444-444444444444', 'Student Nest PG', 'Gandipet, Near CBIT', 5500, 'boys', 'pg', 3.9, 45, false, false, 'active', '+91 98000 11111', 5, ARRAY['wifi', 'food', 'study table'], ARRAY['https://images.unsplash.com/photo-1502672260266-1c1de2d96674?q=80&w=1200'], 17.3850, 78.3250, 'Budget-friendly PG for boys near CBIT with essential amenities.'),
  ('55555555-5555-5555-5555-555555555555', 'Royal Heritage Girls Hostel', 'Kompally, Near CMRIT', 15000, 'girls', 'hostel', 4.7, 320, true, true, 'active', '+91 98001 12345', 1, ARRAY['ac', 'wifi', 'food', 'laundry', 'security', 'gym', 'library'], ARRAY['https://images.unsplash.com/photo-1596276020587-804acfc1a329?q=80&w=1200','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200'], 17.6000, 78.4900, 'Our most prestigious property with personal library, gym, and 24-hour trained security exclusively for girls.'),
  ('66666666-6666-6666-6666-666666666666', 'Budget Boys PG', 'Medchal, Near CMRIT', 4500, 'boys', 'pg', 3.5, 67, false, false, 'active', '+91 97000 22222', 8, ARRAY['wifi'], ARRAY['https://images.unsplash.com/photo-1502672023488-70e25813eb80?q=80&w=1200'], 17.6100, 78.4800, 'Most affordable PG option for boys near CMRIT campus.'),
  ('77777777-7777-7777-7777-777777777777', 'Green View Co-living', 'Dundigal, Near MLRIT', 10500, 'both', 'pg', 4.5, 156, true, true, 'active', '+91 97654 32109', 4, ARRAY['ac', 'wifi', 'food', 'security', 'balcony'], ARRAY['https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=1200'], 17.5800, 78.4350, 'Lush green campus environment with private balconies and fully air-conditioned rooms.'),
  ('88888888-8888-8888-8888-888888888888', 'Safe Haven Girls PG', 'Bachupally, Near VNR', 7500, 'girls', 'pg', 4.1, 92, false, true, 'active', '+91 96000 33333', 3, ARRAY['wifi', 'food', 'laundry', 'security'], ARRAY['https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200'], 17.5450, 78.3800, 'Safe, clean PG for girls with 24/7 CCTV and female warden.')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  type = EXCLUDED.type,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  is_premium = EXCLUDED.is_premium,
  is_verified = EXCLUDED.is_verified,
  status = EXCLUDED.status,
  phone = EXCLUDED.phone,
  vacancy_count = EXCLUDED.vacancy_count,
  facilities = EXCLUDED.facilities,
  images = EXCLUDED.images,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  description = EXCLUDED.description;

-- ============================================================
-- SEED DATA: Hostel-College Junction Map
-- ============================================================
INSERT INTO hostel_colleges (hostel_id, college_id, distance_km, walk_minutes) VALUES
  ('11111111-1111-1111-1111-111111111111', 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2', 0.5, 6),
  ('22222222-2222-2222-2222-222222222222', 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2', 1.2, 14),
  ('33333333-3333-3333-3333-333333333333', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 2.0, 24),
  ('44444444-4444-4444-4444-444444444444', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 0.8, 9),
  ('55555555-5555-5555-5555-555555555555', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 0.2, 2),
  ('66666666-6666-6666-6666-666666666666', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 1.5, 18),
  ('77777777-7777-7777-7777-777777777777', 'c4c4c4c4-c4c4-c4c4-c4c4-c4c4c4c4c4c4', 0.3, 3),
  ('88888888-8888-8888-8888-888888888888', 'c5c5c5c5-c5c5-c5c5-c5c5-c5c5c5c5c5c5', 0.9, 10)
ON CONFLICT (hostel_id, college_id) DO UPDATE SET
  distance_km = EXCLUDED.distance_km,
  walk_minutes = EXCLUDED.walk_minutes;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE roommate_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to allow clean rerun migrations
DROP POLICY IF EXISTS "Public profiles viewable" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;

DROP POLICY IF EXISTS "Active hostels are public" ON hostels;
DROP POLICY IF EXISTS "Owners can insert hostels" ON hostels;
DROP POLICY IF EXISTS "Owners can update own hostels" ON hostels;

DROP POLICY IF EXISTS "Reviews are public" ON reviews;
DROP POLICY IF EXISTS "Auth users can review" ON reviews;

DROP POLICY IF EXISTS "Students see own enquiries" ON enquiries;
DROP POLICY IF EXISTS "Students insert enquiries" ON enquiries;

DROP POLICY IF EXISTS "Users see own bookings" ON bookings;
DROP POLICY IF EXISTS "Users insert bookings" ON bookings;

DROP POLICY IF EXISTS "Users manage own shortlist" ON shortlists;

DROP POLICY IF EXISTS "Grievances are public" ON grievances;
DROP POLICY IF EXISTS "Auth users file grievances" ON grievances;

DROP POLICY IF EXISTS "Users manage price alerts" ON price_alerts;

DROP POLICY IF EXISTS "Public roommate profiles are viewable" ON roommate_profiles;
DROP POLICY IF EXISTS "Users manage own roommate profile" ON roommate_profiles;

-- Profiles: users can read all, update own
CREATE POLICY "Public profiles viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Hostels: everyone can read active, owners can update theirs
CREATE POLICY "Active hostels are public" ON hostels FOR SELECT USING (status = 'active' OR auth.uid() = owner_id);
CREATE POLICY "Owners can insert hostels" ON hostels FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own hostels" ON hostels FOR UPDATE USING (auth.uid() = owner_id);

-- Reviews: public read, authenticated insert
CREATE POLICY "Reviews are public" ON reviews FOR SELECT USING (true);
CREATE POLICY "Auth users can review" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enquiries: owners see theirs, students see theirs
CREATE POLICY "Students see own enquiries" ON enquiries FOR SELECT USING (auth.uid() = student_id OR auth.uid() = owner_id);
CREATE POLICY "Students insert enquiries" ON enquiries FOR INSERT WITH CHECK (true);

-- Bookings: user sees own
CREATE POLICY "Users see own bookings" ON bookings FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users insert bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Shortlists: user manages own
CREATE POLICY "Users manage own shortlist" ON shortlists FOR ALL USING (auth.uid() = user_id);

-- Grievances: public read (for accountability), auth insert
CREATE POLICY "Grievances are public" ON grievances FOR SELECT USING (true);
CREATE POLICY "Auth users file grievances" ON grievances FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Price alerts: user manages own
CREATE POLICY "Users manage price alerts" ON price_alerts FOR ALL USING (auth.uid() = user_id);

-- Roommate profiles: everyone can read, user can update/insert own
CREATE POLICY "Public roommate profiles are viewable" ON roommate_profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own roommate profile" ON roommate_profiles FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update hostel rating when review is added
CREATE OR REPLACE FUNCTION update_hostel_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hostels
  SET 
    rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE hostel_id = NEW.hostel_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE hostel_id = NEW.hostel_id),
    mess_rating = (SELECT ROUND(AVG(mess_rating)::numeric, 1) FROM reviews WHERE hostel_id = NEW.hostel_id AND mess_rating IS NOT NULL)
  WHERE id = NEW.hostel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_review_insert
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE PROCEDURE update_hostel_rating();

-- Auto-generate hostel slug
CREATE OR REPLACE FUNCTION generate_hostel_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug = LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(NEW.id::text, 1, 8);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER before_hostel_insert
  BEFORE INSERT ON hostels
  FOR EACH ROW EXECUTE PROCEDURE generate_hostel_slug();

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_hostels_status ON hostels(status);
CREATE INDEX IF NOT EXISTS idx_hostels_category ON hostels(category);
CREATE INDEX IF NOT EXISTS idx_hostels_type ON hostels(type);
CREATE INDEX IF NOT EXISTS idx_hostels_price ON hostels(price);
CREATE INDEX IF NOT EXISTS idx_hostels_rating ON hostels(rating DESC);
CREATE INDEX IF NOT EXISTS idx_hostels_location ON hostels(lat, lng);
CREATE INDEX IF NOT EXISTS idx_hostel_colleges_college ON hostel_colleges(college_id);
CREATE INDEX IF NOT EXISTS idx_reviews_hostel ON reviews(hostel_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_owner ON enquiries(owner_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_student ON enquiries(student_id);
CREATE INDEX IF NOT EXISTS idx_grievances_hostel ON grievances(hostel_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);

-- ============================================================
-- RPC FUNCTION FOR NEARBY HOSTELS (Feature #03 / Map Search)
-- ============================================================
CREATE OR REPLACE FUNCTION get_nearby_hostels(user_lat double precision, user_lon double precision, radius_km double precision)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  price INTEGER,
  category TEXT,
  type TEXT,
  description TEXT,
  phone TEXT,
  whatsapp TEXT,
  is_premium BOOLEAN,
  is_verified BOOLEAN,
  status TEXT,
  facilities TEXT[],
  images TEXT[],
  rating DECIMAL,
  review_count INTEGER,
  mess_rating DECIMAL,
  vacancy_count INTEGER,
  latitude double precision,
  longitude double precision,
  distance_meters double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.name,
    h.address,
    h.price,
    h.category,
    h.type,
    h.description,
    h.phone,
    h.whatsapp,
    h.is_premium,
    h.is_verified,
    h.status,
    h.facilities,
    h.images,
    h.rating,
    h.review_count,
    h.mess_rating,
    h.vacancy_count,
    COALESCE(h.lat::double precision, 0.0) AS latitude,
    COALESCE(h.lng::double precision, 0.0) AS longitude,
    (6371000 * acos(
      least(1.0, greatest(-1.0, 
        cos(radians(user_lat)) * cos(radians(COALESCE(h.lat::double precision, 0.0))) * 
        cos(radians(COALESCE(h.lng::double precision, 0.0)) - radians(user_lon)) + 
        sin(radians(user_lat)) * sin(radians(COALESCE(h.lat::double precision, 0.0)))
      ))
    )) AS distance_meters
  FROM hostels h
  WHERE h.status = 'active'
    AND h.lat IS NOT NULL
    AND h.lng IS NOT NULL
    AND (6371000 * acos(
      least(1.0, greatest(-1.0, 
        cos(radians(user_lat)) * cos(radians(h.lat::double precision)) * 
        cos(radians(h.lng::double precision) - radians(user_lon)) + 
        sin(radians(user_lat)) * sin(radians(h.lat::double precision))
      ))
    )) <= radius_km * 1000
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC FUNCTION FOR HOSTELS NEAR A SPECIFIC COLLEGE (used by searchNearCollege in api.js)
-- ============================================================
CREATE OR REPLACE FUNCTION get_hostels_near_college(
  college_lat double precision,
  college_lng double precision,
  max_distance_km double precision,
  p_category TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_max_price INTEGER DEFAULT 99999,
  p_min_rating double precision DEFAULT 0.0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  price INTEGER,
  category TEXT,
  type TEXT,
  description TEXT,
  phone TEXT,
  whatsapp TEXT,
  is_premium BOOLEAN,
  is_verified BOOLEAN,
  status TEXT,
  facilities TEXT[],
  images TEXT[],
  rating DECIMAL,
  review_count INTEGER,
  mess_rating DECIMAL,
  vacancy_count INTEGER,
  latitude double precision,
  longitude double precision,
  distance_km double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.name,
    h.address,
    h.price,
    h.category,
    h.type,
    h.description,
    h.phone,
    h.whatsapp,
    h.is_premium,
    h.is_verified,
    h.status,
    h.facilities,
    h.images,
    h.rating,
    h.review_count,
    h.mess_rating,
    h.vacancy_count,
    COALESCE(h.lat::double precision, 0.0) AS latitude,
    COALESCE(h.lng::double precision, 0.0) AS longitude,
    ((6371000 * acos(
      least(1.0, greatest(-1.0, 
        cos(radians(college_lat)) * cos(radians(COALESCE(h.lat::double precision, 0.0))) * 
        cos(radians(COALESCE(h.lng::double precision, 0.0)) - radians(college_lng)) + 
        sin(radians(college_lat)) * sin(radians(COALESCE(h.lat::double precision, 0.0)))
      ))
    )) / 1000.0) AS distance_km
  FROM hostels h
  WHERE h.status = 'active'
    AND h.lat IS NOT NULL
    AND h.lng IS NOT NULL
    AND (p_category IS NULL OR h.category = p_category)
    AND (p_type IS NULL OR h.type = p_type)
    AND (h.price <= p_max_price)
    AND (h.rating >= p_min_rating)
    AND ((6371000 * acos(
      least(1.0, greatest(-1.0, 
        cos(radians(college_lat)) * cos(radians(h.lat::double precision)) * 
        cos(radians(h.lng::double precision) - radians(college_lng)) + 
        sin(radians(college_lat)) * sin(radians(h.lat::double precision))
      ))
    )) / 1000.0) <= max_distance_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SUPABASE REALTIME CONFIGURATION (Realtime Updates Support)
-- ============================================================
-- Add public schema tables to the supabase_realtime publication to broadcast insert/update/delete events
BEGIN;
  -- Remove tables if already added to prevent duplicates
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS enquiries, bookings, roommate_profiles, hostels;
  
  -- Re-add tables to publish postgres changes events to all subscribers
  ALTER PUBLICATION supabase_realtime ADD TABLE enquiries, bookings, roommate_profiles, hostels;
COMMIT;
