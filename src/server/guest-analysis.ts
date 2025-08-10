import { z } from 'zod';
import { tool } from '@openai/agents';
import { getDb } from '@/lib/db';

// Guest Deduplication & Analysis System
class GuestIdentityResolver {
  
  // Name normalization patterns
  private readonly titlePrefixes = ['pak', 'bu', 'bapak', 'ibu', 'dr', 'prof', 'h', 'hj', 'drs', 'ir', 'mt', 'st', 'se'];
  private readonly titleSuffixes = ['se', 'st', 'mt', 'msc', 'phd', 'md', 'jr', 'sr', 'ii', 'iii'];
  
  // Normalize name for comparison
  normalizeeName(name: string): string {
    if (!name) return '';
    
    let normalized = name.toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .replace(/\s+/g, ' ')      // Normalize spaces
      .trim();
    
    // Remove titles/prefixes
    const words = normalized.split(' ');
    const filteredWords = words.filter(word => 
      !this.titlePrefixes.includes(word) && 
      !this.titleSuffixes.includes(word)
    );
    
    return filteredWords.join(' ');
  }
  
  // Extract first and last name components
  extractNameComponents(name: string): { first: string; last: string; full: string } {
    const normalized = this.normalizeeName(name);
    const parts = normalized.split(' ').filter(p => p.length > 1);
    
    return {
      first: parts[0] || '',
      last: parts[parts.length - 1] || '',
      full: normalized
    };
  }
  
  // Calculate similarity score between two names
  calculateNameSimilarity(name1: string, name2: string): number {
    const comp1 = this.extractNameComponents(name1);
    const comp2 = this.extractNameComponents(name2);
    
    // Exact match
    if (comp1.full === comp2.full) return 1.0;
    
    // First name match + last name match
    if (comp1.first === comp2.first && comp1.last === comp2.last) return 0.9;
    
    // First name match only
    if (comp1.first === comp2.first && comp1.first.length > 2) return 0.7;
    
    // Last name match only
    if (comp1.last === comp2.last && comp1.last.length > 2) return 0.6;
    
    // Levenshtein-like simple similarity
    const fullSim = this.stringSimilarity(comp1.full, comp2.full);
    if (fullSim > 0.8) return fullSim * 0.8;
    
    return 0;
  }
  
  // Simple string similarity (Jaccard-like)
  private stringSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }
  
  // Calculate identity confidence based on multiple factors
  calculateIdentityConfidence(guest1: any, guest2: any): {
    score: number;
    factors: string[];
    confidence: 'high' | 'medium' | 'low';
  } {
    const factors: string[] = [];
    let score = 0;
    
    // Name similarity (40% weight)
    const nameSim = this.calculateNameSimilarity(guest1.name, guest2.name);
    score += nameSim * 0.4;
    if (nameSim > 0.8) factors.push(`Strong name match (${(nameSim*100).toFixed(1)}%)`);
    
    // Phone number match (30% weight)
    if (guest1.mobile_phone && guest2.mobile_phone) {
      const phone1 = guest1.mobile_phone.replace(/\D/g, '');
      const phone2 = guest2.mobile_phone.replace(/\D/g, '');
      if (phone1 === phone2 && phone1.length > 8) {
        score += 0.3;
        factors.push('Exact phone match');
      }
    }
    
    // Email match (20% weight)
    if (guest1.email && guest2.email) {
      if (guest1.email.toLowerCase() === guest2.email.toLowerCase()) {
        score += 0.2;
        factors.push('Exact email match');
      }
    }
    
    // ID number match (10% weight)
    if (guest1.id_no && guest2.id_no) {
      if (guest1.id_no === guest2.id_no) {
        score += 0.1;
        factors.push('ID number match');
      }
    }
    
    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low';
    if (score >= 0.8) confidence = 'high';
    else if (score >= 0.5) confidence = 'medium';
    else confidence = 'low';
    
    return { score, factors, confidence };
  }
}

const guestResolver = new GuestIdentityResolver();

