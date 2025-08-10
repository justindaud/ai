import { Agent, run, RunResult, RunState } from '@openai/agents';
import { dataQualityAgent } from './data-quality-agent';
import { analyticsAgent } from './agent';

// Human-in-the-Loop Orchestrator
export class HumanInLoopOrchestrator {
  
  async runDataQualityAnalysis(
    message: string,
    onApprovalRequest?: (interruptions: any[]) => Promise<{ approved: string[]; rejected: string[] }>
  ): Promise<any> {
    
    let result: RunResult<unknown, Agent<unknown, any>> = await run(
      dataQualityAgent,
      message
    );
    
    // Handle interruptions (approval requests)
    while (result.interruptions && result.interruptions.length > 0) {
      console.log(`🚨 Human approval required for ${result.interruptions.length} actions`);
      
      // Format approval requests for user
      const approvalRequests = result.interruptions.map(interruption => ({
        id: interruption.rawItem.name || 'unknown',
        agent: interruption.agent.name,
        tool: interruption.rawItem.name,
        arguments: interruption.rawItem.arguments,
        description: this.formatApprovalRequest(interruption),
        risk_level: this.assessRiskLevel(interruption),
        recommendation: this.getRecommendation(interruption)
      }));
      
      // If callback provided, use it; otherwise, auto-approve low-risk items
      let approvalDecisions: { approved: string[]; rejected: string[] };
      
      if (onApprovalRequest) {
        approvalDecisions = await onApprovalRequest(approvalRequests);
      } else {
        // Auto-approve low-risk items for demo
        approvalDecisions = this.autoApproveBasedOnRisk(approvalRequests);
      }
      
      // Apply approval decisions
      for (const interruption of result.interruptions) {
        const toolName = interruption.rawItem.name;
        
        if (approvalDecisions.approved.includes(toolName)) {
          result.state.approve(interruption);
          console.log(`✅ Approved: ${toolName}`);
        } else if (approvalDecisions.rejected.includes(toolName)) {
          result.state.reject(interruption);
          console.log(`❌ Rejected: ${toolName}`);
        }
      }
      
      // Resume execution
      result = await run(dataQualityAgent, result.state);
    }
    
    return {
      finalOutput: result.finalOutput,
      cleaningResults: result.finalOutput,
      approvalHistory: this.getApprovalHistory(result.state),
      dataQualityScore: this.calculateDataQualityScore(result.finalOutput)
    };
  }
  
  async runIntegratedAnalysis(
    message: string,
    includeDataCleaning: boolean = true
  ): Promise<any> {
    
    if (!includeDataCleaning) {
      // Direct analytics without cleaning
      const result = await run(analyticsAgent, message);
      return {
        type: 'direct_analytics',
        result: result.finalOutput,
        dataQualityWarnings: []
      };
    }
    
    // Two-phase approach: cleaning first, then analytics
    
    // Phase 1: Data quality assessment
    const cleaningMessage = `Analyze data quality and detect duplicates for period relevant to: ${message}`;
    const cleaningResult = await this.runDataQualityAnalysis(
      cleaningMessage,
      this.createInteractiveApprovalHandler()
    );
    
    // Phase 2: Analytics on cleaned data context
    const analyticsMessage = `${message}\n\nDATA QUALITY CONTEXT:\n${JSON.stringify(cleaningResult.cleaningResults, null, 2)}`;
    const analyticsResult = await run(analyticsAgent, analyticsMessage);
    
    return {
      type: 'integrated_analysis',
      data_quality_phase: cleaningResult,
      analytics_phase: analyticsResult.finalOutput,
      combined_insights: this.combineInsights(cleaningResult, analyticsResult.finalOutput),
      recommendations: this.generateActionableRecommendations(cleaningResult, analyticsResult.finalOutput)
    };
  }
  
  private formatApprovalRequest(interruption: any): string {
    const tool = interruption.rawItem.name;
    const args = interruption.rawItem.arguments;
    
    if (tool === 'detect_duplicate_guests') {
      return `Detect and flag potential duplicate guest identities with ${args.similarity_threshold}% confidence threshold`;
    } else if (tool === 'merge_duplicate_profiles') {
      return `Merge ${args.merge_instructions?.length || 0} duplicate guest profiles permanently`;
    } else if (tool === 'perform_data_cleaning') {
      return `Perform ${args.cleaning_type} on guest data${args.auto_fix ? ' with auto-fix' : ''}`;
    }
    
    return `Execute ${tool} with parameters: ${JSON.stringify(args)}`;
  }
  
