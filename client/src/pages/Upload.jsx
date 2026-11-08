/** Upload form with a local preview and a progress bar. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Alert, { FieldError } from "../components/Alert";
import { uploadPhoto, clearPhotoError } from "../features/photos/photosSlice";

const MAX_BYTES = 5 * 1024 * 1024;

export default function Upload() {
  const [form, setForm] = useState({ title: "", description: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [progress, setProgress] = useState(0);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { uploading, error, fieldErrors } = useSelector(state => state.photos);

  /* Release the object URL when it is replaced, otherwise every new preview
     leaks the previous one for as long as the page stays open. */
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => () => { dispatch(clearPhotoError()); }, [dispatch]);

  const chooseFile = event => {
    const chosen = event.target.files[0];
    setLocalError(null);
    if (!chosen) return;

    if (!chosen.type.startsWith("image/")) {
      setLocalError("Please choose an image file.");
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setLocalError("The image must be smaller than 5 MB.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  };

  const submit = async event => {
    event.preventDefault();
    if (!file) {
      setLocalError("Please choose an image to upload.");
      return;
    }

    setProgress(0);
    const result = await dispatch(uploadPhoto({
      file,
      title: form.title,
      description: form.description,
      onProgress: setProgress
    }));

    if (uploadPhoto.fulfilled.match(result)) {
      navigate(`/photo/${result.payload.photo._id}`);
    }
  };

  return (
    <div className="card form-card">
      <h2>Upload a memory</h2>

      <Alert type="error" onClose={() => dispatch(clearPhotoError())}>
        {error || localError}
      </Alert>

      <form onSubmit={submit} noValidate>
        <label>
          Title
          <input
            name="title"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            maxLength={200}
            required
          />
          <FieldError errors={fieldErrors} name="title" />
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            maxLength={1000}
          />
          <FieldError errors={fieldErrors} name="description" />
        </label>

        <label>
          Image file
          <input type="file" accept="image/*" onChange={chooseFile} required />
        </label>

        {preview && <img src={preview} alt="Preview" className="preview" />}

        {uploading && (
          <div className="progress" aria-label={`Uploading ${progress}%`}>
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        <button type="submit" className="btn btn-primary block" disabled={uploading}>
          {uploading ? `Uploading ${progress}%` : "Upload"}
        </button>
      </form>
    </div>
  );
}