// Advanced Guest Analysis Tool
export const analyzeAdvancedGuests = tool({
  name: 'analyze_advanced_guests',
  description:
    'Advanced guest analysis with deduplication, repeat guest detection, and demographic insights using sophisticated name matching and identity resolution.',
  parameters: z.object({
    analysis_type: z.enum(['repeat_guests_advanced', 'guest_deduplication', 'loyalty_analysis', 'guest_demographics_detailed']).describe('Type of advanced analysis'),
    start: z.string().describe('Start date ISO (YYYY-MM-DD)'),
    end: z.string().describe('End date ISO (YYYY-MM-DD)'),
    similarity_threshold: z.number().default(0.7).describe('Similarity threshold for matching (0.0-1.0)'),
    top_n: z.number().default(20).describe('Number of top results to return'),
  }),
  execute: async ({ analysis_type, start, end, similarity_threshold, top_n }) => {
    const db = getDb(true);
    
    if (analysis_type === 'repeat_guests_advanced') {
      // Advanced repeat guest detection with fuzzy matching
      const query = `
        SELECT 
          name,
          mobile_phone,
          email,
          id_no,
          COUNT(*) as visit_count,
          SUM(room_rate) as total_spent,
          AVG(night) as avg_los,
          MIN(arrival) as first_visit,
          MAX(arrival) as last_visit,
          GROUP_CONCAT(DISTINCT segment_ih) as segments,
          GROUP_CONCAT(DISTINCT room_type) as room_types
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY name, mobile_phone, email
        HAVING visit_count > 1
        ORDER BY total_spent DESC
        LIMIT ?
      `;
      
      const rawResults = db.prepare(query).all(start, end, top_n * 2) as any[];
      
      // Apply advanced deduplication
      const deduplicatedGuests = [];
      const processed = new Set();
      
      for (let i = 0; i < rawResults.length; i++) {
        if (processed.has(i)) continue;
        
        const currentGuest = rawResults[i];
        const similarGuests = [currentGuest];
        
        // Find similar guests
        for (let j = i + 1; j < rawResults.length; j++) {
          if (processed.has(j)) continue;
          
          const otherGuest = rawResults[j];
          const identity = guestResolver.calculateIdentityConfidence(currentGuest, otherGuest);
          
          if (identity.score >= similarity_threshold) {
            similarGuests.push(otherGuest);
            processed.add(j);
          }
        }
        
        // Merge similar guests
        const mergedGuest = {
          primary_name: currentGuest.name,
          all_name_variations: similarGuests.map(g => g.name),
          total_visits: similarGuests.reduce((sum, g) => sum + g.visit_count, 0),
          total_spent: similarGuests.reduce((sum, g) => sum + g.total_spent, 0),
          avg_los: similarGuests.reduce((sum, g) => sum + (g.avg_los * g.visit_count), 0) / similarGuests.reduce((sum, g) => sum + g.visit_count, 0),
          first_visit: Math.min(...similarGuests.map(g => new Date(g.first_visit).getTime())),
          last_visit: Math.max(...similarGuests.map(g => new Date(g.last_visit).getTime())),
          contact_info: {
            phones: [...new Set(similarGuests.map(g => g.mobile_phone).filter(Boolean))],
            emails: [...new Set(similarGuests.map(g => g.email).filter(Boolean))]
          },
          segments: [...new Set(similarGuests.flatMap(g => g.segments ? g.segments.split(',') : []))],
          room_preferences: [...new Set(similarGuests.flatMap(g => g.room_types ? g.room_types.split(',') : []))],
          confidence_score: Math.max(...similarGuests.slice(1).map(g => 
            guestResolver.calculateIdentityConfidence(currentGuest, g).score
          ), 1.0)
        };
        
        deduplicatedGuests.push(mergedGuest);
        processed.add(i);
        
        if (deduplicatedGuests.length >= top_n) break;
      }
      
      return {
        analysis_type: 'Advanced Repeat Guests with Deduplication',
        period: `${start} to ${end}`,
        similarity_threshold,
        total_raw_records: rawResults.length,
        deduplicated_count: deduplicatedGuests.length,
        guests: deduplicatedGuests,
        insights: {
          deduplication_rate: ((rawResults.length - deduplicatedGuests.length) / rawResults.length * 100).toFixed(1) + '%',
          avg_confidence: (deduplicatedGuests.reduce((sum, g) => sum + g.confidence_score, 0) / deduplicatedGuests.length).toFixed(3),
          top_spender: deduplicatedGuests[0]
        }
      };
      
    } else if (analysis_type === 'guest_deduplication') {
      // Guest deduplication analysis
      const query = `
        SELECT 
          name,
          mobile_phone,
          email,
          id_no,
          nat_fr,
          age,
          COUNT(*) as booking_count,
          SUM(room_rate) as total_revenue
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY name
        ORDER BY booking_count DESC
        LIMIT ?
      `;
      
      const guests = db.prepare(query).all(start, end, top_n * 3) as any[];
      
      // Analyze for potential duplicates
      const duplicateGroups = [];
      const processed = new Set();
      
      for (let i = 0; i < guests.length; i++) {
        if (processed.has(i)) continue;
        
        const currentGuest = guests[i];
        const potentialDuplicates = [currentGuest];
        
        for (let j = i + 1; j < guests.length; j++) {
          if (processed.has(j)) continue;
          
          const otherGuest = guests[j];
          const identity = guestResolver.calculateIdentityConfidence(currentGuest, otherGuest);
          
          if (identity.score >= similarity_threshold) {
            potentialDuplicates.push({
              ...otherGuest,
              similarity_score: identity.score,
              matching_factors: identity.factors
            });
            processed.add(j);
          }
        }
        
        if (potentialDuplicates.length > 1) {
          duplicateGroups.push({
            primary_guest: currentGuest,
            duplicates: potentialDuplicates.slice(1),
            group_size: potentialDuplicates.length,
            combined_bookings: potentialDuplicates.reduce((sum, g) => sum + g.booking_count, 0),
            combined_revenue: potentialDuplicates.reduce((sum, g) => sum + g.total_revenue, 0)
          });
        }
        
        processed.add(i);
      }
      
      return {
        analysis_type: 'Guest Deduplication Analysis',
        period: `${start} to ${end}`,
        similarity_threshold,
        total_unique_names: guests.length,
        potential_duplicate_groups: duplicateGroups.length,
        duplicate_groups: duplicateGroups.slice(0, top_n),
        statistics: {
          estimated_duplicate_rate: (duplicateGroups.length / guests.length * 100).toFixed(1) + '%',
          potential_revenue_consolidation: duplicateGroups.reduce((sum, g) => sum + g.combined_revenue, 0),
          avg_group_size: duplicateGroups.length > 0 ? (duplicateGroups.reduce((sum, g) => sum + g.group_size, 0) / duplicateGroups.length).toFixed(1) : 0
        }
      };
      
    } else if (analysis_type === 'loyalty_analysis') {
      // Advanced loyalty analysis
      const query = `
        SELECT 
          name,
          COUNT(*) as total_visits,
          SUM(room_rate) as lifetime_value,
          AVG(night) as avg_stay_length,
          MAX(arrival) as last_visit,
          MIN(arrival) as first_visit,
          (julianday(MAX(arrival)) - julianday(MIN(arrival))) as customer_lifespan_days,
          COUNT(DISTINCT strftime('%Y-%m', arrival)) as active_months,
          GROUP_CONCAT(DISTINCT segment_ih) as segments
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY name
        HAVING total_visits >= 2
        ORDER BY lifetime_value DESC
        LIMIT ?
      `;
      
      const loyalGuests = db.prepare(query).all(start, end, top_n) as any[];
      
      // Calculate loyalty metrics
      const enrichedGuests = loyalGuests.map(guest => ({
        ...guest,
        visit_frequency: guest.customer_lifespan_days > 0 ? (guest.total_visits / (guest.customer_lifespan_days / 30)) : 0,
        avg_monthly_spend: guest.active_months > 0 ? (guest.lifetime_value / guest.active_months) : 0,
        loyalty_tier: guest.lifetime_value > 10000000 ? 'VIP' : 
                     guest.lifetime_value > 5000000 ? 'Gold' : 
                     guest.lifetime_value > 2000000 ? 'Silver' : 'Bronze',
        recency_score: Math.max(0, 100 - ((Date.now() - new Date(guest.last_visit).getTime()) / (1000 * 60 * 60 * 24))),
        frequency_score: Math.min(100, guest.total_visits * 10),
        monetary_score: Math.min(100, guest.lifetime_value / 100000)
      }));
      
      return {
        analysis_type: 'Advanced Loyalty Analysis',
        period: `${start} to ${end}`,
        loyal_guests: enrichedGuests,
        loyalty_statistics: {
          total_loyal_customers: loyalGuests.length,
          avg_lifetime_value: loyalGuests.reduce((sum, g) => sum + g.lifetime_value, 0) / loyalGuests.length,
          avg_visit_frequency: enrichedGuests.reduce((sum, g) => sum + g.visit_frequency, 0) / enrichedGuests.length,
          tier_distribution: {
            vip: enrichedGuests.filter(g => g.loyalty_tier === 'VIP').length,
            gold: enrichedGuests.filter(g => g.loyalty_tier === 'Gold').length,
            silver: enrichedGuests.filter(g => g.loyalty_tier === 'Silver').length,
            bronze: enrichedGuests.filter(g => g.loyalty_tier === 'Bronze').length
          }
        }
      };
    }
    
    return { error: 'Analysis type not implemented yet' };
  },
});

