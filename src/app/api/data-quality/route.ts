import { NextRequest, NextResponse } from 'next/server';
import { humanInLoopOrchestrator } from '@/server/human-in-loop';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, mode = 'integrated', includeDataCleaning = true } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log(`🔍 Data Quality Request: ${message}`);
    console.log(`📋 Mode: ${mode}, Include Cleaning: ${includeDataCleaning}`);

    if (mode === 'cleaning_only') {
      // Data quality analysis only
      const result = await humanInLoopOrchestrator.runDataQualityAnalysis(message);
      
      return NextResponse.json({
        type: 'data_quality_analysis',
        result: result.finalOutput,
        data_quality_score: result.dataQualityScore,
        cleaning_results: result.cleaningResults,
        approval_history: result.approvalHistory,
        recommendations: [
          'Review flagged duplicates carefully',
          'Consider implementing data validation rules',
          'Schedule regular data quality audits'
        ]
      });
      
    } else if (mode === 'integrated') {
      // Integrated analysis with data quality first
      const result = await humanInLoopOrchestrator.runIntegratedAnalysis(
        message, 
        includeDataCleaning
      );
      
      return NextResponse.json({
        type: 'integrated_analysis',
        data_quality_phase: result.data_quality_phase,
        analytics_phase: result.analytics_phase,
        combined_insights: result.combined_insights,
        recommendations: result.recommendations,
        workflow_summary: {
          phases_completed: includeDataCleaning ? 2 : 1,
          human_approvals_required: result.data_quality_phase?.approvalHistory?.length || 0,
          data_quality_improvements: `${100 - (result.data_quality_phase?.dataQualityScore || 95)}% potential improvement`,
          analytics_confidence: result.data_quality_phase?.dataQualityScore > 90 ? 'High' : 'Medium'
        }
      });
      
    } else {
      return NextResponse.json({ error: 'Invalid mode. Use "cleaning_only" or "integrated"' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Data Quality API Error:', error);
    
    return NextResponse.json({
      error: 'Data quality analysis failed',
      details: error.message,
      suggestions: [
        'Check if the question is related to hotel guest data',
        'Verify date ranges are valid',
        'Try simplifying the query'
      ]
    }, { status: 500 });
  }
}

// GET endpoint for data quality status
export async function GET() {
  try {
    return NextResponse.json({
      service: 'Hotel Data Quality API',
      status: 'operational',
      capabilities: {
        duplicate_detection: 'Advanced fuzzy matching with human approval',
        data_cleaning: 'Name standardization, phone formatting, typo detection',
        human_in_loop: 'Approval workflow for significant data changes',
        integrated_analytics: 'Quality-assured analytics with cleaned data'
      },
      workflow: {
        step1: 'Data quality assessment with duplicate detection',
        step2: 'Human approval for proposed changes',
        step3: 'Data cleaning execution',
        step4: 'Analytics on cleaned dataset',
        step5: 'Combined insights and recommendations'
      },
      usage: {
        cleaning_only: 'POST /api/data-quality with mode: "cleaning_only"',
        integrated: 'POST /api/data-quality with mode: "integrated"',
        parameters: {
          message: 'Your data quality question or analytics request',
          mode: 'cleaning_only | integrated',
          includeDataCleaning: 'boolean (default: true)'
        }
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }
}

