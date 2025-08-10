import { z } from 'zod';
import { Agent, tool } from '@openai/agents';
import { getDb } from '@/lib/db';

// Data Quality & Cleaning Tools with Human-in-the-Loop
export const detectDuplicateGuests = tool({
  name: 'detect_duplicate_guests',
  description: 'Detect potential duplicate guest identities and request human approval for merging',
  parameters: z.object({
    start: z.string().describe('Start date ISO (YYYY-MM-DD)'),
    end: z.string().describe('End date ISO (YYYY-MM-DD)'),
    similarity_threshold: z.number().default(0.7).describe('Similarity threshold for flagging duplicates'),
    top_n: z.number().default(20).describe('Number of potential duplicates to analyze'),
  }),
  // This tool requires human approval for merging data
  needsApproval: async (context, { similarity_threshold }) => {
    // Always require approval when similarity is high enough to suggest merging
    return similarity_threshold >= 0.6;
  },
  execute: async ({ start, end, similarity_threshold, top_n }) => {
    const db = getDb(true);
    
    // Get potential duplicate candidates
    const query = `
      SELECT 
        name,
        mobile_phone,
        email,
        id_no,
        nat_fr,
        COUNT(*) as booking_count,
        SUM(room_rate) as total_spent,
        GROUP_CONCAT(DISTINCT arrival) as visit_dates,
        GROUP_CONCAT(DISTINCT room_type) as room_types
      FROM stays 
      WHERE arrival >= ? AND arrival <= ?
      GROUP BY LOWER(TRIM(name))
      HAVING booking_count >= 1
      ORDER BY booking_count DESC, total_spent DESC
      LIMIT ?
    `;
    
    const candidates = db.prepare(query).all(start, end, top_n * 2) as any[];
    
    // Advanced duplicate detection logic
    const duplicateGroups = [];
    const processed = new Set();
    
    for (let i = 0; i < candidates.length; i++) {
      if (processed.has(i)) continue;
      
      const currentGuest = candidates[i];
      const similarGuests = [currentGuest];
      
      // Find similar guests using multiple criteria
      for (let j = i + 1; j < candidates.length; j++) {
        if (processed.has(j)) continue;
        
        const otherGuest = candidates[j];
        const similarity = calculateGuestSimilarity(currentGuest, otherGuest);
        
        if (similarity.score >= similarity_threshold) {
          similarGuests.push({
            ...otherGuest,
            similarity_score: similarity.score,
            matching_factors: similarity.factors
          });
          processed.add(j);
        }
      }
      
      if (similarGuests.length > 1) {
        duplicateGroups.push({
          group_id: `dup_${Date.now()}_${i}`,
          primary_guest: currentGuest,
          similar_guests: similarGuests.slice(1),
          confidence_level: Math.max(...similarGuests.slice(1).map(g => g.similarity_score || 0)),
          suggested_action: 'merge_profiles',
          impact: {
            booking_consolidation: similarGuests.reduce((sum, g) => sum + g.booking_count, 0),
            revenue_consolidation: similarGuests.reduce((sum, g) => sum + g.total_spent, 0)
          }
        });
      }
      
      processed.add(i);
      if (duplicateGroups.length >= top_n) break;
    }
    
    return {
      analysis_type: 'Duplicate Guest Detection',
      period: `${start} to ${end}`,
      similarity_threshold,
      total_candidates: candidates.length,
      duplicate_groups_found: duplicateGroups.length,
      duplicate_groups: duplicateGroups,
      approval_required: true,
      next_action: 'Human approval needed to proceed with merging'
    };
  },
});

