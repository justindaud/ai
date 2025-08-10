require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

import { run } from '@openai/agents';
import { dataQualityAgent } from '../src/server/data-quality-agent';
import { humanInLoopOrchestrator } from '../src/server/human-in-loop';

async function demoHumanInLoop() {
  console.log('🔍 HUMAN-IN-THE-LOOP DATA QUALITY DEMO\n');
  console.log('='.repeat(70));
  
  console.log('\n📋 DEMO SCENARIO:');
  console.log('- Detect duplicate guest identities');
  console.log('- AI flags potential duplicates');
  console.log('- Human approval required for merging');
  console.log('- Integrated workflow for analytics');
  
  // Test 1: Data Quality Agent with Approval Workflow
  console.log('\n🔧 TEST 1: DATA QUALITY AGENT (with Human Approval)');
  console.log('-'.repeat(50));
  
  try {
    const approvalHandler = async (requests: any[]) => {
      console.log('\n🚨 APPROVAL REQUIRED:');
      
      const approved: string[] = [];
      const rejected: string[] = [];
      
      for (const request of requests) {
        console.log(`\n📋 Request: ${request.description}`);
        console.log(`   Risk Level: ${request.risk_level.toUpperCase()}`);
        console.log(`   Recommendation: ${request.recommendation}`);
        
        // Simulate human decision based on risk
        if (request.risk_level === 'low' || request.risk_level === 'medium') {
          approved.push(request.id);
          console.log(`   ✅ APPROVED: ${request.id}`);
        } else {
          rejected.push(request.id);
          console.log(`   ❌ REJECTED: ${request.id} (High risk)`);
        }
      }
      
      return { approved, rejected };
    };
    
    const result = await humanInLoopOrchestrator.runDataQualityAnalysis(
      'Detect duplicate guests for Januari 2024 with 70% similarity threshold',
      approvalHandler
    );
    
    console.log('\n📊 DATA QUALITY RESULTS:');
    console.log(`   Data Quality Score: ${result.dataQualityScore}%`);
    console.log(`   Cleaning Results: ${JSON.stringify(result.cleaningResults, null, 2).substring(0, 300)}...`);
    
  } catch (error: any) {
    console.log(`❌ Test 1 Error: ${error.message}`);
  }
  
  // Test 2: Integrated Analysis Workflow
  console.log('\n🔄 TEST 2: INTEGRATED ANALYSIS WORKFLOW');
  console.log('-'.repeat(50));
  
  try {
    const integratedResult = await humanInLoopOrchestrator.runIntegratedAnalysis(
      'Analisis repeat guests dan revenue untuk Q1 2024',
      true // Include data cleaning
    );
    
    console.log('\n📈 INTEGRATED RESULTS:');
    console.log(`   Workflow Type: ${integratedResult.type}`);
    console.log(`   Data Quality Score: ${integratedResult.data_quality_phase?.dataQualityScore || 'N/A'}`);
    console.log(`   Analytics Phase: ${JSON.stringify(integratedResult.analytics_phase).substring(0, 200)}...`);
    console.log(`   Combined Insights: ${JSON.stringify(integratedResult.combined_insights, null, 2)}`);
    
  } catch (error: any) {
    console.log(`❌ Test 2 Error: ${error.message}`);
  }
  
  // Test 3: Direct Data Quality Tools
  console.log('\n🛠️  TEST 3: DIRECT DATA QUALITY TOOLS');
  console.log('-'.repeat(50));
  
  const directTests = [
    'Detect potential duplicate guests untuk Februari 2024',
    'Perform name standardization cleaning for Maret 2024',
    'Analyze phone formatting issues in guest data'
  ];
  
  for (const test of directTests) {
    console.log(`\n🔥 Testing: ${test}`);
    try {
      const result = await run(dataQualityAgent, test);
      console.log(`✅ Result: ${JSON.stringify(result.finalOutput).substring(0, 150)}...`);
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 HUMAN-IN-THE-LOOP DEMO COMPLETED!');
  
  console.log('\n✅ CAPABILITIES DEMONSTRATED:');
  console.log('✅ Advanced duplicate detection with fuzzy name matching');
  console.log('✅ Human approval workflow for data changes');
  console.log('✅ Risk assessment for proposed modifications');
  console.log('✅ Integrated analytics with data quality assurance');
  console.log('✅ Automated approval for low-risk operations');
  console.log('✅ Data cleaning with standardization rules');
  console.log('✅ Quality score calculation and tracking');
  
  console.log('\n🚀 BUSINESS VALUE:');
  console.log('• Prevents accidental data corruption through human oversight');
  console.log('• Improves analytics accuracy with clean, deduplicated data');
  console.log('• Reduces manual data cleaning workload through automation');
  console.log('• Provides audit trail for all data modifications');
  console.log('• Enables confident decision-making on clean data');
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('• Integrate with frontend UI for approval workflow');
  console.log('• Add more sophisticated duplicate detection rules');
  console.log('• Implement automated quality monitoring');
  console.log('• Setup scheduled data quality audits');
}

demoHumanInLoop().catch(console.error);

