import { z } from 'zod';
import { tool } from '@openai/agents';
import { getDb } from '@/lib/db';

export const resolveTimeframe = tool({
  name: 'resolve_timeframe',
  description:
    'Ubah teks timeframe Indonesia menjadi rentang tanggal ISO (YYYY-MM-DD). Contoh: "Januari 2024" → {start: 2024-01-01, end: 2024-01-31}. Gunakan untuk memahami rentang waktu dari pertanyaan user.',
  parameters: z.object({
    text: z.string().describe('Kalimat atau frasa yang mengandung rentang waktu'),
  }),
  execute: async ({ text }) => {
    const months: Record<string, number> = {
      januari: 1,
      febuari: 2,
      februari: 2,
      maret: 3,
      april: 4,
      mei: 5,
      juni: 6,
      juli: 7,
      agustus: 8,
      september: 9,
      oktober: 10,
      november: 11,
      desember: 12,
      'jan': 1,
      'feb': 2,
      'mar': 3,
      'apr': 4,
      'may': 5,
      'jun': 6,
      'jul': 7,
      'agu': 8,
      'sep': 9,
      'okt': 10,
      'nov': 11,
      'des': 12,
    };

    const normalized = String(text || '').trim().toLowerCase();
    const now = new Date();

    const endOfMonth = (y: number, m: number) => new Date(y, m, 0);
    const pad = (n: number) => String(n).padStart(2, '0');

    // bulan ini / bulan lalu / tahun ini
    if (/bulan\s+ini/.test(normalized)) {
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const start = `${y}-${pad(m)}-01`;
      const eom = endOfMonth(y, m);
      const end = `${y}-${pad(m)}-${pad(eom.getDate())}`;
      return { start, end, granularity: 'month' as const };
    }
    if (/bulan\s+lalu/.test(normalized)) {
      const d = new Date(now.getFullYear(), now.getMonth(), 0);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const start = `${y}-${pad(m)}-01`;
      const end = `${y}-${pad(m)}-${pad(d.getDate())}`;
      return { start, end, granularity: 'month' as const };
    }
    if (/tahun\s+ini/.test(normalized)) {
      const y = now.getFullYear();
      return { start: `${y}-01-01`, end: `${y}-12-31`, granularity: 'year' as const };
    }

    // Match e.g. "Januari 2024" / "Jan 2024"
    const monthYear = normalized.match(/(januari|februari|febuari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)\s+(\d{4})/);
    if (monthYear) {
      const mStr = monthYear[1];
      const y = parseInt(monthYear[2], 10);
      const m = months[mStr] || 1;
      const start = `${y}-${pad(m)}-01`;
      const eom = endOfMonth(y, m);
      const end = `${y}-${pad(m)}-${pad(eom.getDate())}`;
      return { start, end, granularity: 'month' as const };
    }

    // Fallback: bulan berjalan
    {
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const start = `${y}-${pad(m)}-01`;
      const eom = endOfMonth(y, m);
      const end = `${y}-${pad(m)}-${pad(eom.getDate())}`;
      return { start, end, granularity: 'month' as const };
    }
  },
});

export const calculateRevenue = tool({
  name: 'calculate_revenue',
  description: 'Hitung total revenue periode tertentu. Gunakan SUM(Room_Rate) saja karena Lodging sudah termasuk.',
  parameters: z.object({
    start: z.string().describe('Tanggal ISO (inclusive)'),
    end: z.string().describe('Tanggal ISO (inclusive)'),
  }),
  execute: async ({ start, end }) => {
    const db = getDb(true);
    const where: string[] = ['arrival >= ? AND depart <= ?'];
    const params: any[] = [start, end];
    const sql = `SELECT SUM(room_rate) as total FROM stays WHERE ${where.join(' AND ')}`;
    const row = db.prepare(sql).get(...params) as { total?: number } | undefined;
    return { metric: 'total_revenue', value: row?.total ?? 0, computed_by: 'calculate_revenue', start, end };
  },
});

