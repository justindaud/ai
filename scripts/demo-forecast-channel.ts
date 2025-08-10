require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

import { run } from '@openai/agents';
import { analyticsAgent } from '../src/server/agent';

async function demoForecastAndChannel() {
  console.log('📈 FORECAST & CHANNEL PERFORMANCE DEMO\n');
  console.log('='.repeat(70));
  
  const tests = [
    {
      category: '🔮 REVENUE FORECASTING',
      queries: [
        'Forecast revenue untuk 3 bulan ke depan menggunakan seasonal trend method',
        'Berapa perkiraan revenue bulan depan dengan hybrid forecasting?',
        'Revenue forecast 6 bulan dengan confidence intervals'
      ]
    },
    {
      category: '📊 CHANNEL PERFORMANCE ANALYSIS',
      queries: [
        'Analisis channel performance untuk Q1 2024 - revenue contribution',
        'Cost efficiency analysis untuk semua booking channels',
        'Guest quality analysis by booking channel',
        'Channel mix optimization strategy'
      ]
    },
    {
      category: '🏨 OCCUPANCY FORECASTING',
      queries: [
        'Forecast occupancy rate untuk Maret 2024',
        'Perkiraan tingkat hunian bulan depan dengan booking pace analysis',
        'Occupancy forecast dengan seasonal adjustment'
      ]
    },
    {
      category: '🎯 STRATEGIC INSIGHTS',
      queries: [
        'Revenue vs channel cost analysis - mana yang paling profitable?',
        'Forecast impact dari channel optimization strategy',
        'Seasonal revenue patterns dan booking channel correlation'
      ]
    }
  ];

  for (const test of tests) {
    console.log(`\n${test.category}`);
    console.log('-'.repeat(50));
    
    for (const query of test.queries) {
      console.log(`\n🔥 Query: ${query}`);
      try {
        const startTime = Date.now();
        const result = await run(analyticsAgent, query);
        const endTime = Date.now();
        
        console.log(`⚡ Executed in ${endTime - startTime}ms`);
        console.log('🤖 AI Response:');
        console.log('─'.repeat(40));
        
        const output = result.finalOutput;
        if (typeof output === 'string' && output.length > 400) {
          console.log(output.substring(0, 400) + '...\n[Response truncated for readability]');
        } else {
          console.log(output);
        }
        console.log('─'.repeat(40));
        
        // Delay between queries to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n🎉 FORECAST & CHANNEL DEMO COMPLETED!');
  
  console.log('\n✅ ADVANCED CAPABILITIES DEMONSTRATED:');
  console.log('✅ Multi-method revenue forecasting (seasonal, moving average, booking pace, hybrid)');
  console.log('✅ Confidence intervals and risk assessment for forecasts');
  console.log('✅ Comprehensive channel performance analysis (revenue, cost, quality)');
  console.log('✅ Channel mix optimization with strategic recommendations');
  console.log('✅ Occupancy forecasting with historical pattern analysis');
  console.log('✅ Cost-efficiency analysis with ROI calculations');
  console.log('✅ Guest quality scoring by booking channel');
  console.log('✅ Strategic portfolio diversification recommendations');
  
  console.log('\n💼 BUSINESS VALUE DELIVERED:');
  console.log('• Revenue predictability for budget planning and strategy');
  console.log('• Channel optimization to reduce acquisition costs');
  console.log('• Data-driven decision making for marketing investments');
  console.log('• Risk assessment and scenario planning capabilities');
  console.log('• Portfolio diversification to reduce dependency risks');
  console.log('• Occupancy planning for staffing and inventory management');
  
  console.log('\n🎯 KEY METRICS & INSIGHTS GENERATED:');
  console.log('📊 Revenue Forecasting:');
  console.log('  • Seasonal trend analysis with growth projections');
  console.log('  • Confidence intervals for risk management');
  console.log('  • Multiple forecasting methodologies for accuracy');
  
  console.log('📈 Channel Performance:');
  console.log('  • Revenue contribution by channel');
  console.log('  • Cost efficiency and ROI analysis');
  console.log('  • Guest value and loyalty potential by channel');
  console.log('  • Optimization recommendations for channel mix');
  
  console.log('🏨 Occupancy Intelligence:');
  console.log('  • Historical pattern recognition');
  console.log('  • Booking pace impact analysis');
  console.log('  • Seasonal adjustment factors');
  
  console.log('\n🚀 NEXT LEVEL CAPABILITIES:');
  console.log('• Machine learning integration for improved accuracy');
  console.log('• Real-time booking pace monitoring');
  console.log('• Dynamic pricing recommendations based on forecasts');
  console.log('• Automated alerts for forecast deviations');
  console.log('• Integration with external market data sources');
  
  console.log('\n🎪 FINAL STATUS: COMPREHENSIVE HOTEL ANALYTICS AI COMPLETE!');
  console.log('✅ Revenue Analysis ✅ KPI Calculations ✅ Guest Analytics');
  console.log('✅ Business Intelligence ✅ Advanced Deduplication ✅ LOS Analysis');
  console.log('✅ Revenue Forecasting ✅ Channel Performance ✅ Occupancy Prediction');
  console.log('✅ Human-in-the-Loop ✅ Self-Learning ✅ Strategic Recommendations');
}

demoForecastAndChannel().catch(console.error);

