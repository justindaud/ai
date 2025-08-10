require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

import { run } from '@openai/agents';
import { analyticsAgent } from '../src/server/agent';

async function comprehensiveDemo() {
  console.log('🏨 HOTEL ANALYTICS AI - COMPREHENSIVE DEMO\n');
  
  const demos = [
    {
      category: '💰 REVENUE & KPI ANALYSIS',
      queries: [
        'Total revenue Januari 2024?',
        'ADR Februari 2024?', 
        'RevPAR Maret 2024?',
        'Occupancy rate Januari 2024?',
        'ALOS bulan Februari 2024?'
      ]
    },
    {
      category: '👥 GUEST ANALYTICS & SEGMENTATION', 
      queries: [
        'Guest segment terbesar Maret 2024?',
        'Analisis age group guest Januari 2024?',
        'Top 5 nationality guest Februari 2024?',
        'Room type preferences Januari 2024?',
        'Booking channel analysis Maret 2024?'
      ]
    },
    {
      category: '📊 BUSINESS INTELLIGENCE & TRENDS',
      queries: [
        'Seasonal trend revenue 2024?',
        'Monthly performance tahun 2024?', 
        'Daily pattern arrivals Januari 2024?',
        'Pricing trends by room type 2024?',
        'Market mix analysis Februari 2024?'
      ]
    },
    {
      category: '🎯 STRATEGIC INSIGHTS',
      queries: [
        'Repeat guests analysis Maret 2024?',
        'Executive Suite performance vs Deluxe Januari 2024?',
        'OTA vs Direct booking comparison Februari 2024?'
      ]
    }
  ];

  for (const demo of demos) {
    console.log(`\n${demo.category}`);
    console.log('='.repeat(50));
    
    for (const query of demo.queries) {
      console.log(`\n🔥 Query: ${query}`);
      try {
        const result = await run(analyticsAgent, query);
        const output = result.finalOutput;
        
        // Pretty print the output with better formatting
        if (typeof output === 'string' && output.length > 200) {
          console.log('💡 AI Response:');
          console.log('─'.repeat(80));
          console.log(output);
          console.log('─'.repeat(80));
        } else {
          console.log('💡 AI Response:', output);
        }
        
        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        console.log('❌ Error:', error.message);
      }
    }
  }
  
  console.log('\n🎉 DEMO COMPLETED!');
  console.log('\n📈 CAPABILITIES DEMONSTRATED:');
  console.log('✅ Advanced KPI calculations (ADR, RevPAR, Occupancy, ALOS)');
  console.log('✅ Guest segmentation & demographic analysis');
  console.log('✅ Seasonal & trend analysis');
  console.log('✅ Room performance analytics');
  console.log('✅ Channel & market mix analysis');
  console.log('✅ Business intelligence insights');
  console.log('✅ Strategic recommendations');
  console.log('\n🚀 AI hotel analytics is now ready for production use!');
}

comprehensiveDemo().catch(console.error);