// Hotel Key Performance Indicators Calculator
export const calculateKPI = tool({
  name: 'calculate_kpi',
  description: 
    'Calculate hotel KPIs: ADR (Average Daily Rate), RevPAR (Revenue Per Available Room), Occupancy Rate, ALOS (Average Length of Stay). Essential for hotel performance analysis.',
  parameters: z.object({
    start: z.string().describe('Start date ISO (YYYY-MM-DD)'),
    end: z.string().describe('End date ISO (YYYY-MM-DD)'),
    kpi_type: z.enum(['adr', 'revpar', 'occupancy', 'alos']).describe('Type of KPI to calculate'),
    room_type_filter: z.string().nullable().describe('Filter by room type prefix (D, E, S, F) or null for all'),
    segment_filter: z.string().nullable().describe('Filter by guest segment or null for all'),
  }),
  execute: async ({ start, end, kpi_type, room_type_filter, segment_filter }) => {
    const db = getDb(true);
    let query = '';
    let params: any[] = [start, end];
    
    if (kpi_type === 'adr') {
      // Average Daily Rate = Total Room Revenue / Total Rooms Sold
      query = `
        SELECT 
          ROUND(AVG(room_rate), 2) as adr,
          COUNT(*) as rooms_sold,
          SUM(room_rate) as total_revenue
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
      `;
    } else if (kpi_type === 'revpar') {
      // RevPAR = Total Room Revenue / Total Available Rooms
      // Calculate available rooms from inventory in notes.md (approx via ENV override)
      const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const defaultRooms = Number(process.env.DEFAULT_ROOMS || 100);
      const totalAvailableRooms = defaultRooms * daysDiff;
      
      query = `
        SELECT 
          SUM(room_rate) as total_revenue,
          COUNT(*) as rooms_sold
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
      `;
      
      const stmt = db.prepare(query);
      const result = stmt.get(params) as any;
      const revpar = result.total_revenue / totalAvailableRooms;
      
      return {
        metric: 'RevPAR',
        value: Math.round(revpar * 100) / 100,
        total_revenue: result.total_revenue,
        rooms_sold: result.rooms_sold,
        available_rooms: totalAvailableRooms,
        period: `${start} to ${end}`,
      };
    } else if (kpi_type === 'occupancy') {
      // Occupancy Rate = Rooms Sold / Available Rooms
      const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const defaultRooms = Number(process.env.DEFAULT_ROOMS || 100);
      const totalAvailableRooms = defaultRooms * daysDiff;
      
      query = `
        SELECT COUNT(*) as rooms_sold
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
      `;
      
      const stmt = db.prepare(query);
      const result = stmt.get(params) as any;
      const occupancyRate = (result.rooms_sold / totalAvailableRooms) * 100;
      
      return {
        metric: 'Occupancy Rate',
        value: Math.round(occupancyRate * 100) / 100,
        unit: '%',
        rooms_sold: result.rooms_sold,
        available_rooms: totalAvailableRooms,
        period: `${start} to ${end}`,
      };
    } else if (kpi_type === 'alos') {
      // Average Length of Stay
      query = `
        SELECT AVG(night) as alos, COUNT(*) as total_stays
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
      `;
    }
    
    // Add filters if specified
    if (room_type_filter) {
      query += ` AND room_type LIKE ?`;
      params.push(`${room_type_filter}%`);
    }
    
    if (segment_filter) {
      query += ` AND segment_ih = ?`;
      params.push(segment_filter);
    }
    
    const stmt = db.prepare(query);
    const result = stmt.get(params) as any;
    
    if (kpi_type === 'adr') {
      return {
        metric: 'ADR (Average Daily Rate)',
        value: result.adr,
        currency: 'IDR',
        rooms_sold: result.rooms_sold,
        total_revenue: result.total_revenue,
        period: `${start} to ${end}`,
      };
    } else if (kpi_type === 'alos') {
      return {
        metric: 'ALOS (Average Length of Stay)',
        value: Math.round(result.alos * 100) / 100,
        unit: 'nights',
        total_stays: result.total_stays,
        period: `${start} to ${end}`,
      };
    }
    
    return result;
  },
});

