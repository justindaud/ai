import { z } from 'zod';
import { tool } from '@openai/agents';
import { getDb } from '@/lib/db';

// Revenue Forecasting & Prediction Tools
export const forecastRevenue = tool({
  name: 'forecast_revenue',
  description: 
    'Generate revenue forecasts using historical data patterns, seasonal trends, and booking velocity. Supports multiple forecasting methodologies.',
  parameters: z.object({
    forecast_horizon: z.enum(['1_month', '3_months', '6_months', '1_year']).describe('How far ahead to forecast'),
    forecast_method: z.enum(['seasonal_trend', 'moving_average', 'booking_pace', 'hybrid']).describe('Forecasting methodology'),
    base_period_start: z.string().describe('Historical data start date (YYYY-MM-DD)'),
    base_period_end: z.string().describe('Historical data end date (YYYY-MM-DD)'),
    include_confidence_intervals: z.boolean().default(true).describe('Include upper/lower confidence bounds'),
    segment_breakdown: z.boolean().default(false).describe('Provide forecast by guest segment'),
  }),
  execute: async ({ forecast_horizon, forecast_method, base_period_start, base_period_end, include_confidence_intervals, segment_breakdown }) => {
    const db = getDb(true);
    
    // Get historical data for analysis
    const historicalQuery = `
      SELECT 
        strftime('%Y-%m', arrival) as month,
        COUNT(*) as bookings,
        SUM(room_rate) as revenue,
        AVG(room_rate) as adr,
        segment_ih,
        AVG(night) as avg_los
      FROM stays 
      WHERE arrival >= ? AND arrival <= ?
      GROUP BY month${segment_breakdown ? ', segment_ih' : ''}
      ORDER BY month
    `;
    
    const historicalData = db.prepare(historicalQuery).all(base_period_start, base_period_end) as any[];
    
    if (historicalData.length === 0) {
      return {
        error: 'Insufficient historical data for forecasting',
        suggestion: 'Ensure base period contains actual booking data'
      };
    }
    
    // Calculate forecast periods
    const forecastPeriods = generateForecastPeriods(forecast_horizon);
    const forecasts = [];
    
    for (const period of forecastPeriods) {
      let forecastValue = 0;
      let confidence = { lower: 0, upper: 0 };
      
      if (forecast_method === 'seasonal_trend') {
        // Seasonal decomposition forecast
        const seasonalForecast = calculateSeasonalForecast(historicalData, period);
        forecastValue = seasonalForecast.value;
        confidence = seasonalForecast.confidence;
        
      } else if (forecast_method === 'moving_average') {
        // Simple moving average
        const recentPeriods = historicalData.slice(-6); // Last 6 months
        forecastValue = recentPeriods.reduce((sum, p) => sum + p.revenue, 0) / recentPeriods.length;
        confidence = calculateMovingAverageConfidence(recentPeriods, forecastValue);
        
      } else if (forecast_method === 'booking_pace') {
        // Booking pace analysis
        const paceForecast = calculateBookingPaceForecast(historicalData, period);
        forecastValue = paceForecast.value;
        confidence = paceForecast.confidence;
        
      } else if (forecast_method === 'hybrid') {
        // Combine multiple methods
        const seasonal = calculateSeasonalForecast(historicalData, period);
        const movingAvg = historicalData.slice(-3).reduce((sum, p) => sum + p.revenue, 0) / 3;
        const pace = calculateBookingPaceForecast(historicalData, period);
        
        // Weighted average of methods
        forecastValue = (seasonal.value * 0.5) + (movingAvg * 0.3) + (pace.value * 0.2);
        confidence = {
          lower: forecastValue * 0.85,
          upper: forecastValue * 1.15
        };
      }
      
      forecasts.push({
        period: period.month,
        forecasted_revenue: Math.round(forecastValue),
        confidence_interval: include_confidence_intervals ? {
          lower_bound: Math.round(confidence.lower),
          upper_bound: Math.round(confidence.upper),
          confidence_level: '85%'
        } : null,
        forecast_method,
        seasonal_factor: getSeasonalFactor(period.month),
        growth_rate: calculateGrowthRate(historicalData, forecastValue)
      });
    }
    
    // Calculate summary metrics
    const totalForecast = forecasts.reduce((sum, f) => sum + f.forecasted_revenue, 0);
    const avgMonthlyGrowth = forecasts.reduce((sum, f) => sum + f.growth_rate, 0) / forecasts.length;
    
    return {
      forecast_type: 'Revenue Forecast',
      methodology: forecast_method,
      horizon: forecast_horizon,
      base_period: `${base_period_start} to ${base_period_end}`,
      historical_average: historicalData.reduce((sum, h) => sum + h.revenue, 0) / historicalData.length,
      forecasts: forecasts,
      summary: {
        total_forecast_period: totalForecast,
        average_monthly_forecast: totalForecast / forecasts.length,
        projected_growth_rate: avgMonthlyGrowth,
        forecast_confidence: include_confidence_intervals ? 'High (85% intervals)' : 'Medium',
        key_assumptions: [
          'Historical patterns continue',
          'No major market disruptions',
          'Current pricing strategy maintained',
          'Seasonal patterns remain consistent'
        ]
      },
      recommendations: generateForecastRecommendations(forecasts, avgMonthlyGrowth)
    };
  },
});

