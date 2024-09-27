import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaRandom, FaRedo, FaVolumeUp, FaHeart, FaRegHeart } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DreamStreamer = ({ signOut }) => {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackAlbum, setCurrentTrackAlbum] = useState(null);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [purchasedAlbums, setPurchasedAlbums] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [showLikedSongs, setShowLikedSongs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState('monthly');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isViewingPurchasedAlbums, setIsViewingPurchasedAlbums] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [albumToPurchase, setAlbumToPurchase] = useState(null);

  const [filterGenre, setFilterGenre] = useState('');
  const [filterAlbum, setFilterAlbum] = useState('');
  const [filterArtist, setFilterArtist] = useState('');
  const [sortOption, setSortOption] = useState('');
  const navigate = useNavigate();

  const subscriptionOptions = {
    monthly: {
      label: "Monthly Subscription",
      price: "$9.99 / month"
    },
    yearly: {
      label: "Yearly Subscription",
      price: "$99.99 / year"
    }
  };

  useEffect(() => {
    const fetchAlbums = async () => {
      setLoading(true);
      try {
        const response = await axios.get('https://frl4tj50o1.execute-api.ap-south-1.amazonaws.com/dev/album');
        const albumsWithPrices = response.data.albums.map(album => ({
          ...album,
          price: (Math.random() * 10 + 10).toFixed(2),
        }));
        setAlbums(albumsWithPrices);
      } catch (error) {
        console.error('Error fetching albums:', error);
      }
      setLoading(false);
    };

    fetchAlbums();

    const storedPurchasedAlbums = localStorage.getItem('purchasedAlbums');
    const storedLikedSongs = localStorage.getItem('likedSongs');

    if (storedPurchasedAlbums) {
      setPurchasedAlbums(JSON.parse(storedPurchasedAlbums));
    }

    if (storedLikedSongs) {
      setLikedSongs(JSON.parse(storedLikedSongs));
    }
  }, []);

  const handleSubscriptionChange = (type) => {
    setSelectedSubscription(type);
  };

  // Single declaration of toggleServiceDetails function
  const toggleServiceDetails = () => {
    setShowServiceDetails(!showServiceDetails);
  };

  const handlePurchaseClick = (album) => {
    const isPurchased = purchasedAlbums.some(purchasedAlbum => purchasedAlbum.albumId === album.albumId);
    if (isPurchased) {
      toast.warn(`You have already purchased ${album.albumName}`);
      return;
    }
    setAlbumToPurchase(album);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = () => {
    const album = albumToPurchase;
    if (!album) return;

    toast.success(`You have purchased ${album.albumName} for $${album.price}!`);
    const newPurchasedAlbums = [...purchasedAlbums, album];
    setPurchasedAlbums(newPurchasedAlbums);
    localStorage.setItem('purchasedAlbums', JSON.stringify(newPurchasedAlbums));
    setShowPurchaseModal(false);
  };

  const cancelPurchase = () => {
    setShowPurchaseModal(false);
  };

  const viewPurchasedAlbums = () => {
    if (purchasedAlbums.length === 0) {
      toast.info("You haven't purchased any albums.");
      navigate('/');
      return;
    }
    setIsViewingPurchasedAlbums(true);
    setAlbums(purchasedAlbums);
    setSelectedAlbum(null);
    setShowLikedSongs(false);
  };

  const viewLikedSongs = () => {
    if (likedSongs.length === 0) {
      toast.info("You haven't liked any songs yet.");
      return;
    }
    setShowLikedSongs(true);
    setSelectedAlbum(null);
  };

  const playTrack = async (trackUrl, index, album, trackName) => {
    if (audio) audio.pause();

    const newAudio = new Audio(trackUrl);
    newAudio.volume = volume;
    newAudio.play();
    setAudio(newAudio);
    setCurrentTrackIndex(index);
    setCurrentTrack({ trackUrl, trackName });
    setCurrentTrackAlbum(album);
    setIsPlaying(true);

    newAudio.addEventListener('timeupdate', () => {
      setProgress((newAudio.currentTime / newAudio.duration) * 100);
    });

    newAudio.addEventListener('ended', () => {
      if (repeat) {
        playTrack(trackUrl, index, album, trackName);
      } else if (shuffle) {
        playRandomTrack();
      } else {
        playNextTrack();
      }
    });

    toast(`Now playing: ${trackName}`, {
      type: 'info',
      autoClose: 3000,
      pauseOnHover: true,
    });

    try {
      await axios.post('https://frl4tj50o1.execute-api.ap-south-1.amazonaws.com/dev/most_played', {
        albumId: album.albumId,
        trackName,
      });
      console.log('Track play recorded successfully');
    } catch (error) {
      console.error('Error recording track play:', error);
    }
  };

  const togglePlayPause = () => {
    if (audio) {
      isPlaying ? audio.pause() : audio.play();
      setIsPlaying(!isPlaying);
    }
  };

  const playNextTrack = () => {
    if (currentTrackAlbum) {
      if (shuffle) {
        playRandomTrack();
      } else if (currentTrackIndex < currentTrackAlbum.tracks.length - 1) {
        playTrack(
          currentTrackAlbum.tracks[currentTrackIndex + 1].trackUrl,
          currentTrackIndex + 1,
          currentTrackAlbum,
          currentTrackAlbum.tracks[currentTrackIndex + 1].trackName
        );
      } else {
        setIsPlaying(false);
      }
    }
  };

  const playPreviousTrack = () => {
    if (currentTrackAlbum && currentTrackIndex > 0) {
      playTrack(
        currentTrackAlbum.tracks[currentTrackIndex - 1].trackUrl,
        currentTrackIndex - 1,
        currentTrackAlbum,
        currentTrackAlbum.tracks[currentTrackIndex - 1].trackName
      );
    }
  };

  const playRandomTrack = () => {
    if (currentTrackAlbum) {
      const randomIndex = Math.floor(Math.random() * currentTrackAlbum.tracks.length);
      playTrack(
        currentTrackAlbum.tracks[randomIndex].trackUrl,
        randomIndex,
        currentTrackAlbum,
        currentTrackAlbum.tracks[randomIndex].trackName
      );
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value / 100;
    setVolume(newVolume);
    if (audio) audio.volume = newVolume;
  };

  const handleProgressChange = (e) => {
    const newProgress = e.target.value;
    setProgress(newProgress);
    if (audio) audio.currentTime = (newProgress / 100) * audio.duration;
  };

  const toggleShuffle = () => setShuffle(!shuffle);

  const toggleRepeat = () => setRepeat(!repeat);

  const handleAlbumClick = (album) => {
    setSelectedAlbum(album);
  };

  const toggleLikeSong = (track) => {
    const isLiked = likedSongs.some(likedTrack => likedTrack.trackUrl === track.trackUrl);
    let updatedLikedSongs;

    if (isLiked) {
      updatedLikedSongs = likedSongs.filter(likedTrack => likedTrack.trackUrl !== track.trackUrl);
      toast.info(`Removed from Liked Songs: ${track.trackName}`);
    } else {
      updatedLikedSongs = [...likedSongs, track];
      toast.success(`Added to Liked Songs: ${track.trackName}`);
    }

    setLikedSongs(updatedLikedSongs);
    localStorage.setItem('likedSongs', JSON.stringify(updatedLikedSongs));
  };

  const goBackToAlbums = () => {
    if (isViewingPurchasedAlbums) {
      setAlbums(purchasedAlbums);
    } else {
      setAlbums(filteredAlbums);
    }
    setSelectedAlbum(null);
  };

  const openFilterModal = () => {
    setIsFilterModalOpen(true);
  };

  const closeFilterModal = () => {
    setIsFilterModalOpen(false);
  };

  const applyFilters = () => {
    closeFilterModal();
  };

  const clearFilters = () => {
    setFilterGenre('');
    setFilterAlbum('');
    setFilterArtist('');
  };

  const filterAlbumsAndTracks = (albums) => {
    return albums
      .filter((album) =>
        album.albumName.toLowerCase().includes(filterAlbum.toLowerCase()) &&
        album.genre.toLowerCase().includes(filterGenre.toLowerCase()) &&
        album.artists.some(artist => artist.toLowerCase().includes(filterArtist.toLowerCase()))
      );
  };

  const sortTracks = (tracks) => {
    if (sortOption === 'name') {
      return [...tracks].sort((a, b) => a.trackName.localeCompare(b.trackName));
    } else if (sortOption === 'artist') {
      return [...tracks].sort((a, b) => a.trackLabel.localeCompare(b.trackLabel));
    } else if (sortOption === 'duration') {
      return [...tracks].sort((a, b) => a.duration - b.duration);
    }
    return tracks;
  };

  const filteredAlbums = filterAlbumsAndTracks(albums);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="w-64 h-4 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-red-600 animate-pulse" style={{ width: '50%' }}></div>
        </div>
        <p className="ml-4">Loading albums...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-black text-white`}>
      <ToastContainer />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 flex items-center justify-between p-4 bg-gray-900 text-white z-10 shadow-lg">
        <Link to="/" className="text-2xl font-semibold text-red-500">DreamStreamer</Link>
        <button
          onClick={signOut}
          className="py-2 px-4 bg-red-600 hover:bg-red-700 transition-colors rounded-lg text-white font-semibold"
        >
          Sign Out
        </button>
      </header>

      {/* Sidebar */}
      <div className="flex-grow pt-16 flex">
        <aside className="w-1/4 bg-gray-900 text-white p-4 flex flex-col justify-between sticky top-0 h-screen">
          <ul className="space-y-6">
            <li>
              <button
                onClick={viewPurchasedAlbums}
                className="w-full text-left py-2 px-4 bg-red-600 hover:bg-red-700 transition-colors rounded-lg text-white font-semibold"
              >
                Purchased Albums
              </button>
            </li>
            <li>
              <button
                onClick={viewLikedSongs}
                className="w-full text-left py-2 px-4 bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg text-white font-semibold"
              >
                Liked Songs
              </button>
            </li>
            <li>
              <button
                onClick={toggleServiceDetails}
                className="w-full text-left py-2 px-4 bg-red-600 hover:bg-red-700 transition-colors rounded-lg text-white font-semibold"
              >
                Service Details & Subscribe
              </button>
            </li>
            <li>
              <button
                onClick={openFilterModal}
                className="w-full text-left py-2 px-4 bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg text-white font-semibold"
              >
                Filter
              </button>
            </li>
          </ul>
        </aside>

        {/* Main Content */}
        <main className="flex-grow p-8 bg-black dark:bg-black overflow-y-auto transition-all duration-300 ease-in-out">
          {!selectedAlbum && !showLikedSongs ? (
            <>
              <h2 className="text-3xl font-semibold mb-4 text-red-500">{isViewingPurchasedAlbums ? 'Purchased Albums' : 'Albums'}</h2>
              <ul className="grid grid-cols-3 gap-6 animate-fade-in">
                {filteredAlbums.map((album) => (
                  <li key={album.albumId} className="group relative">
                    <div
                      className="cursor-pointer transform transition-transform group-hover:scale-105"
                      onClick={() => handleAlbumClick(album)}
                    >
                      <img
                        src={album.albumArtUrl}
                        alt={album.albumName}
                        className="w-full h-64 object-cover rounded-lg shadow-lg"
                      />
                      {!isViewingPurchasedAlbums && (
                        <div className="absolute inset-0 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleAlbumClick(album)}
                            className="py-2 px-4 bg-white text-black hover:bg-gray-200 transition-colors rounded-lg font-semibold mr-2"
                          >
                            View Album
                          </button>
                          <button
                            onClick={() => handlePurchaseClick(album)}
                            className="py-2 px-4 bg-green-600 hover:bg-green-700 transition-colors rounded-lg text-white font-semibold"
                          >
                            Purchase
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-center mt-2 font-semibold text-white">{album.albumName}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : selectedAlbum ? (
            <>
              <button
                onClick={goBackToAlbums}
                className="mb-4 py-2 px-4 bg-red-600 hover:bg-red-700 transition-colors rounded-lg text-white font-semibold"
              >
                Back to Albums
              </button>

              <div className="mb-6 animate-slide-up">
                <div className="flex items-center">
                  <img
                    src={selectedAlbum.albumArtUrl}
                    alt={selectedAlbum.albumName}
                    className="w-48 h-48 object-cover rounded-lg shadow-lg mr-6"
                  />
                  <div>
                    <h2 className="text-3xl font-semibold mb-2 text-red-500">{selectedAlbum.albumName}</h2>
                    <p className="text-gray-400">Artists: {selectedAlbum.artists.join(', ')}</p>
                    <p className="text-gray-400">Band: {selectedAlbum.bandComposition}</p>
                    <p className="text-gray-400">Year: {selectedAlbum.albumYear}</p>
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-semibold mb-4 text-red-500">Tracks</h3>
              <ul className="space-y-3 animate-fade-in">
                {sortTracks(selectedAlbum.tracks).map((track, index) => (
                  <li
                    key={index}
                    className={`p-4 rounded-lg shadow-md cursor-pointer transition duration-200 ${
                      currentTrackIndex === index && selectedAlbum.albumId === currentTrackAlbum?.albumId
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-800 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => playTrack(track.trackUrl, index, selectedAlbum, track.trackName)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">{track.trackName}</p>
                        <p className="text-sm text-gray-400">{track.trackLabel}</p>
                        <p className="text-sm text-gray-400">Duration: {track.duration} sec</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); toggleLikeSong(track); }}>
                        {likedSongs.some(likedTrack => likedTrack.trackUrl === track.trackUrl) ? (
                          <FaHeart className="text-red-500" />
                        ) : (
                          <FaRegHeart className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-semibold mb-4 text-red-500">Liked Songs</h2>
              <ul className="space-y-3 animate-fade-in">
                {likedSongs.map((track, index) => (
                  <li
                    key={index}
                    className="p-4 bg-gray-800 dark:bg-gray-700 rounded-lg shadow-md cursor-pointer transition-colors duration-200 hover:bg-gray-600 dark:hover:bg-gray-600"
                    onClick={() => playTrack(track.trackUrl, index, track.album, track.trackName)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">{track.trackName}</p>
                        <p className="text-sm text-gray-400">{track.trackLabel}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); toggleLikeSong(track); }}>
                        <FaHeart className="text-red-500" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </main>
      </div>

      {/* Footer Player */}
      {currentTrack && currentTrackAlbum && (
        <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 p-4 shadow-lg z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={currentTrackAlbum.albumArtUrl}
                alt={currentTrack.trackName}
                className="w-16 h-16 rounded-lg"
              />
              <div className="ml-4">
                <p className="text-lg font-semibold">{currentTrack.trackName}</p>
                <p className="text-sm text-gray-400">{currentTrackAlbum.artists.join(', ')}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button onClick={playPreviousTrack} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600">
                <FaStepBackward className="text-white" />
              </button>
              <button onClick={togglePlayPause} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600">
                {isPlaying ? <FaPause className="text-white" /> : <FaPlay className="text-white" />}
              </button>
              <button onClick={playNextTrack} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600">
                <FaStepForward className="text-white" />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <FaVolumeUp className="text-white" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume * 100}
                onChange={handleVolumeChange}
                className="w-24"
              />
            </div>

            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleProgressChange}
                className="w-64"
              />
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-full ${shuffle ? 'bg-red-600' : 'bg-gray-700'} hover:bg-gray-600`}
              >
                <FaRandom className="text-white" />
              </button>
              <button
                onClick={toggleRepeat}
                className={`p-2 rounded-full ${repeat ? 'bg-red-600' : 'bg-gray-700'} hover:bg-gray-600`}
              >
                <FaRedo className="text-white" />
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Service Details Modal */}
      {showServiceDetails && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-20">
          <div className="bg-white p-8 rounded-lg max-w-lg mx-auto">
            <h2 className="text-3xl font-semibold mb-4 text-red-500">Subscription Plans</h2>
            <p className="text-gray-700 mb-4">
              DreamStreamer offers unlimited music streaming for all purchased albums and liked songs. Choose a subscription plan below to enjoy our premium features:
            </p>

            <div className="mb-4">
              <div className="flex items-center mb-4">
                <input
                  type="radio"
                  id="monthly"
                  name="subscription"
                  checked={selectedSubscription === 'monthly'}
                  onChange={() => handleSubscriptionChange('monthly')}
                  className="mr-2"
                />
                <label htmlFor="monthly" className="text-gray-900">
                  {subscriptionOptions.monthly.label} - {subscriptionOptions.monthly.price}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="radio"
                  id="yearly"
                  name="subscription"
                  checked={selectedSubscription === 'yearly'}
                  onChange={() => handleSubscriptionChange('yearly')}
                  className="mr-2"
                />
                <label htmlFor="yearly" className="text-gray-900">
                  {subscriptionOptions.yearly.label} - {subscriptionOptions.yearly.price}
                </label>
              </div>
            </div>

            <button
              onClick={toggleServiceDetails}
              className="mt-4 py-2 px-4 bg-red-600 hover:bg-red-700 transition-colors rounded-lg text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Purchase Confirmation Modal */}
      {showPurchaseModal && albumToPurchase && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-20">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-4 text-black">Confirm Purchase</h2>
            <p className="mb-4 text-black">Are you sure you want to purchase <strong>{albumToPurchase.albumName}</strong> for <strong>${albumToPurchase.price}</strong>?</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelPurchase}
                className="py-2 px-6 bg-gray-300 hover:bg-gray-400 rounded-lg font-semibold"
              >
                No
              </button>
              <button
                onClick={confirmPurchase}
                className="py-2 px-6 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-20">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 sm:mx-auto p-6">
            <h2 className="text-3xl font-semibold mb-6 text-gray-900 text-center">Filter Options</h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Filter by Genre</label>
                  <input
                    type="text"
                    placeholder="e.g. Rock, Jazz"
                    value={filterGenre}
                    onChange={(e) => setFilterGenre(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Filter by Album</label>
                  <input
                    type="text"
                    placeholder="e.g. Abbey Road"
                    value={filterAlbum}
                    onChange={(e) => setFilterAlbum(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Filter by Artist</label>
                <input
                  type="text"
                  placeholder="e.g. The Beatles"
                  value={filterArtist}
                  onChange={(e) => setFilterArtist(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={closeFilterModal}
                  className="py-3 px-6 bg-gray-400 hover:bg-gray-500 transition-colors rounded-lg text-white font-semibold"
                >
                  Cancel
                </button>
                <div className="flex space-x-4">
                  <button
                    onClick={clearFilters}
                    className="py-3 px-6 bg-gray-200 hover:bg-gray-300 transition-colors rounded-lg text-gray-800 font-semibold"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={applyFilters}
                    className="py-3 px-6 bg-red-600 hover:bg-red-700 transition-colors rounded-lg text-white font-semibold"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DreamStreamer;