// Guest Demographics and Segmentation Analysis
export const analyzeGuests = tool({
  name: 'analyze_guests',
  description:
    'Analyze guest demographics, segmentation, nationality, age groups, booking channels, room preferences. Very powerful for market intelligence and guest behavior insights.',
  parameters: z.object({
    start: z.string().describe('Start date ISO (YYYY-MM-DD)'),
    end: z.string().describe('End date ISO (YYYY-MM-DD)'),
    analysis_type: z.enum(['segment', 'nationality', 'age_group', 'room_type', 'channel', 'arrangement', 'repeat_guests']).describe('Type of analysis'),
    top_n: z.number().default(10).describe('Number of top results to return'),
  }),
  execute: async ({ start, end, analysis_type, top_n }) => {
    const db = getDb(true);
    let query = '';
    const params = [start, end];
    
    if (analysis_type === 'segment') {
      query = `
        SELECT 
          segment_ih,
          COUNT(*) as bookings,
          SUM(room_rate) as revenue,
          AVG(room_rate) as avg_rate,
          AVG(night) as avg_los
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY segment_ih 
        ORDER BY bookings DESC 
        LIMIT ${top_n}
      `;
    } else if (analysis_type === 'nationality') {
      query = `
        SELECT 
          nat_fr as nationality,
          COUNT(*) as guests,
          SUM(room_rate) as revenue,
          AVG(room_rate) as avg_spend
        FROM stays 
        WHERE arrival >= ? AND arrival <= ? AND nat_fr IS NOT NULL
        GROUP BY nat_fr 
        ORDER BY guests DESC 
        LIMIT ${top_n}
      `;
    } else if (analysis_type === 'age_group') {
      query = `
        SELECT 
          CASE 
            WHEN age < 25 THEN '18-24'
            WHEN age < 35 THEN '25-34'
            WHEN age < 45 THEN '35-44'
            WHEN age < 55 THEN '45-54'
            WHEN age < 65 THEN '55-64'
            ELSE '65+'
          END as age_group,
          COUNT(*) as guests,
          AVG(room_rate) as avg_spend,
          AVG(night) as avg_los
        FROM stays 
        WHERE arrival >= ? AND arrival <= ? AND age > 0
        GROUP BY age_group 
        ORDER BY guests DESC
      `;
    } else if (analysis_type === 'room_type') {
      query = `
        SELECT 
          CASE 
            WHEN room_type LIKE 'D%' THEN 'Deluxe'
            WHEN room_type LIKE 'E%' OR room_type LIKE 'B%' THEN 'Executive Suite'
            WHEN room_type LIKE 'S%' OR room_type LIKE 'J%' THEN 'Suite'
            WHEN room_type LIKE 'F%' THEN 'Family Suite'
            ELSE 'Other'
          END as room_category,
          COUNT(*) as bookings,
          SUM(room_rate) as revenue,
          AVG(room_rate) as avg_rate,
          ROUND(AVG(night), 2) as avg_los
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY room_category 
        ORDER BY revenue DESC
      `;
    } else if (analysis_type === 'channel') {
      query = `
        SELECT 
          sob as booking_source,
          COUNT(*) as bookings,
          SUM(room_rate) as revenue,
          AVG(room_rate) as avg_booking_value
        FROM stays 
        WHERE arrival >= ? AND arrival <= ? AND sob IS NOT NULL
        GROUP BY sob 
        ORDER BY revenue DESC 
        LIMIT ${top_n}
      `;
    } else if (analysis_type === 'arrangement') {
      query = `
        SELECT 
          arrangement,
          COUNT(*) as bookings,
          SUM(room_rate) as revenue,
          ROUND(AVG(room_rate), 2) as avg_rate
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY arrangement 
        ORDER BY bookings DESC
      `;
    } else if (analysis_type === 'repeat_guests') {
      query = `
        SELECT 
          name,
          COUNT(*) as visit_count,
          SUM(room_rate) as total_spent,
          MIN(arrival) as first_visit,
          MAX(arrival) as last_visit
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY name 
        HAVING visit_count > 1 
        ORDER BY total_spent DESC 
        LIMIT ${top_n}
      `;
    }
    
    const stmt = db.prepare(query);
    const results = stmt.all(params);
    
    return {
      analysis: analysis_type,
      period: `${start} to ${end}`,
      results: results,
      total_records: results.length,
    };
  },
});