// Length of Stay Analysis Tool
export const analyzeLengthOfStay = tool({
  name: 'analyze_length_of_stay',
  description:
    'Comprehensive Length of Stay (LOS) analysis with guest behavior patterns, seasonal variations, and business insights.',
  parameters: z.object({
    start: z.string().describe('Start date ISO (YYYY-MM-DD)'),
    end: z.string().describe('End date ISO (YYYY-MM-DD)'),
    analysis_dimension: z.enum(['overall', 'by_segment', 'by_room_type', 'by_nationality', 'by_booking_channel']).describe('Analysis dimension'),
    los_categories: z.boolean().default(true).describe('Include LOS categorization (short/medium/long stay)'),
  }),
  execute: async ({ start, end, analysis_dimension, los_categories }) => {
    const db = getDb(true);
    
    let baseQuery = `
      SELECT 
        night as los,
        COUNT(*) as booking_count,
        SUM(room_rate) as total_revenue,
        AVG(room_rate) as avg_rate,
        segment_ih,
        room_type,
        nat_fr,
        sob
      FROM stays 
      WHERE arrival >= ? AND arrival <= ?
    `;
    
    if (analysis_dimension === 'by_segment') {
      baseQuery += ` GROUP BY segment_ih, night ORDER BY segment_ih, night`;
    } else if (analysis_dimension === 'by_room_type') {
      baseQuery += ` GROUP BY room_type, night ORDER BY room_type, night`;
    } else if (analysis_dimension === 'by_nationality') {
      baseQuery += ` GROUP BY nat_fr, night ORDER BY nat_fr, night`;
    } else if (analysis_dimension === 'by_booking_channel') {
      baseQuery += ` GROUP BY sob, night ORDER BY sob, night`;
    } else {
      baseQuery += ` GROUP BY night ORDER BY night`;
    }
    
    const results = db.prepare(baseQuery).all(start, end) as any[];
    
    // Overall LOS statistics
    const overallStats = db.prepare(`
      SELECT 
        COUNT(*) as total_bookings,
        AVG(night) as avg_los,
        MIN(night) as min_los,
        MAX(night) as max_los,
        SUM(CASE WHEN night = 1 THEN 1 ELSE 0 END) as one_night_stays,
        SUM(CASE WHEN night BETWEEN 2 AND 3 THEN 1 ELSE 0 END) as short_stays,
        SUM(CASE WHEN night BETWEEN 4 AND 7 THEN 1 ELSE 0 END) as medium_stays,
        SUM(CASE WHEN night > 7 THEN 1 ELSE 0 END) as long_stays
      FROM stays 
      WHERE arrival >= ? AND arrival <= ?
    `).get(start, end) as any;
    
    // LOS categories if requested
    let categorizedResults = null;
    if (los_categories) {
      categorizedResults = {
        one_night: {
          count: overallStats.one_night_stays,
          percentage: (overallStats.one_night_stays / overallStats.total_bookings * 100).toFixed(1)
        },
        short_stay: {
          range: '2-3 nights',
          count: overallStats.short_stays,
          percentage: (overallStats.short_stays / overallStats.total_bookings * 100).toFixed(1)
        },
        medium_stay: {
          range: '4-7 nights',
          count: overallStats.medium_stays,
          percentage: (overallStats.medium_stays / overallStats.total_bookings * 100).toFixed(1)
        },
        long_stay: {
          range: '8+ nights',
          count: overallStats.long_stays,
          percentage: (overallStats.long_stays / overallStats.total_bookings * 100).toFixed(1)
        }
      };
    }
    
    return {
      analysis_type: 'Length of Stay Analysis',
      dimension: analysis_dimension,
      period: `${start} to ${end}`,
      overall_statistics: overallStats,
      los_categories: categorizedResults,
      detailed_results: results.slice(0, 50), // Limit for readability
      insights: {
        dominant_los: results.reduce((max, curr) => curr.booking_count > max.booking_count ? curr : max, results[0])?.los || 0,
        revenue_sweet_spot: results.reduce((max, curr) => curr.total_revenue > max.total_revenue ? curr : max, results[0])?.los || 0,
        avg_rate_by_los: results.map(r => ({ los: r.los, avg_rate: r.avg_rate })).slice(0, 10)
      }
    };
  },
});

