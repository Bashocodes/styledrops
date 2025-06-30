import { DivideIcon as LucideIcon, Type, Play, Volume2, Shuffle, Expand, Music } from 'lucide-react';

export interface AnalysisResult {
  id?: string; // Optional UUID from database - undefined if not saved to database
  title: string; // A 2-word creative title
  style: string; // A 3-word creative description
  prompt: string; // Complete description of the media/scene in 33 words
  keyTokens: string[]; // Exactly 7 two-word tokens summarizing the media
  creativeRemixes: string[]; // 3 reimagined descriptions (15-21 words each)
  outpaintingPrompts: string[]; // 3 prompts to expand the scene (15-21 words each)
  animationPrompts: string[]; // 3 video animation prompts (15-21 words each, 5s max)
  musicPrompts: string[]; // 3 music style descriptions (150-180 characters each)
  dialoguePrompts: string[]; // 3 dialogue/narration prompts (5-10 words each, simplified)
  storyPrompts: string[]; // 3 unique stories (15-21 words each)
}

export interface ModuleDefinition {
  id: string;
  name: string;
  color: string;
  icon: LucideIcon;
  promptKey: keyof AnalysisResult;
}

export const TOP_MODULES: ModuleDefinition[] = [
  {
    id: 'story',
    name: 'STORY',
    color: '#F2AB47', // Warm orange - creative storytelling energy
    icon: Type,
    promptKey: 'storyPrompts'
  },
  {
    id: 'motion',
    name: 'MOTION',
    color: '#5F6BBB', // Cool blue - dynamic, flowing movement
    icon: Play,
    promptKey: 'animationPrompts'
  },
  {
    id: 'dialogue',
    name: 'DIALOGUE',
    color: '#DD5E57', // Warm red - passionate, expressive communication
    icon: Volume2,
    promptKey: 'dialoguePrompts'
  }
];

export const BOTTOM_MODULES: ModuleDefinition[] = [
  {
    id: 'mix',
    name: 'MIX',
    color: '#7859BC', // Deep purple - mysterious, creative fusion
    icon: Shuffle,
    promptKey: 'creativeRemixes'
  },
  {
    id: 'expand',
    name: 'EXPAND',
    color: '#7BB972', // Fresh green - growth, expansion, nature
    icon: Expand,
    promptKey: 'outpaintingPrompts'
  },
  {
    id: 'sound',
    name: 'SOUND',
    color: '#5EA3EF', // Bright blue - vibrant, energetic audio
    icon: Music,
    promptKey: 'musicPrompts'
  }
];

// Mock analysis result for development
export const mockAnalysisResult: AnalysisResult = {
  id: undefined, // Mock analysis doesn't have a database ID
  title: "Digital Serenity",
  style: "Neo-futuristic Cyberpunk",
  prompt: "A captivating cybernetic portrait bathed in neon glow, showcasing intricate digital enhancements and a serene expression, blending human and machine aesthetics seamlessly.",
  keyTokens: [
    "cybernetic portrait",
    "neon lighting",
    "futuristic aesthetic",
    "digital enhancement",
    "synthetic beauty",
    "technological fusion",
    "ethereal glow"
  ],
  creativeRemixes: [
    "Transform into medieval fantasy setting with magical elements replacing technological components in mystical environment.",
    "Reimagine as 1920s art deco style with geometric patterns and luxurious vintage aesthetic throughout composition.",
    "Convert to underwater scene with bioluminescent features and flowing aquatic elements creating ethereal atmosphere."
  ],
  outpaintingPrompts: [
    "Reveal vast surrounding environment with additional contextual elements extending beyond current boundaries of content.",
    "Expand to show broader narrative context with supporting characters and environmental details in background.",
    "Extend scope to include temporal elements showing progression and development of central theme."
  ],
  animationPrompts: [
    "Gentle rhythmic motion with subtle environmental changes and soft transitions creating peaceful flowing movement.",
    "Dynamic transformation sequence with dramatic lighting changes and particle effects building visual intensity.",
    "Cinematic camera movement revealing hidden details and creating immersive storytelling experience through motion."
  ],
  musicPrompts: [
    "Ethereal ambient soundscape with layered textures, evolving harmonies, and subtle rhythmic elements creating immersive atmospheric experience perfect for contemplation.",
    "Dynamic orchestral composition featuring dramatic crescendos, intricate melodies, and rich instrumentation that captures emotional depth and narrative complexity.",
    "Electronic fusion with synthesized textures, rhythmic patterns, and digital processing creating modern sonic interpretation of visual themes."
  ],
  dialoguePrompts: [
    "The essence of transformation unfolds",
    "Where reality meets imagination",
    "Beyond the realm of possibility"
  ],
  storyPrompts: [
    "A simple discovery becomes the catalyst for extraordinary personal transformation and unexpected journey of growth.",
    "An intricate narrative exploring how seemingly unrelated elements connect across different dimensions of experience.",
    "A surreal adventure where boundaries between different realities blur creating infinite possibilities for exploration."
  ]
};