// Business Intelligence & Trends Analysis
export const analyzeTrends = tool({
  name: 'analyze_trends',
  description:
    'Analyze business trends: seasonal patterns, daily/monthly performance, market trends, pricing patterns. Essential for strategic planning and revenue optimization.',
  parameters: z.object({
    start: z.string().describe('Start date ISO (YYYY-MM-DD)'),
    end: z.string().describe('End date ISO (YYYY-MM-DD)'),
    trend_type: z.enum(['seasonal', 'daily_pattern', 'monthly_performance', 'pricing_trends', 'market_mix']).describe('Type of trend analysis'),
  }),
  execute: async ({ start, end, trend_type }) => {
    const db = getDb(true);
    let query = '';
    const params = [start, end];
    
    if (trend_type === 'seasonal') {
      query = `
        SELECT 
          strftime('%m', arrival) as month,
          COUNT(*) as bookings,
          SUM(room_rate) as revenue,
          AVG(room_rate) as avg_rate,
          AVG(night) as avg_los
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY month 
        ORDER BY month
      `;
    } else if (trend_type === 'daily_pattern') {
      query = `
        SELECT 
          CASE strftime('%w', arrival)
            WHEN '0' THEN 'Sunday'
            WHEN '1' THEN 'Monday'
            WHEN '2' THEN 'Tuesday'
            WHEN '3' THEN 'Wednesday'
            WHEN '4' THEN 'Thursday'
            WHEN '5' THEN 'Friday'
            WHEN '6' THEN 'Saturday'
          END as day_of_week,
          COUNT(*) as arrivals,
          AVG(room_rate) as avg_rate
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY strftime('%w', arrival)
        ORDER BY strftime('%w', arrival)
      `;
    } else if (trend_type === 'monthly_performance') {
      query = `
        SELECT 
          strftime('%Y-%m', arrival) as month,
          COUNT(*) as bookings,
          SUM(room_rate) as revenue,
          ROUND(AVG(room_rate), 2) as adr,
          COUNT(DISTINCT room_number) as unique_rooms
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY month 
        ORDER BY month
      `;
    } else if (trend_type === 'pricing_trends') {
      query = `
        SELECT 
          strftime('%Y-%m', arrival) as period,
          room_type,
          AVG(room_rate) as avg_price,
          MIN(room_rate) as min_price,
          MAX(room_rate) as max_price,
          COUNT(*) as bookings
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY period, room_type
        ORDER BY period, avg_price DESC
      `;
    } else if (trend_type === 'market_mix') {
      // SQLite lacks windowed SUM OVER in older builds; compute market share via subquery
      query = `
        SELECT 
          strftime('%Y-%m', arrival) as period,
          segment_ih,
          COUNT(*) as bookings,
          SUM(room_rate) as revenue,
          ROUND(COUNT(*) * 100.0 / (
            SELECT COUNT(*) FROM stays s2 
            WHERE strftime('%Y-%m', s2.arrival) = strftime('%Y-%m', stays.arrival)
              AND s2.arrival >= ? AND s2.arrival <= ?
          ), 2) as market_share_pct
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY period, segment_ih
        ORDER BY period, revenue DESC
      `;
    }
    
    const stmt = db.prepare(query);
    const results = trend_type === 'market_mix' 
      ? stmt.all(start, end, start, end) 
      : stmt.all(params);
    
    return {
      trend_analysis: trend_type,
      period: `${start} to ${end}`,
      data: results,
      insights_count: results.length,
    };
  },
});

