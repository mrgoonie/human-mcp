import type { MockAnalysisRequest, MockCompareRequest, MockGeminiResponse, MockComparisonResponse, MockHttpResponseData } from '../types/test-types.js';

export class TestDataGenerators {
  static createBase64Image(variant: 'small' | 'medium' | 'large' = 'small'): string {
    // Different sized images for more realistic testing
    const images = {
      small: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      medium: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      large: 'iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAOklEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJgggAAAABJRU5ErkJgggAAAABJRU5ErkJggg=='
    };
    return `data:image/png;base64,${images[variant]}`;
  }

  static createMockImageBuffer(size: number = 1024): Buffer {
    // Create buffer with specified size for more realistic testing
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(base64, 'base64');
    // Pad buffer to reach desired size
    return size > buffer.length ? Buffer.concat([buffer, Buffer.alloc(size - buffer.length)]) : buffer;
  }

  static createMockVideoFile(duration: number = 10): string {
    // Mock MP4 file path with metadata
    return `/tmp/test-video-${duration}s.mp4`;
  }

  static createMockGifFile(frames: number = 5): string {
    // Mock GIF file path with metadata
    return `/tmp/test-animation-${frames}frames.gif`;
  }

  static createMockAnalysisRequest(overrides: Partial<MockAnalysisRequest> = {}): MockAnalysisRequest {
    const prompts = [
      'Analyze the user interface elements and their layout',
      'Focus on accessibility and usability issues',
      'Identify any visual bugs or rendering problems',
      'Review the overall design consistency',
      'Check for mobile responsiveness indicators'
    ];
    
    const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    return {
      input: TestDataGenerators.createBase64Image(),
      detail_level: Math.random() > 0.5 ? 'detailed' : 'quick',
      custom_prompt: selectedPrompt,
      ...overrides
    };
  }

  static createMockCompareRequest(overrides: Partial<MockCompareRequest> = {}): MockCompareRequest {
    const prompts = [
      'Compare the visual differences between these two UI states',
      'Focus on layout and structural changes',
      'Identify pixel-level differences and their impact',
      'Compare accessibility features between versions',
      'Analyze the user experience implications of changes'
    ];
    
    const comparisonTypes: Array<'pixel' | 'structural' | 'semantic'> = ['pixel', 'structural', 'semantic'];
    const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    const selectedType = comparisonTypes[Math.floor(Math.random() * comparisonTypes.length)];
    
    const baseRequest = {
      input1: TestDataGenerators.createBase64Image('medium'),
      input2: TestDataGenerators.createBase64Image('medium'),
      comparison_type: selectedType as 'pixel' | 'structural' | 'semantic',
      custom_prompt: selectedPrompt
    };
    
    return Object.assign({}, baseRequest, overrides) as MockCompareRequest;
  }

  static createMockGeminiResponse(overrides: Partial<MockGeminiResponse> = {}): MockGeminiResponse {
    const responses = [
      {
        summary: 'Screenshot shows a web application interface',
        details: 'This image contains a modern web application with a navigation bar, sidebar, and main content area. The interface uses a clean design with blue accents.',
        technical_details: {
          dimensions: '1920x1080',
          format: 'PNG',
          colors: 'full color',
          ui_elements: 'navigation, sidebar, content area'
        },
        confidence: 0.92,
        recommendations: ['Consider improving color contrast', 'Add loading states for better UX']
      },
      {
        summary: 'Mobile app screenshot with user interface elements',
        details: 'This is a mobile application screenshot showing a login form with input fields and buttons. The design follows modern mobile UI patterns.',
        technical_details: {
          dimensions: '375x812',
          format: 'JPEG',
          colors: 'full color',
          platform: 'mobile'
        },
        confidence: 0.88,
        recommendations: ['Optimize for smaller screen sizes', 'Ensure touch targets are adequate']
      },
      {
        summary: 'Code editor interface with syntax highlighting',
        details: 'The image shows a code editor with syntax highlighting, line numbers, and a file tree. Multiple tabs are open showing different files.',
        technical_details: {
          dimensions: '1440x900',
          format: 'PNG',
          colors: 'dark theme',
          editor: 'VS Code-like interface'
        },
        confidence: 0.96,
        recommendations: ['Good use of syntax highlighting', 'Consider font size for readability']
      }
    ];
    
    const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
    return Object.assign({}, selectedResponse, overrides) as MockGeminiResponse;
  }

  static createMockComparisonResponse(overrides: Partial<MockComparisonResponse> = {}): MockComparisonResponse {
    const responses = [
      {
        summary: 'Significant UI differences detected',
        differences: [
          'Button color changed from blue to green',
          'Navigation bar height increased by 10px',
          'New search icon added in header'
        ],
        similarity_score: 0.73,
        analysis_method: 'semantic',
        recommendations: [
          'Review color accessibility standards',
          'Test navigation changes with users',
          'Ensure search functionality is intuitive'
        ],
        technical_details: {
          image1_format: 'PNG',
          image2_format: 'PNG',
          comparison_method: 'semantic'
        }
      },
      {
        summary: 'Minor layout adjustments found',
        differences: [
          'Slight margin increase in content area',
          'Font size reduced by 1px'
        ],
        similarity_score: 0.91,
        analysis_method: 'structural',
        recommendations: [
          'Changes are minimal and unlikely to impact users',
          'Consider A/B testing for optimal spacing'
        ],
        technical_details: {
          image1_format: 'JPEG',
          image2_format: 'PNG',
          comparison_method: 'structural'
        }
      },
      {
        summary: 'Images are nearly identical',
        differences: [],
        similarity_score: 0.98,
        analysis_method: 'pixel',
        recommendations: ['No significant changes detected'],
        technical_details: {
          image1_format: 'PNG',
          image2_format: 'PNG',
          comparison_method: 'pixel'
        }
      }
    ];
    
    const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
    return Object.assign({}, selectedResponse, overrides) as MockComparisonResponse;
  }

  static createMockFileStats() {
    return {
      isFile: () => true,
      isDirectory: () => false,
      size: 1024,
      mtime: new Date(),
      ctime: new Date()
    };
  }

  static createMockHttpResponse(data: MockHttpResponseData, status = 200, headers: Record<string, string> = {}) {
    return new Response(typeof data === 'string' ? data : JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }

  static createMockErrorResponse(message: string, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static generateRandomPort(): number {
    return 3000 + Math.floor(Math.random() * 1000);
  }

  static createMockSessionData() {
    return {
      id: 'test-session-123',
      created: Date.now(),
      lastActivity: Date.now(),
      data: {}
    };
  }
}

export default TestDataGenerators;