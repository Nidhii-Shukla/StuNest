import { useState, memo } from 'react';
import { MapPin, Star, Heart, GitCompare, Navigation, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildDirectionsUrl, buildSearchUrl, verifyHostelDistance } from '../lib/maps';
import styles from './HostelCard.module.css';

const FAC_ICONS = {
  ac: 'AC', wifi: 'WiFi', food: 'Dining', laundry: 'Laundry', security: 'Security',
  gym: 'Gym', library: 'Library', parking: 'Parking', pool: 'Pool', balcony: 'Balcony',
  'study table': 'Study Desk',
};

function HostelCard({ hostel, collegeCoords, onShortlist, onCompare, isShortlisted, isCompared }) {
  const [liked, setLiked] = useState(isShortlisted || false);
  const [compared, setCompared] = useState(isCompared || false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const image = hostel.image || hostel.images?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=800';
  const vacancyLeft = hostel.vacancy_count ?? null;
  const isFullyBooked = vacancyLeft === 0;

  const whatsappNum = (hostel.whatsapp || hostel.phone || '').replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${whatsappNum}?text=Hi, I am interested in ${hostel.name} listed on StuNest.`;

  // Google Maps: if a college is selected, show directions from college → hostel
  const mapUrl = collegeCoords
    ? buildDirectionsUrl(hostel.lat, hostel.lng, collegeCoords.lat, collegeCoords.lng)
    : buildSearchUrl(hostel.name, hostel.address);

  // Verify if the listed distance is accurate (within 0.5 km of haversine)
  const distVerification = collegeCoords
    ? verifyHostelDistance(hostel, collegeCoords.lat, collegeCoords.lng)
    : null;

  const handleLike = (e) => {
    e.preventDefault();
    setLiked(l => !l);
    onShortlist?.(hostel.id, !liked);
  };

  const handleCompare = (e) => {
    e.preventDefault();
    setCompared(c => !c);
    onCompare?.(hostel);
  };

  return (
    <div className={`${styles.card} ${isFullyBooked ? styles.fullyBooked : ''}`}>
      {/* Image */}
      <div className={styles.imageWrap}>
        <div className={`${styles.imgSkeleton} ${imgLoaded ? styles.imgLoaded : ''}`} />
        <img
          src={image}
          alt={hostel.name}
          className={`${styles.image} ${imgLoaded ? styles.imgVisible : ''}`}
          onLoad={() => setImgLoaded(true)}
          loading="lazy"
        />

        {/* Top badges */}
        <div className={styles.badgeTopLeft}>
          {hostel.is_premium && (
            <span className={styles.premiumBadge}><Star size={11} fill="currentColor" /> Premium</span>
          )}
          {hostel.is_verified && (
            <span className={styles.verifiedBadge}><CheckCircle size={11} /> Verified</span>
          )}
        </div>

        {/* Category badge */}
        <div className={styles.categoryBadge}>
          {hostel.category === 'boys' ? 'Boys Only' : hostel.category === 'girls' ? 'Girls Only' : 'Unisex Co-living'}&nbsp;{hostel.type?.toUpperCase()}
        </div>

        {/* Vacancy */}
        {vacancyLeft !== null && (
          <div className={`${styles.vacancyBadge} ${isFullyBooked ? styles.vacFull : vacancyLeft <= 2 ? styles.vacLow : styles.vacOk}`}>
            {isFullyBooked ? 'Fully Booked' : vacancyLeft <= 2 ? `Only ${vacancyLeft} left` : `${vacancyLeft} Vacant`}
          </div>
        )}

        {/* Action icons */}
        <div className={styles.imgActions}>
          <button className={`${styles.imgActionBtn} ${liked ? styles.liked : ''}`} onClick={handleLike} title="Shortlist">
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <button className={`${styles.imgActionBtn} ${compared ? styles.compared : ''}`} onClick={handleCompare} title="Compare">
            <GitCompare size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.headerRow}>
          <h3 className={styles.name}>{hostel.name}</h3>
          <div className={styles.rating}>
            <Star size={13} fill="#F59E0B" color="#F59E0B" />
            <span className={styles.ratingScore}>{hostel.rating}</span>
            <span className={styles.reviews}>({hostel.review_count || hostel.reviews || 0})</span>
          </div>
        </div>

        <div className={styles.location}>
          <MapPin size={14} className={styles.locationIcon} />
          <span>{hostel.address}</span>
          {distVerification ? (
            <span
              className={styles.distancePill}
              title={distVerification.verified
                ? `Verified: ${distVerification.computedKm} km (straight line)`
                : `Listed ${distVerification.listedKm} km · Computed ${distVerification.computedKm} km`}
              style={distVerification.verified ? {} : { background:'rgba(245,158,11,0.12)', color:'#B45309' }}
            >
              {distVerification.verified ? '✓' : '~'} {distVerification.computedKm} km
            </span>
          ) : hostel.distance != null ? (
            <span className={styles.distancePill}>{hostel.distance} km</span>
          ) : null}
        </div>

        {/* Facilities */}
        <div className={styles.facilities}>
          {(hostel.facilities || []).slice(0, 4).map((f, i) => (
            <span key={i} className={styles.facBadge} title={f}>
              {FAC_ICONS[f] || (f.charAt(0).toUpperCase() + f.slice(1))}
            </span>
          ))}
          {(hostel.facilities?.length || 0) > 4 && (
            <span className={styles.facMore}>+{hostel.facilities.length - 4}</span>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.priceBlock}>
            <span className={styles.priceCur}>₹</span>
            <span className={styles.price}>{(hostel.price || 0).toLocaleString('en-IN')}</span>
            <span className={styles.pricePer}>/mo</span>
          </div>

          <div className={styles.footerActions}>
            {whatsappNum && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.waBtn} title="WhatsApp">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              </a>
            )}
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={styles.navBtn} title="Directions">
              <Navigation size={15} />
            </a>
            <Link to={`/hostel/${hostel.id}`} className={styles.viewBtn}>
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(HostelCard);