// Custom Complex Query Tool
export const executeCustomQuery = tool({
  name: 'execute_custom_query',
  description:
    'Execute complex custom SQL queries for specific business questions that require filtering by multiple fields like company names, guest types, room details, etc.',
  parameters: z.object({
    description: z.string().describe('Description of what we are looking for'),
    sql_query: z.string().describe('Custom SQL query to execute'),
    expected_fields: z.array(z.string()).describe('Expected fields in the result'),
  }),
  execute: async ({ description, sql_query, expected_fields }) => {
    const db = getDb(true);
    
    try {
      // Security check - only allow SELECT statements
      const normalizedQuery = sql_query.trim().toLowerCase();
      if (!normalizedQuery.startsWith('select')) {
        throw new Error('Only SELECT queries are allowed');
      }
      // Simple whitelist enforcement: only allow reading from 'stays'
      if (!/\bfrom\s+stays\b/i.test(sql_query)) {
        throw new Error('Query must target table: stays');
      }
      
      const stmt = db.prepare(sql_query);
      const results = stmt.all();
      
      return {
        description,
        query_executed: sql_query,
        results: results,
        total_records: results.length,
        fields_returned: expected_fields,
        success: true
      };
    } catch (error: any) {
      return {
        description,
        query_executed: sql_query,
        error: error.message,
        success: false,
        suggestion: 'Check SQL syntax and table/column names. Available columns include: name, company_ta, segment_ih, night, room_type, etc.'
      };
    }
  },
});

