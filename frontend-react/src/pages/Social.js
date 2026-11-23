import React, { useState, useEffect } from 'react';

import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { socialAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const Social = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { notify, confirm } = useToast();
  const [activeTab, setActiveTab] = useState('leaderboard'); // leaderboard, friends, search
  const [leaderboard, setLeaderboard] = useState([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all'); // all, week, month

  useEffect(() => {
    loadData();
  }, [timeframe]);

  const loadData = async () => {
    setLoading(true);
    try {
      
      // Load leaderboard
      const leaderboardRes = await socialAPI.getLeaderboard(timeframe, 50);
      setLeaderboard(leaderboardRes.data.leaderboard || []);

      // Load user rank
      const rankRes = await socialAPI.getUserRank();
      setUserRank(rankRes.data);

      // Load friends
      const friendsRes = await socialAPI.getFriends();
      setFriends(friendsRes.data.friends || []);

      // Load friends leaderboard
      const friendsLbRes = await socialAPI.getFriendsLeaderboard();
      setFriendsLeaderboard(friendsLbRes.data.leaderboard || []);

      // Load friend requests
      const requestsRes = await socialAPI.getFriendRequests();
      setFriendRequests(requestsRes.data.requests || []);

      // Load activity feed
      const activityRes = await socialAPI.getActivityFeed(20);
      setActivityFeed(activityRes.data.activities || []);
      
    } catch (error) {
      console.error('❌ Failed to load social data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await socialAPI.searchUsers(searchQuery);
      setSearchResults(res.data.users || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleSendFriendRequest = async (friendId) => {
    try {
      await socialAPI.sendFriendRequest(friendId);
      notify(t('socialUi.requestSent'), 'success');
      handleSearch(); // Refresh search results
    } catch (error) {
      notify(t('socialUi.somethingWrong'), 'error');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await socialAPI.acceptFriendRequest(requestId);
      notify(t('socialUi.newFriend'), 'success');
      loadData(); // Refresh all data
    } catch (error) {
      notify(t('socialUi.somethingWrong'), 'error');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await socialAPI.rejectFriendRequest(requestId);
      loadData(); // Refresh all data
    } catch (error) {
      notify(t('socialUi.somethingWrong'), 'error');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    const ok = await confirm({ title: t('socialUi.removeTitle'), message: t('socialUi.removeText'), confirmLabel: t('socialUi.removeYes'), danger: true, icon: '👋' });
    if (!ok) return;
    try {
      await socialAPI.removeFriend(friendId);
      loadData(); // Refresh all data
    } catch (error) {
      notify(t('socialUi.somethingWrong'), 'error');
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '🏆';
    if (rank <= 50) return '⭐';
    return '🌟';
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'lesson_completed': return '📚';
      case 'achievement_unlocked': return '🏆';
      case 'level_up': return '⬆️';
      case 'streak_milestone': return '🔥';
      case 'friend_added': return '👥';
      default: return '✨';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-slate-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title mb-2">👥 {t('social.title')}</h1>
        <p className="text-slate-600">{t('social.subtitle')}</p>
      </div>

      {/* User Rank Card */}
      {userRank && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90 mb-1">{t('social.yourRank')}</div>
              <div className="text-4xl font-bold">#{userRank.rank}</div>
              <div className="text-sm opacity-90 mt-1">
                {t('social.topPercent').replace('%', userRank.percentile)} {userRank.totalUsers} {t('social.title').toLowerCase().split(' ')[0]}
              </div>
            </div>
            <div className="text-6xl">{getRankBadge(userRank.rank)}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          🏆 {t('social.leaderboard')}
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'friends'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          👥 {t('social.friends')} ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'search'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          🔍 {t('social.findFriends')}
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'activity'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          📊 {t('social.activity')}
        </button>
      </div>

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div>
          {/* Timeframe Selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                timeframe === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {t('social.allTime')}
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                timeframe === 'month' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {t('social.thisMonth')}
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                timeframe === 'week' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {t('social.thisWeek')}
            </button>
          </div>

          {/* Global Leaderboard */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="font-display text-2xl text-slate-800 mb-4">
              🏆 {t('social.globalLeaderboard')}
            </h2>
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="font-display text-xl text-slate-800 mb-2">{t('social.noLeaderboardData')}</h3>
                <p className="text-slate-600">{t('social.completeToAppear')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((user, index) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    user.id === currentUser.id
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-2xl font-bold text-slate-400 w-8">
                    {getRankBadge(user.rank)}
                  </div>
                  <div className="text-xl font-bold text-slate-600 w-12">
                    #{user.rank}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">
                      {user.username}
                      {user.id === currentUser.id && (
                        <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                          {t('social.you')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      {user.lessons_completed || 0} {t('social.lessons')} • {user.streak || 0} {t('social.dayStreak')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600">{user.xp || 0}</div>
                    <div className="text-xs text-slate-600">XP</div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Friends Leaderboard */}
          {friendsLeaderboard.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="font-display text-2xl text-slate-800 mb-4">
                👥 {t('social.friendsLeaderboard')}
              </h2>
              <div className="space-y-2">
                {friendsLeaderboard.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-4 p-4 rounded-xl ${
                      user.isCurrentUser
                        ? 'bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300'
                        : 'bg-slate-50'
                    }`}
                  >
                    <div className="text-xl font-bold text-slate-600 w-12">
                      #{user.rank}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">
                        {user.username}
                        {user.isCurrentUser && (
                          <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">{user.xp || 0}</div>
                      <div className="text-xs text-slate-600">XP</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="space-y-6">
          {/* Friend Requests */}
          {friendRequests.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="font-display text-2xl text-slate-800 mb-4">
                ➕ {t('social.friendRequests')} ({friendRequests.length})
              </h2>
              <div className="space-y-3">
                {friendRequests.map((request) => (
                  <div key={request.id} className="flex items-center gap-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">{request.from_username}</div>
                      <div className="text-sm text-slate-600">{request.from_xp || 0} XP</div>
                    </div>
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      ✓ {t('social.accept')}
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      ✗ {t('social.reject')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="font-display text-2xl text-slate-800 mb-4">
              👥 {t('social.myFriends')} ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-slate-600 mb-4">{t('social.noFriendsYet')}</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  {t('social.findFriends')}
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {friends.map((friend) => (
                  <div key={friend.id} className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-slate-800">{friend.username}</div>
                        <div className="text-sm text-slate-600">
                          {friend.xp || 0} XP • Level {Math.floor((friend.xp || 0) / 200) + 1}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        ✗
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">
                      {t('social.friendsSince')} {new Date(friend.friends_since).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="font-display text-2xl text-slate-800 mb-4">
            🔍 {t('social.findFriends')}
          </h2>
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('social.searchByUsername')}
              className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
            />
            <button
              onClick={handleSearch}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              {t('social.search')}
            </button>
          </div>
          <div className="space-y-3">
            {searchResults.map((user) => (
              <div key={user.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{user.username}</div>
                  <div className="text-sm text-slate-600">{user.xp || 0} XP • Level {Math.floor((user.xp || 0) / 200) + 1}</div>
                </div>
                {user.friendshipStatus === 'none' && (
                  <button
                    onClick={() => handleSendFriendRequest(user.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    ➕ {t('social.addFriend')}
                  </button>
                )}
                {user.friendshipStatus === 'pending' && (
                  <span className="text-sm text-yellow-600 font-semibold">{t('social.requestSent')}</span>
                )}
                {user.friendshipStatus === 'accepted' && (
                  <span className="text-sm text-green-600 font-semibold">✓ {t('social.friends')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="font-display text-2xl text-slate-800 mb-4">
            📊 {t('social.recentActivity')}
          </h2>
          <div className="space-y-3">
            {activityFeed.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-slate-600">{t('social.noRecentActivity')}</p>
              </div>
            ) : (
              activityFeed.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl">{getActivityIcon(activity.activity_type)}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">{activity.username}</div>
                    <div className="text-sm text-slate-600">{activity.description}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Social;