  private assessRiskLevel(interruption: any): 'low' | 'medium' | 'high' {
    const tool = interruption.rawItem.name;
    const args = interruption.rawItem.arguments;
    
    if (tool === 'merge_duplicate_profiles') return 'high';
    if (tool === 'perform_data_cleaning' && !args.auto_fix) return 'medium';
    if (tool === 'detect_duplicate_guests' && args.similarity_threshold < 0.7) return 'medium';
    
    return 'low';
  }
  
  private getRecommendation(interruption: any): string {
    const risk = this.assessRiskLevel(interruption);
    const tool = interruption.rawItem.name;
    
    if (risk === 'high') {
      return `⚠️  HIGH RISK: Review carefully. ${tool} can permanently modify data.`;
    } else if (risk === 'medium') {
      return `⚡ MEDIUM RISK: Consider impact. Changes may affect analytics accuracy.`;
    } else {
      return `✅ LOW RISK: Safe to approve. Minimal impact on existing data.`;
    }
  }
  
  private autoApproveBasedOnRisk(requests: any[]): { approved: string[]; rejected: string[] } {
    const approved: string[] = [];
    const rejected: string[] = [];
    
    for (const request of requests) {
      if (request.risk_level === 'low') {
        approved.push(request.id);
      } else {
        rejected.push(request.id);
      }
    }
    
    return { approved, rejected };
  }
  
  private createInteractiveApprovalHandler() {
    return async (requests: any[]) => {
      // In a real implementation, this would show UI for approval
      // For demo, auto-approve based on risk assessment
      
      console.log('\n🔍 APPROVAL REQUESTS:');
      requests.forEach(req => {
        console.log(`- ${req.description}`);
        console.log(`  Risk: ${req.risk_level.toUpperCase()}`);
        console.log(`  Recommendation: ${req.recommendation}\n`);
      });
      
      return this.autoApproveBasedOnRisk(requests);
    };
  }
  
  private getApprovalHistory(state: RunState<unknown, Agent<unknown, any>>): any[] {
    // Extract approval history from state
    return []; // Simplified for demo
  }
  
  private calculateDataQualityScore(cleaningResults: any): number {
    // Calculate data quality score based on cleaning results
    if (!cleaningResults || typeof cleaningResults !== 'object') return 85;
    
    let score = 100;
    
    // Deduct points for issues found
    if (cleaningResults.duplicate_groups_found > 0) {
      score -= cleaningResults.duplicate_groups_found * 2;
    }
    
    if (cleaningResults.standardization_suggestions?.length > 0) {
      score -= cleaningResults.standardization_suggestions.length * 1;
    }
    
    return Math.max(score, 60); // Minimum score of 60
  }
  
  private combineInsights(cleaningResult: any, analyticsResult: any): any {
    return {
      data_quality_impact: `Data quality improvements could enhance analytics accuracy by ${(100 - this.calculateDataQualityScore(cleaningResult.cleaningResults)) * 0.5}%`,
      analytics_reliability: cleaningResult.dataQualityScore > 90 ? 'High' : cleaningResult.dataQualityScore > 75 ? 'Medium' : 'Low',
      combined_recommendations: [
        'Complete data cleaning before final analytics reports',
        'Implement regular data quality monitoring',
        'Consider duplicate detection in guest registration process'
      ]
    };
  }
  
  private generateActionableRecommendations(cleaningResult: any, analyticsResult: any): string[] {
    const recommendations = [];
    
    if (cleaningResult.dataQualityScore < 85) {
      recommendations.push('🔧 Prioritize data cleaning to improve analytics accuracy');
    }
    
    if (cleaningResult.cleaningResults?.duplicate_groups_found > 5) {
      recommendations.push('👥 Implement guest registration validation to prevent future duplicates');
    }
    
    recommendations.push('📊 Schedule regular data quality audits');
    recommendations.push('🎯 Use cleaned data for strategic decision making');
    
    return recommendations;
  }
}

// Export a singleton instance for use across the app
export const humanInLoopOrchestrator = new HumanInLoopOrchestrator();

// Export singleton instance
export const humanInLoopOrchestrator = new HumanInLoopOrchestrator();

