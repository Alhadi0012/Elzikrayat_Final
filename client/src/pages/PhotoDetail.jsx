/**
 * One photo in full, with its metadata and comments.
 * The id comes from the route via useParams, as the specification requires.
 */
import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Spinner from "../components/Spinner";
import Alert from "../components/Alert";
import CommentSection from "../components/CommentSection";
import { fetchPhoto, deletePhoto, clearCurrent } from "../features/photos/photosSlice";
import { selectUser } from "../features/auth/authSlice";

export default function PhotoDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector(selectUser);
  const { current, loading, error } = useSelector(state => state.photos);

  useEffect(() => {
    dispatch(fetchPhoto(id));
    return () => { dispatch(clearCurrent()); };
  }, [dispatch, id]);

  const owner = current?.userId;
  const isOwner = user && owner && owner._id === user._id;

  const onDelete = async () => {
    if (!window.confirm("Delete this photo permanently?")) return;
    const result = await dispatch(deletePhoto(id));
    if (deletePhoto.fulfilled.match(result)) navigate("/gallery");
  };

  if (loading) return <Spinner full />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!current) return null;

  return (
    <div className="detail">
      <div className="card detail-main">
        <img src={current.cloudinaryUrl} alt={current.title} />
        <div className="detail-body">
          <h2>{current.title}</h2>
          <p className="muted">
            by {owner ? `${owner.firstName} ${owner.lastName}` : "Unknown"}
            {" · "}
            {new Date(current.dateTime).toLocaleString("en-GB")}
          </p>
          {current.description && <p>{current.description}</p>}

          {isOwner && (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Delete this photo
            </button>
          )}
        </div>
      </div>

      <div className="card detail-side">
        <CommentSection photoId={id} photoOwnerId={owner?._id} />
      </div>

      <p><Link to="/gallery">&larr; Back to the gallery</Link></p>
    </div>
  );
}
