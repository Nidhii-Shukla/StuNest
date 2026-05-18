import { useState, useEffect } from 'react';
import { hostelsApi, collegesApi } from '../lib/api';
import supabase from '../lib/supabase';

import { generatedHostels, generatedColleges } from '../lib/seedGenerator';

export const STATIC_HOSTELS = generatedHostels;
export const STATIC_COLLEGES = generatedColleges;

export function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

export function useHostels() {
  const [hostels, setHostels] = useState(STATIC_HOSTELS);
  const [colleges, setColleges] = useState(STATIC_COLLEGES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [h, c] = await Promise.all([hostelsApi.getAll(), collegesApi.getAll()]);
        if (h.length) setHostels(h);
        if (c.length) setColleges(c);
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, []);

  return { hostels, colleges, loading };
}

// Real-time enabled hostel detail hook
export function useHostelById(id) {
  const [hostel, setHostel] = useState(() => STATIC_HOSTELS.find(h => h.id === id) || null);
  const [loading, setLoading] = useState(false);
  const [liveUpdate, setLiveUpdate] = useState(null); // tracks live vacancy changes

  useEffect(() => {
    if (!id) return;

    // Initial load
    async function load() {
      setLoading(true);
      try {
        const data = await hostelsApi.getById(id);
        if (data) setHostel(data);
      } catch (_) {
        const fallback = STATIC_HOSTELS.find(h => h.id === id);
        if (fallback) setHostel(fallback);
      }
      setLoading(false);
    }
    load();

    // Real-time subscription for vacancy_count & status changes
    const channel = supabase
      .channel(`hostel-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'hostels',
        filter: `id=eq.${id}`
      }, (payload) => {
        setHostel(prev => prev ? { ...prev, ...payload.new } : payload.new);
        // Show a flash notification if vacancy changes
        if (payload.old?.vacancy_count !== payload.new?.vacancy_count) {
          setLiveUpdate(`🔴 Live: Vacancy updated to ${payload.new.vacancy_count} rooms`);
          setTimeout(() => setLiveUpdate(null), 4000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  return { hostel, loading, liveUpdate };
}
