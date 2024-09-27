import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = ({ signOut }) => {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [files, setFiles] = useState({ albumArt: null, tracks: [] });
  const [albumDetails, setAlbumDetails] = useState({
    albumName: '',
    albumYear: '',
    genre: '',
    artists: '',
    bandComposition: '',
    trackLabels: '',
  });
  const [filter, setFilter] = useState({ genre: '', albumName: '', artists: '', trackName: '' });
  const [stats, setStats] = useState({ totalAlbums: 0, totalTracks: 0 });
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false); // Loading state

  // Fetch Albums and Stats
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const response = await axios.get('https://frl4tj50o1.execute-api.ap-south-1.amazonaws.com/dev/album');
        setAlbums(response.data.albums);

        const totalTracks = response.data.albums.reduce((acc, album) => acc + album.tracks.length, 0);
        setStats({ totalAlbums: response.data.albums.length, totalTracks });
      } catch (error) {
        console.error('Error fetching albums:', error);
      }
    };
    fetchAlbums();
  }, []);

  // Filter Albums
  const filterAlbums = () => {
    return albums.filter((album) => {
      return (
        (!filter.genre || album.genre.toLowerCase().includes(filter.genre.toLowerCase())) &&
        (!filter.albumName || album.albumName.toLowerCase().includes(filter.albumName.toLowerCase())) &&
        (!filter.artists || album.artists.join(', ').toLowerCase().includes(filter.artists.toLowerCase())) &&
        (!filter.trackName || album.tracks.some((track) => track.trackName.toLowerCase().includes(filter.trackName.toLowerCase())))
      );
    });
  };

  // Toggle filter panel
  const toggleFilterPanel = () => {
    setShowFilterPanel(!showFilterPanel);
  };

  // Handle album click for editing
  const handleAlbumClick = (album) => {
    setSelectedAlbum(album);
    setAlbumDetails(album);
    setIsEditing(true); // Set edit mode
  };

  // Handle input change for the form
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setAlbumDetails((prev) => ({ ...prev, [name]: value }));
  };

  // Handle file input (album art and tracks)
  const handleFileChange = (event) => {
    const { name, files } = event.target;
    if (name === 'albumArt') {
      setFiles((prev) => ({ ...prev, albumArt: files[0] }));
    } else if (name === 'tracks') {
      setFiles((prev) => ({ ...prev, tracks: [...prev.tracks, ...files] }));
    }
  };

  // Upload Album (New Album)
  const handleFileUpload = async () => {
    if (!files.albumArt || files.tracks.length === 0) {
      alert('Please select album art and at least one track.');
      return;
    }

    setIsUploading(true); // Start loading

    try {
      // Upload album art
      const albumArtResponse = await axios.post(
        'https://frl4tj50o1.execute-api.ap-south-1.amazonaws.com/dev/generating_s3_links',
        {
          fileName: files.albumArt.name,
          fileType: files.albumArt.type,
        }
      );

      const { uploadUrl: albumArtUrl } = albumArtResponse.data;
      await axios.put(albumArtUrl, files.albumArt, {
        headers: {
          'Content-Type': files.albumArt.type,
        },
      });

      // Upload tracks
      const trackUrls = [];
      for (const track of files.tracks) {
        const trackResponse = await axios.post(
          'https://frl4tj50o1.execute-api.ap-south-1.amazonaws.com/dev/generating_s3_links',
          {
            fileName: track.name,
            fileType: track.type,
          }
        );

        const { uploadUrl: trackUploadUrl } = trackResponse.data;
        await axios.put(trackUploadUrl, track, {
          headers: {
            'Content-Type': track.type,
          },
        });

        trackUrls.push({
          trackName: track.name,
          trackUrl: trackUploadUrl.split('?')[0],
          trackLabel: 'Sony Music',
        });
      }

      const artistsArray = albumDetails.artists.split(',').map((artist) => artist.trim());

      const newAlbum = {
        albumId: albumDetails.albumId || albumDetails.albumName.replace(/\s/g, '').toLowerCase(),
        albumArtUrl: albumArtUrl.split('?')[0],
        albumName: albumDetails.albumName,
        albumYear: parseInt(albumDetails.albumYear),
        genre: albumDetails.genre,
        artists: artistsArray,
        bandComposition: albumDetails.bandComposition,
        tracks: trackUrls,
      };

      // POST new album metadata
      const albumUploadResponse = await axios.post('https://frl4tj50o1.execute-api.ap-south-1.amazonaws.com/dev/album', newAlbum);

      // Check if upload was successful
      if (albumUploadResponse.status === 200 || albumUploadResponse.status === 201) {
        setAlbums((prevAlbums) => [...prevAlbums, newAlbum]);
        setStats((prevStats) => ({
          totalAlbums: prevStats.totalAlbums + 1,
          totalTracks: prevStats.totalTracks + trackUrls.length,
        }));
        setUploadStatus('Album metadata and files uploaded successfully!');
      } else {
        throw new Error('Failed to upload album metadata');
      }
    } catch (error) {
      console.error('File upload failed:', error);
      setUploadStatus('Upload failed.');
    } finally {
      setIsUploading(false); // Stop loading
    }
  };

  // Update Album
  const handleUpdateAlbum = async () => {
    if (!selectedAlbum) {
      alert('No album selected for update.');
      return;
    }

    setIsUploading(true); // Start loading

    try {
      let albumArtUrl = selectedAlbum.albumArtUrl;
      if (files.albumArt) {
        const albumArtResponse = await axios.post(
          'https://frl4tj50o1.execute-api.ap-south-1.amazonaws.com/dev/generating_s3_links',
          {
            fileName: files.albumArt.name,
            fileType: files.albumArt.type,
          }
        );
        const { uploadUrl } = albumArtResponse.data;
        await axios.put(uploadUrl, files.albumArt, {
          headers: { 'Content-Type': files.albumArt.type },
        });
        albumArtUrl = uploadUrl.split('?')[0];
      }

      let updatedTracks = selectedAlbum.tracks;
      if (files.tracks && files.tracks.length > 0) {
        const trackUrls = [];
        for (const track of files.tracks) {
          const trackResponse = await axios.post(
            'https://frl4tj50o1.execute-api.ap-south-1.amazonaws.com/dev/generating_s3_links',
            {
              fileName: track.name,
              fileType: track.type,
            }
          );
          const { uploadUrl: trackUploadUrl } = trackResponse.data;
          await axios.put(trackUploadUrl, track, {
            headers: { 'Content-Type': track.type },
          });
          trackUrls.push({
            trackName: track.name,
            trackUrl: trackUploadUrl.split('?')[0],
            trackLabel: 'Sony Music',
          });
        }
        updatedTracks = trackUrls;
      }

      const updatedArtists = Array.isArray(albumDetails.artists)
        ? albumDetails.artists
        : albumDetails.artists.split(',').map((artist) => artist.trim());

      const updatedAlbum = {
        ...albumDetails,
        artists: updatedArtists,
        albumYear: parseInt(albumDetails.albumYear),
        albumArtUrl: albumArtUrl,
        tracks: updatedTracks,
      };

      const response = await axios.put(
        `https://frl4tj50o1.execute-api.ap-south-1.amazonaws.com/dev/album/${selectedAlbum.albumId}`,
        updatedAlbum
      );

      if (response.status === 200 || response.status === 204) {
        alert('Album updated successfully!');
        setAlbums(albums.map(album => album.albumId === selectedAlbum.albumId ? updatedAlbum : album));
      } else {
        throw new Error('Failed to update album');
      }
    } catch (error) {
      console.error('Album update failed:', error);
      alert('Failed to update album');
    } finally {
      setIsUploading(false); // Stop loading
    }
  };

  // Delete Album
  const handleDeleteAlbum = async (albumId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this album?');
    if (!confirmDelete) return;

    try {
      await axios.delete(`https://frl4tj50o1.execute-api.ap-south-1.amazonaws.com/dev/album/${albumId}`);
      alert('Album deleted successfully');
      setAlbums(albums.filter((album) => album.albumId !== albumId));
      setStats((prevStats) => ({
        totalAlbums: prevStats.totalAlbums - 1,
        totalTracks: prevStats.totalTracks - albums.find(album => album.albumId === albumId).tracks.length,
      }));
    } catch (error) {
      console.error('Error deleting album:', error);
      alert('Failed to delete album');
    }
  };

  // Request Analytics Report
  const requestAnalyticsReport = async () => {
    try {
      const response = await axios.post('https://frl4tj50o1.execute-api.ap-south-1.amazonaws.com/dev/send_reports');
      if (response.status === 200) {
        alert('Analytics report has been sent to your email.');
      }
    } catch (error) {
      console.error('Analytics report error:', error);
      alert('Failed to send report.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex-shrink-0">
        <div className="flex flex-col p-4 space-y-6">
          <h1 className="text-3xl font-bold text-gray-100 mb-6">Admin Panel</h1>
          <button
            onClick={() => {
              setSelectedAlbum(null);
              setIsEditing(false); 
              setAlbumDetails({
                albumName: '',
                albumYear: '',
                genre: '',
                artists: '',
                bandComposition: '',
                trackLabels: '',
              }); // Reset the form
            }}
            className="py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200"
          >
            Add Album
          </button>
          <button
            onClick={requestAnalyticsReport}
            className="py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
          >
            Send Analytics Report
          </button>
          <button
            className="py-2 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-200"
            onClick={toggleFilterPanel}
          >
            Filter Albums
          </button>
          <button
            onClick={signOut}
            className="py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-6 bg-gray-900 text-white">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold">Manage Albums</h2>
          <p className="text-gray-400">Total Albums: {stats.totalAlbums}</p>
          <p className="text-gray-400">Total Tracks: {stats.totalTracks}</p>
        </div>

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Filter Albums</h3>
            <input
              type="text"
              name="genre"
              placeholder="Filter by Genre"
              className="w-full p-3 bg-gray-700 rounded-lg mb-4"
              value={filter.genre}
              onChange={(e) => setFilter({ ...filter, genre: e.target.value })}
            />
            <input
              type="text"
              name="albumName"
              placeholder="Filter by Album Name"
              className="w-full p-3 bg-gray-700 rounded-lg mb-4"
              value={filter.albumName}
              onChange={(e) => setFilter({ ...filter, albumName: e.target.value })}
            />
            <input
              type="text"
              name="artists"
              placeholder="Filter by Artists"
              className="w-full p-3 bg-gray-700 rounded-lg mb-4"
              value={filter.artists}
              onChange={(e) => setFilter({ ...filter, artists: e.target.value })}
            />
            <input
              type="text"
              name="trackName"
              placeholder="Filter by Track Name"
              className="w-full p-3 bg-gray-700 rounded-lg mb-4"
              value={filter.trackName}
              onChange={(e) => setFilter({ ...filter, trackName: e.target.value })}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filterAlbums().map((album) => (
            <div key={album.albumId} onClick={() => handleAlbumClick(album)} className="cursor-pointer bg-gray-800 p-4 rounded-lg shadow-lg">
              <img
                src={album.albumArtUrl}
                alt={album.albumName}
                className="w-full h-40 object-cover rounded-lg mb-2 hover:opacity-80 transition-all duration-200"
              />
              <h3 className="text-gray-100 text-center">{album.albumName}</h3>
              <p className="text-gray-400 text-center">Play Count: {album.playCount || 0}</p>
              <p className="text-gray-400 text-center">Last Played Track: {album.lastPlayedTrack || 'N/A'}</p>
            </div>
          ))}
        </div>

        {/* Edit / Add Album Section */}
        {selectedAlbum || !isEditing ? (
          <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Album' : 'Add Album'}</h2>
            <input
              type="text"
              name="albumName"
              placeholder="Album Name"
              className="w-full p-3 bg-gray-700 rounded-lg mb-4"
              onChange={handleInputChange}
              value={albumDetails.albumName}
            />
            <input
              type="text"
              name="genre"
              placeholder="Genre"
              className="w-full p-3 bg-gray-700 rounded-lg mb-4"
              onChange={handleInputChange}
              value={albumDetails.genre}
            />
            <input
              type="number"
              name="albumYear"
              placeholder="Album Year"
              className="w-full p-3 bg-gray-700 rounded-lg mb-4"
              onChange={handleInputChange}
              value={albumDetails.albumYear}
            />
            <input
              type="text"
              name="artists"
              placeholder="Artists (comma separated)"
              className="w-full p-3 bg-gray-700 rounded-lg mb-4"
              onChange={handleInputChange}
              value={albumDetails.artists}
            />
            <input
              type="text"
              name="bandComposition"
              placeholder="Band Composition"
              className="w-full p-3 bg-gray-700 rounded-lg mb-4"
              onChange={handleInputChange}
              value={albumDetails.bandComposition}
            />
            <input
              type="file"
              name="albumArt"
              accept="image/*"
              className="w-full p-3 bg-gray-700 rounded-lg mb-4"
              onChange={handleFileChange}
            />
            <input
              type="file"
              name="tracks"
              accept="audio/*"
              multiple
              className="w-full p-3 bg-gray-700 rounded-lg mb-4"
              onChange={handleFileChange}
            />
            <button
              onClick={isEditing ? handleUpdateAlbum : handleFileUpload}
              className="py-3 px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : isEditing ? 'Update Album' : 'Upload Album'}
            </button>
            {uploadStatus && <p className="text-sm text-green-400 mt-4">{uploadStatus}</p>}
            {isEditing && (
              <button
                onClick={() => handleDeleteAlbum(selectedAlbum.albumId)}
                className="mt-4 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200"
              >
                Delete Album
              </button>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default AdminDashboard;
