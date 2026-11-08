/** Static description of the project, required by the specification. */
export default function About() {
  return (
    <div className="card">
      <h2>About Alzikrayat</h2>
      <p>
        Alzikrayat ("The Memories") is a photo sharing application built for the
        Advanced Web Technologies course at Sudan University of Science and Technology.
      </p>
      <p>
        It is a full MERN application: a React frontend with Redux Toolkit, an
        Express REST API, and MongoDB through Mongoose. Accounts are confirmed by a
        code sent to the user's email, passwords are reset the same way, and the
        images themselves are stored on Cloudinary.
      </p>
      <p>
        Every route, controller, model and component is hand-written following the
        patterns taught in the course.
      </p>
    </div>
  );
}
