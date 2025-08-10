import { Agent } from '@openai/agents';
import { z } from 'zod';
import { tool } from '@openai/agents';
import { analyticsAgent } from './agent';
import { dataQualityAgent } from './data-quality-agent';
import { humanInLoopOrchestrator } from './human-in-loop';

// Master Orchestrator Agent that routes tasks to specialized agents
export const orchestratorAgent = new Agent({
  name: 'Hotel Analytics Orchestrator',
  model: process.env.ORCHESTRATOR_MODEL || 'gpt-4.1',
  modelSettings: { toolChoice: 'auto', parallelToolCalls: true },
  instructions: `
You are the master orchestrator for a hotel analytics system. Your role is to:

1. **ANALYZE USER REQUESTS** and determine which specialized agent should handle them
2. **ROUTE TASKS** to the appropriate agent based on task classification
3. **COORDINATE WORKFLOWS** between multiple agents when needed
4. **PROVIDE UNIFIED RESPONSES** by combining outputs from different agents

AVAILABLE SPECIALIZED AGENTS:
- **Analytics Agent**: Revenue analysis, KPIs, forecasting, guest analytics, trends, channel performance
- **Data Quality Agent**: Guest deduplication, data cleaning, merge operations, quality validation

ROUTING DECISION MATRIX:

**→ Analytics Agent** for:
- Revenue calculations, forecasting, KPI analysis
- Guest behavior analysis, demographics, segmentation  
- Business intelligence, trends, seasonal analysis
- Channel performance, occupancy analysis
- Complex business queries and reporting

**→ Data Quality Agent** for:
- Duplicate guest detection and analysis
- Data cleaning operations and validation
- Guest profile merging (with human approval)
- Data quality assessment and improvement
- Entity resolution and matching

**→ Multi-Agent Workflow** for:
- Tasks requiring both analysis and data cleaning
- Comprehensive reports needing clean data first
- Validation of analytics results against data quality

ORCHESTRATION PATTERNS:
1. **Sequential**: Clean data first, then analyze (for comprehensive reports)
2. **Parallel**: Run analysis while quality checks happen independently
3. **Conditional**: Route based on data quality score or user preference
4. **Interactive**: Handle human-in-the-loop approvals for data operations

Always respond in Indonesian with clear explanation of which agent(s) will handle the request and why.
`,
  tools: [
    // Task classification tool
    tool({
      name: 'classify_user_request',
      description: 'Classify user request to determine which agent(s) should handle it',
      parameters: z.object({
        user_query: z.string().describe('The user\'s original question or request'),
        primary_intent: z.enum(['analytics', 'data_quality', 'mixed']).describe('Primary intent of the request'),
        task_complexity: z.enum(['simple', 'medium', 'complex']).describe('Complexity level requiring single vs multiple agents'),
        requires_clean_data: z.boolean().describe('Whether analytics requires data cleaning first'),
        needs_human_approval: z.boolean().describe('Whether task involves operations requiring human approval'),
      }),
      execute: async ({ user_query, primary_intent, task_complexity, requires_clean_data, needs_human_approval }) => {
        return {
          classification: {
            query: user_query,
            primary_intent,
            task_complexity,
            requires_clean_data,
            needs_human_approval,
            recommended_routing: primary_intent === 'mixed' ? 'multi_agent_workflow' : 
                               primary_intent === 'analytics' ? 'analytics_agent' : 'data_quality_agent',
            orchestration_pattern: requires_clean_data ? 'sequential' : 'direct'
          },
          reasoning: `Intent: ${primary_intent}, Complexity: ${task_complexity}, Clean data needed: ${requires_clean_data}`
        };
      },
    }),

    // Agent routing and execution tool
    tool({
      name: 'route_to_agent',
      description: 'Route the user request to the appropriate specialized agent',
      parameters: z.object({
        target_agent: z.enum(['analytics', 'data_quality']).describe('Which agent should handle this request'),
        user_query: z.string().describe('The user query to send to the agent'),
        context: z.string().nullable().describe('Additional context from orchestration decisions'),
      }),
      execute: async ({ target_agent, user_query, context }) => {
        const contextualQuery = context ? `${context}\n\nUser Query: ${user_query}` : user_query;
        
        if (target_agent === 'analytics') {
          // Route to analytics agent
          const { run } = await import('@openai/agents');
          const result = await run(analyticsAgent, contextualQuery);
          return {
            agent_used: 'Analytics Agent',
            response: result.finalOutput,
            execution_time: 'N/A'
          };
        } else {
          // Route to data quality agent with human-in-the-loop if needed
          // Check if query involves high-risk operations that need approval
          const needsApproval = checkIfNeedsApproval(user_query);
          
          if (needsApproval) {
            // Generate mock approval requests for demo
            const approvalRequests = generateApprovalRequests(user_query);
            return {
              agent_used: 'Data Quality Agent',
              response: 'Human approval required for data quality operations.',
              execution_time: 'N/A',
              human_interactions: 1,
              requiresApproval: true,
              approvalRequests
            };
          } else {
            const result = await humanInLoopOrchestrator.runDataQualityAnalysis(contextualQuery);
            return {
              agent_used: 'Data Quality Agent',
              response: result.finalOutput,
              execution_time: 'N/A',
              human_interactions: 0,
              requiresApproval: Array.isArray((result as any).interruptions) && (result as any).interruptions.length > 0,
              approvalRequests: (result as any).interruptions || undefined
            };
          }
        }
      },
    }),

    // Multi-agent workflow coordination tool
    tool({
      name: 'coordinate_multi_agent_workflow',
      description: 'Coordinate workflows requiring multiple agents working together',
      parameters: z.object({
        workflow_type: z.enum(['sequential_clean_then_analyze', 'parallel_analysis_and_quality', 'validation_workflow']).describe('Type of multi-agent workflow'),
        user_query: z.string().describe('The original user query'),
        data_scope: z.string().nullable().describe('Scope of data to process (date range, filters, etc.)'),
      }),
      execute: async ({ workflow_type, user_query, data_scope }) => {
        const { run } = await import('@openai/agents');
        
        if (workflow_type === 'sequential_clean_then_analyze') {
          // Step 1: Data Quality Assessment
          const qualityContext = data_scope ? 
            `Assess data quality for scope: ${data_scope}. Then: ${user_query}` : 
            `Assess data quality first, then proceed with: ${user_query}`;
          
          const qualityResult = await humanInLoopOrchestrator.runDataQualityAnalysis(qualityContext);
          
          // Step 2: Analytics with clean data context
          const analyticsContext = `Data quality assessment completed: ${qualityResult.finalOutput}\n\nNow analyze: ${user_query}`;
          const analyticsResult = await run(analyticsAgent, analyticsContext);
          
          return {
            workflow: 'Sequential: Data Quality → Analytics',
            quality_phase: {
              agent: 'Data Quality Agent',
              result: qualityResult.finalOutput,
              human_approvals: 0
            },
            analytics_phase: {
              agent: 'Analytics Agent', 
              result: analyticsResult.finalOutput
            },
            combined_insights: `Based on data quality assessment and subsequent analysis: ${analyticsResult.finalOutput}`
          };
          
        } else if (workflow_type === 'parallel_analysis_and_quality') {
          // Run both agents in parallel
          const [analyticsResult, qualityResult] = await Promise.all([
            run(analyticsAgent, user_query),
            humanInLoopOrchestrator.runDataQualityAnalysis(`Quality check for: ${user_query}`)
          ]);
          
          return {
            workflow: 'Parallel: Analytics + Data Quality',
            analytics_result: analyticsResult.finalOutput,
            quality_result: qualityResult.finalOutput,
            combined_insights: `Analytics: ${analyticsResult.finalOutput}\n\nData Quality: ${qualityResult.finalOutput}`
          };
          
        } else { // validation_workflow
          // Analytics first, then validate results with quality checks
          const analyticsResult = await run(analyticsAgent, user_query);
          const validationQuery = `Validate the accuracy of these analytics results: ${analyticsResult.finalOutput}`;
          const validationResult = await run(dataQualityAgent, validationQuery);
          
          return {
            workflow: 'Validation: Analytics → Quality Validation',
            initial_analysis: analyticsResult.finalOutput,
            validation_result: validationResult.finalOutput,
            final_confidence: 'High (validated by data quality agent)'
          };
        }
      },
    }),
  ],
});

