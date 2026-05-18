// Procedural Demo Data Generator for EvolveX (StuNest)
// Generates 20 Colleges per city (8 cities = 160 colleges)
// Generates 10 Hostels per college (160 * 10 = 1,600 hostels)

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const CITIES_CONFIG = {
  "Hyderabad": { lat: 17.4933, lng: 78.3914, colleges: [
    "JNTUH College of Engineering", "Chaitanya Bharathi Institute of Technology (CBIT)", "IIIT Hyderabad", "Osmania University Campus",
    "VNR Vignana Jyothi (VNR VJIET)", "Gokaraju Rangaraju (GRIET)", "Vasavi College of Engineering", "BITS Pilani Hyderabad",
    "Institute of Aeronautical Technology (IARE)", "MVSR Engineering College", "Keshav Memorial Institute (KMIT)", "Muffakham Jah College",
    "Mahatma Gandhi Institute (MGIT)", "Anurag University", "Sreenidhi Institute (SNIST)", "G. Narayanamma Institute (GNITS)",
    "NALSAR University of Law", "MANUU Central University", "University of Hyderabad (UoH)", "Vardhaman College of Engineering"
  ]},
  "Bengaluru": { lat: 12.9716, lng: 77.5946, colleges: [
    "Indian Institute of Science (IISc)", "RV College of Engineering (RVCE)", "PES University Ring Road Campus", "M. S. Ramaiah Institute",
    "B.M.S. College of Engineering", "Bangalore University", "Christ University Main Campus", "REVA University",
    "Mount Carmel College", "St. Joseph's University", "Alliance University", "New Horizon College of Engineering",
    "Dayananda Sagar College (DSCE)", "Nitte Meenakshi Institute", "The Oxford College of Engineering", "Acharya Institute of Technology",
    "MVJ College of Engineering", "Sir M. Visvesvaraya Institute", "Cambridge Institute of Technology", "Presidency University"
  ]},
  "Mumbai": { lat: 19.0760, lng: 72.8777, colleges: [
    "IIT Bombay", "Institute of Chemical Technology (ICT)", "St. Xavier's College Mumbai", "H.R. College of Commerce",
    "NMIMS University Vile Parle", "Veermata Jijabai Technological Institute (VJTI)", "Sardar Patel Institute (SPIT)", "D. J. Sanghvi College",
    "K. J. Somaiya College of Engineering", "Mithibai College", "Sophia College for Women", "R. A. Podar College of Commerce",
    "Jai Hind College", "Wilson College Chowpatty", "Elphinstone College", "Ramnarain Ruia Autonomous College",
    "Sydenham College of Commerce", "KJ Somaiya Vidyavihar", "Thadomal Shahani Engineering College", "Fr. Conceicao Rodrigues College"
  ]},
  "Delhi": { lat: 28.6139, lng: 77.2090, colleges: [
    "IIT Delhi", "Delhi Technological University (DTU)", "Netaji Subhas University (NSUT)", "St. Stephen's College DU",
    "Hindu College DU", "Miranda House DU", "Shri Ram College of Commerce (SRCC)", "Hansraj College DU",
    "Ramjas College DU", "Jawaharlal Nehru University (JNU)", "Jamia Millia Islamia", "Guru Gobind Singh Indraprastha (GGSIPU)",
    "Maharaja Agrasen Institute (MAIT)", "Maharaja Surajmal Institute (MSIT)", "Bharti Vidyapeeth (BVP)", "Indira Gandhi Technical (IGDTUW)",
    "IIIT Delhi", "Shiv Nadar University", "Bennett University", "Amity University Noida"
  ]},
  "Pune": { lat: 18.5204, lng: 73.8567, colleges: [
    "College of Engineering Pune (COEP)", "MIT World Peace University (MIT-WPU)", "Vishwakarma Institute of Technology (VIT)", "Pune Institute of Computer Technology (PICT)",
    "MKSSS's Cummins College", "Symbiosis International University", "Fergusson College", "Savitribai Phule Pune University (SPPU)",
    "D. Y. Patil Institute of Technology", "Bharati Vidyapeeth Deemed University", "AISSMS College of Engineering", "Sinhgad College of Engineering",
    "Modern College of Arts & Science", "Ness Wadia College of Commerce", "Brihan Maharashtra College (BMCC)", "Abasaheb Garware College",
    "Symbiosis Institute of Technology", "Indira College of Engineering", "Pimpri Chinchwad College (PCCOE)", "DY Patil Global University"
  ]},
  "Chennai": { lat: 13.0827, lng: 80.2707, colleges: [
    "IIT Madras", "Anna University Guindy", "SSN College of Engineering", "PSG Institute of Technology",
    "SRM Institute Ramapuram", "Vellore Institute of Technology (VIT Chennai)", "Loyola College Chennai", "Madras Christian College (MCC)",
    "Stella Maris College", "Presidency College Chennai", "B.S. Abdur Rahman Crescent Institute", "Sathyabama Institute",
    "Hindustan Institute of Technology", "Easwari Engineering College", "St. Joseph's College of Engineering", "Rajalakshmi Engineering College",
    "Sri Venkateswara College (SVCE)", "Meenakshi College for Women", "Ethiraj College for Women", "Guru Nanak College"
  ]},
  "Kolkata": { lat: 22.5726, lng: 88.3639, colleges: [
    "Jadavpur University", "Calcutta University Campus", "Presidency University Kolkata", "St. Xavier's College Kolkata",
    "Heritage Institute of Technology", "Institute of Engineering & Management (IEM)", "Techno India University", "MAKAUT Salt Lake",
    "Bethune College", "Scottish Church College", "Lady Brabourne College", "Goenka College of Commerce",
    "Loreto College Kolkata", "Asutosh College", "Maulana Azad College", "Surendranath College",
    "City College Kolkata", "Bhawanipur Education Society", "Sister Nivedita University", "Brainware University"
  ]},
  "Ahmedabad": { lat: 23.0225, lng: 72.5714, colleges: [
    "IIM Ahmedabad", "CEPT University", "Nirma University", "Gujarat University Campus",
    "L.D. College of Engineering", "Pandit Deendayal Energy University (PDEU)", "DA-IICT Gandhinagar", "St. Xavier's College Ahmedabad",
    "H.L. College of Commerce", "M.G. Science Institute", "SAL Institute of Technology", "Indus University",
    "Silver Oak University", "Vishwakarma Government Engineering College", "GLS University", "L.J. Institute of Engineering",
    "Ahmedabad University", "Shanti Business School", "Swarrnim Startup University", "Rai University"
  ]}
};

