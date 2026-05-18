import supabase from './supabase';

// ============================================================
// HOSTELS API
// ============================================================

export const hostelsApi = {
  // Get all active hostels with optional filters
  async getAll({ category, type, minPrice, maxPrice, facilities, rating, limit = 50 } = {}) {
    let query = supabase
      .from('hostels')
      .select(`
        *,
        emergency_contacts(warden_name, warden_phone, nearest_hospital, hospital_phone, police_station, ambulance_phone),
        room_types(id, name, price, capacity, available, total)
      `)
      .eq('status', 'active');

    if (category) query = query.eq('category', category);
    if (type) query = query.eq('type', type);
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);
    if (rating) query = query.gte('rating', rating);
    if (facilities?.length > 0) query = query.contains('facilities', facilities);

    query = query.order('is_premium', { ascending: false }).order('rating', { ascending: false }).limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get hostel by ID
  async getById(id) {
    const { data, error } = await supabase
      .from('hostels')
      .select(`
        *,
        profiles:owner_id(full_name, phone, avatar_url),
        emergency_contacts(*),
        room_types(*),
        hostel_colleges(distance_km, walk_minutes, colleges(*)),
        food_menus(*),
        seasonal_pricing(*),
        hostel_qa(*, profiles:question_by(full_name), answerer:answered_by(full_name))
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Get hostel by slug
  async getBySlug(slug) {
    const { data, error } = await supabase
      .from('hostels')
      .select(`*, emergency_contacts(*), room_types(*), food_menus(*)`)
      .eq('slug', slug)
      .single();
    if (error) throw error;
    return data;
  },

  // Search hostels near a college
  async searchNearCollege(collegeLat, collegeLng, filters = {}) {
    // Use raw query for distance calculation
    const { data, error } = await supabase.rpc('get_hostels_near_college', {
      college_lat: collegeLat,
      college_lng: collegeLng,
      max_distance_km: filters.maxDistance || 10,
      p_category: filters.category || null,
      p_type: filters.type || null,
      p_max_price: filters.maxPrice || 99999,
      p_min_rating: filters.rating || 0
    });
    if (error) {
      // Fallback: fetch all and filter client-side
      const allHostels = await hostelsApi.getAll(filters);
      return allHostels;
    }
    return data || [];
  },

  // Get featured hostels for landing page
  async getFeatured(limit = 6) {
    const { data, error } = await supabase
      .from('hostels')
      .select('*')
      .eq('status', 'active')
      .eq('is_premium', true)
      .order('rating', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  // Track a view
  async trackView(hostelId, viewerCollege = null) {
    await supabase.from('hostel_views').insert({
      hostel_id: hostelId,
      viewer_college: viewerCollege,
      device_type: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    });
  },

  // Toggle shortlist
  async toggleShortlist(hostelId, userId) {
    const { data: existing } = await supabase
      .from('shortlists')
      .select('*')
      .eq('user_id', userId)
      .eq('hostel_id', hostelId)
      .single();

    if (existing) {
      await supabase.from('shortlists').delete().eq('user_id', userId).eq('hostel_id', hostelId);
      return false;
    } else {
      await supabase.from('shortlists').insert({ user_id: userId, hostel_id: hostelId });
      return true;
    }
  },

  // Get user's shortlist
  async getShortlist(userId) {
    const { data, error } = await supabase
      .from('shortlists')
      .select('hostels(*)')
      .eq('user_id', userId);
    if (error) throw error;
    return data?.map(s => s.hostels) || [];
  },
};

// ============================================================
// REVIEWS API
// ============================================================

export const reviewsApi = {
  async getForHostel(hostelId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .eq('hostel_id', hostelId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create({ hostelId, userId, rating, messRating, title, body, pros, cons }) {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        hostel_id: hostelId,
        user_id: userId,
        rating,
        mess_rating: messRating,
        title,
        body,
        pros,
        cons,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markHelpful(reviewId) {
    const { error } = await supabase.rpc('increment_helpful_count', { review_id: reviewId });
    if (error) throw error;
  },

  // Get sentiment summary for a hostel
  async getSentimentSummary(hostelId) {
    const reviews = await reviewsApi.getForHostel(hostelId);
    if (!reviews.length) return null;

    const allPros = reviews.flatMap(r => r.pros || []);
    const allCons = reviews.flatMap(r => r.cons || []);

    const countOccurrences = (arr) => {
      return arr.reduce((acc, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      }, {});
    };

    const proCounts = countOccurrences(allPros);
    const conCounts = countOccurrences(allCons);

    const topPros = Object.entries(proCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topCons = Object.entries(conCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { topPros, topCons, totalReviews: reviews.length };
  }
};

// ============================================================
// ENQUIRIES API
// ============================================================

export const enquiriesApi = {
  async send({ hostelId, ownerId, studentId, studentName, studentPhone, studentCollege, message, moveInDate, roomType }) {
    const { data, error } = await supabase
      .from('enquiries')
      .insert({
        hostel_id: hostelId,
        owner_id: ownerId,
        student_id: studentId,
        student_name: studentName,
        student_phone: studentPhone,
        student_college: studentCollege,
        message,
        move_in_date: moveInDate,
        room_type: roomType,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getForOwner(ownerId) {
    const { data, error } = await supabase
      .from('enquiries')
      .select('*, hostels(name)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markRead(enquiryId) {
    await supabase.from('enquiries').update({ is_read: true }).eq('id', enquiryId);
  },

  async reply(enquiryId, replyText) {
    const { error } = await supabase.from('enquiries').update({
      reply: replyText,
      replied_at: new Date().toISOString(),
    }).eq('id', enquiryId);
    if (error) throw error;
  }
};

// ============================================================
// COLLEGES API
// ============================================================

export const collegesApi = {
  async getAll() {
    const { data, error } = await supabase.from('colleges').select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  async search(query) {
    const { data, error } = await supabase
      .from('colleges')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);
    if (error) throw error;
    return data || [];
  }
};

// ============================================================
// OWNER API
// ============================================================

export const ownerApi = {
  async getMyHostels(ownerId) {
    const { data, error } = await supabase
      .from('hostels')
      .select('*, room_types(*)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createHostel(hostelData) {
    const { data, error } = await supabase
      .from('hostels')
      .insert(hostelData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateHostel(hostelId, updates) {
    const { data, error } = await supabase
      .from('hostels')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', hostelId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateVacancy(hostelId, vacancyCount) {
    await supabase.from('hostels').update({ vacancy_count: vacancyCount }).eq('id', hostelId);
  },

  async getAnalytics(ownerId) {
    const hostels = await ownerApi.getMyHostels(ownerId);
    const hostelIds = hostels.map(h => h.id);

    const [enquiriesResult, viewsResult, reviewsResult] = await Promise.all([
      supabase.from('enquiries').select('*').in('hostel_id', hostelIds),
      supabase.from('hostel_views').select('*').in('hostel_id', hostelIds),
      supabase.from('reviews').select('*').in('hostel_id', hostelIds),
    ]);

    return {
      totalViews: viewsResult.data?.length || 0,
      totalEnquiries: enquiriesResult.data?.length || 0,
      totalReviews: reviewsResult.data?.length || 0,
      avgRating: hostels.reduce((a, h) => a + (h.rating || 0), 0) / (hostels.length || 1),
    };
  },

  async upsertFoodMenu(hostelId, dayOfWeek, mealType, items, isVegetarian) {
    const { data, error } = await supabase
      .from('food_menus')
      .upsert({ hostel_id: hostelId, day_of_week: dayOfWeek, meal_type: mealType, items, is_vegetarian: isVegetarian })
      .select();
    if (error) throw error;
    return data;
  },

  async upsertEmergencyContacts(hostelId, contacts) {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .upsert({ hostel_id: hostelId, ...contacts })
      .select();
    if (error) throw error;
    return data;
  },

  async upsertRoomType(hostelId, name, price, capacity, total, available) {
    const { data, error } = await supabase
      .from('room_types')
      .insert({ hostel_id: hostelId, name, price, capacity, total, available })
      .select();
    if (error) throw error;
    return data;
  }
};

// ============================================================
// PRICE ALERTS API
// ============================================================

export const priceAlertsApi = {
  async create({ userId, collegeId, category, maxPrice, facilities, whatsapp, email }) {
    const { data, error } = await supabase
      .from('price_alerts')
      .insert({ user_id: userId, college_id: collegeId, category, max_price: maxPrice, facilities, whatsapp, email })
      .select().single();
    if (error) throw error;
    return data;
  },

  async getForUser(userId) {
    const { data, error } = await supabase
      .from('price_alerts')
      .select('*, colleges(name)')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  },

  async delete(alertId) {
    await supabase.from('price_alerts').delete().eq('id', alertId);
  }
};

// ============================================================
// GRIEVANCES API (Feature #25)
// ============================================================

export const grievancesApi = {
  async getForHostel(hostelId) {
    const { data, error } = await supabase
      .from('grievances')
      .select('*, profiles:student_id(full_name)')
      .eq('hostel_id', hostelId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create({ hostelId, studentId, category, title, description, priority }) {
    const { data, error } = await supabase
      .from('grievances')
      .insert({ hostel_id: hostelId, student_id: studentId, category, title, description, priority })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateStatus(grievanceId, status, resolutionNote) {
    await supabase.from('grievances').update({
      status,
      resolution_note: resolutionNote,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null
    }).eq('id', grievanceId);
  }
};

// ============================================================
// COMMUNITY Q&A API (Feature #16)
// ============================================================

export const qaApi = {
  async getForHostel(hostelId) {
    const { data, error } = await supabase
      .from('hostel_qa')
      .select('*, asker:question_by(full_name), answerer:answered_by(full_name)')
      .eq('hostel_id', hostelId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async askQuestion({ hostelId, userId, question }) {
    const { data, error } = await supabase
      .from('hostel_qa')
      .insert({ hostel_id: hostelId, question_by: userId, question })
      .select().single();
    if (error) throw error;
    return data;
  },

  async answerQuestion({ qaId, userId, answer, isVerifiedResident }) {
    const { data, error } = await supabase
      .from('hostel_qa')
      .update({ answer, answered_by: userId, answered_at: new Date().toISOString(), is_verified_resident: isVerifiedResident })
      .eq('id', qaId)
      .select().single();
    if (error) throw error;
    return data;
  }
};

// ============================================================
// BOOKINGS API (Feature #07 - Token Booking)
// ============================================================

export const bookingsApi = {
  async create({ hostelId, studentId, roomTypeId, moveInDate }) {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        hostel_id: hostelId,
        student_id: studentId,
        room_type_id: roomTypeId,
        move_in_date: moveInDate,
        token_amount: 200,
        status: 'pending',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      })
      .select().single();
    if (error) throw error;
    return data;
  },

  async getForStudent(studentId) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, hostels(name, address, images), room_types(name, price)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};

// ============================================================
// RESIDENT PHOTOS API (Feature #24)
// ============================================================

export const residentPhotosApi = {
  async getForHostel(hostelId) {
    const { data, error } = await supabase
      .from('resident_photos')
      .select('*, profiles:uploaded_by(full_name)')
      .eq('hostel_id', hostelId)
      .eq('is_approved', true)
      .order('taken_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async upload({ hostelId, userId, photoUrl, caption }) {
    const { data, error } = await supabase
      .from('resident_photos')
      .insert({ hostel_id: hostelId, uploaded_by: userId, photo_url: photoUrl, caption })
      .select().single();
    if (error) throw error;
    return data;
  }
};

// ============================================================
// AUTH API
// ============================================================

export const authApi = {
  async signUp({ email, password, fullName, role = 'student' }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } }
    });
    if (error) throw error;

    // Update profile with role
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role
      });
    }
    return data;
  },

  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select().single();
    if (error) throw error;
    return data;
  }
};

// ============================================================
// ROOMMATE API (Feature #04)
// ============================================================

export const roommateApi = {
  // Get all roommate profiles (excluding current user)
  async getAllActive(currentUserId = null) {
    let query = supabase
      .from('roommate_profiles')
      .select('*, profiles:user_id(full_name, avatar_url, role), hostels(name)')
      .eq('is_looking', true)
      .order('created_at', { ascending: false });
      
    if (currentUserId) {
      query = query.neq('user_id', currentUserId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get a specific user's roommate profile
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('roommate_profiles')
      .select('*, hostels(name)')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error && error.code !== 'PGRST116') throw error; // Ignore not found
    return data;
  },

  // Upsert (Create or Update) a roommate profile
  async upsertProfile(userId, profileData) {
    const { data, error } = await supabase
      .from('roommate_profiles')
      .upsert({ user_id: userId, ...profileData, updated_at: new Date().toISOString() })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
};

// ============================================================
// ADMIN API
// ============================================================

export const adminApi = {
  // Get all pending hostels
  async getPendingHostels() {
    const { data, error } = await supabase
      .from('hostels')
      .select('*, profiles:owner_id(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Approve a hostel
  async approveHostel(hostelId) {
    const { data, error } = await supabase
      .from('hostels')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', hostelId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Reject a hostel
  async rejectHostel(hostelId) {
    const { data, error } = await supabase
      .from('hostels')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', hostelId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// End of api.js
