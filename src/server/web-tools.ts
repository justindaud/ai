import { z } from 'zod';
import { tool } from '@openai/agents';
import fetch from 'node-fetch';

// Web Search Tool (Example Implementation)
export const webSearch = tool({
  name: 'web_search',
  description: 'Search the internet for information not available in hotel database',
  parameters: z.object({
    query: z.string().describe('Search query for web search'),
    context: z.string().describe('Context of why web search is needed'),
  }),
  execute: async ({ query, context }) => {
    try {
      const apiKey = process.env.SERPAPI_KEY || process.env.BING_SEARCH_KEY;
      if (!apiKey) {
        return { error: 'No search API key configured', suggestion: 'Set SERPAPI_KEY or BING_SEARCH_KEY in ENV' };
      }
      // Prefer SerpAPI if available
      if (process.env.SERPAPI_KEY) {
        const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&engine=google&api_key=${process.env.SERPAPI_KEY}`;
        const resp = await fetch(url);
        const json: any = await resp.json();
        const results = (json.organic_results || []).slice(0, 5).map((r: any) => ({ title: r.title, snippet: r.snippet, url: r.link }));
        return { query, context, results };
      }
      // Fallback to Bing V7
      const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&mkt=id-ID`;
      const resp = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': apiKey } });
      const json: any = await resp.json();
      const results = (json.webPages?.value || []).slice(0, 5).map((r: any) => ({ title: r.name, snippet: r.snippet, url: r.url }));
      return { query, context, results };
    } catch (error: any) {
      return { error: 'Web search error', details: error.message };
    }
  },
});

// Context Router Tool
export const contextRouter = tool({
  name: 'route_context',
  description: 'Determine if question is hotel-related or needs external search',
  parameters: z.object({
    question: z.string().describe('User question to analyze'),
  }),
  execute: async ({ question }) => {
    const hotelKeywords = [
      'revenue', 'adr', 'occupancy', 'guest', 'room', 'hotel', 'booking', 
      'embassy', 'corporate', 'stay', 'night', 'tamu', 'kamar', 'pendapatan'
    ];
    
    const isHotelRelated = hotelKeywords.some(keyword => 
      question.toLowerCase().includes(keyword)
    );
    
    return {
      is_hotel_related: isHotelRelated,
      suggested_action: isHotelRelated 
        ? "Use hotel analytics tools" 
        : "Use web search or clarify context",
      confidence: isHotelRelated ? 0.8 : 0.3
    };
  },
});
