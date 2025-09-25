import { Post } from './lib/supabaseUtils';

// Mock data for gallery posts
export const mockPosts: Post[] = [
  {
    id: '1',
    user_id: 'mock-user-1',
    username: 'artisan_nova',
    media_url: 'https://images.pexels.com/photos/8566473/pexels-photo-8566473.jpeg',
    media_type: 'image',
    title: 'Digital Serenity',
    style: 'Neo-futuristic Cyberpunk',
    analysis_data: {
      id: '1',
      title: 'Digital Serenity',
      style: 'Neo-futuristic Cyberpunk',
      prompt: 'A captivating cybernetic portrait bathed in neon glow, showcasing intricate digital enhancements and a serene expression, blending human and machine aesthetics seamlessly.',
      keyTokens: [
        'cybernetic portrait',
        'neon lighting',
        'futuristic aesthetic',
        'digital enhancement',
        'synthetic beauty',
        'technological fusion',
        'ethereal glow'
      ],
      creativeRemixes: [
        'Transform into medieval fantasy setting with magical elements replacing technological components in mystical environment.',
        'Reimagine as 1920s art deco style with geometric patterns and luxurious vintage aesthetic throughout composition.',
        'Convert to underwater scene with bioluminescent features and flowing aquatic elements creating ethereal atmosphere.'
      ],
      outpaintingPrompts: [
        'Reveal vast surrounding environment with additional contextual elements extending beyond current boundaries of content.',
        'Expand to show broader narrative context with supporting characters and environmental details in background.',
        'Extend scope to include temporal elements showing progression and development of central theme.'
      ],
      animationPrompts: [
        'Gentle rhythmic motion with subtle environmental changes and soft transitions creating peaceful flowing movement.',
        'Dynamic transformation sequence with dramatic lighting changes and particle effects building visual intensity.',
        'Cinematic camera movement revealing hidden details and creating immersive storytelling experience through motion.'
      ],
      musicPrompts: [
        'Ethereal ambient soundscape with layered textures, evolving harmonies, and subtle rhythmic elements creating immersive atmospheric experience perfect for contemplation.',
        'Dynamic orchestral composition featuring dramatic crescendos, intricate melodies, and rich instrumentation that captures emotional depth and narrative complexity.',
        'Electronic fusion with synthesized textures, rhythmic patterns, and digital processing creating modern sonic interpretation of visual themes.'
      ],
      dialoguePrompts: [
        'The essence of transformation unfolds',
        'Where reality meets imagination',
        'Beyond the realm of possibility'
      ],
      storyPrompts: [
        'A simple discovery becomes the catalyst for extraordinary personal transformation and unexpected journey of growth.',
        'An intricate narrative exploring how seemingly unrelated elements connect across different dimensions of experience.',
        'A surreal adventure where boundaries between different realities blur creating infinite possibilities for exploration.'
      ]
    },
    created_at: '2024-01-15T10:30:00Z',
    likes_count: 42
  },
  {
    id: '2',
    user_id: 'mock-user-2',
    username: 'pixel_dreamer',
    media_url: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg',
    media_type: 'image',
    title: 'Cosmic Wanderer',
    style: 'Ethereal Space Art',
    analysis_data: {
      id: '2',
      title: 'Cosmic Wanderer',
      style: 'Ethereal Space Art',
      prompt: 'A lone figure silhouetted against a vast cosmic backdrop, surrounded by swirling galaxies and distant stars, evoking themes of exploration and infinite possibility.',
      keyTokens: [
        'cosmic silhouette',
        'galaxy swirls',
        'stellar backdrop',
        'space exploration',
        'infinite vastness',
        'celestial beauty',
        'astral journey'
      ],
      creativeRemixes: [
        'Reimagine as underwater explorer discovering bioluminescent deep sea creatures in mysterious ocean depths.',
        'Transform into forest wanderer surrounded by magical floating lights and ancient mystical tree spirits.',
        'Convert to urban explorer navigating neon-lit cityscape with holographic advertisements and flying vehicles.'
      ],
      outpaintingPrompts: [
        'Expand to reveal massive space station or alien architecture in the cosmic background.',
        'Extend scene to show other cosmic travelers on similar journeys across the galaxy.',
        'Broaden view to include multiple planets and celestial phenomena in the vast universe.'
      ],
      animationPrompts: [
        'Gentle rotation of galaxies with twinkling stars and slow drift of cosmic dust particles.',
        'Figure walking forward as planets and stars slowly move past creating sense of journey.',
        'Pulsing nebulae and shifting cosmic colors creating dynamic celestial light show around traveler.'
      ],
      musicPrompts: [
        'Ambient space music with deep synthesizer pads, ethereal choir voices, and subtle cosmic sound effects creating sense of wonder and exploration.',
        'Orchestral piece with soaring strings, majestic brass, and delicate harp arpeggios capturing the grandeur of space travel.',
        'Electronic ambient with spacey reverbs, filtered melodies, and rhythmic pulses evoking the mystery of deep space exploration.'
      ],
      dialoguePrompts: [
        'Among the stars we find ourselves',
        'The universe calls to wanderers',
        'Infinite paths await the brave'
      ],
      storyPrompts: [
        'A cosmic traveler discovers an ancient signal that leads to a forgotten civilization.',
        'The last human explores the galaxy searching for signs of life and meaning.',
        'A mystical journey through space reveals the interconnectedness of all existence.'
      ]
    },
    created_at: '2024-01-14T15:45:00Z',
    likes_count: 38
  },
  {
    id: '3',
    user_id: 'mock-user-3',
    username: 'neon_architect',
    media_url: 'https://images.pexels.com/photos/2387793/pexels-photo-2387793.jpeg',
    media_type: 'image',
    title: 'Urban Pulse',
    style: 'Cyberpunk Cityscape',
    analysis_data: {
      id: '3',
      title: 'Urban Pulse',
      style: 'Cyberpunk Cityscape',
      prompt: 'A vibrant neon-soaked urban landscape with towering skyscrapers, holographic advertisements, and streams of light creating a pulsing rhythm of city life.',
      keyTokens: [
        'neon cityscape',
        'holographic ads',
        'urban rhythm',
        'light streams',
        'cyber architecture',
        'digital pulse',
        'future metropolis'
      ],
      creativeRemixes: [
        'Transform into ancient Roman city with marble columns and golden light replacing neon elements.',
        'Reimagine as floating sky city with cloud bridges and aerial transportation systems.',
        'Convert to underwater city with bioluminescent coral structures and aquatic transportation.'
      ],
      outpaintingPrompts: [
        'Expand to show the full sprawling metropolis extending to the horizon with multiple districts.',
        'Reveal the sky level with flying vehicles and elevated transportation networks above the city.',
        'Extend downward to show underground levels and subterranean city infrastructure.'
      ],
      animationPrompts: [
        'Flowing traffic streams with pulsing neon signs and holographic displays cycling through advertisements.',
        'Camera sweep through the city streets revealing layers of activity and urban life.',
        'Time-lapse showing day to night transition with lights gradually illuminating the cityscape.'
      ],
      musicPrompts: [
        'Synthwave track with driving basslines, retro synthesizers, and electronic drums capturing the energy of cyberpunk nightlife.',
        'Ambient electronic with urban sound samples, filtered vocals, and rhythmic pulses reflecting the city heartbeat.',
        'Industrial electronic music with metallic percussion, distorted synths, and atmospheric pads evoking futuristic urban environment.'
      ],
      dialoguePrompts: [
        'The city never sleeps tonight',
        'Neon dreams and digital schemes',
        'Welcome to tomorrow\'s metropolis'
      ],
      storyPrompts: [
        'A hacker navigates the digital underground while evading corporate surveillance in the neon city.',
        'Two lovers meet on a rooftop garden above the sprawling cyberpunk metropolis.',
        'A detective investigates mysterious disappearances in the shadowy districts of the future city.'
      ]
    },
    created_at: '2024-01-13T09:20:00Z',
    likes_count: 55
  },
  {
    id: '4',
    user_id: 'mock-user-4',
    username: 'mystic_lens',
    media_url: 'https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg',
    media_type: 'image',
    title: 'Forest Whispers',
    style: 'Enchanted Nature',
    analysis_data: {
      id: '4',
      title: 'Forest Whispers',
      style: 'Enchanted Nature',
      prompt: 'A mystical forest scene with dappled sunlight filtering through ancient trees, creating magical patterns of light and shadow on the forest floor.',
      keyTokens: [
        'mystical forest',
        'dappled sunlight',
        'ancient trees',
        'light patterns',
        'shadow play',
        'natural magic',
        'woodland serenity'
      ],
      creativeRemixes: [
        'Transform into crystalline ice forest with frozen waterfalls and aurora lights dancing between trees.',
        'Reimagine as alien jungle with bioluminescent plants and floating spores creating ethereal atmosphere.',
        'Convert to autumn forest with golden leaves and warm amber light filtering through branches.'
      ],
      outpaintingPrompts: [
        'Expand to reveal hidden fairy dwellings and magical creatures living within the forest.',
        'Extend to show a crystal clear stream winding through the forest with stepping stones.',
        'Broaden view to include ancient stone ruins covered in moss and climbing vines.'
      ],
      animationPrompts: [
        'Gentle swaying of tree branches with leaves rustling and sunbeams slowly shifting across forest floor.',
        'Magical particles floating through the air with occasional glimpses of woodland creatures.',
        'Seasonal time-lapse showing the forest transforming through spring, summer, autumn, and winter.'
      ],
      musicPrompts: [
        'Celtic folk music with acoustic guitar, flute melodies, and nature sounds creating peaceful woodland atmosphere.',
        'Ambient nature composition with forest sounds, gentle piano, and ethereal string arrangements.',
        'New age music featuring harp, wind chimes, and bird songs blended with soft synthesizer pads.'
      ],
      dialoguePrompts: [
        'Listen to the forest\'s ancient song',
        'Nature holds all the answers',
        'In silence, wisdom grows'
      ],
      storyPrompts: [
        'A lost traveler discovers a hidden grove where time moves differently and magic still exists.',
        'An ancient tree guardian awakens to protect the forest from encroaching darkness.',
        'A young botanist uncovers the secret language of plants in this enchanted woodland.'
      ]
    },
    created_at: '2024-01-12T14:10:00Z',
    likes_count: 29
  },
  {
    id: '5',
    user_id: 'mock-user-5',
    username: 'chrome_vision',
    media_url: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg',
    media_type: 'image',
    title: 'Mechanical Dreams',
    style: 'Industrial Steampunk',
    analysis_data: {
      id: '5',
      title: 'Mechanical Dreams',
      style: 'Industrial Steampunk',
      prompt: 'An intricate mechanical contraption with brass gears, copper pipes, and steam vents, showcasing the beauty of industrial craftsmanship and Victorian-era engineering.',
      keyTokens: [
        'brass gears',
        'copper pipes',
        'steam vents',
        'mechanical beauty',
        'industrial craft',
        'Victorian engineering',
        'clockwork precision'
      ],
      creativeRemixes: [
        'Transform into organic bio-mechanical fusion with living vines growing through mechanical components.',
        'Reimagine as crystal-powered magical apparatus with glowing gems replacing steam and gears.',
        'Convert to underwater diving apparatus with barnacles and coral growing on brass surfaces.'
      ],
      outpaintingPrompts: [
        'Expand to show the full workshop with other mechanical inventions and tools scattered around.',
        'Reveal the inventor working at a desk surrounded by blueprints and prototype devices.',
        'Extend to show the machine as part of a larger factory or industrial complex.'
      ],
      animationPrompts: [
        'Gears turning rhythmically with steam puffing from vents and pressure gauges fluctuating.',
        'Camera rotating around the machine revealing intricate details and moving mechanical parts.',
        'Assembly sequence showing how the various components come together to form the complete device.'
      ],
      musicPrompts: [
        'Industrial orchestral music with mechanical percussion, brass instruments, and steam sound effects creating steampunk atmosphere.',
        'Clockwork waltz with music box melodies, ticking rhythms, and orchestral arrangements evoking Victorian elegance.',
        'Ambient industrial with metallic sounds, steam hisses, and rhythmic mechanical noises creating workshop atmosphere.'
      ],
      dialoguePrompts: [
        'Precision in every turning gear',
        'Steam-powered dreams take flight',
        'Innovation through brass and steam'
      ],
      storyPrompts: [
        'A brilliant inventor creates a machine that can harness the power of dreams and imagination.',
        'In a steampunk world, a young engineer discovers blueprints for a device that could change everything.',
        'The last steam-powered automaton awakens in an abandoned Victorian workshop.'
      ]
    },
    created_at: '2024-01-11T11:55:00Z',
    likes_count: 47
  },
  {
    id: '6',
    user_id: 'mock-user-6',
    username: 'wave_rider',
    media_url: 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg',
    media_type: 'image',
    title: 'Ocean Symphony',
    style: 'Fluid Dynamics',
    analysis_data: {
      id: '6',
      title: 'Ocean Symphony',
      style: 'Fluid Dynamics',
      prompt: 'A powerful ocean wave captured at the perfect moment, showcasing the raw energy and fluid beauty of water in motion with crystalline droplets and foam.',
      keyTokens: [
        'ocean wave',
        'fluid motion',
        'water energy',
        'crystalline drops',
        'sea foam',
        'aquatic power',
        'liquid sculpture'
      ],
      creativeRemixes: [
        'Transform into molten lava flow with glowing embers and volcanic energy replacing water dynamics.',
        'Reimagine as liquid mercury with metallic reflections and otherworldly fluid properties.',
        'Convert to aurora wave with colorful light patterns flowing like liquid energy through space.'
      ],
      outpaintingPrompts: [
        'Expand to show the vast ocean horizon with storm clouds gathering in the distance.',
        'Reveal surfers riding the waves or seabirds diving through the spray.',
        'Extend to show the wave crashing against rocky cliffs with dramatic spray patterns.'
      ],
      animationPrompts: [
        'Slow motion wave breaking with water droplets suspended in air and foam cascading.',
        'Time-lapse of multiple waves rolling in sequence with changing light conditions.',
        'Underwater view showing the wave from below with sunlight filtering through the water.'
      ],
      musicPrompts: [
        'Orchestral piece with flowing string sections, crashing cymbals, and wind instruments mimicking ocean sounds and wave movements.',
        'Ambient water music with recorded ocean sounds, synthesized wave textures, and rhythmic patterns matching wave cycles.',
        'Classical composition featuring piano arpeggios like water droplets, with crescendos representing wave crashes.'
      ],
      dialoguePrompts: [
        'The ocean speaks in waves',
        'Liquid poetry in motion',
        'Where water meets the sky'
      ],
      storyPrompts: [
        'A marine biologist discovers that ocean waves carry messages from deep sea creatures.',
        'A surfer finds perfect harmony with the ocean and learns to read its ancient rhythms.',
        'The last mermaid uses wave patterns to communicate with the surface world.'
      ]
    },
    created_at: '2024-01-10T16:30:00Z',
    likes_count: 33
  }
];

// Helper function to get posts by style
export const getPostsByStyleMock = (style: string): Post[] => {
  return mockPosts.filter(post => post.style === style);
};

// Helper function to get all unique styles
export const getAllStylesMock = (): string[] => {
  return [...new Set(mockPosts.map(post => post.style))];
};