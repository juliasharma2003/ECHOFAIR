
import React, { useState, useMemo, useEffect } from 'react';
import { Page, Playlist, AnalysisResult, Track, ArtistFinancials } from './types';
import { analyzePlaylistIntegrity, estimateArtistFinancials } from './services/geminiService';
import IntegrityChart from './components/IntegrityChart';

// Base64 Representation of the Vinyl for Rap
const RAP_MATCHING_IMAGE = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=800&h=800";

// HELPER FOR MOCK TRACKS
const createTracks = (genre: string, artists: string[], count: number): Track[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${genre.toLowerCase()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
    title: `${genre} Anthem #${i + 1}`,
    artist: artists[i % artists.length],
    label: i % 3 === 0 ? 'Independent' : 'Major Distribution',
    genre,
    duration: '3:45',
    spotifyUrl: 'https://open.spotify.com',
    votes: Math.floor(Math.random() * 500)
  }));
};

const GENRES = ["Pop", "K-Pop", "Funk", "R&B", "Hip Hop", "Rap", "Jazz", "Classical"];

const genreGradients: Record<string, string> = {
  "Pop": "from-blue-600 to-cyan-400",
  "K-Pop": "from-pink-600 to-purple-400",
  "Funk": "from-orange-600 to-yellow-500",
  "R&B": "from-indigo-700 to-purple-600",
  "Hip Hop": "from-red-700 to-slate-900",
  "Rap": "from-[#e8e4d9] to-[#4a7c59]", 
  "Jazz": "from-[#1a1a1a] to-[#444444]", 
  "Classical": "from-emerald-800 to-green-600",
  "Various": "from-gray-700 to-indigo-900"
};

const genreImagePools: Record<string, string[]> = {
  "Pop": ["1514525253344-99637cc329df", "1496293455970-f8581aae0e3c", "1526218626217-0fc23b1649b5", "1550684848-fac1c5b4e853", "1485191306462-c5163d11f4d9", "1516062423002-793963289069"],
  "K-Pop": ["1533933909048-03373cea48f3", "1492684223066-81342ee5ff30", "1530419248446-2e590176aa78", "1516450360452-9312f5e86fc7", "1594122230689-45899d9e6f69", "1526218626217-0fc23b1649b5"],
  "Funk": ["1594122230689-45899d9e6f69", "1508700115892-45ecd05ae2ad", "1485191306462-c5163d11f4d9", "1501612722273-7f7229792078", "1493225255756-d9584f8606e9", "1514525253344-99637cc329df"],
  "R&B": ["1493225255756-d9584f8606e9", "1514525253344-99637cc329df", "1470225620780-dba8ba36b745", "1533173053835-267035661414", "1530419248446-2e590176aa78", "1485191306462-c5163d11f4d9"],
  "Hip Hop": ["1557672172-298e090bd0f1", "1550684848-fac1c5b4e853", "1516062423002-793963289069", "1496293455970-f8581aae0e3c", "1533173053835-267035661414", "1508700115892-45ecd05ae2ad"],
  "Rap": [RAP_MATCHING_IMAGE],
  "Jazz": ["1511192336575-5a79af651d03", "1511671782779-c97d3d27a1d4", "1525994886773-0305df255a2f", "1516737488042-749d2173bacc", "1445346335515-b454e4c41b63", "1514525253344-99637cc329df"],
  "Classical": ["1516280440614-37939bbacd81", "1507833423374-782c5d3a44ad", "1465847849013-1fa704936a52", "1473186578172-df10de827c66", "1441974231531-c6227db76b6e", "1492684223066-81342ee5ff30"]
};

const genreData: Record<string, { names: string[], artists: string[] }> = {
  "Pop": { names: ["Pure Pop Integrity", "Synth Pop Wave", "Indie Pop Gems", "Bedroom Pop", "Dreamy Pop", "Bubblegum Fair"], artists: ["Lia", "The Spark", "Melody J", "Echo", "Nova", "Sky"] },
  "K-Pop": { names: ["K-Pop Underground", "Seoul Vibe", "Neo-Generation", "K-RnB Melodies", "Hallyu Core", "Idol Ethics"], artists: ["NEO", "StarDust", "Luna8", "AURA", "Zenith", "Pixel"] },
  "Funk": { names: ["Funk & Soul Fair", "Future Funk Hub", "G-Funk Classics", "Nu-Funk Grooves", "Slap Bass Logic", "Disco Fair"], artists: ["Funkadelic Echo", "The Bassline", "Soul Cat", "Groove Theory", "Bootsy Jr", "The One"] },
  "R&B": { names: ["R&B Realness", "Velvet Sessions", "Neo-Soul Roots", "Alternative R&B", "Soul Sync", "Quiet Storm"], artists: ["Silky V", "The Harmony", "Amber", "Midnight", "Silk", "Lush"] },
  "Hip Hop": { names: ["Hip Hop Truth", "Boombap Revival", "UK Drill Vibe", "Conscious Hiphop", "Sample Integrity", "The Golden Era"], artists: ["Flow State", "Lyricist X", "The Beat", "Cipher", "Dusty Fingers", "Breakbeat"] },
  "Rap": { names: ["Rap Radical", "Grime Integrity", "Melodic Rap", "Underground Spitters", "Flow Ethics", "The Realist"], artists: ["Ghost Writer", "Spitfire", "Subway Poet", "Verse", "Vanguard", "Prophet"] },
  "Jazz": { names: ["Jazz Ethics", "Modern Fusion", "Bop & Beyond", "Cool Jazz Night", "Improv Logic", "The Standard"], artists: ["Saxophone Soul", "The Quintet", "Dim Lights", "Miles Ahead", "Coltrane Spirit", "Blue Note"] },
  "Classical": { names: ["Classical Clarity", "Modern Minimalism", "Romantic Era", "Strings Attached", "Opus Diversity", "Chamber Fairness"], artists: ["Symphony No. 5", "Virtuoso", "Strings Attached", "Composer X", "Maestro Y", "Quartet Z"] }
};