const HOSTEL_ADJECTIVES = ["Sunrise", "Sunset", "Royal", "Elite", "Comfort", "Green View", "Golden Gates", "Cozy Nest", "Secure Haven", "Metro Living", "Luxury Stay", "Happy Nest", "Home Away", "Smart Living", "Vibrant Stay", "Signature", "Heritage", "Sovereign", "Alpine", "Nest"];
const HOSTEL_GENDERS = ["Boys", "Girls", "Unisex Co-living"];
const HOSTEL_TYPES = ["Hostel", "PG", "Residency", "Luxury PG", "Premium Stays"];

const FACILITIES_POOL = ["ac", "wifi", "food", "laundry", "security", "gym", "study table", "library", "parking", "tv", "geyser", "power backup"];

const WARDEN_NAMES = ["Srinivas Rao", "Lakshmi K.", "Ramesh Kumar", "Anitha Reddy", "Rajesh Sharma", "Priya Nair", "Manish Patel", "Sunita Sen", "Vijay Yadav", "Meena Gupta"];

const UNSPLASH_IMAGES = [
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1200",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200",
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200",
  "https://images.unsplash.com/photo-1502672260266-1c1de2d96674?q=80&w=1200",
  "https://images.unsplash.com/photo-1596276020587-804acfc1a329?q=80&w=1200",
  "https://images.unsplash.com/photo-1502672023488-70e25813eb80?q=80&w=1200",
  "https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=1200",
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200"
];

// Helper to generate coordinates at a distance offset (roughly in km)
function offsetCoords(baseLat, baseLng, offsetKmX, offsetKmY) {
  const earthRadius = 6371;
  const latOffset = (offsetKmY / earthRadius) * (180 / Math.PI);
  const lngOffset = (offsetKmX / earthRadius) * (180 / Math.PI) / Math.cos(baseLat * Math.PI / 180);
  return {
    lat: Number((baseLat + latOffset).toFixed(6)),
    lng: Number((baseLng + lngOffset).toFixed(6))
  };
}

// Generate all Colleges
export const generatedColleges = [];
export const generatedHostels = [];

