import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generatedColleges, generatedHostels } from '../src/lib/seedGenerator.js';

// Load environment variables (supports local .env fallback)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// 1. Health & Server Status Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    message: 'StuNest Premium Backend API running successfully on Railway!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 2. Database Status Check
app.get('/api/database-status', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client is not configured on the backend.' });
  }

  try {
    const { count: collegeCount, error: collegeError } = await supabase
      .from('colleges')
      .select('*', { count: 'exact', head: true });

    if (collegeError) throw collegeError;

    const { count: hostelCount, error: hostelError } = await supabase
      .from('hostels')
      .select('*', { count: 'exact', head: true });

    if (hostelError) throw hostelError;

    res.json({
      connected: true,
      supabaseUrl: supabaseUrl.replace(/(https:\/\/)(.*)(.supabase.co)/, '$1***$3'), // Mask URL
      collegesCount: collegeCount || 0,
      hostelsCount: hostelCount || 0,
      status: (collegeCount > 0 && hostelCount > 0) ? 'SEEDED' : 'EMPTY'
    });
  } catch (err) {
    res.status(500).json({
      connected: false,
      error: err.message || err,
      message: 'Failed to connect to your Supabase instance.'
    });
  }
});

// 3. Secure Groq AI Assistant Proxy
app.post('/api/chat', async (req, res) => {
  const { messages, systemPrompt } = req.body;
  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Groq API Key is not configured on the Railway server.' });
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid "messages" parameter.' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
          ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
        ],
        max_tokens: 200,
        temperature: 0.6,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Groq API responded with error: ${errorText}` });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || 'No reply generated.';

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

// 4. On-Demand Database Seeding
app.post('/api/seed', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client is not configured.' });
  }

  console.log('⚡ Railway Server Database Seeding Triggered!');

  try {
    // A. Colleges Seeding
    const collegesToInsert = generatedColleges.map(c => ({
      id: c.id,
      name: c.name,
      short_name: c.short_name,
      city: c.city,
      lat: c.lat,
      lng: c.lng
    }));

    for (let i = 0; i < collegesToInsert.length; i += 40) {
      const chunk = collegesToInsert.slice(i, i + 40);
      const { error } = await supabase.from('colleges').upsert(chunk);
      if (error) throw error;
    }

    // B. Hostels Seeding
    const hostelsToInsert = generatedHostels.map(h => ({
      id: h.id,
      name: h.name,
      slug: `${h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${h.id.substring(0, 6)}`,
      address: h.address,
      city: h.city,
      lat: h.lat,
      lng: h.lng,
      price: h.price,
      category: h.category,
      type: h.type,
      description: h.description,
      phone: h.phone,
      is_premium: h.is_premium,
      is_verified: h.is_verified,
      status: 'active',
      facilities: h.facilities,
      images: h.images,
      rating: h.rating,
      review_count: h.review_count,
      vacancy_count: h.vacancy_count
    }));

    for (let i = 0; i < hostelsToInsert.length; i += 40) {
      const chunk = hostelsToInsert.slice(i, i + 40);
      const { error } = await supabase.from('hostels').upsert(chunk);
      if (error) throw error;
    }

    // C. Proximity mappings
    const mappingsToInsert = generatedHostels.map(h => ({
      hostel_id: h.id,
      college_id: h.college_id,
      distance_km: h.distance,
      walk_minutes: Math.round(h.distance * 12)
    }));

    for (let i = 0; i < mappingsToInsert.length; i += 80) {
      const chunk = mappingsToInsert.slice(i, i + 80);
      const { error } = await supabase.from('hostel_colleges').upsert(chunk);
      if (error) throw error;
    }

    res.json({
      success: true,
      message: '1,760 records successfully pushed to the Supabase Cloud database from your Railway server!'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err,
      message: 'Seeding failed midway.'
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 StuNest Express API server running on port ${PORT}`);
});