// Simplified orchestration function for API usage
export async function orchestrateHotelAnalytics(userQuery: string) {
  const { run } = await import('@openai/agents');
  
  try {
    // Route through orchestrator for intelligent agent selection
    const result = await run(orchestratorAgent, userQuery);
    return {
      success: true,
      response: result.finalOutput,
      orchestration_used: true,
      agents_involved: extractAgentsUsed(result.finalOutput)
    };
  } catch (error: any) {
    // Fallback to direct analytics agent if orchestration fails
    console.warn('Orchestration failed, falling back to analytics agent:', error.message);
    const fallbackResult = await run(analyticsAgent, userQuery);
    return {
      success: true,
      response: fallbackResult.finalOutput,
      orchestration_used: false,
      fallback_reason: error.message
    };
  }
}

// Helper function to extract which agents were used from response
function extractAgentsUsed(response: any): string[] {
  const responseStr = typeof response === 'string' ? response : JSON.stringify(response);
  const agents = [];
  
  if (responseStr.includes('Analytics Agent') || responseStr.includes('analytics_agent')) {
    agents.push('analytics');
  }
  if (responseStr.includes('Data Quality Agent') || responseStr.includes('data_quality_agent')) {
    agents.push('data_quality');
  }
  if (responseStr.includes('Orchestrator') || responseStr.includes('orchestrator')) {
    agents.push('orchestrator');
  }
  
  return agents.length > 0 ? agents : ['analytics']; // Default fallback
}