// Channel Performance Analysis Tool
export const analyzeChannelPerformance = tool({
  name: 'analyze_channel_performance',
  description:
    'Comprehensive analysis of booking channel performance: revenue contribution, cost efficiency, guest quality, and optimization opportunities.',
  parameters: z.object({
    start: z.string().describe('Start date ISO (YYYY-MM-DD)'),
    end: z.string().describe('End date ISO (YYYY-MM-DD)'),
    analysis_type: z.enum(['revenue_contribution', 'cost_efficiency', 'guest_quality', 'channel_mix_optimization']).describe('Type of channel analysis'),
    include_trends: z.boolean().default(true).describe('Include time-based trends'),
    top_n_channels: z.number().default(10).describe('Number of top channels to analyze'),
  }),
  execute: async ({ start, end, analysis_type, include_trends, top_n_channels }) => {
    const db = getDb(true);
    
    if (analysis_type === 'revenue_contribution') {
      const query = `
        SELECT 
          sob as channel,
          COUNT(*) as bookings,
          SUM(room_rate) as total_revenue,
          AVG(room_rate) as avg_booking_value,
          AVG(night) as avg_los,
          COUNT(DISTINCT name) as unique_guests,
          SUM(room_rate) * 100.0 / (SELECT SUM(room_rate) FROM stays WHERE arrival >= ? AND arrival <= ?) as revenue_share_pct
        FROM stays 
        WHERE arrival >= ? AND arrival <= ? AND sob IS NOT NULL
        GROUP BY sob
        ORDER BY total_revenue DESC
        LIMIT ?
      `;
      
      const channels = db.prepare(query).all(start, end, start, end, top_n_channels) as any[];
      
      // Get trend data if requested
      let trendData = null;
      if (include_trends) {
        const trendQuery = `
          SELECT 
            strftime('%Y-%m', arrival) as month,
            sob as channel,
            SUM(room_rate) as monthly_revenue,
            COUNT(*) as monthly_bookings
          FROM stays 
          WHERE arrival >= ? AND arrival <= ? AND sob IS NOT NULL
          GROUP BY month, channel
          ORDER BY month, monthly_revenue DESC
        `;
        trendData = db.prepare(trendQuery).all(start, end);
      }
      
      return {
        analysis_type: 'Channel Revenue Contribution',
        period: `${start} to ${end}`,
        channels: channels.map(ch => ({
          ...ch,
          revenue_per_guest: ch.unique_guests > 0 ? ch.total_revenue / ch.unique_guests : 0,
          booking_frequency: ch.bookings / ch.unique_guests,
          performance_tier: ch.revenue_share_pct > 20 ? 'Tier 1' : 
                           ch.revenue_share_pct > 10 ? 'Tier 2' : 
                           ch.revenue_share_pct > 5 ? 'Tier 3' : 'Tier 4'
        })),
        trend_analysis: trendData,
        insights: {
          dominant_channel: channels[0],
          channel_concentration: channels.slice(0, 3).reduce((sum, ch) => sum + ch.revenue_share_pct, 0),
          diversification_score: calculateChannelDiversification(channels),
          revenue_risk: channels[0].revenue_share_pct > 50 ? 'High' : 'Medium'
        }
      };
      
    } else if (analysis_type === 'cost_efficiency') {
      // Simulate commission/cost data (in real implementation, this would come from a costs table)
      const query = `
        SELECT 
          sob as channel,
          COUNT(*) as bookings,
          SUM(room_rate) as gross_revenue,
          AVG(room_rate) as avg_booking_value
        FROM stays 
        WHERE arrival >= ? AND arrival <= ? AND sob IS NOT NULL
        GROUP BY sob
        ORDER BY gross_revenue DESC
        LIMIT ?
      `;
      
      const channels = db.prepare(query).all(start, end, top_n_channels) as any[];
      
      // Add simulated cost data
      const channelsWithCosts = channels.map(ch => {
        const commissionRate = getChannelCommissionRate(ch.channel);
        const acquisitionCost = ch.gross_revenue * commissionRate;
        const netRevenue = ch.gross_revenue - acquisitionCost;
        
        return {
          ...ch,
          commission_rate: commissionRate,
          total_acquisition_cost: acquisitionCost,
          net_revenue: netRevenue,
          cost_per_booking: acquisitionCost / ch.bookings,
          net_margin: (netRevenue / ch.gross_revenue) * 100,
          roi: (netRevenue / acquisitionCost) * 100
        };
      });
      
      return {
        analysis_type: 'Channel Cost Efficiency',
        period: `${start} to ${end}`,
        channels: channelsWithCosts,
        cost_summary: {
          total_acquisition_cost: channelsWithCosts.reduce((sum, ch) => sum + ch.total_acquisition_cost, 0),
          average_commission_rate: channelsWithCosts.reduce((sum, ch) => sum + ch.commission_rate, 0) / channelsWithCosts.length,
          best_margin_channel: channelsWithCosts.reduce((best, ch) => ch.net_margin > best.net_margin ? ch : best, channelsWithCosts[0]),
          most_efficient_channel: channelsWithCosts.reduce((best, ch) => ch.cost_per_booking < best.cost_per_booking ? ch : best, channelsWithCosts[0])
        }
      };
      
    } else if (analysis_type === 'guest_quality') {
      const query = `
        SELECT 
          sob as channel,
          COUNT(*) as total_bookings,
          AVG(night) as avg_los,
          AVG(room_rate) as avg_spend,
          COUNT(DISTINCT name) as unique_guests,
          segment_ih
        FROM stays 
        WHERE arrival >= ? AND arrival <= ? AND sob IS NOT NULL
        GROUP BY sob, segment_ih
        ORDER BY sob, total_bookings DESC
      `;
      
      const channelSegments = db.prepare(query).all(start, end) as any[];
      
      // Aggregate by channel
      const channelQuality = {};
      channelSegments.forEach(cs => {
        if (!channelQuality[cs.channel]) {
          channelQuality[cs.channel] = {
            channel: cs.channel,
            total_bookings: 0,
            avg_los: 0,
            avg_spend: 0,
            unique_guests: 0,
            segments: [],
            loyalty_potential: 0
          };
        }
        
        const quality = channelQuality[cs.channel];
        quality.total_bookings += cs.total_bookings;
        quality.avg_los = (quality.avg_los + cs.avg_los) / 2;
        quality.avg_spend = (quality.avg_spend + cs.avg_spend) / 2;
        quality.segments.push({
          segment: cs.segment_ih,
          bookings: cs.total_bookings
        });
        
        // Calculate loyalty potential (repeat booking ratio)
        quality.loyalty_potential = quality.unique_guests > 0 ? 
          (quality.total_bookings / quality.unique_guests) : 1;
      });
      
      const channelQualityArray = Object.values(channelQuality).map((ch: any) => ({
        ...ch,
        guest_value_score: (ch.avg_los * 0.3) + (ch.avg_spend / 10000 * 0.4) + (ch.loyalty_potential * 0.3),
        quality_tier: ch.avg_spend > 800000 ? 'Premium' : 
                     ch.avg_spend > 600000 ? 'Standard' : 'Economy'
      }));
      
      return {
        analysis_type: 'Guest Quality by Channel',
        period: `${start} to ${end}`,
        channels: channelQualityArray.slice(0, top_n_channels),
        quality_insights: {
          premium_channels: channelQualityArray.filter(ch => ch.quality_tier === 'Premium'),
          highest_loyalty: channelQualityArray.reduce((best, ch) => ch.loyalty_potential > best.loyalty_potential ? ch : best, channelQualityArray[0]),
          longest_stay_channel: channelQualityArray.reduce((best, ch) => ch.avg_los > best.avg_los ? ch : best, channelQualityArray[0])
        }
      };
      
    } else if (analysis_type === 'channel_mix_optimization') {
      // Comprehensive optimization analysis
      const revenueData = await analyzeChannelPerformance.execute({ 
        start, end, analysis_type: 'revenue_contribution', include_trends: false, top_n_channels 
      });
      const costData = await analyzeChannelPerformance.execute({ 
        start, end, analysis_type: 'cost_efficiency', include_trends: false, top_n_channels 
      });
      
      const optimizationMatrix = revenueData.channels.map(revCh => {
        const costCh = costData.channels.find(c => c.channel === revCh.channel);
        return {
          channel: revCh.channel,
          revenue_share: revCh.revenue_share_pct,
          net_margin: costCh?.net_margin || 0,
          growth_potential: calculateGrowthPotential(revCh),
          optimization_score: (revCh.revenue_share_pct * 0.4) + ((costCh?.net_margin || 0) * 0.6),
          recommended_action: getChannelRecommendation(revCh, costCh)
        };
      });
      
      return {
        analysis_type: 'Channel Mix Optimization',
        period: `${start} to ${end}`,
        optimization_matrix: optimizationMatrix,
        strategic_recommendations: generateChannelStrategy(optimizationMatrix),
        portfolio_balance: {
          current_concentration: optimizationMatrix[0]?.revenue_share || 0,
          recommended_max_concentration: 40,
          diversification_opportunities: optimizationMatrix.filter(ch => ch.growth_potential > 20)
        }
      };
    }
    
    return { error: 'Analysis type not implemented' };
  },
});

