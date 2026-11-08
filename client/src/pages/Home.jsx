/** Landing page: welcome, live counters and the newest photos. */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import PhotoCard from "../components/PhotoCard";
import { fetchPhotos, fetchStats } from "../features/photos/photosSlice";

export default function Home() {
  const dispatch = useDispatch();
  const { items, stats } = useSelector(state => state.photos);

  useEffect(() => {
    dispatch(fetchStats());
    dispatch(fetchPhotos({ limit: 6 }));
  }, [dispatch]);

  return (
    <>
      <section className="hero">
        <h1>Alzikrayat</h1>
        <p>Share your memories. Upload your photos, tell their story, and let others comment.</p>
        <Link to="/gallery" className="btn btn-primary">Browse the gallery</Link>
      </section>

      <section className="stats">
        <div><strong>{stats.users}</strong><span>Members</span></div>
        <div><strong>{stats.photos}</strong><span>Photos</span></div>
        <div><strong>{stats.comments}</strong><span>Comments</span></div>
      </section>

      <h2>Latest memories</h2>
      {items.length === 0 ? (
        <p className="muted">No photos yet. Be the first to upload one.</p>
      ) : (
        <div className="photo-grid">
          {items.slice(0, 6).map(photo => <PhotoCard key={photo._id} photo={photo} />)}
        </div>
      )}
    </>
  );
}