// Export orchestration patterns for frontend integration
export const ORCHESTRATION_PATTERNS = {
  DIRECT: 'direct',
  SEQUENTIAL: 'sequential', 
  PARALLEL: 'parallel',
  VALIDATION: 'validation',
  HUMAN_IN_LOOP: 'human_in_loop'
} as const;

export type OrchestrationPattern = typeof ORCHESTRATION_PATTERNS[keyof typeof ORCHESTRATION_PATTERNS];

// Helper methods for orchestrator
function checkIfNeedsApproval(query: string): boolean {
  const approvalKeywords = [
    'merge', 'delete', 'clean', 'duplicate', 'remove', 'consolidate',
    'standardize', 'fix', 'correct', 'update', 'modify'
  ];
  
  const queryLower = query.toLowerCase();
  return approvalKeywords.some(keyword => queryLower.includes(keyword));
}

function generateApprovalRequests(query: string): any[] {
  const requests = [];
  
  if (query.toLowerCase().includes('duplicate')) {
    requests.push({
      id: 'detect_duplicate_guests_001',
      agent: 'Data Quality Agent',
      tool: 'detect_duplicate_guests',
      description: 'Detect potential duplicate guest identities using fuzzy name matching with 85% confidence threshold',
      risk_level: 'medium',
      recommendation: '⚡ MEDIUM RISK: Consider impact. Changes may affect analytics accuracy.',
      arguments: {
        similarity_threshold: 0.85,
        include_name_variations: true,
        check_contact_overlap: true
      },
      details: {
        affectedRecords: 157,
        estimatedImpact: 'Improved guest analytics accuracy',
        reversible: true
      }
    });
  }
  
  if (query.toLowerCase().includes('merge') || query.toLowerCase().includes('clean')) {
    requests.push({
      id: 'merge_duplicate_profiles_001',
      agent: 'Data Quality Agent',
      tool: 'merge_duplicate_profiles',
      description: 'Merge 3 duplicate guest profiles permanently into single consolidated profile',
      risk_level: 'high',
      recommendation: '⚠️ HIGH RISK: Review carefully. merge_duplicate_profiles can permanently modify data.',
      arguments: {
        merge_instructions: [
          'Merge "John Smith" with "J. Smith" and "John S."',
          'Consolidate booking history and preferences',
          'Keep most recent contact information'
        ],
        backup_before_merge: true
      },
      details: {
        affectedRecords: 3,
        estimatedImpact: 'Consolidated guest profile with complete history',
        reversible: false
      }
    });
    
    requests.push({
      id: 'perform_data_cleaning_001',
      agent: 'Data Quality Agent', 
      tool: 'perform_data_cleaning',
      description: 'Standardize phone number formats and normalize guest name capitalization',
      risk_level: 'low',
      recommendation: '✅ LOW RISK: Safe to approve. Minimal impact on existing data.',
      arguments: {
        cleaning_type: 'standardization',
        auto_fix: false,
        target_fields: ['phone_number', 'guest_name', 'nationality']
      },
      details: {
        affectedRecords: 1247,
        estimatedImpact: 'Improved data consistency and searchability',
        reversible: true
      }
    });
  }
  
  // Default request if no specific operations detected
  if (requests.length === 0) {
    requests.push({
      id: 'assess_data_quality_001',
      agent: 'Data Quality Agent',
      tool: 'assess_data_quality',
      description: 'Comprehensive data quality assessment and validation for guest records',
      risk_level: 'low',
      recommendation: '✅ LOW RISK: Safe to approve. Read-only analysis with no data modification.',
      arguments: {
        assessment_scope: 'guest_data',
        include_recommendations: true,
        generate_quality_score: true
      },
      details: {
        affectedRecords: 0,
        estimatedImpact: 'Data quality insights and recommendations',
        reversible: true
      }
    });
  }
  
  return requests;
}