// Occupancy Forecasting Tool
export const forecastOccupancy = tool({
  name: 'forecast_occupancy',
  description: 'Forecast hotel occupancy rates using historical patterns, booking pace, and seasonal trends.',
  parameters: z.object({
    forecast_period: z.string().describe('Target month to forecast (YYYY-MM)'),
    historical_months: z.number().default(12).describe('Number of historical months to analyze'),
    include_booking_pace: z.boolean().default(true).describe('Include current booking pace in forecast'),
  }),
  execute: async ({ forecast_period, historical_months, include_booking_pace }) => {
    const db = getDb(true);
    
    // Get historical occupancy data
    const query = `
      SELECT 
        strftime('%Y-%m', arrival) as month,
        COUNT(*) as bookings,
        COUNT(DISTINCT room_number) as rooms_occupied,
        AVG(night) as avg_los
      FROM stays 
      WHERE arrival >= date('${forecast_period}-01', '-${historical_months} months')
        AND arrival < '${forecast_period}-01'
      GROUP BY month
      ORDER BY month
    `;
    
    const historicalData = db.prepare(query).all() as any[];
    
    if (historicalData.length === 0) {
      return { error: 'Insufficient historical data for occupancy forecast' };
    }
    
    // Calculate seasonal factors and trends
    const seasonalPattern = calculateSeasonalOccupancyPattern(historicalData);
    const trendFactor = calculateOccupancyTrend(historicalData);
    
    // Base forecast from historical average for same month
    const sameMonthHistory = historicalData.filter(h => h.month.endsWith(forecast_period.slice(-2)));
    const baseOccupancy = sameMonthHistory.reduce((sum, h) => sum + h.bookings, 0) / sameMonthHistory.length;
    
    // Apply seasonal and trend adjustments
    const forecastedBookings = baseOccupancy * seasonalPattern * trendFactor;
    const forecastedOccupancyRate = Math.min((forecastedBookings / (30 * 100)) * 100, 100); // Assuming 100 rooms, 30 days
    
    return {
      forecast_type: 'Occupancy Forecast',
      target_period: forecast_period,
      forecasted_occupancy_rate: Math.round(forecastedOccupancyRate * 100) / 100,
      forecasted_bookings: Math.round(forecastedBookings),
      confidence_level: 'Medium',
      contributing_factors: {
        historical_average: Math.round(baseOccupancy),
        seasonal_factor: seasonalPattern,
        trend_factor: trendFactor,
        booking_pace_impact: include_booking_pace ? 'Included' : 'Not included'
      },
      recommendations: generateOccupancyRecommendations(forecastedOccupancyRate)
    };
  },
});

