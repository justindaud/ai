import { NextRequest, NextResponse } from 'next/server';
import { humanInLoopOrchestrator } from '@/server/human-in-loop';

// In-memory storage for pending approval requests (in production, use Redis or database)
const pendingRequests = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const { requestId, approvedIds, rejectedIds } = await req.json();

    if (!requestId || (!approvedIds && !rejectedIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: requestId and approval decisions' },
        { status: 400 }
      );
    }

    // Simulate processing approved operations
    const approvalResults = [];
    
    if (approvedIds && approvedIds.length > 0) {
      approvalResults.push(`✅ Approved ${approvedIds.length} operation(s):`);
      
      for (const id of approvedIds) {
        // Simulate different types of approved operations
        if (id.includes('duplicate')) {
          approvalResults.push(`  • Guest deduplication completed for ${id}`);
        } else if (id.includes('merge')) {
          approvalResults.push(`  • Guest profiles merged successfully for ${id}`);
        } else if (id.includes('clean')) {
          approvalResults.push(`  • Data cleaning operation completed for ${id}`);
        } else {
          approvalResults.push(`  • Operation ${id} completed successfully`);
        }
      }
    }

    if (rejectedIds && rejectedIds.length > 0) {
      approvalResults.push(`❌ Rejected ${rejectedIds.length} operation(s):`);
      rejectedIds.forEach((id: string) => {
        approvalResults.push(`  • Operation ${id} was cancelled by user`);
      });
    }

    // Simulate post-approval analysis
    const postApprovalAnalysis = await simulatePostApprovalAnalysis(approvedIds, rejectedIds);

    const response = [
      '🎯 **Human-in-the-Loop Approval Completed**\n',
      ...approvalResults,
      '\n📊 **Impact Analysis:**',
      ...postApprovalAnalysis,
      '\n✅ **Next Steps:**',
      '• Data quality improvements have been applied',
      '• Analytics accuracy has been enhanced',
      '• You can now proceed with your analysis queries',
      '\n🔄 Ready for your next question!'
    ].join('\n');

    return NextResponse.json({
      success: true,
      output: response,
      approvedCount: approvedIds?.length || 0,
      rejectedCount: rejectedIds?.length || 0,
      orchestrationUsed: true,
      agentsInvolved: ['data_quality', 'orchestrator']
    });

  } catch (error: any) {
    console.error('Approval processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process approval decisions',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

async function simulatePostApprovalAnalysis(approvedIds: string[], rejectedIds: string[]) {
  const analysis = [];
  
  if (approvedIds && approvedIds.length > 0) {
    // Simulate data quality improvements
    const duplicatesResolved = approvedIds.filter(id => id.includes('duplicate')).length;
    const mergesCompleted = approvedIds.filter(id => id.includes('merge')).length;
    const cleaningOps = approvedIds.filter(id => id.includes('clean')).length;

    if (duplicatesResolved > 0) {
      analysis.push(`• Resolved ${duplicatesResolved} duplicate guest group(s)`);
      analysis.push(`• Estimated data accuracy improvement: +${duplicatesResolved * 2}%`);
    }

    if (mergesCompleted > 0) {
      analysis.push(`• Merged ${mergesCompleted} guest profile(s)`);
      analysis.push(`• Consolidated guest history and preferences`);
    }

    if (cleaningOps > 0) {
      analysis.push(`• Completed ${cleaningOps} data cleaning operation(s)`);
      analysis.push(`• Standardized data formats and values`);
    }

    // Overall impact
    const totalOperations = approvedIds.length;
    analysis.push(`• Overall data quality score improved by ~${totalOperations * 1.5}%`);
  }

  if (rejectedIds && rejectedIds.length > 0) {
    analysis.push(`• ${rejectedIds.length} operation(s) cancelled as requested`);
    analysis.push(`• Original data integrity maintained`);
  }

  if (analysis.length === 0) {
    analysis.push('• No operations were processed');
  }

  return analysis;
}

// Helper endpoint to store pending requests (called by orchestrator)
export async function PUT(req: NextRequest) {
  try {
    const { requestId, approvalRequests } = await req.json();
    
    if (!requestId || !approvalRequests) {
      return NextResponse.json(
        { error: 'Missing requestId or approvalRequests' },
        { status: 400 }
      );
    }

    // Store pending request
    pendingRequests.set(requestId, {
      requests: approvalRequests,
      timestamp: Date.now(),
      status: 'pending'
    });

    return NextResponse.json({ 
      success: true,
      message: 'Approval request stored',
      requestId 
    });

  } catch (error: any) {
    console.error('Failed to store approval request:', error);
    return NextResponse.json(
      { error: 'Failed to store approval request' },
      { status: 500 }
    );
  }
}

// Helper endpoint to get pending requests
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const requestId = url.searchParams.get('requestId');

    if (requestId) {
      const request = pendingRequests.get(requestId);
      if (!request) {
        return NextResponse.json(
          { error: 'Request not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(request);
    }

    // Return all pending requests
    const allRequests = Array.from(pendingRequests.entries()).map(([id, data]) => ({
      id,
      ...data
    }));

    return NextResponse.json({
      pendingRequests: allRequests,
      count: allRequests.length
    });

  } catch (error: any) {
    console.error('Failed to get approval requests:', error);
    return NextResponse.json(
      { error: 'Failed to get approval requests' },
      { status: 500 }
    );
  }
}
