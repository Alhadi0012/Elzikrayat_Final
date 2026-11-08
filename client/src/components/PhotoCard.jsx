/** One photo in the gallery grid. */
import { Link } from "react-router-dom";

export default function PhotoCard({ photo }) {
  const author = photo.userId;
  const name = author ? `${author.firstName} ${author.lastName}` : "Unknown";

  return (
    <Link to={`/photo/${photo._id}`} className="photo-card">
      <img src={photo.cloudinaryUrl} alt={photo.title} loading="lazy" />
      <div className="photo-card-body">
        <h3>{photo.title}</h3>
        <small>
          {name} &middot; {new Date(photo.dateTime).toLocaleDateString("en-GB")}
        </small>
      </div>
    </Link>
  );
}
