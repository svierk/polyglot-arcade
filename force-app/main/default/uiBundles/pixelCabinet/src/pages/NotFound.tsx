import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="py-12 text-center">
      <h1 className="arcade-title mb-4 text-4xl">404</h1>
      <p className="arcade-hint mb-8">This level does not exist.</p>
      <Link to="/" className="arcade-button">
        Back to the lobby
      </Link>
    </div>
  );
}
