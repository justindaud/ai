import { z } from 'zod';
import { tool } from '@openai/agents';

// AI Memory & Learning System
interface LearningData {
  query: string;
  response: string;
  feedback: 'positive' | 'negative' | 'correction';
  correction?: string;
  timestamp: number;
  userId?: string;
}

class AIIntelligence {
  private memory: Map<string, LearningData[]> = new Map();
  private patterns: Map<string, any> = new Map();
  
  // Store learning data
  async learn(data: LearningData) {
    const key = this.generateKey(data.query);
    const existing = this.memory.get(key) || [];
    existing.push(data);
    this.memory.set(key, existing);
    
    // Update patterns
    await this.updatePatterns(data);
  }
  
  // Extract patterns from data
  private async updatePatterns(data: LearningData) {
    // Detect common query patterns
    if (data.query.includes('ADR') || data.query.includes('average daily rate')) {
      this.updatePattern('adr_queries', data);
    }
    
    if (data.query.includes('occupancy') || data.query.includes('hunian')) {
      this.updatePattern('occupancy_queries', data);
    }
    
    // Learn from corrections
    if (data.feedback === 'correction' && data.correction) {
      this.updatePattern('corrections', {
        original: data.query,
        corrected: data.correction,
        context: data.response
      });
    }
  }
  
  private updatePattern(type: string, data: any) {
    const existing = this.patterns.get(type) || [];
    existing.push({ ...data, timestamp: Date.now() });
    this.patterns.set(type, existing);
  }
  
  // Get relevant context for query
  async getContext(query: string): Promise<string[]> {
    const key = this.generateKey(query);
    const learningData = this.memory.get(key) || [];
    
    const context: string[] = [];
    
    // Add learned corrections
    const corrections = this.patterns.get('corrections') || [];
    for (const correction of corrections) {
      if (this.isSimilarQuery(query, correction.original)) {
        context.push(`LEARNED CORRECTION: ${correction.corrected}`);
      }
    }
    
    // Add successful patterns
    learningData
      .filter(d => d.feedback === 'positive')
      .slice(-3) // Last 3 successful responses
      .forEach(d => {
        context.push(`SUCCESSFUL PATTERN: ${d.query} -> ${d.response.substring(0, 100)}...`);
      });
    
    return context;
  }
  
  private generateKey(query: string): string {
    // Simple key generation - normalize query
    return query.toLowerCase()
      .replace(/\d{4}/g, 'YEAR') // Replace years
      .replace(/januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember/gi, 'MONTH')
      .replace(/\s+/g, '_');
  }
  
  private isSimilarQuery(query1: string, query2: string): boolean {
    const key1 = this.generateKey(query1);
    const key2 = this.generateKey(query2);
    return key1 === key2;
  }
  
  // Get intelligent insights based on learning
  async getIntelligentInsights(query: string, baseResponse: any): Promise<string[]> {
    const insights: string[] = [];
    
    // Pattern-based insights
    if (query.includes('ADR')) {
      const adrPattern = this.patterns.get('adr_queries') || [];
      if (adrPattern.length > 5) {
        insights.push("INSIGHT: Berdasarkan analisis sebelumnya, ADR hotel Anda konsisten di range Rp 700-800rb. Pertimbangkan dynamic pricing untuk optimasi.");
      }
    }
    
    if (query.includes('occupancy')) {
      const occupancyPattern = this.patterns.get('occupancy_queries') || [];
      if (occupancyPattern.length > 3) {
        insights.push("INSIGHT: Occupancy rate Anda di range 28-30%. Fokus pada channel marketing dan promotional strategy untuk meningkatkan ke target 50%+.");
      }
    }
    
    return insights;
  }
}

// Global AI Intelligence instance
export const aiIntelligence = new AIIntelligence();

// Learning tool for the agent
export const learnFromInteraction = tool({
  name: 'learn_from_interaction',
  description: 'Learn from user interactions and improve responses',
  parameters: z.object({
    query: z.string().describe('Original user query'),
    response: z.string().describe('AI response'),
    feedback_type: z.enum(['positive', 'negative', 'correction']).describe('Type of feedback'),
    correction: z.string().nullable().describe('User correction if applicable'),
  }),
  execute: async ({ query, response, feedback_type, correction }) => {
    await aiIntelligence.learn({
      query,
      response, 
      feedback: feedback_type,
      correction: correction || undefined,
      timestamp: Date.now()
    });
    
    return {
      learned: true,
      message: `Feedback captured: ${feedback_type}`,
      correction_stored: !!correction
    };
  },
});

// Enhanced context provider
export const getIntelligentContext = tool({
  name: 'get_intelligent_context',
  description: 'Get intelligent context and insights based on learning',
  parameters: z.object({
    query: z.string().describe('User query to get context for'),
  }),
  execute: async ({ query }) => {
    const context = await aiIntelligence.getContext(query);
    const insights = await aiIntelligence.getIntelligentInsights(query, {});
    
    return {
      learned_context: context,
      intelligent_insights: insights,
      has_learning_data: context.length > 0
    };
  },
});

// Business rules and domain knowledge
export const hotelIntelligence = {
  businessRules: [
    "Room_Rate already includes Lodging - never add them together",
    "ADR above Rp 800,000 is excellent for this property class",
    "Occupancy below 50% requires immediate action",
    "OTA dominance above 70% indicates over-dependence risk",
    "Weekend rates typically 20-30% higher than weekdays",
    "Corporate segments prefer Monday-Thursday bookings",
    "Resort guests have longer ALOS than business travelers"
  ],
  
  industryBenchmarks: {
    adr: { excellent: 800000, good: 600000, poor: 400000 },
    occupancy: { excellent: 80, good: 60, poor: 40 },
    revpar: { excellent: 500000, good: 300000, poor: 200000 },
    alos: { excellent: 3.0, good: 2.0, poor: 1.5 }
  },
  
  getContextualAdvice(metric: string, value: number): string {
    const benchmarks = this.industryBenchmarks[metric as keyof typeof this.industryBenchmarks];
    if (!benchmarks) return '';
    
    if (value >= benchmarks.excellent) {
      return `Excellent performance! ${metric.toUpperCase()} is above industry standards.`;
    } else if (value >= benchmarks.good) {
      return `Good performance. ${metric.toUpperCase()} is within acceptable range.`;
    } else {
      return `Below expectations. ${metric.toUpperCase()} needs immediate attention and improvement strategies.`;
    }
  }
};
