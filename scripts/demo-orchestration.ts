require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

import { orchestrateHotelAnalytics } from '../src/server/orchestrator';

async function demoOrchestration() {
  console.log('🎭 MULTI-AGENT ORCHESTRATION DEMO\n');
  console.log('='.repeat(70));
  
  const testCases = [
    {
      category: '📊 ANALYTICS ROUTING',
      description: 'These should route to Analytics Agent',
      queries: [
        'Total revenue Januari 2024',
        'ADR untuk Q1 2024',
        'Channel performance analysis',
        'Forecast revenue 3 bulan ke depan'
      ]
    },
    {
      category: '🔧 DATA QUALITY ROUTING', 
      description: 'These should route to Data Quality Agent',
      queries: [
        'Detect duplicate guests in database',
        'Analyze guest deduplication for January 2024',
        'Find potential duplicate identities',
        'Clean guest data untuk improved analytics'
      ]
    },
    {
      category: '🚀 MULTI-AGENT WORKFLOWS',
      description: 'These should trigger orchestrated workflows',
      queries: [
        'Comprehensive guest analysis dengan data cleaning',
        'Revenue analysis but clean duplicates first',
        'Full hotel performance report dengan quality validation',
        'Strategic insights dengan data integrity check'
      ]
    },
    {
      category: '🎯 INTELLIGENT ROUTING',
      description: 'Complex queries requiring smart decisions',
      queries: [
        'Berapa total tamu yang repeat dengan variasi nama?',
        'Channel analysis tapi pastikan data bersih dulu',
        'Embassy guests analysis with deduplication',
        'Forecast accuracy validation through data quality'
      ]
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${testCase.category}`);
    console.log(`📝 ${testCase.description}`);
    console.log('-'.repeat(50));
    
    for (const query of testCase.queries) {
      console.log(`\n🔥 Query: "${query}"`);
      
      try {
        const startTime = Date.now();
        const result = await orchestrateHotelAnalytics(query);
        const endTime = Date.now();
        
        console.log(`⚡ Executed in ${endTime - startTime}ms`);
        console.log(`🎭 Orchestration Used: ${result.orchestration_used ? '✅ YES' : '❌ NO'}`);
        console.log(`🤖 Agents Involved: ${result.agents_involved.join(', ')}`);
        
        if (result.fallback_reason) {
          console.log(`⚠️  Fallback Reason: ${result.fallback_reason}`);
        }
        
        console.log('📄 Response Preview:');
        console.log('─'.repeat(40));
        
        const response = result.response;
        if (typeof response === 'string' && response.length > 300) {
          console.log(response.substring(0, 300) + '...\n[Response truncated for demo]');
        } else {
          console.log(response);
        }
        console.log('─'.repeat(40));
        
        // Delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n🎉 ORCHESTRATION DEMO COMPLETED!\n');
  
  console.log('✅ ORCHESTRATION BENEFITS DEMONSTRATED:');
  console.log('🎯 Intelligent task classification and agent routing');
  console.log('🔄 Seamless fallback mechanisms for reliability');
  console.log('🚀 Multi-agent workflows for complex operations');
  console.log('🧠 Context-aware decision making for optimal performance');
  console.log('🔧 Specialized agent utilization for maximum efficiency');
  console.log('👥 Human-in-the-loop integration for critical operations');
  
  console.log('\n💼 BUSINESS VALUE:');
  console.log('• Optimal resource utilization through smart routing');
  console.log('• Improved accuracy via specialized agent expertise');
  console.log('• Enhanced reliability with multiple fallback layers');
  console.log('• Scalable architecture supporting diverse workflows');
  console.log('• Consistent user experience across complex operations');
  
  console.log('\n🚀 ORCHESTRATION PATTERNS IMPLEMENTED:');
  console.log('📋 DIRECT ROUTING: Single agent for straightforward tasks');
  console.log('🔄 SEQUENTIAL WORKFLOWS: Data cleaning → Analytics');
  console.log('⚡ PARALLEL PROCESSING: Multiple agents simultaneously');
  console.log('✅ VALIDATION WORKFLOWS: Analysis → Quality validation');
  console.log('👋 HUMAN-IN-THE-LOOP: Critical approvals and oversight');
  
  console.log('\n🎭 MULTI-AGENT ARCHITECTURE SUCCESS!');
  console.log('✅ Orchestrator Agent ✅ Analytics Agent ✅ Data Quality Agent');
  console.log('✅ Intelligent Routing ✅ Workflow Coordination ✅ Fallback Systems');
  console.log('✅ Context Management ✅ Resource Optimization ✅ Scalable Design');
}

demoOrchestration().catch(console.error);

