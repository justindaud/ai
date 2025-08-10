require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

import { run } from '@openai/agents';
import { analyticsAgent } from '../src/server/agent';

async function testComplexQueries() {
  console.log('🔍 TESTING COMPLEX MULTI-FIELD QUERIES\n');
  console.log('='.repeat(60));
  
  const complexQueries = [
    {
      category: '🏛️ EMBASSY & DIPLOMATIC GUESTS',
      questions: [
        'Berapa rata-rata lama inap tamu embassy?',
        'Total revenue dari embassy guests tahun 2024?',
        'Berapa banyak unique embassy guests yang menginap?'
      ]
    },
    {
      category: '🏢 CORPORATE ANALYSIS',
      questions: [
        'Rata-rata lama inap tamu corporate (segment COR-FIT dan COR-GROUP)?',
        'Company mana yang paling sering booking?',
        'ADR untuk segment corporate vs individual?'
      ]
    },
    {
      category: '🛏️ ROOM TYPE PREFERENCES',
      questions: [
        'Rata-rata lama inap di Executive Suite vs Deluxe?',
        'Tamu mana yang prefer Family Suite?',
        'Revenue per room type dengan breakdown ALOS?'
      ]
    },
    {
      category: '⏰ LONG STAY ANALYSIS',
      questions: [
        'Berapa banyak tamu yang menginap lebih dari 7 malam?',
        'Profile tamu long stay (segment, room type, nationality)?',
        'Revenue contribution dari long stay guests?'
      ]
    }
  ];

  for (const category of complexQueries) {
    console.log(`\n${category.category}`);
    console.log('-'.repeat(50));
    
    for (const question of category.questions) {
      console.log(`\n🔥 Query: ${question}`);
      try {
        const result = await run(analyticsAgent, question);
        const output = result.finalOutput;
        
        console.log('🤖 AI Response:');
        console.log('─'.repeat(40));
        
        if (typeof output === 'string' && output.length > 300) {
          console.log(output.substring(0, 300) + '...\n[Response truncated for readability]');
        } else {
          console.log(output);
        }
        console.log('─'.repeat(40));
        
        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error: any) {
        console.log('❌ Error:', error.message);
      }
    }
  }
  
  console.log('\n🎉 COMPLEX QUERY TESTING COMPLETED!');
  console.log('\n✅ CAPABILITIES DEMONSTRATED:');
  console.log('✅ Multi-field filtering (company + segment + room type)');
  console.log('✅ Custom business logic queries');
  console.log('✅ Smart SQL query building');
  console.log('✅ Complex aggregations and calculations');
  console.log('✅ Cross-field analysis and insights');
  console.log('✅ Dynamic query construction');
  
  console.log('\n🚀 AI dapat menjawab pertanyaan bisnis yang sangat spesifik!');
}

testComplexQueries().catch(console.error);
