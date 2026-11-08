/** The full gallery. */
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import PhotoCard from "../components/PhotoCard";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import { fetchPhotos } from "../features/photos/photosSlice";

export default function Gallery() {
  const dispatch = useDispatch();
  const { items, loading, error, total } = useSelector(state => state.photos);

  useEffect(() => { dispatch(fetchPhotos()); }, [dispatch]);

  return (
    <>
      <div className="page-head">
        <h2>Gallery</h2>
        <span className="muted">{total} photo(s)</span>
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <Spinner full />
      ) : items.length === 0 ? (
        <p className="muted">No photos yet.</p>
      ) : (
        <div className="photo-grid">
          {items.map(photo => <PhotoCard key={photo._id} photo={photo} />)}
        </div>
      )}
    </>
  );
}
