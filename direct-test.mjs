import { loadConfig } from './src/utils/config.js';
import { GeminiClient } from './src/tools/eyes/utils/gemini-client.js';
import { processImage } from './src/tools/eyes/processors/image.js';

async function testEyesAnalyze() {
  try {
    console.log('Loading configuration...');
    const config = loadConfig();
    
    console.log('Creating Gemini client...');
    const geminiClient = new GeminiClient(config);
    const model = geminiClient.getModel('detailed');
    
    console.log('Processing image...');
    const screenshotPath = 'screenshots/CleanShot 2025-09-15 at 13.43.58@2x.png';
    
    const options = {
      source: screenshotPath,
      type: 'image',
      detail_level: 'detailed',
      prompt: 'Provide a comprehensive analysis of this screenshot. Describe what application or interface is being shown, the layout, key elements visible, any text content, buttons, menus, and overall functionality that can be inferred from the visual elements.',
      fetchTimeout: config.server.fetchTimeout
    };
    
    const result = await processImage(model, screenshotPath, options);
    
    console.log('\n=== SCREENSHOT ANALYSIS RESULT ===');
    console.log(result.analysis);
    console.log('\n=== END ANALYSIS ===');
    
  } catch (error) {
    console.error('Error during analysis:', error);
    if (error.message) {
      console.error('Error message:', error.message);
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testEyesAnalyze();