const COMMUNITY_PLAYLISTS_SEED: Playlist[] = GENRES.flatMap(genre => 
  genreData[genre].names.map((name, i) => {
    const pool = genreImagePools[genre];
    let finalImageUrl = `https://images.unsplash.com/photo-${pool[i % pool.length]}?auto=format&fit=crop&q=80&w=800&h=800`;
    if (genre === "Rap") finalImageUrl = RAP_MATCHING_IMAGE;

    return {
      id: `${genre.toLowerCase()}-${i}`,
      name: name,
      description: `Community-vetted ${genre} tracks focusing on organic growth and artist fairness.`,
      owner: `${genre}Curator_${i + 1}`,
      imageUrl: finalImageUrl,
      genre: genre,
      integrityScore: 68 + Math.floor(Math.random() * 30),
      votes: Math.floor(Math.random() * 100),
      tracks: createTracks(genre, genreData[genre].artists, 12)
    };
  })
);

const SPOTIFY_PLAYLISTS: Playlist[] = [
  { id: 's-p1', name: 'Liked Songs', description: 'Your collected tracks from Spotify.', owner: 'You', imageUrl: `https://images.unsplash.com/photo-1514525253344-99637cc329df?auto=format&fit=crop&q=80&w=800&h=800`, genre: 'Various', tracks: createTracks('Mixed', ['Various Artists'], 50) },
  { id: 's-p2', name: 'Discover Weekly', description: 'Spotify algorithms suggestion.', owner: 'Spotify', imageUrl: `https://images.unsplash.com/photo-1526218626217-0fc23b1649b5?auto=format&fit=crop&q=80&w=800&h=800`, genre: 'Mixed', tracks: createTracks('Pop', ['Algo Gen'], 30) },
  { id: 's-p3', name: 'Party Mix', description: 'Your saved party playlist.', owner: 'You', imageUrl: `https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=800&h=800`, genre: 'Hip Hop', tracks: createTracks('Hip Hop', ['Party DJ'], 25) },
];

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Landing);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ArtistFinancials | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sessionInterests, setSessionInterests] = useState<string[]>([]);
  
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([]);
  const [upvotedPlaylistIds, setUpvotedPlaylistIds] = useState<string[]>([]);
  const [downvotedPlaylistIds, setDownvotedPlaylistIds] = useState<string[]>([]);
  const [followedArtists, setFollowedArtists] = useState<{name: string, imageUrl: string}[]>([]);
  const [savedPlaylistIds, setSavedPlaylistIds] = useState<string[]>([]);
  const [userCuratedPlaylists, setUserCuratedPlaylists] = useState<Playlist[]>([]);
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);

  const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '', genre: GENRES[0] });

  const allCommunityPlaylists = useMemo(() => [...COMMUNITY_PLAYLISTS_SEED, ...userCuratedPlaylists], [userCuratedPlaylists]);
  const allAvailablePlaylists = useMemo(() => [...allCommunityPlaylists, ...SPOTIFY_PLAYLISTS], [allCommunityPlaylists]);

  const favorites = useMemo(() => {
    const list: Track[] = [];
    allAvailablePlaylists.forEach(p => {
      p.tracks.forEach(t => {
        if (likedTrackIds.includes(t.id) && !list.find(item => item.id === t.id)) {
          list.push(t);
        }
      });
    });
    return list;
  }, [likedTrackIds, allAvailablePlaylists]);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query.length > 2) {
      const matchedGenre = GENRES.find(g => g.toLowerCase() === query || query.includes(g.toLowerCase()));
      if (matchedGenre && !sessionInterests.includes(matchedGenre)) {
        setSessionInterests(prev => [...prev, matchedGenre]);
      }
    }
  }, [searchQuery]);

  // RECOMMENDATION ENGINE
  const principalRecommendations = useMemo(() => {
    // 1. Liked Genres
    const genreAffinityMap: Record<string, number> = {};
    favorites.forEach(t => {
      genreAffinityMap[t.genre] = (genreAffinityMap[t.genre] || 0) + 1;
    });
    const likedGenres = Object.entries(genreAffinityMap)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 3);

    // 2. Active Search
    const query = searchQuery.toLowerCase().trim();
    const activeMatchGenre = GENRES.find(g => g.toLowerCase() === query || query.includes(g.toLowerCase()));

    const seenIds = new Set<string>();

    const getItemsFromGenre = (genre: string, tag: string | null) => {
      return allCommunityPlaylists
        .filter(p => p.genre === genre && !seenIds.has(p.id))
        .sort((a, b) => (b.integrityScore || 0) - (a.integrityScore || 0))
        .slice(0, 3)
        .map(p => {
          seenIds.add(p.id);
          return { ...p, recommendationTag: tag };
        });
    };

    // POOL A: Active Match (Grouped Top) - No tag for MATCH anymore as requested
    let topGroup: any[] = [];
    if (activeMatchGenre) {
      topGroup = getItemsFromGenre(activeMatchGenre, null);
    }

    // POOL B: Personalised Mix (Discovery Feed)
    let personalisedPool: any[] = [];
    sessionInterests.forEach(genre => {
      if (genre !== activeMatchGenre) {
        personalisedPool = [...personalisedPool, ...getItemsFromGenre(genre, "BASED ON TASTE")];
      }
    });
    likedGenres.forEach(genre => {
      if (genre !== activeMatchGenre && !sessionInterests.includes(genre)) {
        personalisedPool = [...personalisedPool, ...getItemsFromGenre(genre, "BASED ON TASTE")];
      }
    });

    // SHUFFLE POOL B ONLY: Ensure "BASED ON TASTE" items are mixed up
    for (let i = personalisedPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [personalisedPool[i], personalisedPool[j]] = [personalisedPool[j], personalisedPool[i]];
    }

    // COMBINE
    let finalSelection = [...topGroup, ...personalisedPool];

    // POOL C: Fillers (Mixed in after)
    if (finalSelection.length < 12) {
      const fillers = allCommunityPlaylists
        .filter(p => !seenIds.has(p.id))
        .sort((a, b) => (b.integrityScore || 0) - (a.integrityScore || 0))
        .slice(0, 12 - finalSelection.length)
        .map(p => ({ ...p, recommendationTag: null }));
      
      finalSelection = [...finalSelection, ...fillers];
    }

    return finalSelection.slice(0, 12);
  }, [allCommunityPlaylists, searchQuery, favorites, sessionInterests]);

  const totalArtistLikes = useMemo(() => {
    if (!selectedArtist) return 0;
    const artistTracks = new Map<string, Track>();
    allAvailablePlaylists.forEach(p => {
      p.tracks.forEach(t => {
        if (t.artist === selectedArtist.name) {
          artistTracks.set(t.id, t);
        }
      });
    });
    
    let sum = 0;
    artistTracks.forEach(t => {
      sum += (t.votes || 0);
      if (likedTrackIds.includes(t.id)) sum += 1;
    });
    return sum;
  }, [selectedArtist, allAvailablePlaylists, likedTrackIds]);

  const handleConnect = () => {
    setIsConnected(true);
    setCurrentPage(Page.Dashboard);
  };

  const viewPlaylistDetail = (p: Playlist) => {
    setSelectedPlaylist(p);
    setCurrentPage(Page.PlaylistDetail);
  };

  const toggleSavePlaylist = (id: string) => {
    if (!isConnected) return alert("Login to save playlists!");
    setSavedPlaylistIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const toggleFollowArtist = (name: string) => {
    if (!isConnected) return alert("Login to support artists!");
    const exists = followedArtists.find(a => a.name === name);
    if (exists) {
      setFollowedArtists(prev => prev.filter(a => a.name !== name));
    } else {
      const portraitId = "1506794778242-f8d80eead658"; 
      setFollowedArtists(prev => [...prev, { name, imageUrl: `https://images.unsplash.com/photo-${portraitId}?auto=format&fit=crop&q=80&w=200&h=200` }]);
    }
  };

  const handleToggleLike = (trackId: string) => {
    if (!isConnected) return alert("Please login to like songs!");
    setLikedTrackIds(prev => prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]);
  };

  const handlePlaylistVote = (playlistId: string, delta: number) => {
    if (!isConnected) return alert("Please login to vote on playlists!");
    if (delta > 0) {
      if (upvotedPlaylistIds.includes(playlistId)) {
        setUpvotedPlaylistIds(prev => prev.filter(id => id !== playlistId));
      } else {
        setUpvotedPlaylistIds(prev => [...prev, playlistId]);
        setDownvotedPlaylistIds(prev => prev.filter(id => id !== playlistId));
      }
    } else {
      if (downvotedPlaylistIds.includes(playlistId)) {
        setDownvotedPlaylistIds(prev => prev.filter(id => id !== playlistId));
      } else {
        setDownvotedPlaylistIds(prev => [...prev, playlistId]);
        setUpvotedPlaylistIds(prev => prev.filter(id => id !== playlistId));
      }
    }
  };

  const startAnalysis = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setIsAnalyzing(true);
    setCurrentPage(Page.Analyser);
    const result = await analyzePlaylistIntegrity(playlist);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylist.name) return alert("Please name your playlist!");
    let finalUrl = `https://images.unsplash.com/photo-${genreImagePools[newPlaylist.genre][0]}?auto=format&fit=crop&q=80&w=800&h=800`;
    if (newPlaylist.genre === "Rap") finalUrl = RAP_MATCHING_IMAGE;
    const playlist: Playlist = {
      id: `curated-${Date.now()}`,
      name: newPlaylist.name,
      description: newPlaylist.description,
      owner: 'John Doe',
      imageUrl: finalUrl,
      genre: newPlaylist.genre,
      tracks: createTracks(newPlaylist.genre, genreData[newPlaylist.genre].artists, 10),
      integrityScore: 100,
      votes: 0
    };
    setUserCuratedPlaylists(prev => [playlist, ...prev]);
    setCurrentPage(Page.Profile);
    setNewPlaylist({ name: '', description: '', genre: GENRES[0] });
  };

  const PlaylistCover = ({ playlist, className = "w-full h-full object-cover" }: { playlist: Playlist, className?: string }) => {
    const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>('loading');
    const gradient = genreGradients[playlist.genre] || genreGradients["Various"];
    const displayUrl = useMemo(() => playlist.genre === 'Rap' ? RAP_MATCHING_IMAGE : playlist.imageUrl, [playlist.genre, playlist.imageUrl]);
    useEffect(() => {
      if (displayUrl.startsWith('data:')) setImgState('loaded');
      else setImgState('loading');
    }, [playlist.id, displayUrl]);
    return (
      <div className={`relative w-full h-full overflow-hidden bg-gradient-to-br ${gradient}`}>
        <img src={displayUrl} className={`${className} transition-opacity duration-700 ${imgState === 'loaded' ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setImgState('loaded')} onError={() => setImgState('error')} alt={playlist.name} />
        {imgState !== 'loaded' && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center bg-black/10 backdrop-blur-sm">
            <span className="text-white/50 font-black text-xl uppercase tracking-tighter animate-pulse">{imgState === 'loading' ? 'SIGNAL' : playlist.genre}</span>
          </div>
        )}
      </div>
    );
  };

  const renderLanding = () => (
    <div className="max-w-7xl mx-auto px-6 pt-32 pb-20 text-center animate-in fade-in zoom-in-95 duration-1000">
      <div className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-8">Music Fairness Initiative</div>
      <h1 className="text-6xl md:text-9xl font-extrabold font-heading mb-8 tracking-tight leading-[0.9]">RECLAIM THE <br/><span className="gradient-text">ALGORITHM.</span></h1>
      <p className="text-xl text-gray-400 mb-16 max-w-2xl mx-auto leading-relaxed font-medium">EchoFair inspects your streaming habits to expose corporate bias and promote organic artist growth. Transparency for the next era of audio.</p>
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-32">
        <button 
          onClick={isConnected ? () => setCurrentPage(Page.Dashboard) : handleConnect} 
          className="btn-primary text-sm uppercase py-5 px-14 rounded-2xl flex items-center justify-center gap-3"
        > 
          {isConnected ? "Analyse my playlists" : "Link Spotify"} 
        </button>
        <button onClick={() => setCurrentPage(Page.Explore)} className="glass hover:bg-white/5 text-white text-sm font-bold py-5 px-14 rounded-2xl transition-all"> View Recommended </button>
      </div>
      <div className="grid md:grid-cols-3 gap-6 text-left">
        {[
          { title: "Fairness Inspection", icon: "01", desc: "Easily check if a playlist is filled with genuine music or just hidden corporate advertisements." },
          { title: "Corporate Loops", icon: "02", desc: "See which major labels are dominating your listening time and blocking independent talent." },
          { title: "Vetted Discovery", icon: "03", desc: "Find music selected by humans who care about talent, not just massive marketing budgets." }
        ].map((feat, i) => (
          <div key={i} className="glass p-12 rounded-3xl border border-white/5 group hover:border-cyan-500/30 transition-all duration-500 shadow-xl">
            <div className="text-sm font-mono text-cyan-400 mb-6 font-bold">{feat.icon}</div>
            <h3 className="text-2xl font-bold mb-4 font-heading">{feat.title}</h3>
            <p className="text-gray-500 text-lg leading-snug">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderExplore = () => (
    <div className="max-w-7xl mx-auto px-6 py-20 animate-in fade-in duration-700">
      <div className="mb-20">
        <h2 className="text-5xl font-heading font-black mb-10 tracking-tight">Recommended <span className="text-cyan-400">to you</span></h2>
        <div className="relative group max-w-xl">
          <input type="text" placeholder="Search genres (e.g. Jazz), artists, or curators..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 px-8 outline-none focus:border-cyan-400/50 transition-all text-lg font-medium placeholder:text-gray-600 shadow-2xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <div className="absolute right-4 top-4 bg-white text-black p-3 rounded-xl shadow-lg">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {principalRecommendations.map((p: any) => (
          <div key={p.id} className="glass rounded-3xl overflow-hidden group cursor-pointer hover:border-cyan-400/20 transition-all shadow-xl" onClick={() => viewPlaylistDetail(p)}>
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <PlaylistCover playlist={p} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest text-white">{p.integrityScore}% FAIR</div>
                {p.recommendationTag && (
                  <div className={`backdrop-blur-md border text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg animate-in zoom-in-90 ${
                    p.recommendationTag === "MATCH" ? "bg-white text-black border-white/30" : "bg-cyan-500/90 text-black border-cyan-400/30"
                  }`}>
                    {p.recommendationTag}
                  </div>
                )}
              </div>
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-3 font-heading group-hover:text-cyan-400 transition-colors">{p.name}</h3>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">{p.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-gray-600 uppercase tracking-widest">{p.genre}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="max-w-7xl mx-auto px-6 py-20 animate-in fade-in duration-700">
      <h2 className="text-5xl font-heading font-black tracking-tight mb-4">Fairness <span className="text-cyan-400">Analyser</span></h2>
      <p className="text-gray-400 text-2xl mb-16 font-bold tracking-tight">From your Spotify</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {SPOTIFY_PLAYLISTS.map(playlist => (
          <div key={playlist.id} className="glass rounded-3xl overflow-hidden group border border-white/5 hover:border-cyan-400/30 transition-all cursor-pointer shadow-xl" onClick={() => viewPlaylistDetail(playlist)}>
            <div className="relative h-72 w-full overflow-hidden">
              <PlaylistCover playlist={playlist} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent flex items-end p-10">
                <h3 className="text-3xl font-bold font-heading group-hover:text-cyan-400 transition-colors">{playlist.name}</h3>
              </div>
            </div>
            <div className="p-10">
              <button onClick={(e) => { e.stopPropagation(); startAnalysis(playlist); }} className="w-full bg-white text-black font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg">Inspect Fairness</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCommunity = () => (
    <div className="max-w-7xl mx-auto px-6 py-20 animate-in fade-in duration-700">
      <h2 className="text-6xl font-heading font-black mb-16 tracking-tighter">Community <span className="gradient-text">Network</span></h2>
      {GENRES.map(genre => (
        <section key={genre} className="mb-20">
          <h3 className="text-xl font-black uppercase tracking-widest font-heading mb-10 border-l-4 border-cyan-400 pl-6">{genre}</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCommunityPlaylists.filter(p => p.genre === genre).map(p => (
              <div key={p.id} className="glass rounded-3xl p-6 hover:bg-white/[0.04] transition-all cursor-pointer group shadow-lg" onClick={() => viewPlaylistDetail(p)}>
                <div className="relative mb-6 aspect-square rounded-2xl overflow-hidden shadow-xl border border-white/5 bg-black/10">
                  <PlaylistCover playlist={p} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h4 className="font-bold text-lg group-hover:text-cyan-400 transition-colors">{p.name}</h4>
                <div className="text-[10px] text-gray-500 font-black uppercase mt-2 tracking-widest">By @{p.owner}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );

  const renderProfile = () => (
    <div className="max-w-7xl mx-auto px-6 py-24 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row gap-16 mb-24 items-center md:items-start">
        <div className="w-48 h-48 rounded-[2.5rem] bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center text-5xl font-black text-black shadow-2xl">JD</div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-6xl font-heading font-black mb-4 tracking-tight">John Doe</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-lg font-medium">Just a fan of music.</p>
          <div className="flex gap-4 justify-center md:justify-start">
            <button onClick={() => setCurrentPage(Page.CreatePlaylist)} className="btn-primary px-10 py-4 rounded-xl text-[10px] uppercase tracking-widest shadow-xl">Create a playlist</button>
            <button onClick={() => setIsConnected(false)} className="glass px-10 py-4 rounded-xl text-[10px] uppercase font-black text-red-400 tracking-widest hover:bg-red-400/10 transition-colors">Disconnect</button>
          </div>
        </div>
      </div>
      <div className="space-y-16">
        <section className="glass p-10 rounded-4xl border border-white/5 shadow-2xl">
          <h3 className="text-2xl font-heading font-black mb-8 border-l-4 border-cyan-400 pl-6">Your Playlists</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {userCuratedPlaylists.length === 0 ? (
              <div className="col-span-full py-10 text-center border border-dashed border-white/10 rounded-3xl"><p className="text-gray-600 italic">Start curating fair signals to see them here.</p></div>
            ) : (
              userCuratedPlaylists.map(p => (
                <div key={p.id} className="group cursor-pointer" onClick={() => viewPlaylistDetail(p)}>
                  <div className="aspect-square rounded-2xl overflow-hidden mb-4 shadow-lg border border-white/10 bg-black/10"><PlaylistCover playlist={p} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>
                  <h4 className="font-bold text-center group-hover:text-cyan-400 truncate">{p.name}</h4>
                  <div className="text-[9px] text-gray-500 text-center font-black uppercase mt-1 tracking-widest">{p.genre}</div>
                </div>
              ))
            )}
          </div>
        </section>
        
        <div className="grid lg:grid-cols-2 gap-12">
          {/* FAVORITES SECTION (Songs Liked) */}
          <section className="glass p-10 rounded-4xl border border-white/5 shadow-2xl">
            <h3 className="text-2xl font-heading font-black mb-8 border-l-4 border-cyan-400 pl-6 text-cyan-400">Favorites</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {favorites.length === 0 && <p className="text-gray-600 italic">No favorite songs yet.</p>}
              {favorites.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5 group hover:bg-white/[0.05] transition-colors">
                  <div><div className="font-bold text-lg">{t.title}</div><div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">@{t.artist}</div></div>
                  <svg className="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
              ))}
            </div>
          </section>

          {/* ARTISTS SUPPORTING SECTION (Following) */}
          <section className="glass p-10 rounded-4xl border border-white/5 shadow-2xl">
            <h3 className="text-2xl font-heading font-black mb-8 border-l-4 border-indigo-400 pl-6">Artists Supporting</h3>
            <div className="space-y-4">
              {followedArtists.length === 0 && <p className="text-gray-600 italic">Follow artists to track their financial fairness.</p>}
              {followedArtists.map(a => (
                <div key={a.name} className="flex items-center gap-6 bg-white/[0.03] p-4 rounded-2xl border border-white/5 hover:bg-white/[0.06] transition-all group shadow-sm">
                  <img src={a.imageUrl} className="w-16 h-16 rounded-xl object-cover shadow-lg border border-white/10" alt={a.name} />
                  <span className="font-bold text-lg group-hover:text-cyan-400 transition-colors">{a.name}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass p-10 rounded-4xl border border-white/5 shadow-2xl col-span-full">
            <h3 className="text-2xl font-heading font-black mb-8 border-l-4 border-purple-400 pl-6">Library</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedPlaylistIds.length === 0 && <p className="text-gray-600 italic col-span-full">No nodes added yet.</p>}
              {savedPlaylistIds.map(id => {
                const p = allAvailablePlaylists.find(cp => cp.id === id);
                return p ? (
                  <div key={id} className="flex items-center gap-6 bg-white/[0.03] p-4 rounded-2xl cursor-pointer hover:bg-white/[0.06] transition-all border border-white/5" onClick={() => viewPlaylistDetail(p)}>
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-lg border border-white/10 bg-black/10"><PlaylistCover playlist={p} className="w-full h-full object-cover" /></div>
                    <div><span className="font-bold text-lg">{p.name}</span><div className="text-[9px] text-cyan-400 font-bold uppercase mt-1 tracking-widest">{p.genre} Signal</div></div>
                  </div>
                ) : null;
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  const renderCreatePlaylist = () => (
    <div className="max-w-2xl mx-auto px-6 py-32 animate-in zoom-in-95 duration-700">
      <h2 className="text-5xl font-heading font-black mb-4 tracking-tight">Create a playlist</h2>
      <p className="text-gray-500 mb-12 font-medium">Initialize a community node for fair discovery.</p>
      <form onSubmit={handleCreatePlaylist} className="glass p-10 rounded-4xl space-y-8 shadow-2xl">
        <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Playlist Name</label><input type="text" placeholder="Independent Sound 2025" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-cyan-400 font-bold transition-all shadow-inner" value={newPlaylist.name} onChange={(e) => setNewPlaylist(prev => ({ ...prev, name: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Curator Vision</label><textarea placeholder="Focus on independent growth, anti-loop patterns..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-cyan-400 font-medium transition-all shadow-inner" value={newPlaylist.description} onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Genre Target</label><select className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 outline-none focus:border-cyan-400 font-bold bg-black cursor-pointer transition-all" value={newPlaylist.genre} onChange={(e) => setNewPlaylist(prev => ({ ...prev, genre: e.target.value }))}>{GENRES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
        <div className="flex gap-4 pt-4"><button type="button" onClick={() => setCurrentPage(Page.Profile)} className="flex-1 glass py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/5">Cancel</button><button type="submit" className="flex-[2] btn-primary py-4 rounded-xl text-xs uppercase tracking-widest shadow-lg">Create playlist</button></div>
      </form>
    </div>
  );

  const renderPlaylistDetail = () => {
    if (!selectedPlaylist) return null;
    const isSpotifyPlaylist = selectedPlaylist.id.startsWith('s-');
    const upvoted = upvotedPlaylistIds.includes(selectedPlaylist.id);
    const downvoted = downvotedPlaylistIds.includes(selectedPlaylist.id);
    const totalVotes = (selectedPlaylist.votes || 0) + (upvoted ? 1 : downvoted ? -1 : 0);

    return (
      <div className="max-w-6xl mx-auto px-6 py-24 animate-in fade-in duration-500">
        <button onClick={() => setCurrentPage(Page.Explore)} className="text-gray-600 hover:text-white mb-12 flex items-center gap-3 group transition-colors font-bold">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>Back
        </button>
        <div className="flex flex-col lg:flex-row gap-16 mb-24 items-start">
          <div className="w-full lg:w-96 aspect-square rounded-4xl overflow-hidden shadow-2xl border border-white/5 bg-black/10"><PlaylistCover playlist={selectedPlaylist} className="w-full h-full object-cover" /></div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6"><span className="bg-white/5 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-cyan-400/20">{selectedPlaylist.genre}</span><span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">By @{selectedPlaylist.owner}</span></div>
            <h1 className="text-6xl md:text-8xl font-heading font-black mb-8 tracking-tighter leading-none">{selectedPlaylist.name}</h1>
            <p className="text-gray-400 text-xl mb-12 max-w-2xl leading-relaxed font-medium">{selectedPlaylist.description}</p>
            <div className="flex flex-wrap items-center gap-6">
              {isSpotifyPlaylist && <button onClick={() => startAnalysis(selectedPlaylist)} className="btn-primary py-4 px-12 rounded-xl text-[10px] uppercase tracking-widest shadow-xl">Inspect Fairness</button>}
              <button onClick={() => toggleSavePlaylist(selectedPlaylist.id)} className={`px-10 py-4 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${savedPlaylistIds.includes(selectedPlaylist.id) ? 'bg-cyan-500 text-black shadow-cyan' : 'glass shadow-lg'}`}>{savedPlaylistIds.includes(selectedPlaylist.id) ? 'In Library' : 'Add to Library'}</button>
              
              <div className="flex items-center gap-3 glass p-2 rounded-2xl">
                 <button onClick={() => handlePlaylistVote(selectedPlaylist.id, 1)} className={`p-2 rounded-xl transition-colors ${upvoted ? 'bg-cyan-400 text-black' : 'hover:bg-white/5 text-gray-500'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"/></svg></button>
                 <span className="font-mono font-black text-lg min-w-[1.5rem] text-center">{totalVotes}</span>
                 <button onClick={() => handlePlaylistVote(selectedPlaylist.id, -1)} className={`p-2 rounded-xl transition-colors ${downvoted ? 'bg-red-500 text-black' : 'hover:bg-white/5 text-gray-500'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg></button>
              </div>
            </div>
          </div>
        </div>
        <div className="glass rounded-4xl overflow-hidden border border-white/5 shadow-2xl">
          <div className="px-12 py-6 border-b border-white/5 bg-white/[0.02] flex justify-between text-[10px] font-black text-gray-600 uppercase tracking-widest"><span className="w-1/2">Audio Signal</span><span className="w-1/4">Entity Type</span><span className="w-1/4 text-right">Interaction</span></div>
          <div className="divide-y divide-white/5">
            {selectedPlaylist.tracks.map((track, i) => (
              <div key={track.id} className="px-12 py-8 flex items-center hover:bg-white/[0.02] transition-colors group">
                <div className="w-1/2 flex items-center gap-8"><span className="text-gray-700 font-mono text-xs font-bold">{i + 1}</span><div><div className="font-bold text-lg group-hover:text-cyan-400 transition-colors">{track.title}</div><button onClick={() => { setIsLoadingArtist(true); setCurrentPage(Page.ArtistProfile); estimateArtistFinancials(track.artist, track.label).then(res => { setSelectedArtist(res); setIsLoadingArtist(false); }); }} className="text-xs text-gray-500 hover:text-white transition-colors mt-1 font-bold">@{track.artist}</button></div></div>
                <div className="w-1/4"><span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${track.label === 'Independent' ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'bg-white/5 text-gray-600'}`}>{track.label}</span></div>
                <div className="w-1/4 flex justify-end gap-6 items-center">
                  <button onClick={() => handleToggleLike(track.id)} className={`p-4 glass rounded-xl transition-all hover:scale-110 ${likedTrackIds.includes(track.id) ? 'text-red-500 shadow-red-500/20' : 'text-gray-600 hover:text-red-400'}`}>
                    <svg className={`w-5 h-5 ${likedTrackIds.includes(track.id) ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                  </button>
                  <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer" className="p-4 glass rounded-xl inline-block hover:bg-cyan-400 hover:text-black transition-all hover:scale-105 shadow-md"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.508 17.302c-.218.358-.682.474-1.037.258-2.856-1.745-6.452-2.14-10.686-1.173-.41.094-.82-.164-.914-.572-.094-.41.164-.82.572-.914 4.636-1.06 8.608-.61 11.799 1.339.358.218.474.682.266 1.042z"/></svg></a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderArtistProfile = () => (
    <div className="max-w-6xl mx-auto px-6 py-24 animate-in fade-in duration-500">
      <button onClick={() => setCurrentPage(Page.Explore)} className="text-gray-600 hover:text-white mb-12 flex items-center gap-3 transition-colors font-bold"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>Return</button>
      {isLoadingArtist ? (
        <div className="py-40 text-center space-y-10"><div className="w-20 h-20 border-t-2 border-cyan-400 rounded-full animate-spin mx-auto shadow-cyan"></div><h2 className="text-4xl font-heading font-black tracking-tight">Decoding Artist Economy...</h2></div>
      ) : selectedArtist && (
        <div className="space-y-16 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row gap-16 items-center md:items-start">
            <div className="w-56 h-56 rounded-4xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-7xl font-black text-black shadow-2xl">{selectedArtist.name.substring(0, 1).toUpperCase()}</div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-7xl font-heading font-black mb-6 tracking-tight">{selectedArtist.name}</h2>
              <div className="flex items-center gap-6 justify-center md:justify-start">
                <button onClick={() => toggleFollowArtist(selectedArtist.name)} className={`px-10 py-4 rounded-xl text-[10px] uppercase font-black transition-all ${followedArtists.find(a => a.name === selectedArtist.name) ? 'bg-cyan-400 text-black shadow-cyan' : 'glass shadow-lg'}`}>{followedArtists.find(a => a.name === selectedArtist.name) ? 'Following' : 'Follow Artist'}</button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
             <div className="glass p-8 rounded-4xl border border-white/5 flex flex-col items-center justify-center text-center shadow-xl group hover:border-cyan-400/30 transition-all">
                <span className="text-gray-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Community Impact</span>
                <span className="text-5xl font-mono font-black text-cyan-400 mb-2 group-hover:scale-110 transition-transform">{totalArtistLikes.toLocaleString()}</span>
                <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Aggregate Signal Likes</span>
             </div>
             <div className="glass p-8 rounded-4xl border border-white/5 flex flex-col items-center justify-center text-center shadow-xl col-span-2">
                <p className="text-gray-400 italic font-medium leading-relaxed max-w-lg">
                  "This metric represents the total organic validation this artist has received from EchoFair community nodes. High numbers indicate a strong independent growth signal."
                </p>
             </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="glass p-12 rounded-4xl border border-white/5 space-y-8 shadow-2xl">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Monthly Economics</h3>
              <div className="flex justify-between items-center"><span className="text-gray-400 font-medium">Gross Revenue (100k Streams)</span><span className="font-mono font-bold text-2xl">${selectedArtist.estimatedMonthlyEarnings}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">Platform Cut (30%)</span><span className="font-bold text-red-500/80">-${selectedArtist.platformCut}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">Label Split</span><span className="font-bold text-red-500/80">-${selectedArtist.labelCut}</span></div>
              <div className="h-px bg-white/5"></div>
              <div className="flex justify-between items-center"><span className="font-black text-cyan-400 text-xs tracking-widest uppercase">Artist Net</span><span className="font-black text-5xl text-cyan-400 font-heading">${selectedArtist.artistTakeHome}</span></div>
            </div>
            <div className="glass p-12 rounded-4xl border border-white/5 shadow-2xl">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-10">Direct Support Links</h3>
              <div className="space-y-4">
                {selectedArtist.supportLinks.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-white/5 p-6 rounded-2xl hover:bg-white/10 transition-all border border-white/5 group shadow-sm">
                    <span className="font-bold text-lg group-hover:text-cyan-400 transition-colors">{link.platform}</span>
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-32 selection:bg-cyan-400 selection:text-black">
      <nav className="sticky top-0 z-50 nav-blur px-8 py-6 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-5 cursor-pointer group" onClick={() => setCurrentPage(Page.Landing)}><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-black group-hover:rotate-12 transition-transform glow-cyan shadow-xl">EF</div><span className="text-2xl font-heading font-black tracking-tight">ECHO<span className="text-cyan-400">FAIR</span></span></div>
          <div className="flex items-center gap-10">
            <button onClick={() => setCurrentPage(Page.Explore)} className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all hover:text-white ${currentPage === Page.Explore ? 'text-cyan-400 underline underline-offset-8' : 'text-gray-500'}`}>Recommended to you</button>
            <button onClick={() => setCurrentPage(Page.Community)} className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all hover:text-white ${currentPage === Page.Community ? 'text-cyan-400 underline underline-offset-8' : 'text-gray-500'}`}>Community</button>
            {isConnected && <button onClick={() => setCurrentPage(Page.Dashboard)} className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all hover:text-white ${currentPage === Page.Dashboard ? 'text-cyan-400 underline underline-offset-8' : 'text-gray-500'}`}>Analyser</button>}
            {!isConnected ? <button onClick={handleConnect} className="btn-primary text-[10px] uppercase px-8 py-3 rounded-xl shadow-lg">Link Spotify</button> : <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-[10px] font-black cursor-pointer hover:scale-110 transition-all shadow-lg" onClick={() => setCurrentPage(Page.Profile)}>JD</div>}
          </div>
        </div>
      </nav>
      <main>
        {currentPage === Page.Landing && renderLanding()}
        {currentPage === Page.Explore && renderExplore()}
        {currentPage === Page.Dashboard && renderDashboard()}
        {currentPage === Page.PlaylistDetail && renderPlaylistDetail()}
        {currentPage === Page.Community && renderCommunity()}
        {currentPage === Page.Profile && renderProfile()}
        {currentPage === Page.CreatePlaylist && renderCreatePlaylist()}
        {currentPage === Page.Analyser && (
          <div className="max-w-5xl mx-auto py-32 px-6">
            {isAnalyzing ? (
              <div className="text-center py-20 space-y-10 animate-in fade-in duration-1000"><div className="w-20 h-20 border-t-2 border-cyan-400 rounded-full animate-spin mx-auto shadow-cyan"></div><h2 className="text-5xl font-heading font-black tracking-tight">Analysing Fairness...</h2><p className="text-gray-500 font-medium">Scanning metadata for industrial loop clusters.</p></div>
            ) : analysis && (
              <div className="space-y-16 animate-in fade-in duration-500">
                <div className="flex items-center gap-12"><div className="w-40 h-40 rounded-3xl overflow-hidden shadow-2xl shrink-0 border border-white/5 bg-black/10"><PlaylistCover playlist={selectedPlaylist!} /></div><h2 className="text-4xl font-heading font-black tracking-tight">{selectedPlaylist?.name} Fairness Analysis</h2></div>
                <div className="glass p-16 rounded-4xl flex flex-col md:flex-row gap-16 items-center border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className={`absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-[100px] opacity-20 transition-colors ${analysis.score < 60 ? 'bg-red-600' : analysis.score < 85 ? 'bg-yellow-500' : 'bg-cyan-400'}`}></div>
                    <div className="w-64 h-64 shrink-0 z-10"><IntegrityChart score={analysis.score} /></div>
                    <div className="flex-1 z-10"><div className="flex flex-col mb-6"><div className="flex items-center gap-6"><span className={`text-9xl font-black leading-none font-heading ${analysis.score < 60 ? 'text-red-500' : analysis.score < 85 ? 'text-yellow-400' : 'text-cyan-400'}`}>{analysis.score}</span><div className="flex flex-col"><div className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">Integrity Index</div><div className={`text-sm font-black uppercase tracking-widest mt-2 ${analysis.score < 60 ? 'text-red-500' : analysis.score < 85 ? 'text-yellow-400' : 'text-cyan-400'}`}>{analysis.score < 60 ? '⚠ COMPROMISED' : analysis.score < 85 ? '⚠ CAUTION' : '✓ FAIR SIGNAL'}</div></div></div></div><p className="text-2xl text-white font-medium leading-relaxed">{analysis.summary}</p></div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {analysis.riskFactors.map((risk, i) => (
                    <div key={i} className={`bg-white/5 p-10 rounded-3xl border shadow-lg relative transition-all hover:bg-white/[0.07] ${risk.severity === 'High' ? 'border-red-500/30 bg-red-500/[0.02]' : risk.severity === 'Medium' ? 'border-yellow-500/30 bg-yellow-500/[0.02]' : 'border-white/5'}`}>
                      <div className="flex justify-between items-start mb-6"><span className={`text-[10px] font-black uppercase tracking-widest ${risk.severity === 'High' ? 'text-red-500' : risk.severity === 'Medium' ? 'text-yellow-400' : 'text-cyan-400'}`}>{risk.category}</span><span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${risk.severity === 'High' ? 'border-red-500/50 bg-red-500/10 text-red-500' : risk.severity === 'Medium' ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500' : 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'}`}>{risk.severity} Risk</span></div>
                      <p className="text-gray-400 leading-relaxed font-medium">{risk.description}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => setCurrentPage(Page.Dashboard)} className="w-full btn-primary py-6 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl">Finish Inspection</button>
              </div>
            )}
          </div>
        )}
        {currentPage === Page.ArtistProfile && renderArtistProfile()}
      </main>
      <footer className="mt-40 pt-20 pb-20 px-8 border-t border-white/5 bg-black/20">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-5"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-black shadow-lg">EF</div><span className="text-3xl font-heading font-black tracking-tight">ECHOFAIR</span></div>
            <div className="flex gap-10"><button onClick={() => setCurrentPage(Page.Explore)} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Recommended</button><button onClick={() => setCurrentPage(Page.Community)} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Community Network</button><button onClick={() => setCurrentPage(Page.Profile)} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Fairness Settings</button></div>
            <div className="text-[10px] font-black text-gray-700 uppercase tracking-widest">&copy; 2025 ECHOFAIR SIGNAL PROTOCOL</div>
         </div>
      </footer>
    </div>
  );
};

export default App;