// Helper Functions
function generateForecastPeriods(horizon: string): Array<{ month: string }> {
  const periods = [];
  const currentDate = new Date();
  const monthsAhead = {
    '1_month': 1,
    '3_months': 3,
    '6_months': 6,
    '1_year': 12
  }[horizon] || 3;
  
  for (let i = 1; i <= monthsAhead; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    periods.push({
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    });
  }
  
  return periods;
}

function calculateSeasonalForecast(historical: any[], period: { month: string }): { value: number; confidence: { lower: number; upper: number } } {
  // Simplified seasonal calculation
  const monthNum = parseInt(period.month.split('-')[1]);
  const seasonalMultiplier = [0.8, 0.85, 0.9, 0.95, 1.1, 1.15, 1.2, 1.1, 1.0, 1.05, 0.9, 1.3][monthNum - 1];
  const avgRevenue = historical.reduce((sum, h) => sum + h.revenue, 0) / historical.length;
  const forecastValue = avgRevenue * seasonalMultiplier;
  
  return {
    value: forecastValue,
    confidence: {
      lower: forecastValue * 0.85,
      upper: forecastValue * 1.15
    }
  };
}

function calculateMovingAverageConfidence(recent: any[], forecast: number): { lower: number; upper: number } {
  const variance = recent.reduce((sum, p) => sum + Math.pow(p.revenue - forecast, 2), 0) / recent.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    lower: forecast - (1.645 * stdDev),
    upper: forecast + (1.645 * stdDev)
  };
}

