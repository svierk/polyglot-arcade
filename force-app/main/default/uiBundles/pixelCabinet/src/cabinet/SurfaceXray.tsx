/**
 * Tech X-ray of the cabinet itself: what opens behind the badge in the marquee
 * bar. Uses the pattern names and numbers of the doc site, like the X-ray in
 * the hub lobby, so the UI and the docs use the same terms.
 */

/** Where the doc site explains the four integration patterns. */
export const PATTERNS_URL =
  'https://svierk.github.io/polyglot-arcade/architecture/patterns';

const ROWS: Array<[string, string]> = [
  ['Framework', 'React'],
  ['Surface', 'UI bundle - Pixel Cabinet'],
  ['Saves the score', 'The app, with the player’s session'],
  ['Data path', 'Data SDK GraphQL'],
];

interface SurfaceXrayProps {
  onClose: () => void;
}

export default function SurfaceXray({ onClose }: SurfaceXrayProps) {
  return (
    <section
      id="surface-xray"
      className="xray-panel"
      aria-labelledby="surface-xray-title"
    >
      <p className="xray-kicker">Tech X-ray · this surface</p>
      <h2 id="surface-xray-title" className="xray-heading">
        <span className="xray-no">
          <span className="sr-only">Pattern </span>2
        </span>
        Native React UI bundle
      </h2>
      <p className="xray-text">
        The Pixel Cabinet is a React app, deployed as UIBundle metadata and
        served from the org's own *.salesforce.app domain, next to the Angular
        hub that launched it. It saves every round played here with the Data
        SDK: UI API GraphQL with your session, so sharing and field-level
        security apply as in any Salesforce UI. Lightning frames the same games
        at /embed, where the cabinet runs as a guest and tells the host page
        about each round (pattern 3).
      </p>
      <dl className="xray-rows">
        {ROWS.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="xray-links">
        <a
          href={PATTERNS_URL}
          target="_blank"
          rel="noreferrer"
          className="arcade-nav-link"
        >
          All four patterns in the docs ↗
        </a>
        <button type="button" className="arcade-nav-link" onClick={onClose}>
          Close
        </button>
      </p>
    </section>
  );
}