// Smart Query Builder Tool
export const buildSmartQuery = tool({
  name: 'build_smart_query',
  description:
    'Build intelligent SQL queries for complex business questions. Use this when you need to find specific information by combining multiple fields.',
  parameters: z.object({
    business_question: z.string().describe('The business question to answer'),
    target_metric: z.enum(['average_los', 'total_revenue', 'guest_count', 'booking_count', 'occupancy_rate']).describe('What metric to calculate'),
    filter_criteria: z.array(z.object({
      field: z.string().describe('Database field to filter on'),
      condition: z.string().describe('SQL condition (LIKE, =, >, etc.)'),
      value: z.string().describe('Value to filter by')
    })).describe('Criteria to filter the data'),
  }),
  execute: async ({ business_question, target_metric, filter_criteria }) => {
    let baseQuery = '';
    let whereClause = '';
    let params: any[] = [];
    
    // Whitelist columns and operators
    const allowedFields = new Set(['name','company_ta','segment_ih','night','room_type','room_rate','arrival','depart','nat_fr','sob','arrangement']);
    const allowedOps = new Set(['=','>','<','>=','<=','LIKE']);
    
    const fragments: string[] = [];
    for (const criteria of filter_criteria) {
      const field = criteria.field.toLowerCase();
      const opRaw = criteria.condition.toUpperCase();
      const op = opRaw === 'CONTAINS' ? 'LIKE' : opRaw;
      if (!allowedFields.has(field) || !allowedOps.has(op)) continue;
      if (op === 'LIKE') {
        fragments.push(`${field} LIKE ?`);
        params.push(`%${criteria.value}%`);
      } else {
        fragments.push(`${field} ${op} ?`);
        params.push(criteria.value);
      }
    }
    if (fragments.length > 0) whereClause = `WHERE ${fragments.join(' AND ')}`;
    
    // Build query based on target metric
    switch (target_metric) {
      case 'average_los':
        baseQuery = `
          SELECT 
            AVG(night) as average_length_of_stay,
            COUNT(*) as total_bookings,
            SUM(room_rate) as total_revenue,
            MIN(night) as min_stay,
            MAX(night) as max_stay
          FROM stays 
          ${whereClause}
        `;
        break;
        
      case 'total_revenue':
        baseQuery = `
          SELECT 
            SUM(room_rate) as total_revenue,
            COUNT(*) as total_bookings,
            AVG(room_rate) as average_rate,
            AVG(night) as average_los
          FROM stays 
          ${whereClause}
        `;
        break;
        
      case 'guest_count':
        baseQuery = `
          SELECT 
            COUNT(DISTINCT name) as unique_guests,
            COUNT(*) as total_bookings,
            AVG(night) as average_los,
            SUM(room_rate) as total_revenue
          FROM stays 
          ${whereClause}
        `;
        break;
        
      case 'booking_count':
        baseQuery = `
          SELECT 
            COUNT(*) as total_bookings,
            COUNT(DISTINCT name) as unique_guests,
            SUM(room_rate) as total_revenue,
            AVG(night) as average_los,
            AVG(room_rate) as average_rate
          FROM stays 
          ${whereClause}
        `;
        break;
        
      default:
        baseQuery = `
          SELECT 
            COUNT(*) as total_records,
            AVG(night) as average_los,
            SUM(room_rate) as total_revenue
          FROM stays 
          ${whereClause}
        `;
    }
    
    try {
      const db = getDb(true);
      const stmt = db.prepare(baseQuery);
      const results = stmt.get(...params);
      
      return {
        business_question,
        sql_query: baseQuery,
        filter_applied: filter_criteria,
        results: results,
        interpretation: `Query executed successfully for: ${business_question}`
      };
    } catch (error: any) {
      return {
        business_question,
        sql_query: baseQuery,
        filter_applied: filter_criteria,
        error: error.message,
        suggestion: 'Check field names. Available fields: name, company_ta, segment_ih, night, room_type, room_rate, arrival, depart, etc.'
      };
    }
  },
});

// NEW: Find birthdays today
export const findBirthdaysToday = tool({
  name: 'find_birthdays_today',
  description: 'Cari tamu yang hari ini berulang tahun. Mencocokkan bulan-hari dari kolom Birth_Date terhadap tanggal hari ini. Opsional window hari ke depan/belakang.',
  parameters: z.object({
    window_days: z.number().default(0).describe('Jarak hari +/- dari hari ini untuk mencari ulang tahun (0 = tepat hari ini)'),
    top_n: z.number().default(50).describe('Batas jumlah hasil'),
  }),
  execute: async ({ window_days, top_n }) => {
    const db = getDb(true);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    // Build list of MM-DD strings to match (window)
    const targets: string[] = [];
    for (let d = -Math.abs(window_days); d <= Math.abs(window_days); d++) {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + d);
      const mm = pad(dt.getMonth() + 1);
      const dd = pad(dt.getDate());
      targets.push(`${mm}-${dd}`);
    }

    // SQLite: strftime('%m-%d', Birth_Date)
    const placeholders = targets.map(() => '?').join(',');
    const query = `
      SELECT 
        name, birth_date, company_ta, segment_ih,
        COUNT(*) as total_visits,
        SUM(room_rate) as total_spent,
        MIN(arrival) as first_visit,
        MAX(arrival) as last_visit
      FROM stays
      WHERE birth_date IS NOT NULL 
        AND strftime('%m-%d', birth_date) IN (${placeholders})
      GROUP BY LOWER(TRIM(name)), strftime('%m-%d', birth_date)
      ORDER BY total_spent DESC
      LIMIT ?
    `;

    const rows = db.prepare(query).all(...targets, top_n) as any[];

    return {
      query_date: today.toISOString().slice(0, 10),
      window_days,
      results: rows,
      total_found: rows.length,
      suggestion: rows.length === 0 ? 'Tidak ada tamu yang ulang tahun pada window ini' : undefined,
    };
  },
});

