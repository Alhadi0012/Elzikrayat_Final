/**
 * The comment thread on the photo detail page, plus the form to add one.
 *
 * The list updates straight from the store: addComment returns the saved
 * comment already populated, so nothing has to be refetched.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Alert, { FieldError } from "./Alert";
import { addComment, deleteComment } from "../features/comments/commentsSlice";
import { selectUser } from "../features/auth/authSlice";

export default function CommentSection({ photoId, photoOwnerId }) {
  const [text, setText] = useState("");
  const dispatch = useDispatch();

  const user = useSelector(selectUser);
  const { items, adding, error, fieldErrors } = useSelector(state => state.comments);

  const onSubmit = async event => {
    event.preventDefault();
    if (!text.trim()) return;

    const result = await dispatch(addComment({ photoId, comment: text.trim() }));
    if (addComment.fulfilled.match(result)) setText("");
  };

  /* A comment can be removed by its author or by the owner of the photo. */
  const canDelete = comment =>
    user && (comment.userId?._id === user._id || photoOwnerId === user._id);

  return (
    <section className="comments">
      <h3>Comments ({items.length})</h3>

      <Alert type="error">{error}</Alert>

      {items.length === 0 && <p className="muted">No comments yet.</p>}

      <ul className="comment-list">
        {items.map(comment => (
          <li key={comment._id}>
            <div className="comment-head">
              <strong>
                {comment.userId?.firstName} {comment.userId?.lastName}
              </strong>
              <span className="muted">
                {new Date(comment.dateTime).toLocaleString("en-GB")}
              </span>
              {canDelete(comment) && (
                <button
                  type="button"
                  className="link-danger"
                  onClick={() => dispatch(deleteComment({ photoId, commentId: comment._id }))}
                >
                  Delete
                </button>
              )}
            </div>
            <p>{comment.comment}</p>
          </li>
        ))}
      </ul>

      {user ? (
        <form onSubmit={onSubmit} className="comment-form">
          <textarea
            value={text}
            onChange={event => setText(event.target.value)}
            placeholder="Write a comment..."
            rows={2}
            maxLength={500}
            required
          />
          <FieldError errors={fieldErrors} name="comment" />
          <button type="submit" className="btn btn-primary" disabled={adding}>
            {adding ? "Posting..." : "Add comment"}
          </button>
        </form>
      ) : (
        <p className="muted">
          <Link to="/login">Log in</Link> to leave a comment.
        </p>
      )}
    </section>
  );
}
