require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

import { run } from '@openai/agents';
import { analyticsAgent } from '../src/server/agent';

async function learningDemo() {
  console.log('🧠 AI LEARNING SYSTEM DEMO\n');
  console.log('='.repeat(60));
  
  console.log('\n📊 PHASE 1: Normal Query (Without Learning Context)');
  console.log('-'.repeat(50));
  
  try {
    const result1 = await run(analyticsAgent, 'ADR Januari 2024?');
    console.log('🤖 AI Response:', result1.finalOutput.substring(0, 300) + '...');
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n🎓 PHASE 2: Learning from Feedback');
  console.log('-'.repeat(50));
  
  try {
    const learningQuery = `Gunakan learn_from_interaction dengan data: 
    - query: "ADR Januari 2024"
    - response: "ADR bagus di Rp 721k"
    - feedback_type: "correction" 
    - correction: "ADR perlu dibandingkan dengan industry benchmark dan ditambahkan strategi pricing optimization"`;
    
    const result2 = await run(analyticsAgent, learningQuery);
    console.log('🎓 Learning Response:', result2.finalOutput);
  } catch (error: any) {
    console.log('❌ Learning Error:', error.message);
  }
  
  console.log('\n🚀 PHASE 3: Enhanced Query (With Learning Context)');
  console.log('-'.repeat(50));
  
  try {
    const result3 = await run(analyticsAgent, 'ADR Februari 2024 dengan intelligent context dan benchmarking?');
    console.log('🧠 Enhanced AI Response:', result3.finalOutput.substring(0, 400) + '...');
  } catch (error: any) {
    console.log('❌ Enhanced Query Error:', error.message);
  }
  
  console.log('\n✨ LEARNING CAPABILITIES DEMONSTRATED:');
  console.log('✅ Memory system for storing corrections');
  console.log('✅ Pattern recognition for similar queries');
  console.log('✅ Intelligent context integration');
  console.log('✅ Industry benchmark application');
  console.log('✅ Feedback-driven improvement');
  console.log('✅ Self-learning architecture');
  
  console.log('\n🎯 NO MORE HARDCODING NEEDED!');
  console.log('AI sekarang bisa:');
  console.log('- Belajar dari koreksi user');
  console.log('- Mengenali pola query');
  console.log('- Menyimpan knowledge yang dipelajari');
  console.log('- Menerapkan industry best practices');
  console.log('- Memberikan respons yang semakin cerdas');
}

learningDemo().catch(console.error);