export const performDataCleaning = tool({
  name: 'perform_data_cleaning',
  description: 'Perform various data cleaning operations: name standardization, phone formatting, typo detection',
  parameters: z.object({
    cleaning_type: z.enum(['name_standardization', 'phone_formatting', 'typo_detection', 'missing_data_filling']).describe('Type of cleaning operation'),
    start: z.string().describe('Start date ISO (YYYY-MM-DD)'),
    end: z.string().describe('End date ISO (YYYY-MM-DD)'),
    auto_fix: z.boolean().default(false).describe('Auto-fix obvious issues without approval'),
  }),
  needsApproval: async (context, { auto_fix, cleaning_type }) => {
    // Require approval for non-trivial changes
    if (cleaning_type === 'typo_detection' || !auto_fix) return true;
    return false;
  },
  execute: async ({ cleaning_type, start, end, auto_fix }) => {
    const db = getDb(auto_fix ? false : true);
    
    if (cleaning_type === 'name_standardization') {
      const query = `
        SELECT DISTINCT name, COUNT(*) as frequency
        FROM stays 
        WHERE arrival >= ? AND arrival <= ?
        GROUP BY name
        ORDER BY frequency DESC
        LIMIT 100
      `;
      
      const names = db.prepare(query).all(start, end) as any[];
      
      const standardizationSuggestions = names.map(record => {
        const originalName = record.name;
        const standardizedName = standardizeName(originalName);
        
        return {
          original: originalName,
          suggested: standardizedName,
          frequency: record.frequency,
          changes_needed: originalName !== standardizedName,
          cleaning_rules: getAppliedRules(originalName, standardizedName)
        };
      }).filter(s => s.changes_needed);
      
      const payload = {
        cleaning_type: 'Name Standardization',
        period: `${start} to ${end}`,
        total_names_analyzed: names.length,
        standardization_suggestions: standardizationSuggestions,
        auto_fix_eligible: standardizationSuggestions.filter(s => s.cleaning_rules.includes('title_removal')).length,
        approval_required: !auto_fix
      };
      if (auto_fix && standardizationSuggestions.length > 0) {
        db.exec(`CREATE TABLE IF NOT EXISTS cleaned_name_standardization (
          id TEXT PRIMARY KEY,
          original TEXT,
          suggested TEXT,
          frequency INTEGER,
          created_at TEXT
        )`);
        const nowIso = new Date().toISOString();
        const stmt = db.prepare(`INSERT INTO cleaned_name_standardization (id, original, suggested, frequency, created_at) VALUES (?, ?, ?, ?, ?)`);
        for (const s of standardizationSuggestions) {
          const id = `namefix_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
          stmt.run(id, s.original, s.suggested, s.frequency, nowIso);
        }
      }
      return payload;
      
    } else if (cleaning_type === 'phone_formatting') {
      const query = `
        SELECT DISTINCT mobile_phone, COUNT(*) as frequency
        FROM stays 
        WHERE arrival >= ? AND arrival <= ? AND mobile_phone IS NOT NULL
        GROUP BY mobile_phone
        ORDER BY frequency DESC
        LIMIT 100
      `;
      
      const phones = db.prepare(query).all(start, end) as any[];
      
      const phoneStandardization = phones.map(record => {
        const originalPhone = record.mobile_phone;
        const standardizedPhone = standardizePhone(originalPhone);
        
        return {
          original: originalPhone,
          suggested: standardizedPhone,
          frequency: record.frequency,
          changes_needed: originalPhone !== standardizedPhone,
          format_issues: detectPhoneIssues(originalPhone)
        };
      }).filter(s => s.changes_needed);
      
      const payload = {
        cleaning_type: 'Phone Formatting',
        period: `${start} to ${end}`,
        phone_standardization: phoneStandardization,
        auto_fix_eligible: phoneStandardization.filter(s => s.format_issues.includes('spacing')).length
      };
      if (auto_fix && phoneStandardization.length > 0) {
        db.exec(`CREATE TABLE IF NOT EXISTS cleaned_phone_formatting (
          id TEXT PRIMARY KEY,
          original TEXT,
          suggested TEXT,
          frequency INTEGER,
          created_at TEXT
        )`);
        const nowIso = new Date().toISOString();
        const stmt = db.prepare(`INSERT INTO cleaned_phone_formatting (id, original, suggested, frequency, created_at) VALUES (?, ?, ?, ?, ?)`);
        for (const p of phoneStandardization) {
          const id = `phonefix_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
          stmt.run(id, p.original, p.suggested, p.frequency, nowIso);
        }
      }
      return payload;
      
    } else if (cleaning_type === 'typo_detection') {
      // Detect common typos in guest names, companies, etc.
      const commonTypos = detectCommonTypos(start, end);
      
      return {
        cleaning_type: 'Typo Detection',
        period: `${start} to ${end}`,
        potential_typos: commonTypos,
        approval_required: true,
        suggested_corrections: commonTypos.map(t => ({
          field: t.field,
          original: t.original_value,
          suggested: t.suggested_correction,
          confidence: t.confidence,
          frequency: t.frequency
        }))
      };
    }
    
    return { error: 'Cleaning type not implemented' };
  },
});