Object.entries(CITIES_CONFIG).forEach(([cityName, config]) => {
  config.colleges.forEach((collegeName, idx) => {
    // Generate actual database-compatible UUID
    const collegeId = generateUUID();
    
    // Spread colleges across the city in a 5km grid radius
    const angle = (idx / config.colleges.length) * 2 * Math.PI;
    const distance = 1.0 + (idx % 4) * 1.2; // 1km to 5km away from center
    const xOffset = distance * Math.cos(angle);
    const yOffset = distance * Math.sin(angle);
    
    const coords = offsetCoords(config.lat, config.lng, xOffset, yOffset);
    
    generatedColleges.push({
      id: collegeId,
      name: `${collegeName}, ${cityName}`,
      short_name: collegeName.split(" ").slice(0, 3).join(" ").replace(/[^a-zA-Z ]/g, ""),
      lat: coords.lat,
      lng: coords.lng,
      city: cityName
    });

    // Generate 10 Hostels strictly clustered near this college (within 0.2km to 2.2km)
    for (let h = 1; h <= 10; h++) {
      const hostelId = generateUUID();
      const hAngle = (h / 10) * 2 * Math.PI;
      const hDistance = 0.25 + (h % 3) * 0.6; // Clustered tightly inside 0.25km to 1.5km
      const hX = hDistance * Math.cos(hAngle);
      const hY = hDistance * Math.sin(hAngle);
      
      const hCoords = offsetCoords(coords.lat, coords.lng, hX, hY);
      
      const isPremium = h % 3 === 0;
      const categoryIndex = h % 3; // 0=boys, 1=girls, 2=co-living
      const category = categoryIndex === 0 ? "boys" : (categoryIndex === 1 ? "girls" : "both");
      const categoryLabel = categoryIndex === 0 ? "Boys" : (categoryIndex === 1 ? "Girls" : "Co-living");
      
      const adj = HOSTEL_ADJECTIVES[(idx + h) % HOSTEL_ADJECTIVES.length];
      const type = HOSTEL_TYPES[(idx * h) % HOSTEL_TYPES.length];
      const name = `${adj} ${categoryLabel} ${type}`;
      
      const price = isPremium ? 11000 + (h % 5) * 1200 : 4500 + (h % 5) * 900;
      const rating = Number((3.8 + (h % 12) * 0.1).toFixed(1));
      const reviews = 15 + (idx * h % 150);
      
      // Select 4-7 random facilities
      const facilities = [];
      const numFac = 4 + (h % 4);
      for (let f = 0; f < numFac; f++) {
        const facItem = FACILITIES_POOL[(h * f + idx) % FACILITIES_POOL.length];
        if (!facilities.includes(facItem)) {
          facilities.push(facItem);
        }
      }

      // Photos layout
      const photoStart = (idx + h) % UNSPLASH_IMAGES.length;
      const images = [
        UNSPLASH_IMAGES[photoStart],
        UNSPLASH_IMAGES[(photoStart + 1) % UNSPLASH_IMAGES.length],
        UNSPLASH_IMAGES[(photoStart + 2) % UNSPLASH_IMAGES.length]
      ];

      const wardenName = WARDEN_NAMES[(idx + h) % WARDEN_NAMES.length];
      const phoneDigits = String(7000000000 + (idx * 54321 + h * 98765) % 2999999999);
      const phone = `+91 ${phoneDigits.substring(0, 5)} ${phoneDigits.substring(5)}`;

      generatedHostels.push({
        id: hostelId,
        name: name,
        address: `Street ${h}, near ${collegeName.split(" ")[0]}, ${cityName}`,
        price: price,
        category: category,
        type: type.toLowerCase().includes("pg") ? "pg" : "hostel",
        rating: rating,
        review_count: reviews,
        is_premium: isPremium,
        is_verified: h % 2 === 0,
        distance: Number(hDistance.toFixed(2)),
        phone: phone,
        vacancy_count: h % 6,
        facilities: facilities,
        images: images,
        lat: hCoords.lat,
        lng: hCoords.lng,
        description: `${name} provides premium standard single & sharing accommodation located only ${hDistance.toFixed(1)} km from ${collegeName}. Features fully furnished rooms with regular housekeeping, modern warden security managed by ${wardenName}, high speed wifi and quality dining choices daily.`,
        college_id: collegeId,
        city: cityName
      });
    }
  });
});
