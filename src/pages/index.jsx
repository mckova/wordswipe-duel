import Layout from "./Layout.jsx";

import Home from "./Home";

import Game from "./Game";

import GameResult from "./GameResult";

import Shop from "./Shop";

import Leaderboard from "./Leaderboard";

import Profile from "./Profile";

import MultiplayerMode from "./MultiplayerMode";

import LocalDuel from "./LocalDuel";

import OnlineMatchmaking from "./OnlineMatchmaking";

import MultiplayerGame from "./MultiplayerGame";

import PlayerSwitch from "./PlayerSwitch";

import MultiplayerResult from "./MultiplayerResult";

import FriendMultiplayer from "./FriendMultiplayer";

import FriendGameLobby from "./FriendGameLobby";

import FriendGame from "./FriendGame";

import FriendGameResult from "./FriendGameResult";

import DailyChallenge from "./DailyChallenge";

import DailyChallengeGame from "./DailyChallengeGame";

import Friends from "./Friends";

import Gifts from "./Gifts";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Game: Game,
    
    GameResult: GameResult,
    
    Shop: Shop,
    
    Leaderboard: Leaderboard,
    
    Profile: Profile,
    
    MultiplayerMode: MultiplayerMode,
    
    LocalDuel: LocalDuel,
    
    OnlineMatchmaking: OnlineMatchmaking,
    
    MultiplayerGame: MultiplayerGame,
    
    PlayerSwitch: PlayerSwitch,
    
    MultiplayerResult: MultiplayerResult,
    
    FriendMultiplayer: FriendMultiplayer,
    
    FriendGameLobby: FriendGameLobby,
    
    FriendGame: FriendGame,
    
    FriendGameResult: FriendGameResult,
    
    DailyChallenge: DailyChallenge,
    
    DailyChallengeGame: DailyChallengeGame,
    
    Friends: Friends,
    
    Gifts: Gifts,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Game" element={<Game />} />
                
                <Route path="/GameResult" element={<GameResult />} />
                
                <Route path="/Shop" element={<Shop />} />
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/MultiplayerMode" element={<MultiplayerMode />} />
                
                <Route path="/LocalDuel" element={<LocalDuel />} />
                
                <Route path="/OnlineMatchmaking" element={<OnlineMatchmaking />} />
                
                <Route path="/MultiplayerGame" element={<MultiplayerGame />} />
                
                <Route path="/PlayerSwitch" element={<PlayerSwitch />} />
                
                <Route path="/MultiplayerResult" element={<MultiplayerResult />} />
                
                <Route path="/FriendMultiplayer" element={<FriendMultiplayer />} />
                
                <Route path="/FriendGameLobby" element={<FriendGameLobby />} />
                
                <Route path="/FriendGame" element={<FriendGame />} />
                
                <Route path="/FriendGameResult" element={<FriendGameResult />} />
                
                <Route path="/DailyChallenge" element={<DailyChallenge />} />
                
                <Route path="/DailyChallengeGame" element={<DailyChallengeGame />} />
                
                <Route path="/Friends" element={<Friends />} />
                
                <Route path="/Gifts" element={<Gifts />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}