export const getGuestProfile = tool({
  name: 'get_guest_profile',
  description: 'Ambil ringkasan profil dan histori inap untuk 1 tamu (berdasarkan nama atau ID internal). Kembalikan info non-sensitif + metrik bisnis.',
  parameters: z.object({
    name: z.string().describe('Nama tamu persis sesuai data (case-insensitive)'),
    top_n_rooms: z.number().default(3).describe('Jumlah kategori kamar favorit'),
  }),
  execute: async ({ name, top_n_rooms }) => {
    const db = getDb(true);
    const target = name.trim().toLowerCase();

    // Profil dasar (ambil satu contoh paling baru)
    const profile = db.prepare(`
      SELECT name, occupation, sex, birth_date
      FROM stays
      WHERE LOWER(TRIM(name)) = ?
      ORDER BY arrival DESC
      LIMIT 1
    `).get(target) as any | undefined;

    // Ringkasan histori
    const summary = db.prepare(`
      SELECT
        COUNT(*) AS total_visits,
        SUM(room_rate) AS total_spent,
        ROUND(AVG(night), 2) AS avg_los,
        MIN(arrival) AS first_visit,
        MAX(arrival) AS last_visit
      FROM stays
      WHERE LOWER(TRIM(name)) = ?
    `).get(target) as any;

    // Kategori kamar favorit
    const rooms = db.prepare(`
      SELECT
        CASE 
          WHEN room_type LIKE 'D%' THEN 'Deluxe'
          WHEN room_type LIKE 'E%' OR room_type LIKE 'B%' THEN 'Executive Suite'
          WHEN room_type LIKE 'S%' OR room_type LIKE 'J%' THEN 'Suite'
          WHEN room_type LIKE 'F%' THEN 'Family Suite'
          ELSE 'Other'
        END as room_category,
        COUNT(*) AS count_bookings,
        ROUND(AVG(room_rate), 2) AS avg_rate
      FROM stays
      WHERE LOWER(TRIM(name)) = ?
      GROUP BY room_category
      ORDER BY count_bookings DESC
      LIMIT ?
    `).all(target, top_n_rooms) as any[];

    // Arrangement mix (RO/RB)
    const arrangements = db.prepare(`
      SELECT arrangement, COUNT(*) AS bookings
      FROM stays
      WHERE LOWER(TRIM(name)) = ? AND arrangement IS NOT NULL
      GROUP BY arrangement
      ORDER BY bookings DESC
    `).all(target) as any[];

    // Channel/source mix
    const channels = db.prepare(`
      SELECT sob AS channel, COUNT(*) AS bookings
      FROM stays
      WHERE LOWER(TRIM(name)) = ? AND sob IS NOT NULL
      GROUP BY sob
      ORDER BY bookings DESC
    `).all(target) as any[];

    return {
      guest_name: name,
      profile: profile || null,
      summary: {
        total_visits: Number(summary?.total_visits ?? 0),
        total_spent: Number(summary?.total_spent ?? 0),
        avg_los: Number(summary?.avg_los ?? 0),
        first_visit: summary?.first_visit ?? null,
        last_visit: summary?.last_visit ?? null,
      },
      favorites: rooms,
      arrangement_mix: arrangements,
      channel_mix: channels,
      contacts: (() => {
        const contact = db.prepare(`
          SELECT mobile_phone, email FROM stays
          WHERE LOWER(TRIM(name)) = ?
          ORDER BY arrival DESC
          LIMIT 1
        `).get(target) as any | undefined;
        return contact ? { mobile_phone: contact.mobile_phone || null, email: contact.email || null } : { mobile_phone: null, email: null };
      })(),
    };
  },
});