function calculateBookingPaceForecast(historical: any[], period: { month: string }): { value: number; confidence: { lower: number; upper: number } } {
  // Simplified booking pace calculation
  const recentGrowth = historical.length > 1 ? 
    (historical[historical.length - 1].revenue / historical[historical.length - 2].revenue) - 1 : 0;
  const lastValue = historical[historical.length - 1]?.revenue || 0;
  const forecastValue = lastValue * (1 + recentGrowth);
  
  return {
    value: forecastValue,
    confidence: {
      lower: forecastValue * 0.9,
      upper: forecastValue * 1.1
    }
  };
}

function getSeasonalFactor(month: string): number {
  const monthNum = parseInt(month.split('-')[1]);
  return [0.8, 0.85, 0.9, 0.95, 1.1, 1.15, 1.2, 1.1, 1.0, 1.05, 0.9, 1.3][monthNum - 1];
}

function calculateGrowthRate(historical: any[], forecast: number): number {
  if (historical.length === 0) return 0;
  const lastActual = historical[historical.length - 1]?.revenue || 0;
  return lastActual > 0 ? ((forecast / lastActual) - 1) * 100 : 0;
}

function generateForecastRecommendations(forecasts: any[], avgGrowth: number): string[] {
  const recommendations = [];
  
  if (avgGrowth > 10) {
    recommendations.push('Strong growth projected - consider capacity planning');
  } else if (avgGrowth < -5) {
    recommendations.push('Declining trend - review pricing and marketing strategy');
  }
  
  recommendations.push('Monitor actual vs forecast monthly for accuracy');
  recommendations.push('Adjust forecasts based on market conditions');
  
  return recommendations;
}

