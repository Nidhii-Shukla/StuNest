// Supabase Cloud Database Seeder for EvolveX (StuNest)
// Reads credentials from local .env and pushes 1,760 records directly to your active Supabase cloud database

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { generatedColleges, generatedHostels } from './src/lib/seedGenerator.js';

console.log('📖 Reading credentials from local .env...');
const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.+)/);

if (!urlMatch || !keyMatch) {
  console.error('❌ Could not find VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your .env file!');
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

console.log(`🔗 Connecting to Supabase Cloud Instance at: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  try {
    // 1. Colleges seeding
    console.log('🏛️ Seeding 160 colleges...');
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
      console.log(`   └─ Colleges chunk [${i + chunk.length}/160] uploaded.`);
    }

    // 2. Hostels seeding
    console.log('🏨 Seeding 1,600 hostels...');
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
      console.log(`   └─ Hostels chunk [${i + chunk.length}/1600] uploaded.`);
    }

    // 3. Proximity mapping seeding
    console.log('📏 Mapping 1,600 hostel-college proximity relations...');
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
      console.log(`   └─ Proximity mappings chunk [${i + chunk.length}/1600] uploaded.`);
    }

    console.log('\n🎉 SUCCESS! 1,760 records successfully pushed into your Supabase Cloud Database!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ DATABASE SEEDING FAILED:', err.message || err);
    process.exit(1);
  }
}

runSeed();
