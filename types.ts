
export interface Artist {
  id: string;
  name: string;
  label: string;
  genres: string[];
  estimatedMonthlyStreams?: number;
  isIndependent?: boolean;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  label: string;
  genre: string;
  duration: string;
  spotifyUrl: string;
  votes?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  owner: string;
  imageUrl: string;
  genre: string;
  tracks: Track[];
  integrityScore?: number;
}

export interface AnalysisResult {
  score: number;
  riskFactors: {
    category: 'Nepotism' | 'Payola' | 'Organic' | 'Label Dominance';
    severity: 'Low' | 'Medium' | 'High';
    description: string;
  }[];
  summary: string;
}

export interface ArtistFinancials {
  name: string;
  estimatedMonthlyEarnings: number;
  platformCut: number;
  labelCut: number;
  artistTakeHome: number;
  supportLinks: { platform: string; url: string }[];
  fairnessStatement: string;
}

export enum Page {
  Landing = 'landing',
  Dashboard = 'dashboard', 
  Explore = 'explore',      
  Analyser = 'analyser',
  Community = 'community',
  ArtistProfile = 'artist-profile',
  PlaylistDetail = 'playlist-detail',
  Following = 'following',
  Profile = 'profile',
  CreatePlaylist = 'create-playlist'
}
