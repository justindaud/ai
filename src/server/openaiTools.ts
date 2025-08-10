import { codeInterpreterTool, fileSearchTool, imageGenerationTool } from '@openai/agents-openai';

export function getOpenAITools() {
  const tools = [] as any[];
  // Code interpreter (useful for ad-hoc calculations or csv summarization)
  tools.push(codeInterpreterTool({}));

  // File search (requires configured file search on OpenAI side; safe to include if enabled)
  tools.push(fileSearchTool({}));

  // Image generation (optional; can help produce infographics if needed)
  tools.push(imageGenerationTool({}));

  return tools;
}


