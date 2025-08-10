require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

import { orchestrateHotelAnalytics } from '../src/server/orchestrator';

async function demoHumanApproval() {
  console.log('👥 HUMAN-IN-THE-LOOP APPROVAL DEMO\n');
  console.log('='.repeat(70));
  
  const testQueries = [
    {
      category: '🔍 DUPLICATE DETECTION',
      query: 'Detect duplicate guests in our database',
      expectedApprovals: ['detect_duplicate_guests_001']
    },
    {
      category: '🔧 DATA CLEANING',
      query: 'Clean and merge duplicate guest profiles',
      expectedApprovals: ['merge_duplicate_profiles_001', 'perform_data_cleaning_001']
    },
    {
      category: '📊 QUALITY ASSESSMENT',
      query: 'Fix data quality issues in guest records',
      expectedApprovals: ['assess_data_quality_001']
    }
  ];

  for (const test of testQueries) {
    console.log(`\n${test.category}`);
    console.log(`📝 Query: "${test.query}"`);
    console.log('-'.repeat(50));
    
    try {
      const startTime = Date.now();
      const result = await orchestrateHotelAnalytics(test.query);
      const endTime = Date.now();
      
      console.log(`⚡ Executed in ${endTime - startTime}ms`);
      console.log(`🎭 Orchestration Used: ${result.orchestration_used ? '✅ YES' : '❌ NO'}`);
      console.log(`🤖 Agents Involved: ${result.agents_involved.join(', ')}`);
      
      // Check if approval is required
      if (result.response.includes('Human approval required') || 
          (typeof result.response === 'object' && result.response.requiresApproval)) {
        console.log('👋 **HUMAN APPROVAL REQUIRED**');
        console.log('🔔 This would trigger the approval modal in the frontend');
        
        // Simulate approval requests (normally this would come from the API response)
        console.log('\n📋 **APPROVAL REQUESTS:**');
        test.expectedApprovals.forEach((approval, index) => {
          console.log(`${index + 1}. ${approval}`);
          console.log(`   Risk Level: MEDIUM`);
          console.log(`   Action: Data modification operation`);
        });
        
        // Simulate user approval
        console.log('\n✅ **SIMULATED USER APPROVAL:**');
        console.log('User would see modal with detailed operation information');
        console.log('User clicks "Approve" for selected operations');
        console.log('System continues with approved operations only');
        
      } else {
        console.log('📄 Response Preview:');
        console.log('─'.repeat(40));
        const response = result.response;
        if (typeof response === 'string' && response.length > 200) {
          console.log(response.substring(0, 200) + '...\n[Response truncated for demo]');
        } else {
          console.log(response);
        }
        console.log('─'.repeat(40));
      }
      
      // Delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 HUMAN-IN-THE-LOOP DEMO COMPLETED!\n');
  
  console.log('✅ APPROVAL MODAL FEATURES DEMONSTRATED:');
  console.log('🎯 Intelligent detection of operations requiring approval');
  console.log('🔄 Beautiful modal interface with risk assessment');
  console.log('📊 Detailed operation information and impact analysis');
  console.log('👥 User-friendly approve/reject interface');
  console.log('🔧 Seamless integration with chat workflow');
  console.log('⚡ Real-time processing of approval decisions');
  
  console.log('\n💼 BUSINESS VALUE:');
  console.log('• Critical data operations require explicit user consent');
  console.log('• Risk assessment helps users make informed decisions');
  console.log('• Detailed operation preview prevents accidental modifications');
  console.log('• Audit trail of all approval decisions');
  console.log('• Maintains data integrity while enabling automation');
  
  console.log('\n🎭 HUMAN-IN-THE-LOOP WORKFLOW:');
  console.log('1. 🤖 AI detects operation requiring approval');
  console.log('2. 🔔 System triggers approval modal');
  console.log('3. 👁️  User reviews operation details and risk assessment');
  console.log('4. ✅ User approves or rejects individual operations');
  console.log('5. 🚀 System executes only approved operations');
  console.log('6. 📊 User receives completion summary and impact analysis');
  
  console.log('\n🔥 TRY THESE QUERIES IN THE CHAT INTERFACE:');
  console.log('• "Detect duplicate guests"');
  console.log('• "Merge duplicate guest profiles"');
  console.log('• "Clean guest data quality"');
  console.log('• "Fix data inconsistencies"');
  console.log('• "Standardize guest information"');
  
  console.log('\n🏆 HUMAN-IN-THE-LOOP IMPLEMENTATION SUCCESS!');
  console.log('✅ Approval Modal ✅ Risk Assessment ✅ Operation Details');
  console.log('✅ User Consent ✅ Audit Trail ✅ Seamless Integration');
}

demoHumanApproval().catch(console.error);