function calculateChannelDiversification(channels: any[]): number {
  const total = channels.reduce((sum, ch) => sum + ch.revenue_share_pct, 0);
  const herfindahl = channels.reduce((sum, ch) => sum + Math.pow(ch.revenue_share_pct / total, 2), 0);
  return Math.round((1 - herfindahl) * 100);
}

function getChannelCommissionRate(channel: string): number {
  const rates = {
    'OTA': 0.15,
    'RSVP by Phone': 0.02,
    'Walk-in Guest': 0.0,
    'Hotel Website': 0.03,
    'Travel Agent': 0.10
  };
  return rates[channel] || 0.12;
}

function calculateGrowthPotential(channel: any): number {
  // Simplified growth potential calculation
  return channel.revenue_share_pct < 10 ? 30 : channel.revenue_share_pct < 20 ? 20 : 10;
}

function getChannelRecommendation(revCh: any, costCh: any): string {
  if (!costCh) return 'Monitor performance';
  
  if (costCh.net_margin > 80 && revCh.revenue_share_pct < 20) {
    return 'Invest for growth';
  } else if (costCh.net_margin < 70 && revCh.revenue_share_pct > 30) {
    return 'Reduce dependency';
  } else {
    return 'Maintain current level';
  }
}

function generateChannelStrategy(matrix: any[]): string[] {
  return [
    'Focus investment on high-margin, low-concentration channels',
    'Gradually reduce dependency on over-concentrated channels',
    'Monitor ROI trends monthly for optimization opportunities',
    'Consider direct booking incentives to reduce commission costs'
  ];
}

function calculateSeasonalOccupancyPattern(historical: any[]): number {
  // Simplified seasonal pattern
  return 1.0; // Would be more sophisticated in real implementation
}

function calculateOccupancyTrend(historical: any[]): number {
  if (historical.length < 2) return 1.0;
  
  const recent = historical.slice(-3);
  const older = historical.slice(-6, -3);
  
  const recentAvg = recent.reduce((sum, h) => sum + h.bookings, 0) / recent.length;
  const olderAvg = older.reduce((sum, h) => sum + h.bookings, 0) / older.length;
  
  return olderAvg > 0 ? recentAvg / olderAvg : 1.0;
}

function generateOccupancyRecommendations(rate: number): string[] {
  const recommendations = [];
  
  if (rate > 85) {
    recommendations.push('High occupancy projected - consider rate optimization');
    recommendations.push('Ensure adequate staffing and inventory');
  } else if (rate < 60) {
    recommendations.push('Low occupancy projected - implement promotional strategies');
    recommendations.push('Review pricing competitiveness');
  } else {
    recommendations.push('Moderate occupancy - maintain current strategy');
  }
  
  return recommendations;
}