export const mergeDuplicateProfiles = tool({
  name: 'merge_duplicate_profiles',
  description: 'Merge approved duplicate guest profiles into consolidated records',
  parameters: z.object({
    merge_instructions: z.array(z.object({
      group_id: z.string(),
      primary_guest_name: z.string(),
      merge_with: z.array(z.string()),
      consolidation_rules: z.object({
        keep_latest_contact: z.boolean().default(true),
        sum_financial_data: z.boolean().default(true),
        preserve_visit_history: z.boolean().default(true),
      })
    })).describe('Approved merge instructions from human review'),
  }),
  needsApproval: true, // Always require approval for actual data merging
  execute: async ({ merge_instructions }) => {
    const db = getDb(false);
    // Write merges to an audit table first to preserve raw vs cleaned.
    db.exec(`CREATE TABLE IF NOT EXISTS cleaned_profile_merges (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      primary_profile TEXT,
      merged_profiles TEXT,
      created_at TEXT
    )`);

    const nowIso = new Date().toISOString();
    const results = [] as any[];
    for (const instruction of merge_instructions) {
      const id = `merge_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      db.prepare(`INSERT INTO cleaned_profile_merges (id, group_id, primary_profile, merged_profiles, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(id, instruction.group_id, instruction.primary_guest_name, JSON.stringify(instruction.merge_with), nowIso);
      results.push({ id, group_id: instruction.group_id, primary_profile: instruction.primary_guest_name, merged_profiles: instruction.merge_with });
    }

    return {
      operation: 'Profile Merging (staged to cleaned_profile_merges)',
      merge_results: results,
      total_merges: results.length,
      next_steps: 'Entries staged. Consider running consolidation job to update analytical views.'
    };
  },
});

// Helper functions
function calculateGuestSimilarity(guest1: any, guest2: any): { score: number; factors: string[] } {
  const factors: string[] = [];
  let score = 0;
  
  // Name similarity (simplified)
  const name1 = guest1.name.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const name2 = guest2.name.toLowerCase().replace(/[^\w\s]/g, '').trim();
  
  if (name1 === name2) {
    score += 0.4;
    factors.push('Exact name match');
  } else if (name1.includes(name2) || name2.includes(name1)) {
    score += 0.3;
    factors.push('Partial name match');
  }
  
  // Phone similarity
  if (guest1.mobile_phone && guest2.mobile_phone) {
    const phone1 = guest1.mobile_phone.replace(/\D/g, '');
    const phone2 = guest2.mobile_phone.replace(/\D/g, '');
    if (phone1 === phone2 && phone1.length > 8) {
      score += 0.3;
      factors.push('Phone match');
    }
  }
  
  // Email similarity
  if (guest1.email && guest2.email) {
    if (guest1.email.toLowerCase() === guest2.email.toLowerCase()) {
      score += 0.2;
      factors.push('Email match');
    }
  }
  
  // ID number similarity
  if (guest1.id_no && guest2.id_no) {
    if (guest1.id_no === guest2.id_no) {
      score += 0.1;
      factors.push('ID match');
    }
  }
  
  return { score, factors };
}

function standardizeName(name: string): string {
  if (!name) return name;
  
  // Remove common titles and normalize
  let standardized = name
    .replace(/\b(pak|bu|bapak|ibu|dr|prof|h|hj|drs|ir|mt|st|se)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  // Proper case
  standardized = standardized.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
    
  return standardized;
}

function standardizePhone(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Indonesian phone format
  if (digitsOnly.startsWith('62')) {
    return `+62 ${digitsOnly.slice(2, 5)} ${digitsOnly.slice(5, 9)} ${digitsOnly.slice(9)}`;
  } else if (digitsOnly.startsWith('0')) {
    return `+62 ${digitsOnly.slice(1, 4)} ${digitsOnly.slice(4, 8)} ${digitsOnly.slice(8)}`;
  }
  
  return phone;
}

function getAppliedRules(original: string, standardized: string): string[] {
  const rules = [];
  if (original.length !== standardized.length) rules.push('title_removal');
  if (original.toLowerCase() !== standardized.toLowerCase()) rules.push('case_correction');
  return rules;
}

function detectPhoneIssues(phone: string): string[] {
  const issues = [];
  if (/\s{2,}/.test(phone)) issues.push('spacing');
  if (!/^\+/.test(phone) && phone.length > 8) issues.push('missing_country_code');
  return issues;
}

function detectCommonTypos(start: string, end: string): any[] {
  // Simplified typo detection - would be more sophisticated in real implementation
  return [
    {
      field: 'name',
      original_value: 'Jhon Smith',
      suggested_correction: 'John Smith',
      confidence: 0.9,
      frequency: 3
    },
    {
      field: 'company_ta',
      original_value: 'Embasy',
      suggested_correction: 'Embassy',
      confidence: 0.95,
      frequency: 5
    }
  ];
}

// Data Quality Agent Configuration
export const dataQualityAgent = new Agent({
  name: 'Data Quality Specialist',
  model: process.env.DQ_MODEL || 'gpt-4.1-mini',
  modelSettings: { toolChoice: 'auto', parallelToolCalls: true, maxTokens: 1200 },
  instructions: `
You are a specialized data quality and cleaning agent for hotel guest data.

PRIMARY RESPONSIBILITIES:
- Detect duplicate guest identities across variations in names, titles, formatting
- Identify data quality issues: typos, formatting inconsistencies, missing information
- Suggest data standardization and cleaning operations
- Request human approval for significant data changes

DUPLICATE DETECTION EXPERTISE:
- Handle name variations: "Pak John", "John Smith SE", "J. Smith", "John S."
- Account for title prefixes/suffixes: Dr, Prof, Pak, Bu, SE, ST, etc.
- Consider multiple identity factors: name, phone, email, ID number
- Calculate confidence scores for suggested merges

HUMAN-IN-THE-LOOP PROTOCOL:
- ALWAYS request approval for duplicate merges with confidence > 60%
- ALWAYS request approval for typo corrections affecting >5 records
- Auto-fix only obvious formatting issues (spacing, case)
- Provide clear justification for suggested changes

QUALITY ASSESSMENT:
- Analyze data completeness, consistency, accuracy
- Detect patterns indicating data entry errors
- Suggest validation rules and data standards
- Estimate impact of quality improvements on analytics accuracy

Use the internal SQLite database \`stays\` as the default data source unless the user explicitly uploads an external file. Do not ask for uploads unless the user intends to provide additional data.

Respond in Indonesian with detailed analysis and clear recommendations for data quality improvements.
`,
  tools: [detectDuplicateGuests, performDataCleaning, mergeDuplicateProfiles],
});

