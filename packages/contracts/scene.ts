export type SceneDefinition = {
  id: string;
  title: string;
  english_title: string;
  chapter: string;
  headline: [string, string];
  intro: [string, string];
  tagline: string;
  location: string;
  time: string;
  weather: string;
  entry_title: string;
  entry_description: string;
  enter_label: string;
  opening_line: string;
  conversation_hint: string;
  character: {
    name: string;
    age: number;
    profession: string;
    appearance: string;
    personality: string;
    backstory: string;
  };
  topics: [string, string, string];
  photo_caption: string;
  photo_description: string;
  palette: { background: string; accent: string; outfit: string; hair: string; skin: string };
  visual: {
    setting: 'cafe' | 'bookshop' | 'station';
    hairstyle: 'long' | 'short' | 'bun';
    outfit: 'coat' | 'sweater' | 'jacket';
    accessory: 'star' | 'glasses' | 'scarf' | 'none';
  };
  mock_replies: [string, string, string];
};
